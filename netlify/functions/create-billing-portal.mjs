import Stripe from "stripe";
import {
  findSubscriptionByUserId,
  getAuthenticatedUser,
  jsonResponse,
  requireEnv,
} from "./_shared/subscriptions.mjs";

export default async (request) => {
  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  try {
    const authorization = request.headers.get("authorization") || "";
    const accessToken = authorization.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : "";
    if (!accessToken) {
      return jsonResponse(401, { error: "Sign in before managing your subscription." });
    }

    const user = await getAuthenticatedUser(accessToken);
    if (!user?.id) {
      return jsonResponse(401, { error: "Your session could not be verified." });
    }

    const subscription = await findSubscriptionByUserId(user.id);
    if (!subscription?.stripe_customer_id) {
      return jsonResponse(404, {
        error: "No Stripe billing profile is connected to this account.",
      });
    }

    const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
    const appUrl = requireEnv("APP_URL").replace(/\/$/, "");
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${appUrl}/?billing=return`,
    });

    return jsonResponse(200, { url: portalSession.url });
  } catch (error) {
    console.error("Unable to create Stripe billing portal session:", error);
    return jsonResponse(500, {
      error: "Unable to open subscription management. Please try again.",
    });
  }
};

export const config = { path: "/api/create-billing-portal" };
