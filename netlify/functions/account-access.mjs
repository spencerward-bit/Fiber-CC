import {
  findSubscriptionByUserId,
  getAuthenticatedUser,
  isPremiumSubscription,
  jsonResponse,
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

export default async (req) => {
  if (req.method !== "GET") return jsonResponse(405, { error: "Method not allowed." });

  try {
    const authorization = req.headers.get("authorization") || "";
    const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
    if (!accessToken) return jsonResponse(401, { error: "Sign in before checking access." });

    const user = await getAuthenticatedUser(accessToken);
    if (!user?.id) return jsonResponse(401, { error: "Your session could not be verified." });

    const record = await findSubscriptionByUserId(user.id);
    return jsonResponse(200, { access: publicAccessRecord(record) });
  } catch (error) {
    console.error("Unable to load account access:", error);
    return jsonResponse(500, { error: "Unable to check account access. Please try again." });
  }
};

export const config = { path: "/api/account-access" };
