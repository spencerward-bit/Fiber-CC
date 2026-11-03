create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "Users can view their own settings"
on public.user_settings
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own settings"
on public.user_settings
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own settings"
on public.user_settings
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Entitlement rows are server-managed. A fresh database should also run
-- supabase/migrations so indexes, the webhook ledger, and triggers exist.
-- Authenticated users cannot insert, update, or delete these rows. Direct
-- selects are revoked as well; the app reads access through the
-- account-access function, which uses the service role.
create table if not exists public.user_subscriptions (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null default 'manual',
  status text not null default 'inactive',
  is_premium boolean not null default false,
  started_at timestamptz null,
  current_period_end timestamptz null,
  canceled_at timestamptz null,
  stripe_customer_id text null,
  stripe_subscription_id text null,
  stripe_price_id text null,
  trial_started_at timestamptz null,
  last_stripe_event_id text null,
  last_stripe_event_created_at timestamptz null,
  store_product_id text null,
  store_transaction_id text null
);

create unique index if not exists user_subscriptions_user_id_key
on public.user_subscriptions (user_id);

alter table public.user_subscriptions enable row level security;
alter table public.user_subscriptions force row level security;

drop policy if exists "Users can view their own subscription" on public.user_subscriptions;

revoke all on table public.user_subscriptions from public, anon, authenticated;
