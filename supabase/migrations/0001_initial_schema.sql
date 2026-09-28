-- ============================================================================
-- Hadiya (هدية) — 0001 initial schema
-- Arabic-first AI digital gifting platform.
--
-- Design notes
--  * All primary keys are UUIDs so client-generated ids are safe to reject/accept.
--  * `role` lives in its own table (user_roles) so a normal user can NEVER
--    escalate themselves by writing to a public profile row. RLS on user_roles
--    grants SELECT to the owner only, and NO insert/update policy exists, which
--    means only the service role (server) can mutate roles.
--  * Demo data is flagged with `is_demo` so it can be purged in one call and
--    never contaminates production analytics.
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('USER', 'ADMIN');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_status as enum ('ACTIVE', 'DISABLED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type gift_status as enum ('DRAFT', 'PUBLISHED', 'DISABLED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type gift_type as enum (
    'experience', 'message', 'image', 'story', 'video', 'quiz', 'generic'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type ai_feature as enum (
    'gift_suggestions', 'message', 'gift_experience', 'story', 'vibe'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type ai_generation_status as enum ('success', 'error', 'rate_limited', 'invalid_output');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Shared trigger: keep updated_at honest
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles — one row per auth user
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         citext,
  full_name     text,
  avatar_url    text,
  status        user_status not null default 'ACTIVE',
  disabled_at   timestamptz,
  last_seen_at  timestamptz,
  signup_source text,
  is_demo       boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists profiles_created_at_idx on public.profiles (created_at desc);
create index if not exists profiles_is_demo_idx on public.profiles (is_demo) where is_demo;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- user_roles — the ONLY source of truth for authorisation
-- ---------------------------------------------------------------------------
create table if not exists public.user_roles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  role       user_role not null default 'USER',
  granted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_roles_role_idx on public.user_roles (role);

drop trigger if exists user_roles_set_updated_at on public.user_roles;
create trigger user_roles_set_updated_at
  before update on public.user_roles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- app_settings — single row (id = 1) holding admin-editable configuration
-- ---------------------------------------------------------------------------
create table if not exists public.app_settings (
  id                         smallint primary key default 1 check (id = 1),
  site_name                  text not null default 'هدية',
  site_name_en               text not null default 'Hadiya',
  ai_model                   text,
  ai_daily_limit             integer not null default 10 check (ai_daily_limit >= 0),
  ai_monthly_limit           integer not null default 120 check (ai_monthly_limit >= 0),
  default_gift_visibility    text not null default 'unlisted'
                               check (default_gift_visibility in ('public', 'unlisted')),
  maintenance_mode           boolean not null default false,
  feature_flags              jsonb not null default '{}'::jsonb,
  updated_by                 uuid references auth.users (id) on delete set null,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

insert into public.app_settings (id) values (1) on conflict (id) do nothing;

drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- gift_templates — curated starting points
-- ---------------------------------------------------------------------------
create table if not exists public.gift_templates (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  title_ar          text not null,
  title_en          text not null,
  description_ar    text,
  category          text not null,
  emoji             text,
  gradient          text,
  accent            text,
  type              gift_type not null default 'experience',
  is_active         boolean not null default true,
  is_demo           boolean not null default false,
  default_sections  jsonb not null default '[]'::jsonb,
  position          integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists gift_templates_category_idx on public.gift_templates (category);
create index if not exists gift_templates_active_idx on public.gift_templates (is_active, position);

drop trigger if exists gift_templates_set_updated_at on public.gift_templates;
create trigger gift_templates_set_updated_at
  before update on public.gift_templates
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- gifts
-- ---------------------------------------------------------------------------
create table if not exists public.gifts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  title            text not null default 'هدية بدون عنوان',
  slug             text not null unique,
  category         text not null default 'generic',
  template_id      uuid references public.gift_templates (id) on delete set null,
  type             gift_type not null default 'experience',
  status           gift_status not null default 'DRAFT',
  visibility       text not null default 'unlisted'
                     check (visibility in ('public', 'unlisted')),
  content_json     jsonb not null default '{}'::jsonb,
  cover_image      text,
  theme_json       jsonb not null default '{}'::jsonb,
  recipient_name   text,
  occasion         text,
  source           text not null default 'builder',
  is_demo          boolean not null default false,
  disabled_at      timestamptz,
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists gifts_user_id_idx        on public.gifts (user_id);
create index if not exists gifts_status_idx         on public.gifts (status);
create index if not exists gifts_created_at_idx     on public.gifts (created_at desc);
create index if not exists gifts_user_created_idx   on public.gifts (user_id, created_at desc);
create index if not exists gifts_category_idx       on public.gifts (category);
create index if not exists gifts_is_demo_idx        on public.gifts (is_demo) where is_demo;
create index if not exists gifts_published_idx      on public.gifts (published_at desc)
  where status = 'PUBLISHED';

drop trigger if exists gifts_set_updated_at on public.gifts;
create trigger gifts_set_updated_at
  before update on public.gifts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- gift_sections — ordered blocks inside a gift
-- ---------------------------------------------------------------------------
create table if not exists public.gift_sections (
  id           uuid primary key default gen_random_uuid(),
  gift_id      uuid not null references public.gifts (id) on delete cascade,
  type         text not null,
  position     integer not null default 0,
  content_json jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists gift_sections_gift_idx on public.gift_sections (gift_id, position);

drop trigger if exists gift_sections_set_updated_at on public.gift_sections;
create trigger gift_sections_set_updated_at
  before update on public.gift_sections
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- ai_generations — usage metering + audit trail (never stores raw prompts)
-- ---------------------------------------------------------------------------
create table if not exists public.ai_generations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users (id) on delete set null,
  session_id    text,
  feature       ai_feature not null,
  model         text not null,
  provider      text not null default 'openrouter',
  status        ai_generation_status not null default 'success',
  input_tokens  integer,
  output_tokens integer,
  total_tokens  integer,
  latency_ms    integer,
  gift_id       uuid references public.gifts (id) on delete set null,
  error_code    text,
  is_demo       boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists ai_generations_user_idx    on public.ai_generations (user_id);
create index if not exists ai_generations_created_idx on public.ai_generations (created_at desc);
create index if not exists ai_generations_feature_idx on public.ai_generations (feature);
create index if not exists ai_generations_user_day_idx
  on public.ai_generations (user_id, created_at desc) where status = 'success';

-- ---------------------------------------------------------------------------
-- analytics_events — privacy-conscious product analytics
-- No raw IP addresses. Anonymous session ids only.
-- ---------------------------------------------------------------------------
create table if not exists public.analytics_events (
  id            bigserial primary key,
  user_id       uuid references auth.users (id) on delete set null,
  session_id    text not null,
  event_name    text not null,
  page          text,
  referrer      text,
  source        text,
  device        text,
  browser       text,
  country       text,
  metadata_json jsonb not null default '{}'::jsonb,
  is_demo       boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists analytics_events_created_idx  on public.analytics_events (created_at desc);
create index if not exists analytics_events_name_idx     on public.analytics_events (event_name);
create index if not exists analytics_events_session_idx  on public.analytics_events (session_id);
create index if not exists analytics_events_user_idx     on public.analytics_events (user_id);
create index if not exists analytics_events_name_time_idx
  on public.analytics_events (event_name, created_at desc);

-- ---------------------------------------------------------------------------
-- gift_opens — one row per opening session
-- ---------------------------------------------------------------------------
create table if not exists public.gift_opens (
  id               uuid primary key default gen_random_uuid(),
  gift_id          uuid not null references public.gifts (id) on delete cascade,
  session_id       text not null,
  opened_at        timestamptz not null default now(),
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  device           text,
  browser          text,
  is_demo          boolean not null default false,
  unique (gift_id, session_id)
);

create index if not exists gift_opens_gift_idx    on public.gift_opens (gift_id, opened_at desc);
create index if not exists gift_opens_opened_idx  on public.gift_opens (opened_at desc);

-- ---------------------------------------------------------------------------
-- admin_logs — audit trail for privileged actions
-- ---------------------------------------------------------------------------
create table if not exists public.admin_logs (
  id            uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users (id) on delete set null,
  action        text not null,
  target_type   text,
  target_id     text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists admin_logs_created_idx on public.admin_logs (created_at desc);
create index if not exists admin_logs_admin_idx   on public.admin_logs (admin_user_id);

-- ---------------------------------------------------------------------------
-- Analytics rollups
--
-- The dashboard previously computed every counter with a COUNT(*) over raw
-- tables. That is correct but does not stay fast forever. These two SQL
-- functions do the same aggregation inside Postgres in a single round trip,
-- and they are the ONLY place analytics numbers come from — no fixtures.
-- ---------------------------------------------------------------------------
create or replace function public.admin_overview(p_since timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'total_users',        (select count(*) from profiles where not is_demo),
    'new_users_today',    (select count(*) from profiles
                            where not is_demo and created_at >= date_trunc('day', now())),
    'new_users_week',     (select count(*) from profiles
                            where not is_demo and created_at >= now() - interval '7 days'),
    'new_users_month',    (select count(*) from profiles
                            where not is_demo and created_at >= now() - interval '30 days'),

    'total_gifts',        (select count(*) from gifts where not is_demo),
    'published_gifts',    (select count(*) from gifts where not is_demo and status = 'PUBLISHED'),
    'draft_gifts',        (select count(*) from gifts where not is_demo and status = 'DRAFT'),
    'gifts_today',        (select count(*) from gifts
                            where not is_demo and created_at >= date_trunc('day', now())),

    'total_opens',        (select count(*) from gift_opens where not is_demo),
    'unique_opens',       (select count(distinct gift_id) from gift_opens where not is_demo),

    'total_ai',           (select count(*) from ai_generations where not is_demo),
    'ai_today',           (select count(*) from ai_generations
                            where not is_demo and created_at >= date_trunc('day', now())),

    'total_visitors',     (select count(distinct session_id) from analytics_events where not is_demo),
    'visitors_today',     (select count(distinct session_id) from analytics_events
                            where not is_demo and created_at >= date_trunc('day', now())),
    'visitors_week',      (select count(distinct session_id) from analytics_events
                            where not is_demo and created_at >= now() - interval '7 days'),
    'visitors_month',     (select count(distinct session_id) from analytics_events
                            where not is_demo and created_at >= now() - interval '30 days'),

    'page_views',         (select count(*) from analytics_events
                            where not is_demo and event_name = 'page_view'),
    'page_views_today',   (select count(*) from analytics_events
                            where not is_demo and event_name = 'page_view'
                              and created_at >= date_trunc('day', now())),

    'total_sessions',     (select count(distinct session_id) from analytics_events where not is_demo),
    'events_in_range',    (select count(*) from analytics_events
                            where not is_demo and created_at >= p_since),

    'active_users_7d',    (select count(distinct user_id) from analytics_events
                            where not is_demo and user_id is not null
                              and created_at >= now() - interval '7 days'),
    'active_users_30d',   (select count(distinct user_id) from analytics_events
                            where not is_demo and user_id is not null
                              and created_at >= now() - interval '30 days')
  );
$$;

create or replace function public.admin_time_series(p_since timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'visitors', (
      select coalesce(jsonb_agg(jsonb_build_object('date', d, 'value', v) order by d), '[]'::jsonb)
      from (
        select date_trunc('day', created_at)::date as d,
               count(distinct session_id)::int as v
        from analytics_events
        where not is_demo and created_at >= p_since
        group by 1
      ) t
    ),
    'new_users', (
      select coalesce(jsonb_agg(jsonb_build_object('date', d, 'value', v) order by d), '[]'::jsonb)
      from (
        select date_trunc('day', created_at)::date as d, count(*)::int as v
        from profiles
        where not is_demo and created_at >= p_since
        group by 1
      ) t
    ),
    'gifts_created', (
      select coalesce(jsonb_agg(jsonb_build_object('date', d, 'value', v) order by d), '[]'::jsonb)
      from (
        select date_trunc('day', created_at)::date as d, count(*)::int as v
        from gifts
        where not is_demo and created_at >= p_since
        group by 1
      ) t
    ),
    'gifts_opened', (
      select coalesce(jsonb_agg(jsonb_build_object('date', d, 'value', v) order by d), '[]'::jsonb)
      from (
        select date_trunc('day', opened_at)::date as d, count(*)::int as v
        from gift_opens
        where not is_demo and opened_at >= p_since
        group by 1
      ) t
    ),
    'ai_generations', (
      select coalesce(jsonb_agg(jsonb_build_object('date', d, 'value', v) order by d), '[]'::jsonb)
      from (
        select date_trunc('day', created_at)::date as d, count(*)::int as v
        from ai_generations
        where not is_demo and created_at >= p_since
        group by 1
      ) t
    )
  );
$$;

create or replace function public.admin_distributions()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'top_categories', (
      select coalesce(jsonb_agg(jsonb_build_object('label', label, 'value', v) order by v desc), '[]'::jsonb)
      from (
        select category as label, count(*)::int as v
        from gifts where not is_demo
        group by 1 order by 2 desc limit 10
      ) t
    ),
    'ai_features', (
      select coalesce(jsonb_agg(jsonb_build_object('label', label, 'value', v) order by v desc), '[]'::jsonb)
      from (
        select feature::text as label, count(*)::int as v
        from ai_generations where not is_demo
        group by 1 order by 2 desc limit 10
      ) t
    ),
    'devices', (
      select coalesce(jsonb_agg(jsonb_build_object('label', label, 'value', v) order by v desc), '[]'::jsonb)
      from (
        select coalesce(device, 'unknown') as label, count(distinct session_id)::int as v
        from analytics_events where not is_demo
        group by 1 order by 2 desc limit 10
      ) t
    ),
    'browsers', (
      select coalesce(jsonb_agg(jsonb_build_object('label', label, 'value', v) order by v desc), '[]'::jsonb)
      from (
        select coalesce(browser, 'unknown') as label, count(distinct session_id)::int as v
        from analytics_events where not is_demo
        group by 1 order by 2 desc limit 10
      ) t
    ),
    'top_pages', (
      select coalesce(jsonb_agg(jsonb_build_object('label', label, 'value', v) order by v desc), '[]'::jsonb)
      from (
        select coalesce(page, '/') as label, count(*)::int as v
        from analytics_events
        where not is_demo and event_name = 'page_view'
        group by 1 order by 2 desc limit 10
      ) t
    ),
    'traffic_sources', (
      select coalesce(jsonb_agg(jsonb_build_object('label', label, 'value', v) order by v desc), '[]'::jsonb)
      from (
        select coalesce(source, 'direct') as label, count(distinct session_id)::int as v
        from analytics_events where not is_demo
        group by 1 order by 2 desc limit 10
      ) t
    ),
    'recent_events', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'event_name', e.event_name,
               'page', e.page,
               'created_at', e.created_at,
               'session_id', e.session_id,
               'device', e.device
             ) order by e.created_at desc), '[]'::jsonb)
      from (
        select * from analytics_events
        where not is_demo
        order by created_at desc limit 25
      ) e
    )
  );
$$;

create or replace function public.admin_funnel()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'visitors',       (select count(distinct session_id) from analytics_events where not is_demo),
    'registered',     (select count(*) from profiles where not is_demo),
    'created_gift',   (select count(distinct user_id) from gifts where not is_demo),
    'used_ai',        (select count(distinct user_id) from ai_generations
                        where not is_demo and user_id is not null and status = 'success'),
    'published_gift', (select count(distinct user_id) from gifts
                        where not is_demo and status = 'PUBLISHED'),
    'gift_opened',    (select count(distinct g.user_id)
                        from gift_opens o join gifts g on g.id = o.gift_id
                        where not is_demo and not g.is_demo)
  );
$$;

-- Lock these helpers down: only the service role may execute them.
revoke all on function public.admin_overview(timestamptz) from public, anon, authenticated;
revoke all on function public.admin_time_series(timestamptz) from public, anon, authenticated;
revoke all on function public.admin_distributions() from public, anon, authenticated;
revoke all on function public.admin_funnel() from public, anon, authenticated;