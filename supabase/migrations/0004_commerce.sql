-- ============================================================================
-- Hadiya (هدية) — 0004 commerce
-- Physical products, Stripe orders, free digital claims, chat log.
--
-- Design notes
--  * `products` unifies both commerce kinds: physical (Stripe Checkout) and
--    digital (free claim). `price_cents = 0` + `kind = 'digital'` is claimable.
--  * Money is stored as integer cents (`price_cents`, `amount_total`) — never
--    floats. Currency is an ISO code string; Hadiya defaults to USD because
--    Stripe has no Egyptian merchant accounts, and it is configurable per row.
--  * `orders.product_snapshot` freezes the product data at purchase time, so a
--    later price change or rename can never mutate a historical order.
--  * `claims` is visitor-scoped and idempotent: two unique indexes prevent a
--    session or an account from claiming the same free item twice.
--  * `stripe_events` makes webhook processing idempotent (Stripe retries).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type product_kind as enum ('physical', 'digital');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum ('pending', 'paid', 'failed', 'refunded', 'shipped');
exception when duplicate_object then null; end $$;

do $$ begin
  create type claim_item_type as enum ('product', 'gift');
exception when duplicate_object then null; end $$;

do $$ begin
  create type chat_role as enum ('user', 'assistant', 'system');
exception when duplicate_object then null; end $$;

-- The chatbot meters through ai_generations like every other AI capability.
-- Postgres 12+ allows ADD VALUE inside a transaction as long as the new value
-- is not used in the same transaction — this file never inserts 'chat' rows.
alter type ai_feature add value if not exists 'chat' after 'vibe';

-- ---------------------------------------------------------------------------
-- products — purchasable physical items + claimable digital items
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  kind              product_kind not null default 'digital',
  title_ar          text not null,
  title_en          text,
  description_ar    text,
  description_en    text,
  category          text not null default 'general',
  price_cents       integer not null default 0 check (price_cents >= 0),
  currency          text not null default 'usd' check (length(currency) = 3),
  images            text[] not null default '{}',
  -- Optional path to a .glb model under /public/models (3D product viewer).
  model_url         text,
  emoji             text,
  gradient          text,
  accent            text,
  -- null stock = unlimited (digital items). Physical items must be > 0.
  stock             integer check (stock is null or stock >= 0),
  max_per_user      integer not null default 1 check (max_per_user between 1 and 10),
  weight_grams      integer,
  shipping_note_ar  text,
  is_active         boolean not null default true,
  is_claimable      boolean not null default true,
  is_demo           boolean not null default false,
  position          integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
-- ---------------------------------------------------------------------------
-- orders — one row per Stripe Checkout session
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references auth.users (id) on delete set null,
  email                 citext,
  product_id            uuid not null references public.products (id) on delete restrict,
  product_snapshot      jsonb not null,
  quantity              integer not null default 1 check (quantity between 1 and 10),
  amount_total          integer not null check (amount_total >= 0),
  currency              text not null default 'usd' check (length(currency) = 3),
  status                order_status not null default 'pending',
  stripe_session_id     text unique,
  stripe_payment_intent text,
  stripe_event_id       text,
  shipping_address      jsonb,
  metadata_json         jsonb not null default '{}'::jsonb,
  is_demo               boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger trg_orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create index if not exists orders_status_idx on public.orders (status, created_at desc);
create index if not exists orders_user_idx on public.orders (user_id, created_at desc);
create index if not exists orders_created_idx on public.orders (created_at desc);

-- ---------------------------------------------------------------------------
-- claims — who claimed which free digital item (the claim log)
-- ---------------------------------------------------------------------------
create table if not exists public.claims (
  id              uuid primary key default gen_random_uuid(),
  item_type       claim_item_type not null,
  item_id         uuid not null,
  user_id         uuid references auth.users (id) on delete set null,
  email           citext,
  visitor_hash    text not null,
  claim_ip_hash   text,
  metadata_json   jsonb not null default '{}'::jsonb,
  is_demo         boolean not null default false,
  created_at      timestamptz not null default now()
);

-- One claim per visitor session per item, and one per account per item.
create unique index if not exists claims_visitor_unique
  on public.claims (item_type, item_id, visitor_hash);
create unique index if not exists claims_user_unique
  on public.claims (item_type, item_id, user_id) where user_id is not null;
create index if not exists claims_item_idx on public.claims (item_type, item_id, created_at desc);
create index if not exists claims_created_idx on public.claims (created_at desc);

