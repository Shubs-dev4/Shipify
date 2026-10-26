-- Users live in Supabase Auth (auth.users). Everything else below.
create extension if not exists pgcrypto;

create table projects (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null default 'Untitled',
  data jsonb not null,                       -- the builder's project object
  updated_at timestamptz not null default now()
);

create table sites (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  project_id uuid references projects on delete set null,
  site_key text not null unique default encode(gen_random_bytes(12), 'hex'),  -- public key
  domain text,                               -- e.g. mysite.pages.dev (null = don't check origin)
  created_at timestamptz not null default now()
);

create table events (
  id bigint generated always as identity primary key,
  site_id uuid not null references sites on delete cascade,
  ts timestamptz not null default now(),
  type text not null check (type in ('pageview','click','add_to_cart','checkout_started')),
  visitor_id text, session_id text,
  path text, referrer text, utm jsonb,
  device text, country text,
  props jsonb
);
create index events_site_ts on events (site_id, ts);
create index events_site_type_ts on events (site_id, type, ts);

create table products (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites on delete cascade,
  name text not null, price_cents int not null, stripe_price_id text
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites on delete cascade,
  stripe_session_id text not null unique,    -- makes webhook retries idempotent
  total_cents int not null, currency text not null default 'usd',
  status text not null default 'paid',
  created_at timestamptz not null default now()
);
create index orders_site_ts on orders (site_id, created_at);

create table order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references orders on delete cascade,
  product_name text not null, qty int not null, unit_cents int not null
);

-- Row-level security: owners see only their own data.
-- Writes to events/orders come from edge functions using the service role (bypasses RLS).
alter table projects enable row level security;
alter table sites enable row level security;
alter table events enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

create policy own_projects on projects for all using (owner = auth.uid()) with check (owner = auth.uid());
create policy own_sites on sites for all using (owner = auth.uid()) with check (owner = auth.uid());
create policy own_events on events for select using (site_id in (select id from sites where owner = auth.uid()));
create policy own_products on products for all
  using (site_id in (select id from sites where owner = auth.uid()))
  with check (site_id in (select id from sites where owner = auth.uid()));
create policy own_orders on orders for select using (site_id in (select id from sites where owner = auth.uid()));
create policy own_items on order_items for select
  using (order_id in (select o.id from orders o join sites s on s.id = o.site_id where s.owner = auth.uid()));

-- Dashboard aggregates in one call. SECURITY INVOKER, so RLS applies to the caller.
-- Revenue, AOV and top products come from ORDERS only (never from client events).
create or replace function site_stats(p_site uuid, p_from timestamptz, p_to timestamptz)
returns jsonb language sql stable security invoker as $$
  with e as (select * from events where site_id = p_site and ts >= p_from and ts < p_to),
       o as (select * from orders where site_id = p_site and status = 'paid' and created_at >= p_from and created_at < p_to)
  select jsonb_build_object(
    'visitors',  (select count(distinct visitor_id) from e where type = 'pageview'),
    'sessions',  (select count(distinct session_id) from e),
    'pageviews', (select count(*) from e where type = 'pageview'),
    'orders',    (select count(*) from o),
    'revenue_cents', (select coalesce(sum(total_cents), 0) from o),
    'funnel', jsonb_build_object(
      'visitors',  (select count(distinct session_id) from e where type = 'pageview'),
      'cart',      (select count(distinct session_id) from e where type = 'add_to_cart'),
      'checkout',  (select count(distinct session_id) from e where type = 'checkout_started'),
      'purchases', (select count(*) from o)),
    'top_pages', (select coalesce(jsonb_agg(t), '[]') from (
      select path, count(*) as views from e where type = 'pageview' group by 1 order by 2 desc limit 8) t),
    'top_products', (select coalesce(jsonb_agg(t), '[]') from (
      select oi.product_name as name, sum(oi.qty) as units, sum(oi.qty * oi.unit_cents) as revenue_cents
      from order_items oi join o on o.id = oi.order_id group by 1 order by 3 desc limit 8) t),
    'sources', (select coalesce(jsonb_agg(t), '[]') from (
      select coalesce(nullif(utm->>'source',''), nullif(referrer,''), 'Direct') as name, count(distinct session_id) as n
      from e where type = 'pageview' group by 1 order by 2 desc limit 8) t),
    'devices', (select coalesce(jsonb_agg(t), '[]') from (
      select coalesce(device,'unknown') as name, count(distinct session_id) as n
      from e where type = 'pageview' group by 1 order by 2 desc) t),
    'daily', (select coalesce(jsonb_agg(t order by t.d), '[]') from (
      select (ts at time zone 'utc')::date as d, count(*) as views, count(distinct visitor_id) as visitors
      from e where type = 'pageview' group by 1) t)
  );
$$;
