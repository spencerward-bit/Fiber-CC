import Stripe from "stripe";

import {
  findAuthUserByEmail,
  findSubscriptionByStripeId,
  findSubscriptionByUserId,
  jsonResponse,
  requireEnv,
  subscriptionRecordFromStripe,
  supabaseAdminRequest,
  upsertSubscription,
} from "./_shared/subscriptions.mjs";

const HANDLED_EVENTS = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
]);

function objectId(value) {
  return typeof value === "string" ? value : value?.id || null;
}

async function readEventLedger(eventId) {
  const rows = await supabaseAdminRequest(
    `/rest/v1/stripe_webhook_events?event_id=eq.${encodeURIComponent(eventId)}&select=event_id,outcome,user_id&limit=1`,
  );
  return rows?.[0] || null;
}

async function writeEventLedger(event, outcome, userId = null, errorMessage = null) {
  await supabaseAdminRequest("/rest/v1/stripe_webhook_events?on_conflict=event_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: {
      event_id: event.id,
      event_type: event.type,
      stripe_created_at: new Date(event.created * 1000).toISOString(),
      ...(userId ? { user_id: userId } : {}),
      outcome,
      error_message: errorMessage,
      processed_at: new Date().toISOString(),
    },
  });
}

async function retrieveCustomer(stripe, customerId) {
  if (!customerId) return null;
  const customer = await stripe.customers.retrieve(customerId);
  return customer?.deleted ? null : customer;
}

async function resolveUserId(stripe, subscription, checkoutSession = null) {
  const metadataUserId =
    subscription?.metadata?.supabase_user_id ||
    checkoutSession?.metadata?.supabase_user_id ||
    checkoutSession?.client_reference_id;
  if (metadataUserId) return metadataUserId;

  const subscriptionId = objectId(subscription);
  if (subscriptionId) {
    const existingBySubscription = await findSubscriptionByStripeId(
      "stripe_subscription_id",
      subscriptionId,
    );
    if (existingBySubscription?.user_id) return existingBySubscription.user_id;
  }

  const customerId = objectId(subscription?.customer || checkoutSession?.customer);
  if (customerId) {
    const existingByCustomer = await findSubscriptionByStripeId("stripe_customer_id", customerId);
    if (existingByCustomer?.user_id) return existingByCustomer.user_id;

    const customer = await retrieveCustomer(stripe, customerId);
    if (customer?.metadata?.supabase_user_id) return customer.metadata.supabase_user_id;

    const email = customer?.email || checkoutSession?.customer_details?.email;
    if (email) {
      const authUser = await findAuthUserByEmail(email);
      if (authUser?.id) return authUser.id;
    }
  }

  const checkoutEmail = checkoutSession?.customer_details?.email || checkoutSession?.customer_email;
  if (checkoutEmail) {
    const authUser = await findAuthUserByEmail(checkoutEmail);
    if (authUser?.id) return authUser.id;
  }

  return null;
}

function subscriptionUsesConfiguredPrice(subscription, expectedPriceId) {
  return subscription?.items?.data?.some((item) => objectId(item.price) === expectedPriceId);
}

async function syncSubscription(stripe, event, subscription, checkoutSession = null) {
  const expectedPriceId = requireEnv("STRIPE_PRICE_ID");
  if (!subscriptionUsesConfiguredPrice(subscription, expectedPriceId)) {
    return { outcome: "ignored", userId: null };
  }

  const userId = await resolveUserId(stripe, subscription, checkoutSession);
  if (!userId) {
    throw new Error(`No Supabase user could be matched to Stripe subscription ${subscription.id}.`);
  }

  const existing = await findSubscriptionByUserId(userId);
  const priorCreatedAt = existing?.last_stripe_event_created_at
    ? Date.parse(existing.last_stripe_event_created_at)
    : 0;
  const incomingCreatedAt = event.created * 1000;
  if (priorCreatedAt > incomingCreatedAt) {
    return { outcome: "ignored", userId };
  }

  const record = subscriptionRecordFromStripe(subscription, userId, event);
  await upsertSubscription(record);
  return { outcome: "processed", userId };
}

async function retrieveInvoiceSubscription(stripe, invoice) {
  const subscriptionId = objectId(
    invoice.subscription || invoice.parent?.subscription_details?.subscription,
  );
  return subscriptionId ? stripe.subscriptions.retrieve(subscriptionId) : null;
}

async function processEvent(stripe, event) {
  if (!HANDLED_EVENTS.has(event.type)) return { outcome: "ignored", userId: null };

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const subscriptionId = objectId(session.subscription);
    if (!subscriptionId) return { outcome: "ignored", userId: null };
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return syncSubscription(stripe, event, subscription, session);
  }

  if (event.type.startsWith("customer.subscription.")) {
    const eventSubscription = event.data.object;
    let currentSubscription = eventSubscription;
    try {
      currentSubscription = await stripe.subscriptions.retrieve(eventSubscription.id);
    } catch (error) {
      // Deleted subscriptions normally remain retrievable. The signed event
      // object is still authoritative if Stripe no longer returns the record.
      console.warn(`Unable to retrieve Stripe subscription ${eventSubscription.id}:`, error.message);
    }
    return syncSubscription(stripe, event, currentSubscription);
  }

  const subscription = await retrieveInvoiceSubscription(stripe, event.data.object);
  if (!subscription) return { outcome: "ignored", userId: null };
  return syncSubscription(stripe, event, subscription);
}

export default async (request) => {
  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  let event;
  try {
    const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
    event = stripe.webhooks.constructEvent(
      await request.text(),
      request.headers.get("stripe-signature"),
      requireEnv("STRIPE_WEBHOOK_SECRET"),
    );

    const prior = await readEventLedger(event.id);
    if (prior && ["processed", "ignored"].includes(prior.outcome)) {
      return jsonResponse(200, { received: true, duplicate: true });
    }

    await writeEventLedger(event, "processing");
    const result = await processEvent(stripe, event);
    await writeEventLedger(event, result.outcome, result.userId);
    return jsonResponse(200, { received: true, outcome: result.outcome });
  } catch (error) {
    if (event) {
      try {
        const prior = await readEventLedger(event.id);
        await writeEventLedger(
          event,
          "failed",
          prior?.user_id || null,
          String(error?.message || error).slice(0, 1000),
        );
      } catch (ledgerError) {
        console.error("Unable to record Stripe webhook failure", ledgerError);
      }
    }
    console.error("Stripe webhook failed", error);
    return jsonResponse(400, { error: "Webhook processing failed." });
  }
};

export const config = { path: "/api/stripe-webhook" };