-- ---------------------------------------------------------------------------
-- stripe_events — webhook idempotency ledger
-- ---------------------------------------------------------------------------
create table if not exists public.stripe_events (
  id           text primary key,
  type         text not null,
  payload      jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- chat_messages — persisted AI chatbot conversations
-- ---------------------------------------------------------------------------
create table if not exists public.chat_messages (
  id            uuid primary key default gen_random_uuid(),
  session_id    text not null,
  user_id       uuid references auth.users (id) on delete set null,
  role          chat_role not null,
  content       text not null,
  model         text,
  input_tokens  integer,
  output_tokens integer,
  is_demo       boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists chat_messages_session_idx on public.chat_messages (session_id, created_at);
create index if not exists chat_messages_created_idx on public.chat_messages (created_at desc);

-- ---------------------------------------------------------------------------
-- Tracking triggers — the database records commerce activity by itself
-- ---------------------------------------------------------------------------
-- When an order transitions to `paid` (the webhook's doing), decrement stock
-- and write a system audit row + an analytics event in the same statement.
create or replace function public.handle_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    update public.products
       set stock = greatest(coalesce(stock, 0) - new.quantity, 0)
     where id = new.product_id
       and stock is not null;

    insert into public.admin_logs (admin_user_id, action, target_type, target_id, metadata_json)
    values (null, 'order_paid', 'order', new.id,
            jsonb_build_object(
              'amount_total', new.amount_total,
              'currency', new.currency,
              'quantity', new.quantity,
              'product_id', new.product_id,
              'stripe_payment_intent', new.stripe_payment_intent));

    insert into public.analytics_events (session_id, event_name, metadata_json)
    values (coalesce((new.metadata_json ->> 'session_id'), 'system'), 'order_paid',
            jsonb_build_object('order_id', new.id, 'amount_total', new.amount_total));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orders_status on public.orders;
create trigger trg_orders_status after update on public.orders
  for each row execute function public.handle_order_status_change();

-- Every claim lands in the audit log + analytics automatically.
create or replace function public.handle_claim_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_logs (admin_user_id, action, target_type, target_id, metadata_json)
  values (null, 'claim_created', new.item_type::text, new.item_id,
          jsonb_build_object('claim_id', new.id, 'user_id', new.user_id));

  insert into public.analytics_events (session_id, event_name, metadata_json)
  values (coalesce((new.metadata_json ->> 'session_id'), 'system'), 'claim_created',
          jsonb_build_object('claim_id', new.id, 'item_type', new.item_type));
  return new;
end;
$$;

drop trigger if exists trg_claims_created on public.claims;
create trigger trg_claims_created after insert on public.claims
  for each row execute function public.handle_claim_created();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- Same threat model as 0002: a signed-in user sees their own rows; admins see
-- everything; anonymous visitors only see ACTIVE products. All writes go
-- through the server (service role / pg pool) which bypasses RLS, so NO
-- insert/update/delete policies are granted here.
alter table public.products      enable row level security;
alter table public.orders        enable row level security;
alter table public.claims        enable row level security;
alter table public.stripe_events enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products
  for select to anon, authenticated
  using (is_active = true);

drop policy if exists orders_owner_read on public.orders;
create policy orders_owner_read on public.orders
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists claims_owner_read on public.claims;
create policy claims_owner_read on public.claims
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- stripe_events / chat_messages have no policies at all: only the server
-- (service role) ever reads or writes them. Fail closed.

-- ---------------------------------------------------------------------------
-- Admin aggregate functions (SECURITY DEFINER, pinned search_path — the same
-- pattern as admin_overview in 0001). Demo rows are excluded everywhere so the
-- dashboard reports REAL commerce only.
-- ---------------------------------------------------------------------------
create or replace function public.admin_sales_overview(p_since timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'revenue_total', coalesce((select sum(amount_total) from public.orders
        where status in ('paid', 'shipped') and not is_demo), 0),
    'revenue_range', coalesce((select sum(amount_total) from public.orders
        where status in ('paid', 'shipped') and not is_demo
          and created_at >= coalesce(p_since, '-infinity'::timestamptz)), 0),
    'orders_total', (select count(*) from public.orders where not is_demo),
    'orders_paid', (select count(*) from public.orders
        where status in ('paid', 'shipped') and not is_demo),
    'orders_pending', (select count(*) from public.orders
        where status = 'pending' and not is_demo),
    'orders_range', (select count(*) from public.orders
        where not is_demo and created_at >= coalesce(p_since, '-infinity'::timestamptz)),
    'units_sold', coalesce((select sum(quantity) from public.orders
        where status in ('paid', 'shipped') and not is_demo), 0),
    'claims_total', (select count(*) from public.claims where not is_demo),
    'claims_range', (select count(*) from public.claims
        where not is_demo and created_at >= coalesce(p_since, '-infinity'::timestamptz)),
    'active_products', (select count(*) from public.products
        where is_active and not is_demo),
    'low_stock_products', (select count(*) from public.products
        where is_active and not is_demo and stock is not null and stock <= 3),
    -- Average order value over PAID orders. 0 when there are none.
    'avg_order_value', coalesce((
        select sum(amount_total)::float / nullif(count(*), 0)
        from public.orders
        where status in ('paid', 'shipped') and not is_demo), 0)
  );
$$;

create or replace function public.admin_sales_time_series(p_since timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with days as (
    select generate_series(
      date_trunc('day', coalesce(p_since, now() - interval '29 days')),
      date_trunc('day', now()),
      interval '1 day'
    ) as day
  )
  select jsonb_build_object(
    'revenue', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'date', to_char(d.day, 'YYYY-MM-DD'),
               'value', coalesce(o.revenue, 0)
             ) order by d.day), '[]'::jsonb)
      from days d
      left join (
        select date_trunc('day', created_at) as day, sum(amount_total) as revenue
        from public.orders
        where status in ('paid', 'shipped') and not is_demo
        group by 1
      ) o on o.day = d.day
    ),
    'orders', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'date', to_char(d.day, 'YYYY-MM-DD'),
               'value', coalesce(o.orders, 0)
             ) order by d.day), '[]'::jsonb)
      from days d
      left join (
        select date_trunc('day', created_at) as day, count(*) as orders
        from public.orders
        where not is_demo
        group by 1
      ) o on o.day = d.day
    ),
    'claims', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'date', to_char(d.day, 'YYYY-MM-DD'),
               'value', coalesce(c.claims, 0)
             ) order by d.day), '[]'::jsonb)
      from days d
      left join (
        select date_trunc('day', created_at) as day, count(*) as claims
        from public.claims
        where not is_demo
        group by 1
      ) c on c.day = d.day
    )
  );
