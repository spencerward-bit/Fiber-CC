import {
  findSubscriptionByUserId,
  getAuthenticatedUser,
  isPremiumSubscription,
  jsonResponse,
  nativeCorsHeaders,
} from "./_shared/subscriptions.mjs";

function publicAccessRecord(record) {
  if (!isPremiumSubscription(record)) return null;
  return {
    tier: "premium",
    status: record.status,
    source: record.provider,
    current_period_end: record.current_period_end,
  };
}

function respond(request, statusCode, body) {
  return jsonResponse(statusCode, body, nativeCorsHeaders(request));
}

export default async (req) => {
  if (req.method === "OPTIONS") {
    const cors = nativeCorsHeaders(req);
    if (!cors["Access-Control-Allow-Origin"]) {
      return jsonResponse(403, { error: "Origin not allowed." });
    }
    return new Response(null, { status: 204, headers: cors });
  }

  if (req.method !== "GET") return respond(req, 405, { error: "Method not allowed." });

  try {
    const authorization = req.headers.get("authorization") || "";
    const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
    if (!accessToken) return respond(req, 401, { error: "Sign in before checking access." });

    const user = await getAuthenticatedUser(accessToken);
    if (!user?.id) return respond(req, 401, { error: "Your session could not be verified." });

    const record = await findSubscriptionByUserId(user.id);
    return respond(req, 200, { access: publicAccessRecord(record) });
  } catch (error) {
    console.error("Unable to load account access:", error);
    return respond(req, 500, { error: "Unable to check account access. Please try again." });
  }
};

export const config = { path: "/api/account-access" };
