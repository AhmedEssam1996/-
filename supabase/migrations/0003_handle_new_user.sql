-- ============================================================================
-- Hadiya (هدية) — 0003 new-user provisioning
--
-- Every auth.users row gets a matching profile + a USER role. Critically, the
-- role assigned is always 'USER' — the trigger deliberately ignores anything the
-- client may have placed in user metadata. Promotion to ADMIN happens only via
-- the server-side bootstrap flow (see src/lib/auth/admin.ts).
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
  v_avatar    text;
  v_source    text;
begin
  v_full_name := nullif(trim(coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    ''
  )), '');

  v_avatar := nullif(trim(coalesce(
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_user_meta_data ->> 'picture',
    ''
  )), '');

  v_source := nullif(trim(coalesce(new.raw_user_meta_data ->> 'signup_source', '')), '');

  insert into public.profiles (id, email, full_name, avatar_url, signup_source)
  values (new.id, new.email, v_full_name, v_avatar, coalesce(v_source, 'email'))
  on conflict (id) do update
    set email      = excluded.email,
        full_name  = coalesce(public.profiles.full_name, excluded.full_name),
        avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);

  -- Always USER. Never derived from client-supplied metadata.
  insert into public.user_roles (user_id, role)
  values (new.id, 'USER')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill for accounts created before the trigger existed.
insert into public.profiles (id, email, full_name, avatar_url)
select u.id,
       u.email,
       nullif(trim(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')), ''),
       nullif(trim(coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture', '')), '')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

insert into public.user_roles (user_id, role)
select u.id, 'USER'
from auth.users u
where not exists (select 1 from public.user_roles r where r.user_id = u.id)
on conflict (user_id) do nothing;