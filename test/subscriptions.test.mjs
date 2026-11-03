import test from "node:test";
import assert from "node:assert/strict";
import {
  entitlementWriteShouldReplace,
  isPremiumSubscription,
  nativeCorsHeaders,
  stripeSubscriptionPeriodEnd,
  stripeSubscriptionToCancel,
  subscriptionRecordFromGooglePlay,
  subscriptionRecordFromStripe,
} from "../netlify/functions/_shared/subscriptions.mjs";

const now = new Date("2026-07-16T12:00:00.000Z");

test("active Stripe subscription with a future period grants Premium", () => {
  assert.equal(isPremiumSubscription({
    provider: "stripe",
    status: "active",
    is_premium: true,
    current_period_end: "2026-08-16T12:00:00.000Z",
  }, now), true);
});

test("trialing Stripe subscription with a future trial boundary grants Premium", () => {
  assert.equal(isPremiumSubscription({
    provider: "stripe",
    status: "trialing",
    is_premium: true,
    current_period_end: "2026-07-30T12:00:00.000Z",
  }, now), true);
});

test("expired, canceled, malformed, and boundary-less Stripe rows fail closed", () => {
  const base = { provider: "stripe", is_premium: true };
  assert.equal(isPremiumSubscription({ ...base, status: "active" }, now), false);
  assert.equal(isPremiumSubscription({ ...base, status: "active", current_period_end: "bad" }, now), false);
  assert.equal(isPremiumSubscription({ ...base, status: "active", current_period_end: now.toISOString() }, now), false);
  assert.equal(isPremiumSubscription({ ...base, status: "canceled", current_period_end: "2026-08-16T12:00:00.000Z" }, now), false);
});

test("manual Premium access may omit a billing period", () => {
  assert.equal(isPremiumSubscription({ provider: "manual", status: "active", is_premium: true }, now), true);
});

test("Google Play rows use the same Premium gate and require a future period", () => {
  const record = subscriptionRecordFromGooglePlay({
    userId: "4f5d0c8a-3d2b-4c6e-8f10-123456789abc",
    productId: "premium_monthly",
    transactionId: "gpa.1234",
    status: "active",
    currentPeriodEnd: "2026-08-16T12:00:00.000Z",
    startedAt: "2026-07-16T12:00:00.000Z",
  });
  assert.equal(record.provider, "google_play");
  assert.equal(record.store_product_id, "premium_monthly");
  assert.equal("stripe_customer_id" in record, false);
  assert.equal(isPremiumSubscription(record, now), true);
  assert.equal(isPremiumSubscription({ ...record, current_period_end: null }, now), false);
  assert.equal(isPremiumSubscription({ ...record, status: "canceled", is_premium: false }, now), false);
});

test("a future Play writer must not replace a live Stripe subscription", () => {
  const stripeRow = {
    user_id: "user-1",
    provider: "stripe",
    status: "active",
    is_premium: true,
    current_period_end: "2027-08-16T12:00:00.000Z",
  };
  const playRow = subscriptionRecordFromGooglePlay({
    userId: "user-1",
    productId: "premium_monthly",
    status: "active",
    currentPeriodEnd: "2026-08-16T12:00:00.000Z",
  });
  assert.equal(entitlementWriteShouldReplace(stripeRow, playRow), false);
  assert.equal(entitlementWriteShouldReplace(null, playRow), true);
  assert.equal(entitlementWriteShouldReplace({ ...stripeRow, user_id: "other" }, playRow), false);
});

test("account deletion cancels only a live Stripe subscription id", () => {
  assert.equal(stripeSubscriptionToCancel({
    provider: "stripe",
    status: "active",
    stripe_subscription_id: "sub_123",
  }), "sub_123");
  assert.equal(stripeSubscriptionToCancel({
    provider: "stripe",
    status: "trialing",
    stripe_subscription_id: "sub_trial",
  }), "sub_trial");
  assert.equal(stripeSubscriptionToCancel({
    provider: "stripe",
    status: "canceled",
    stripe_subscription_id: "sub_123",
  }), null);
  assert.equal(stripeSubscriptionToCancel({
    provider: "google_play",
    status: "active",
    stripe_subscription_id: "sub_123",
  }), null);
  assert.equal(stripeSubscriptionToCancel(null), null);
});

test("native app origins are the only account-access CORS allowlist", () => {
  const request = (origin) => ({ headers: { get: () => origin } });
  assert.equal(nativeCorsHeaders(request("https://localhost"))["Access-Control-Allow-Origin"], "https://localhost");
  assert.equal(nativeCorsHeaders(request("capacitor://localhost"))["Access-Control-Allow-Origin"], "capacitor://localhost");
  assert.deepEqual(nativeCorsHeaders(request("https://www.coloroptics.co")), {});
  assert.deepEqual(nativeCorsHeaders(request("https://evil.example")), {});
});

test("subscription mapper supports item-level Stripe billing periods", () => {
  const subscription = {
    id: "sub_123",
    customer: "cus_123",
    status: "active",
    created: 1_752_668_800,
    items: {
      data: [{ price: { id: "price_123" }, current_period_end: 1_755_360_000 }],
    },
  };
  assert.equal(stripeSubscriptionPeriodEnd(subscription), 1_755_360_000);
  assert.deepEqual(subscriptionRecordFromStripe(subscription, "user_123"), {
    user_id: "user_123",
    provider: "stripe",
    status: "active",
    is_premium: true,
    stripe_customer_id: "cus_123",
    stripe_subscription_id: "sub_123",
    stripe_price_id: "price_123",
    started_at: "2025-07-16T12:26:40.000Z",
    current_period_end: "2025-08-16T16:00:00.000Z",
    canceled_at: null,
    trial_started_at: null,
    last_stripe_event_id: null,
    last_stripe_event_created_at: null,
  });
});
