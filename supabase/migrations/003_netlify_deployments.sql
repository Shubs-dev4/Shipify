create table public.project_deployments (
  project_id uuid primary key references public.projects(id) on delete cascade,
  owner uuid not null references auth.users(id) on delete cascade,
  netlify_site_id text not null unique,
  netlify_url text not null,
  store_slug text not null unique,
  custom_domain text unique,
  storefront_url text not null,
  deploy_id text,
  deploy_state text not null default 'created',
  updated_at timestamptz not null default now()
);

alter table public.project_deployments enable row level security;
revoke all on public.project_deployments from anon, authenticated;
grant all on public.project_deployments to service_role;

create table public.storefront_gateway (
  id boolean primary key default true check (id),
  netlify_site_id text unique,
  netlify_url text,
  status text not null default 'not_created'
    check (status in ('not_created', 'creating', 'ready', 'updating')),
  updated_at timestamptz not null default now()
);

insert into public.storefront_gateway(id) values (true);

alter table public.storefront_gateway enable row level security;
revoke all on public.storefront_gateway from anon, authenticated;
grant all on public.storefront_gateway to service_role;

create or replace function public.claim_storefront_gateway()
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  update public.storefront_gateway
  set status = 'creating', updated_at = now()
  where id = true
    and (status = 'not_created' or (status = 'creating' and updated_at < now() - interval '10 minutes'));
  return found;
end;
$$;

revoke all on function public.claim_storefront_gateway() from public, anon, authenticated;
grant execute on function public.claim_storefront_gateway() to service_role;

create or replace function public.claim_storefront_gateway_update()
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  update public.storefront_gateway
  set status = 'updating', updated_at = now()
  where id = true
    and (status = 'ready' or (status = 'updating' and updated_at < now() - interval '10 minutes'));
  return found;
end;
$$;

revoke all on function public.claim_storefront_gateway_update() from public, anon, authenticated;
grant execute on function public.claim_storefront_gateway_update() to service_role;

create table public.netlify_publish_limits (
  id boolean primary key default true check (id),
  minute_started_at timestamptz not null default now(),
  minute_count integer not null default 0 check (minute_count >= 0),
  day_started_at date not null default (now() at time zone 'utc')::date,
  day_count integer not null default 0 check (day_count >= 0)
);

insert into public.netlify_publish_limits(id) values (true);

alter table public.netlify_publish_limits enable row level security;
revoke all on public.netlify_publish_limits from anon, authenticated;
grant all on public.netlify_publish_limits to service_role;

create or replace function public.consume_netlify_publish_slot(p_count integer default 1)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  current_minute timestamptz := statement_timestamp();
  current_day date := (statement_timestamp() at time zone 'utc')::date;
  current_minute_count integer;
  current_day_count integer;
begin
  if p_count < 1 or p_count > 2 then
    raise exception 'Invalid publish slot count';
  end if;

  update public.netlify_publish_limits
  set minute_started_at = current_minute, minute_count = 0
  where id = true and minute_started_at <= current_minute - interval '1 minute';

  update public.netlify_publish_limits
  set day_started_at = current_day, day_count = 0
  where id = true and day_started_at < current_day;

  select minute_count, day_count
  into current_minute_count, current_day_count
  from public.netlify_publish_limits
  where id = true
  for update;

  if current_minute_count + p_count > 3 then
    return 'minute_limit';
  end if;
  if current_day_count + p_count > 100 then
    return 'daily_limit';
  end if;

  update public.netlify_publish_limits
  set minute_count = current_minute_count + p_count, day_count = current_day_count + p_count
  where id = true;

  return 'allowed';
end;
$$;

revoke all on function public.consume_netlify_publish_slot(integer) from public, anon, authenticated;
grant execute on function public.consume_netlify_publish_slot(integer) to service_role;
