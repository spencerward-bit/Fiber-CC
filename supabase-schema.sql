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

create table if not exists public.user_subscriptions (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users (id) on delete cascade,
  is_premium boolean not null default false,
  started_at timestamptz null,
  current_period_end timestamptz null,
  canceled_at timestamptz null
);

create unique index if not exists user_subscriptions_user_id_key
on public.user_subscriptions (user_id);

alter table public.user_subscriptions enable row level security;

create policy "Users can view their own subscription"
on public.user_subscriptions
for select
to authenticated
using (auth.uid() = user_id);
