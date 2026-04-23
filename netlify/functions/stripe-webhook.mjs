import Stripe from "stripe";

const DEFAULT_SUPABASE_URL = "https://xekhxxodxprripdahwdr.supabase.co";

function getEnvValue(name, fallback = "") {
  if (typeof Netlify !== "undefined" && Netlify.env) {
    return Netlify.env.get(name) || fallback;
  }

  return process.env[name] || fallback;
}

function toIsoString(unixSeconds) {
  if (!unixSeconds) {
    return null;
  }

  return new Date(unixSeconds * 1000).toISOString();
}

function getSupabaseUserIdFromObject(object) {
  return object?.metadata?.supabase_user_id || object?.client_reference_id || null;
}

async function upsertUserSubscription(userId, values) {
  const supabaseUrl = getEnvValue("SUPABASE_URL", DEFAULT_SUPABASE_URL);
  const serviceRoleKey = getEnvValue("SUPABASE_SERVICE_ROLE_KEY");

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }

  const payload = {
    user_id: userId,
    updated_at: new Date().toISOString(),
    ...values
  };

  const updateResponse = await fetch(`${supabaseUrl}/rest/v1/user_subscriptions?user_id=eq.${encodeURIComponent(userId)}&select=id`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: "return=representation"
    },
    body: JSON.stringify(payload)
  });

  if (!updateResponse.ok) {
    const errorText = await updateResponse.text();
    throw new Error(`Supabase subscription update failed: ${errorText}`);
  }

  const updatedRows = await updateResponse.json();

  if (updatedRows.length > 0) {
    return;
  }

  const insertResponse = await fetch(`${supabaseUrl}/rest/v1/user_subscriptions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: "return=representation"
    },
    body: JSON.stringify(payload)
  });

  if (!insertResponse.ok) {
    const errorText = await insertResponse.text();
    throw new Error(`Supabase subscription insert failed: ${errorText}`);
  }
}

async function handleCheckoutCompleted(session) {
  const userId = getSupabaseUserIdFromObject(session);

  if (!userId) {
    return;
  }

  await upsertUserSubscription(userId, {
    is_premium: true,
    started_at: new Date().toISOString(),
    canceled_at: null
  });
}

async function getSupabaseUserIdFromSubscription(stripe, subscription) {
  const directUserId = getSupabaseUserIdFromObject(subscription);

  if (directUserId) {
    return directUserId;
  }

  try {
    const sessions = await stripe.checkout.sessions.list({
      subscription: subscription.id,
      limit: 1
    });

    return getSupabaseUserIdFromObject(sessions.data[0]);
  } catch (error) {
    console.error("Unable to resolve subscription checkout session:", error.message);
    return null;
  }
}

async function handleSubscriptionUpdated(stripe, subscription) {
  const userId = await getSupabaseUserIdFromSubscription(stripe, subscription);

  if (!userId) {
    console.error(`Missing Supabase user id for subscription ${subscription.id}.`);
    return;
  }

  const activeStatuses = new Set(["active", "trialing"]);
  const isPremium = activeStatuses.has(subscription.status);

  await upsertUserSubscription(userId, {
    is_premium: isPremium,
    started_at: toIsoString(subscription.start_date),
    current_period_end: toIsoString(subscription.current_period_end),
    canceled_at: subscription.canceled_at ? toIsoString(subscription.canceled_at) : null
  });
}

async function handleSubscriptionDeleted(stripe, subscription) {
  const userId = await getSupabaseUserIdFromSubscription(stripe, subscription);

  if (!userId) {
    console.error(`Missing Supabase user id for deleted subscription ${subscription.id}.`);
    return;
  }

  await upsertUserSubscription(userId, {
    is_premium: false,
    started_at: toIsoString(subscription.start_date),
    current_period_end: toIsoString(subscription.current_period_end),
    canceled_at: subscription.canceled_at ? toIsoString(subscription.canceled_at) : new Date().toISOString()
  });
}

async function handleInvoicePaymentFailed(invoice) {
  const userId = getSupabaseUserIdFromObject(invoice.parent?.subscription_details) || getSupabaseUserIdFromObject(invoice.subscription_details);

  if (!userId) {
    return;
  }

  await upsertUserSubscription(userId, {
    is_premium: false,
    canceled_at: new Date().toISOString()
  });
}

export default async req => {
  if (req.method !== "POST") {
    return new Response("Method not allowed.", { status: 405 });
  }

  try {
    const stripeSecretKey = getEnvValue("STRIPE_SECRET_KEY");
    const webhookSecret = getEnvValue("STRIPE_WEBHOOK_SECRET");

    if (!stripeSecretKey || !webhookSecret) {
      return new Response("Stripe webhook is not configured.", { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey);
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    if (!signature) {
      return new Response("Missing Stripe signature.", { status: 400 });
    }

    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(stripe, event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(stripe, event.data.object);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object);
        break;
      default:
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(`Webhook error: ${error.message || "Unknown error"}`, { status: 400 });
  }
};

export const config = {
  path: "/api/stripe-webhook"
};
