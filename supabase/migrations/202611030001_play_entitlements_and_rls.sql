begin;

-- Columns a future Google Play Billing writer (for example RevenueCat) can fill
-- without reusing Stripe customer or subscription ids. The Android app does
-- not write these columns.
alter table public.user_subscriptions
  add column if not exists store_product_id text,
  add column if not exists store_transaction_id text;

create unique index if not exists user_subscriptions_store_transaction_id_key
  on public.user_subscriptions (store_transaction_id)
  where store_transaction_id is not null;

alter table public.user_subscriptions enable row level security;
alter table public.user_subscriptions force row level security;

-- RLS finding, reaffirmed for production:
-- users must not insert, update, or delete their own user_subscriptions rows.
-- Direct selects are also revoked so Stripe customer ids are not readable
-- with the anon key. The app reads access through /api/account-access, which
-- uses the service role. Only the service role should write entitlements
-- (Stripe webhook, account deletion, and a future Play Billing writer).
drop policy if exists "Users can view their own subscription" on public.user_subscriptions;

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

revoke all on table public.user_subscriptions from public, anon, authenticated;

alter table public.stripe_webhook_events enable row level security;
alter table public.stripe_webhook_events force row level security;
revoke all on table public.stripe_webhook_events from public, anon, authenticated;

commit;
