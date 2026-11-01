create table subscriptions (
  owner uuid primary key references auth.users on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  stripe_event_created bigint not null default 0,
  stripe_event_id text,
  updated_at timestamptz not null default now()
);

alter table subscriptions enable row level security;
create policy read_own_subscription on subscriptions
  for select using (owner = auth.uid());

create or replace function apply_stripe_subscription(
  p_owner uuid,
  p_customer_id text,
  p_subscription_id text,
  p_status text,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean,
  p_event_id text,
  p_event_created bigint
)
returns void
language sql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  insert into public.subscriptions as current_subscription(
    owner, stripe_customer_id, stripe_subscription_id, status,
    current_period_end, cancel_at_period_end, stripe_event_id,
    stripe_event_created, updated_at
  ) values (
    p_owner, p_customer_id, p_subscription_id, p_status,
    p_current_period_end, p_cancel_at_period_end, p_event_id,
    p_event_created, now()
  )
  on conflict (owner) do update set
    stripe_customer_id = excluded.stripe_customer_id,
    stripe_subscription_id = excluded.stripe_subscription_id,
    status = excluded.status,
    current_period_end = excluded.current_period_end,
    cancel_at_period_end = excluded.cancel_at_period_end,
    stripe_event_id = excluded.stripe_event_id,
    stripe_event_created = excluded.stripe_event_created,
    updated_at = now()
  where current_subscription.stripe_event_created <= excluded.stripe_event_created;
$$;

revoke all on function apply_stripe_subscription(uuid, text, text, text, timestamptz, boolean, text, bigint) from public, anon, authenticated;
grant execute on function apply_stripe_subscription(uuid, text, text, text, timestamptz, boolean, text, bigint) to service_role;

create table project_usage (
  owner uuid primary key references auth.users on delete cascade,
  project_count integer not null default 0 check (project_count >= 0)
);

insert into project_usage(owner, project_count)
select owner, count(*)::integer from projects group by owner
on conflict(owner) do update set project_count = excluded.project_count;

alter table project_usage enable row level security;
revoke all on project_usage from anon, authenticated;

create or replace function enforce_project_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  next_count integer;
begin
  if exists (select 1 from public.projects where id = new.id) then
    return new;
  end if;

  insert into public.project_usage as current_usage(owner, project_count)
  values (new.owner, 1)
  on conflict (owner) do update
    set project_count = current_usage.project_count + 1
  returning project_count into next_count;

  if next_count > 1 and not exists (
    select 1 from public.subscriptions
    where owner = new.owner and status in ('active', 'trialing')
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'free_plan_project_limit';
  end if;

  return new;
end;
$$;

create or replace function decrement_project_usage()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  update public.project_usage
  set project_count = greatest(project_count - 1, 0)
  where owner = old.owner;
  return old;
end;
$$;

create trigger projects_enforce_plan_limit
before insert on projects
for each row execute function enforce_project_plan_limit();

create trigger projects_decrement_usage
after delete on projects
for each row execute function decrement_project_usage();
