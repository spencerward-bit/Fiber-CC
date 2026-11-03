# Color Optics Subscription Setup

## Architecture

- Supabase Auth identifies the signed-in Color Optics user.
- Stripe Checkout creates or resumes the web subscription.
- Stripe webhooks are the source of truth for subscription status.
- Netlify Functions verify the user and update Supabase with the service-role key.
- The browser receives a minimal access response from `/api/account-access` and cannot write entitlement data.
- Stripe Billing Portal lets an active web subscriber manage billing without exposing Stripe secrets.

## Netlify environment variables

Add these through **Netlify > Site configuration > Environment variables**. Use the **Functions** scope when that option is available, and set the values for Production. Do not place live secrets in `netlify.toml` or commit them to Git.

| Variable | Required value |
| --- | --- |
| `APP_URL` | `https://www.coloroptics.co` |
| `STRIPE_SECRET_KEY` | Live Stripe secret key (`sk_live_...`) |
| `STRIPE_PRICE_ID` | Live monthly Premium price (`price_...`) |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the existing Color Optics webhook (`whsec_...`) |
| `STRIPE_TRIAL_DAYS` | `30` |
| `SUPABASE_URL` | Color Optics Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase public/anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key; Functions only |

After changing Netlify environment variables, a new production deploy is required before Functions receive the updated values.

## Supabase migration

Review and apply, in order:

1. `supabase/migrations/202607160001_production_subscriptions.sql`
2. `supabase/migrations/202611030001_play_entitlements_and_rls.sql`
3. `supabase/migrations/202611030002_tighten_user_settings_grants.sql`

The first migration:

- creates one canonical subscription row per user;
- stores Stripe customer, subscription, price, period, and event identifiers;
- creates an idempotent webhook-event ledger;
- removes browser write access to subscription entitlements;
- keeps all subscription writes restricted to trusted server code.

The second migration adds `store_product_id` and `store_transaction_id` for a future Play Billing writer and repeats the entitlement lockdown: no insert, update, or delete policy, and table privileges revoked from `public`, `anon`, and `authenticated`.

The third migration removes `TRUNCATE` (and other non-RLS privileges) from `user_settings`. It was applied on the live project as `tighten_user_settings_grants`. Signed-in users keep `select`, `insert`, and `update` for their own row. Account deletion still removes that row through the service-role function, not from the browser.

Applying the migrations is a separate production action and requires explicit approval.

## Stripe webhook

Keep the production endpoint at:

`https://www.coloroptics.co/api/stripe-webhook`

Subscribe it to:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

The endpoint verifies Stripe's signature against the raw request body, records event processing, ignores stale events, and updates Supabase from the current Stripe subscription object.

## Stripe Billing Portal

Enable and configure Stripe's customer portal in the live Stripe account. Premium web subscribers use `/api/create-billing-portal` to open a short-lived portal session. No secret or customer identifier is sent by the browser.

## Existing subscriber reconciliation

The reconciliation command is read-only unless both `--apply` and a matching `--confirm` value are present.

Dry run:

```powershell
$env:STRIPE_SECRET_KEY = "sk_live_..."
$env:STRIPE_PRICE_ID = "price_..."
$env:SUPABASE_URL = "https://your-project.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "..."
npm run subscriptions:reconcile -- --email=spencerward@obsidianbroadband.com
```

Approved write after reviewing the dry-run result:

```powershell
npm run subscriptions:reconcile -- --email=spencerward@obsidianbroadband.com --apply --confirm=spencerward@obsidianbroadband.com
```

Do not run the write form until the migration has been applied and the proposed subscriber match has been reviewed.

## Validation checklist

1. Run `npm test` locally.
2. Apply the reviewed Supabase migration.
3. Confirm all Netlify environment variables point to the same live Stripe and Supabase projects.
4. Deploy the approved branch to a non-production preview first.
5. Complete a Stripe test-mode checkout in a test environment.
6. Verify webhook deliveries return HTTP 200 and one canonical row appears in `user_subscriptions`.
7. Verify active and trialing accounts receive Premium, while canceled, unpaid, expired, and malformed records fail closed.
8. Reconcile the existing live subscriber only after the dry-run identity, price, status, and billing period are confirmed.

## Account deletion

`/api/delete-account` accepts a signed-in user's access token and `{ "confirm": "DELETE" }`. It uses the service-role key already configured for Functions. It cancels a cancelable Stripe subscription first, then deletes `user_settings`, `user_subscriptions`, linked `stripe_webhook_events`, and the Supabase auth user. The service-role key is not shipped in the app.

The public explanation page is `https://www.coloroptics.co/delete-account.html`.

## Android app and a future Play Billing writer

The Capacitor app calls `https://www.coloroptics.co/api/account-access` and `/api/delete-account`. Those two functions allow the native origins `https://localhost` and `capacitor://localhost`. Stripe Checkout and the billing portal are not offered inside the app and do not send that CORS header.

Add this Supabase Auth redirect URL before testing password reset or email confirmation inside the app:

`co.coloroptics.app://auth/callback`

A later Google Play Billing integration, including one fronted by RevenueCat, should write the same `user_subscriptions` row through the service role. Use `subscriptionRecordFromGooglePlay` in `netlify/functions/_shared/subscriptions.mjs` (`provider` `google_play`, plus `store_product_id`, `store_transaction_id`, `status`, and `current_period_end`). Do not let the client insert that row. `entitlementWriteShouldReplace` refuses to overwrite a Stripe subscription that is still Premium. Play Billing itself is not implemented.

## Mobile billing note

Stripe Checkout remains the web subscription path. The Android app hides that purchase UI. Play Billing can be added later against the same subscription table.
