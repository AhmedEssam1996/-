-- ============================================================================
-- Hadiya (هدية) — 0002 Row Level Security
--
-- Threat model
--  1. A signed-in user must never read/write another user's gifts.
--  2. A signed-in user must never escalate their own role.
--  3. An anonymous visitor must never read drafts — only PUBLISHED gifts.
--  4. Anonymous visitors may write analytics events, but nothing else.
--  5. The service role (server-only key) bypasses RLS by design and is the only
--     identity that may mutate user_roles / app_settings / admin_logs.
--
-- Every helper function below is SECURITY DEFINER with a pinned search_path so
-- it cannot be hijacked through a malicious `public` schema shadow.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.current_role_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role::text from public.user_roles where user_id = auth.uid()), 'ANON');
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'ADMIN'
  );
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'ACTIVE'
  );
$$;

revoke all on function public.current_role_name() from public, anon;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_active_user() from public, anon;
grant execute on function public.current_role_name() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_active_user() to authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.user_roles        enable row level security;
alter table public.app_settings      enable row level security;
alter table public.gift_templates    enable row level security;
alter table public.gifts             enable row level security;
alter table public.gift_sections     enable row level security;
alter table public.ai_generations    enable row level security;
alter table public.analytics_events  enable row level security;
alter table public.gift_opens        enable row level security;
alter table public.admin_logs        enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
--   * own row: full access (minus role, which lives elsewhere)
--   * published gift authors: public identity fields are readable so a gift page
--     can show "من {name}". Exposed through a narrow column list in the app.
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_select_public_authors on public.profiles;
create policy profiles_select_public_authors on public.profiles
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.gifts g
      where g.user_id = profiles.id
        and g.status = 'PUBLISHED'
        and g.visibility = 'public'
    )
  );

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- user_roles — SELECT-only for the owner. NO write policy exists, so only the
-- service role can ever change a role. This is the load-bearing rule that makes
-- privilege escalation impossible from the client.
-- ---------------------------------------------------------------------------
drop policy if exists user_roles_select_self on public.user_roles;
create policy user_roles_select_self on public.user_roles
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- app_settings — world-readable (public feature flags / site name),
-- writable by nobody through RLS. Admin writes go through the service role.
-- ---------------------------------------------------------------------------
drop policy if exists app_settings_select_all on public.app_settings;
create policy app_settings_select_all on public.app_settings
  for select to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- gift_templates — active templates are public
-- ---------------------------------------------------------------------------
drop policy if exists gift_templates_select_active on public.gift_templates;
create policy gift_templates_select_active on public.gift_templates
  for select to anon, authenticated
  using (is_active or public.is_admin());

-- ---------------------------------------------------------------------------
-- gifts
--   * owner: everything
--   * admin: everything
--   * anon/others: only PUBLISHED
-- ---------------------------------------------------------------------------
drop policy if exists gifts_select_owner on public.gifts;
create policy gifts_select_owner on public.gifts
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists gifts_select_published on public.gifts;
create policy gifts_select_published on public.gifts
  for select to anon, authenticated
  using (status = 'PUBLISHED');

drop policy if exists gifts_insert_own on public.gifts;
create policy gifts_insert_own on public.gifts
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_active_user());

drop policy if exists gifts_update_own on public.gifts;
create policy gifts_update_own on public.gifts
  for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists gifts_delete_own on public.gifts;
create policy gifts_delete_own on public.gifts
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- gift_sections — reachable only through an accessible parent gift
-- ---------------------------------------------------------------------------
drop policy if exists gift_sections_select on public.gift_sections;
create policy gift_sections_select on public.gift_sections
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.gifts g
      where g.id = gift_sections.gift_id
        and (g.status = 'PUBLISHED' or g.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists gift_sections_write on public.gift_sections;
create policy gift_sections_write on public.gift_sections
  for all to authenticated
  using (
    exists (
      select 1 from public.gifts g
      where g.id = gift_sections.gift_id and (g.user_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.gifts g
      where g.id = gift_sections.gift_id and (g.user_id = auth.uid() or public.is_admin())
    )
  );

-- ---------------------------------------------------------------------------
-- ai_generations — users see their own usage; only the server writes.
-- ---------------------------------------------------------------------------
drop policy if exists ai_generations_select_own on public.ai_generations;
create policy ai_generations_select_own on public.ai_generations
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- analytics_events
--   * ANONYMOUS INSERT IS INTENTIONALLY NOT GRANTED.
--     Events are ingested through POST /api/analytics/events, which derives
--     user_id and a server-signed session id. This prevents forged or
--     attributed-to-someone-else analytics rows.
--   * Users may read nothing; admins read everything (via service role).
-- ---------------------------------------------------------------------------
drop policy if exists analytics_events_select_admin on public.analytics_events;
create policy analytics_events_select_admin on public.analytics_events
  for select to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- gift_opens
--   * Anonymous recipients must be able to record an open without an account.
--     The route uses the service role and validates that the gift is PUBLISHED,
--     so this policy only matters for owner/admin reads.
-- ---------------------------------------------------------------------------
drop policy if exists gift_opens_select on public.gift_opens;
create policy gift_opens_select on public.gift_opens
  for select to authenticated
  using (
    exists (
      select 1 from public.gifts g
      where g.id = gift_opens.gift_id and (g.user_id = auth.uid() or public.is_admin())
    )
  );

-- ---------------------------------------------------------------------------
-- admin_logs — append-only, server-written, admin-readable.
-- ---------------------------------------------------------------------------
drop policy if exists admin_logs_select_admin on public.admin_logs;
create policy admin_logs_select_admin on public.admin_logs
  for select to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Grants
--
-- RLS is the second gate. The first is table-level GRANTs: `anon` literally has
-- no privilege on the sensitive tables, so even a broken policy cannot leak.
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select on public.app_settings          to anon, authenticated;
grant select on public.gift_templates        to anon, authenticated;
grant select on public.gifts                 to anon, authenticated;
grant select on public.gift_sections         to anon, authenticated;
grant select on public.profiles              to anon, authenticated;

grant select, insert, update, delete on public.profiles       to authenticated;
grant select on public.user_roles                             to authenticated;
grant select, insert, update, delete on public.gifts          to authenticated;
grant select, insert, update, delete on public.gift_sections  to authenticated;
grant select on public.ai_generations                         to authenticated;
grant select on public.analytics_events                       to authenticated;
grant select on public.gift_opens                             to authenticated;
grant select on public.admin_logs                             to authenticated;

-- Anonymous identities get nothing beyond the read grants above.
revoke insert, update, delete on public.analytics_events from anon, authenticated;
revoke insert, update, delete on public.gift_opens        from anon, authenticated;
revoke insert, update, delete on public.ai_generations    from anon, authenticated;
revoke insert, update, delete on public.admin_logs        from anon, authenticated;
revoke insert, update, delete on public.app_settings      from anon, authenticated;
revoke insert, update, delete on public.user_roles        from anon, authenticated;
revoke insert, update, delete on public.gift_templates    from anon, authenticated;