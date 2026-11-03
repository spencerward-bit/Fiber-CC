begin;

alter table public.user_subscriptions
  add column if not exists provider text,
  add column if not exists status text,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_price_id text,
  add column if not exists trial_started_at timestamptz,
  add column if not exists last_stripe_event_id text,
  add column if not exists last_stripe_event_created_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

update public.user_subscriptions
set provider = 'manual'
where provider is null or btrim(provider) = '';

update public.user_subscriptions
set status = 'inactive'
where status is null or btrim(status) = '';

update public.user_subscriptions
set is_premium = false
where is_premium is null;

alter table public.user_subscriptions
  alter column provider set default 'manual',
  alter column provider set not null,
  alter column status set default 'inactive',
  alter column status set not null,
  alter column is_premium set default false,
  alter column is_premium set not null;

do $$
begin
  if exists (
    select 1
    from public.user_subscriptions
    group by user_id
    having count(*) > 1
  ) then
    raise exception 'Duplicate user_subscriptions rows must be resolved before applying this migration.';
  end if;
end
$$;

create unique index if not exists user_subscriptions_user_id_key
  on public.user_subscriptions (user_id);

create unique index if not exists user_subscriptions_stripe_customer_id_key
  on public.user_subscriptions (stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists user_subscriptions_stripe_subscription_id_key
  on public.user_subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;

create index if not exists user_subscriptions_provider_status_idx
  on public.user_subscriptions (provider, status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_subscriptions_updated_at on public.user_subscriptions;
create trigger set_user_subscriptions_updated_at
before update on public.user_subscriptions
for each row execute function public.set_updated_at();

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  stripe_created_at timestamptz not null,
  user_id uuid references auth.users (id) on delete set null,
  outcome text not null default 'processing',
  error_message text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stripe_webhook_events_user_id_idx
  on public.stripe_webhook_events (user_id, stripe_created_at desc);

drop trigger if exists set_stripe_webhook_events_updated_at on public.stripe_webhook_events;
create trigger set_stripe_webhook_events_updated_at
before update on public.stripe_webhook_events
for each row execute function public.set_updated_at();

alter table public.stripe_webhook_events enable row level security;

revoke all on table public.stripe_webhook_events from anon, authenticated;

-- Subscription entitlements are server-managed. Remove any legacy policies
-- that allowed a browser client to insert or update its own Premium flag.
alter table public.user_subscriptions enable row level security;
alter table public.user_subscriptions force row level security;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_subscriptions'
  loop
    execute format(
      'drop policy if exists %I on public.user_subscriptions',
      policy_record.policyname
    );
  end loop;
end
$$;

-- Authenticated and anonymous clients cannot insert, update, delete, or select
-- entitlement rows. The service role (Stripe webhook, account deletion, and a
-- future Play Billing writer) bypasses RLS. Do not add a write policy here.
revoke all on table public.user_subscriptions from public, anon, authenticated;

commit;
