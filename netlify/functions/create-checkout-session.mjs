import Stripe from "stripe";
import {
  findSubscriptionByUserId,
  getAuthenticatedUser,
  isPremiumSubscription,
  jsonResponse,
  optionalEnv,
  requireEnv,
  subscriptionRecordFromStripe,
  upsertSubscription,
} from "./_shared/subscriptions.mjs";

function customerIdFromRecord(record) {
  return record?.stripe_customer_id || null;
}

function subscriptionUsesPrice(subscription, priceId) {
  return subscription?.items?.data?.some((item) => item?.price?.id === priceId);
}

async function findStripeCustomers(stripe, user, record) {
  const customers = [];
  const savedCustomerId = customerIdFromRecord(record);

  if (savedCustomerId) {
    try {
      const savedCustomer = await stripe.customers.retrieve(savedCustomerId);
      if (!savedCustomer.deleted) customers.push(savedCustomer);
    } catch (error) {
      console.warn(`Unable to retrieve saved Stripe customer ${savedCustomerId}:`, error.message);
    }
  }

  const matches = await stripe.customers.list({ email: user.email, limit: 100 });
  for (const customer of matches.data) {
    if (!customers.some((candidate) => candidate.id === customer.id)) customers.push(customer);
  }

  return customers.sort((left, right) => {
    const leftMatches = left.metadata?.supabase_user_id === user.id ? 1 : 0;
    const rightMatches = right.metadata?.supabase_user_id === user.id ? 1 : 0;
    return rightMatches - leftMatches;
  });
}

async function inspectExistingSubscriptions(stripe, customers, priceId) {
  const subscriptions = [];
  for (const customer of customers) {
    const page = await stripe.subscriptions.list({ customer: customer.id, status: "all", limit: 100 });
    subscriptions.push(...page.data.filter((subscription) => subscriptionUsesPrice(subscription, priceId)));
  }

  subscriptions.sort((left, right) => (right.created || 0) - (left.created || 0));
  return {
    active: subscriptions.find((subscription) => ["active", "trialing"].includes(subscription.status)) || null,
    hasHistory: subscriptions.length > 0,
  };
}

export default async (req) => {
  if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed." });

  try {
    const authorization = req.headers.get("authorization") || "";
    const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
    if (!accessToken) return jsonResponse(401, { error: "Sign in before subscribing." });

    const user = await getAuthenticatedUser(accessToken);
    if (!user?.id || !user?.email) {
      return jsonResponse(401, { error: "Unable to match checkout to a signed-in account." });
    }

    const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
    const stripePriceId = requireEnv("STRIPE_PRICE_ID");
    const appUrl = requireEnv("APP_URL").replace(/\/$/, "");
    const trialDays = Math.max(0, Number.parseInt(optionalEnv("STRIPE_TRIAL_DAYS", "30"), 10) || 0);
    const record = await findSubscriptionByUserId(user.id);

    if (isPremiumSubscription(record)) {
      return jsonResponse(409, {
        code: "already_subscribed",
        error: "This account already has Premium access.",
      });
    }

    const customers = await findStripeCustomers(stripe, user, record);
    const existing = await inspectExistingSubscriptions(stripe, customers, stripePriceId);
    if (existing.active) {
      await upsertSubscription(subscriptionRecordFromStripe(existing.active, user.id));
      return jsonResponse(409, {
        code: "already_subscribed",
        accessUpdated: true,
        error: "Your existing Stripe subscription has been connected to this account.",
      });
    }

    const customer = customers[0] || null;
    if (customer && customer.metadata?.supabase_user_id !== user.id) {
      await stripe.customers.update(customer.id, {
        metadata: { ...customer.metadata, supabase_user_id: user.id },
      });
    }

    const subscriptionData = {
      metadata: { supabase_user_id: user.id, supabase_user_email: user.email },
    };
    if (!existing.hasHistory && trialDays > 0) subscriptionData.trial_period_days = trialDays;

    const checkoutOptions = {
      mode: "subscription",
      client_reference_id: user.id,
      payment_method_collection: "always",
      line_items: [{ price: stripePriceId, quantity: 1 }],
      success_url: `${appUrl}/?checkout=success`,
      cancel_url: `${appUrl}/?checkout=cancel`,
      metadata: { supabase_user_id: user.id, supabase_user_email: user.email },
      subscription_data: subscriptionData,
      allow_promotion_codes: true,
    };

    if (customer) checkoutOptions.customer = customer.id;
    else checkoutOptions.customer_email = user.email;

    const requestId = req.headers.get("x-checkout-request-id") || crypto.randomUUID();
    const checkoutSession = await stripe.checkout.sessions.create(checkoutOptions, {
      idempotencyKey: `color-optics-checkout-${user.id}-${requestId}`.slice(0, 255),
    });

    return jsonResponse(200, { url: checkoutSession.url });
  } catch (error) {
    console.error("Unable to create Stripe checkout:", error);
    return jsonResponse(500, { error: "Unable to start Stripe checkout. Please try again." });
  }
};

export const config = { path: "/api/create-checkout-session" };
