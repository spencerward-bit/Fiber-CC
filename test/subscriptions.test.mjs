import test from "node:test";
import assert from "node:assert/strict";
import {
  isPremiumSubscription,
  stripeSubscriptionPeriodEnd,
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