$$;

create or replace function public.admin_orders(
  p_limit  integer default 50,
  p_offset integer default 0,
  p_status text default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'total', (
      select count(*) from public.orders
      where not is_demo
        and (p_status is null or status::text = p_status)
    ),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', o.id,
               'email', o.email,
               'status', o.status::text,
               'quantity', o.quantity,
               'amount_total', o.amount_total,
               'currency', o.currency,
               'product_title', coalesce(o.product_snapshot ->> 'title_ar', o.product_snapshot ->> 'title_en'),
               'product_kind', o.product_snapshot ->> 'kind',
               'stripe_session_id', o.stripe_session_id,
               'stripe_payment_intent', o.stripe_payment_intent,
               'created_at', o.created_at
             ) order by o.created_at desc)
      from public.orders o
      where not o.is_demo
        and (p_status is null or o.status::text = p_status)
      limit least(coalesce(p_limit, 50), 200)
      offset greatest(coalesce(p_offset, 0), 0)
    ), '[]'::jsonb)
  );
$$;

create or replace function public.admin_claims(
  p_limit  integer default 50,
  p_offset integer default 0
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'total', (select count(*) from public.claims where not is_demo),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', c.id,
               'item_type', c.item_type::text,
               'item_id', c.item_id,
               'email', c.email,
               'user_id', c.user_id,
               'created_at', c.created_at,
               -- Resolve the human-readable title for either item kind.
               'item_title', case
                 when c.item_type = 'product' then (
                   select coalesce(p.title_ar, p.title_en, p.slug)
                   from public.products p where p.id = c.item_id)
                 else (select coalesce(g.title, g.slug)
                       from public.gifts g where g.id = c.item_id)
               end
             ) order by c.created_at desc)
      from public.claims c
      where not c.is_demo
      limit least(coalesce(p_limit, 50), 200)
      offset greatest(coalesce(p_offset, 0), 0)
    ), '[]'::jsonb)
  );
$$;


);

create trigger trg_products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

create index if not exists products_active_idx on public.products (is_active, position);
create index if not exists products_kind_idx on public.products (kind) where is_active;
create index if not exists products_category_idx on public.products (category);
