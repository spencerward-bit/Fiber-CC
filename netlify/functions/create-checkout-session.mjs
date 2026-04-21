import Stripe from "stripe";

const DEFAULT_APP_URL = "https://www.coloroptics.co";
const DEFAULT_SUPABASE_URL = "https://xekhxxodxprripdahwdr.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6Inhla2h4eG9keHBycmlwZGFod2RyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MjMzOTgsImV4cCI6MjA5MTQ5OTM5OH0.buCrTi2vnG9JQYIwdtCA1jzs0wdocdT_ul4qLoPEoPQ";
const DEFAULT_STRIPE_PRICE_ID = "price_1TNDFsKBGIvdmveYrW8VIgR9";

function getEnvValue(name, fallback = "") {
  if (typeof Netlify !== "undefined" && Netlify.env) {
    return Netlify.env.get(name) || fallback;
  }

  return process.env[name] || fallback;
}

async function getAuthenticatedUser(accessToken) {
  const supabaseUrl = getEnvValue("SUPABASE_URL", DEFAULT_SUPABASE_URL);
  const supabaseAnonKey = getEnvValue("SUPABASE_ANON_KEY", DEFAULT_SUPABASE_ANON_KEY);

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseAnonKey
    }
  });

  if (!response.ok) {
    throw new Error("Unable to verify the signed-in user.");
  }

  return response.json();
}

export default async req => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed." }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const authorization = req.headers.get("authorization") || "";
    const accessToken = authorization.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : "";

    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Sign in before subscribing." }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const stripeSecretKey = getEnvValue("STRIPE_SECRET_KEY");
    const stripePriceId = getEnvValue("STRIPE_PRICE_ID", DEFAULT_STRIPE_PRICE_ID);
    const appUrl = getEnvValue("APP_URL", DEFAULT_APP_URL);

    if (!stripeSecretKey) {
      return new Response(JSON.stringify({ error: "Stripe is not configured on the server yet." }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const user = await getAuthenticatedUser(accessToken);

    if (!user?.id || !user?.email) {
      return new Response(JSON.stringify({ error: "Unable to match checkout to a signed-in account." }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const stripe = new Stripe(stripeSecretKey);
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email,
      payment_method_collection: "always",
      line_items: [
        {
          price: stripePriceId,
          quantity: 1
        }
      ],
      success_url: `${appUrl}/?checkout=success`,
      cancel_url: `${appUrl}/?checkout=cancel`,
      metadata: {
        supabase_user_id: user.id,
        supabase_user_email: user.email
      },
      subscription_data: {
        trial_period_days: 30,
        metadata: {
          supabase_user_id: user.id,
          supabase_user_email: user.email
        }
      },
      allow_promotion_codes: true
    });

    return new Response(JSON.stringify({ url: checkoutSession.url }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || "Unable to start Stripe checkout." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

export const config = {
  path: "/api/create-checkout-session"
};
