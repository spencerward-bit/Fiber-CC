import Stripe from "stripe";
import {
  assertUserId,
  findSubscriptionByUserId,
  getAuthenticatedUser,
  jsonResponse,
  nativeCorsHeaders,
  requireEnv,
  stripeSubscriptionToCancel,
  supabaseAdminRequest,
} from "./_shared/subscriptions.mjs";

function respond(request, statusCode, body) {
  return jsonResponse(statusCode, body, nativeCorsHeaders(request));
}

async function readConfirmation(request) {
  try {
    const body = await request.json();
    return body?.confirm === "DELETE";
  } catch {
    return false;
  }
}

async function cancelStripeSubscription(subscriptionId) {
  const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
  try {
    await stripe.subscriptions.cancel(subscriptionId);
  } catch (error) {
    if (error?.code === "resource_missing") return;
    throw error;
  }
}

async function deleteUserRows(userId) {
  const headers = { Prefer: "return=minimal" };
  try {
    await supabaseAdminRequest(`/rest/v1/stripe_webhook_events?user_id=eq.${userId}`, {
      method: "DELETE",
      headers,
    });
  } catch (error) {
    // The webhook ledger is created by the production subscription migration.
    // A missing table should not block deleting the account itself.
    if (!String(error?.message || "").includes("(404)")) throw error;
  }
  await supabaseAdminRequest(`/rest/v1/user_settings?user_id=eq.${userId}`, {
    method: "DELETE",
    headers,
  });
  await supabaseAdminRequest(`/rest/v1/user_subscriptions?user_id=eq.${userId}`, {
    method: "DELETE",
    headers,
  });
  await supabaseAdminRequest(`/auth/v1/admin/users/${userId}`, {
    method: "DELETE",
  });
}

export default async (request) => {
  if (request.method === "OPTIONS") {
    const cors = nativeCorsHeaders(request);
    if (!cors["Access-Control-Allow-Origin"]) {
      return jsonResponse(403, { error: "Origin not allowed." });
    }
    return new Response(null, { status: 204, headers: cors });
  }

  if (request.method !== "POST") {
    return respond(request, 405, { error: "Method not allowed." });
  }

  try {
    const confirmed = await readConfirmation(request);
    if (!confirmed) {
      return respond(request, 400, { error: "Type DELETE to confirm account deletion." });
    }

    const authorization = request.headers.get("authorization") || "";
    const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
    if (!accessToken) {
      return respond(request, 401, { error: "Sign in before deleting your account." });
    }

    const user = await getAuthenticatedUser(accessToken);
    const userId = user?.id ? assertUserId(user.id) : "";
    if (!userId) {
      return respond(request, 401, { error: "Your session could not be verified." });
    }

    const record = await findSubscriptionByUserId(userId);
    const stripeSubscriptionId = stripeSubscriptionToCancel(record);
    if (stripeSubscriptionId) {
      try {
        await cancelStripeSubscription(stripeSubscriptionId);
      } catch (error) {
        console.error("Unable to cancel subscription before account deletion:", error);
        return respond(request, 502, {
          error: "The active subscription could not be canceled, so the account was not deleted. Please try again.",
        });
      }
    }

    await deleteUserRows(userId);
    return respond(request, 200, {
      deleted: true,
      subscriptionCanceled: Boolean(stripeSubscriptionId),
    });
  } catch (error) {
    console.error("Unable to delete account:", error);
    return respond(request, 500, { error: "Account deletion could not be finished. Please try again." });
  }
};

export const config = { path: "/api/delete-account" };
