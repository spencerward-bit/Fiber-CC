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
  return object?.metadata?.supabase_user_id || null;
}

async function upsertUserSubscription(userId, values) {
  const supabaseUrl = getEnvValue("SUPABASE_URL", DEFAULT_SUPABASE_URL);
  const serviceRoleKey = getEnvValue("SUPABASE_SERVICE_ROLE_KEY");

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/user_subscriptions?on_conflict=user_id`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify([
      {
        user_id: userId,
        ...values
      }
    ])
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase upsert failed: ${errorText}`);
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

async function handleSubscriptionUpdated(subscription) {
  const userId = getSupabaseUserIdFromObject(subscription);

  if (!userId) {
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

async function handleSubscriptionDeleted(subscription) {
  const userId = getSupabaseUserIdFromObject(subscription);

  if (!userId) {
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
        await handleSubscriptionUpdated(event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
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
