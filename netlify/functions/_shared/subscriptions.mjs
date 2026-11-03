const ACTIVE_STATUSES = new Set(["active", "trialing"]);
const PERIOD_BOUND_PROVIDERS = new Set(["stripe", "google_play"]);
const STRIPE_CANCELABLE_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "paused",
  "incomplete",
]);
const NATIVE_APP_ORIGINS = new Set([
  "https://localhost",
  "capacitor://localhost",
]);
const USER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const GOOGLE_PLAY_PROVIDER = "google_play";

export function requireEnv(name) {
  const netlifyValue = typeof Netlify !== "undefined" && Netlify.env
    ? Netlify.env.get(name)
    : "";
  const value = String(netlifyValue || process.env[name] || "").trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function optionalEnv(name, fallback = "") {
  const netlifyValue = typeof Netlify !== "undefined" && Netlify.env
    ? Netlify.env.get(name)
    : "";
  return String(netlifyValue || process.env[name] || fallback).trim();
}

export function jsonResponse(statusCode, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, private",
      ...extraHeaders,
    },
  });
}

export function bearerToken(headers = {}) {
  const authorization = headers.authorization || headers.Authorization || "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

export function isPremiumSubscription(record, now = new Date()) {
  if (!record || record.is_premium !== true) return false;
  const status = String(record.status || "").toLowerCase();
  if (!ACTIVE_STATUSES.has(status)) return false;

  // Stripe and future Google Play rows always have a billing or trial boundary.
  // Requiring it prevents a stale row from granting access forever if the
  // store notification stops arriving. Manual grants may omit a period end.
  const provider = String(record.provider || "").toLowerCase();
  if (PERIOD_BOUND_PROVIDERS.has(provider) && !record.current_period_end) {
    return false;
  }

  if (record.current_period_end) {
    const periodEnd = new Date(record.current_period_end);
    if (Number.isNaN(periodEnd.getTime()) || periodEnd <= now) return false;
  }

  return true;
}

export function stripeStatusGrantsPremium(status) {
  return ACTIVE_STATUSES.has(String(status || "").toLowerCase());
}

export function unixToIso(value) {
  if (!Number.isFinite(value)) return null;
  return new Date(value * 1000).toISOString();
}

export function stripeSubscriptionPeriodEnd(subscription) {
  const candidates = [
    subscription?.current_period_end,
    ...(subscription?.items?.data || []).map((item) => item?.current_period_end),
  ].filter(Number.isFinite);
  return candidates.length ? Math.max(...candidates) : null;
}

export async function supabaseAdminRequest(path, options = {}) {
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(`${supabaseUrl}${path}`, {
    method: options.method || "GET",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const detail = typeof data === "string" ? data : JSON.stringify(data);
    throw new Error(`Supabase request failed (${response.status}): ${detail}`);
  }

  return data;
}

export async function getAuthenticatedUser(accessToken) {
  if (!accessToken) return null;
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const anonKey = requireEnv("SUPABASE_ANON_KEY");
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return null;
  return response.json();
}

export async function findSubscriptionByUserId(userId) {
  const query = new URLSearchParams({ select: "*", user_id: `eq.${userId}`, limit: "1" });
  const rows = await supabaseAdminRequest(`/rest/v1/user_subscriptions?${query}`);
  return Array.isArray(rows) ? rows[0] || null : null;
}

export async function findSubscriptionByStripeId(field, value) {
  if (!value || !["stripe_customer_id", "stripe_subscription_id"].includes(field)) return null;
  const query = new URLSearchParams({ select: "*", [field]: `eq.${value}`, limit: "1" });
  const rows = await supabaseAdminRequest(`/rest/v1/user_subscriptions?${query}`);
  return Array.isArray(rows) ? rows[0] || null : null;
}

export async function findAuthUserByEmail(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return null;

  for (let page = 1; page <= 20; page += 1) {
    const response = await supabaseAdminRequest(`/auth/v1/admin/users?page=${page}&per_page=100`);
    const users = Array.isArray(response) ? response : response?.users || [];
    const match = users.find((user) => String(user.email || "").toLowerCase() === normalizedEmail);
    if (match) return match;
    if (users.length < 100) break;
  }
  return null;
}

export async function upsertSubscription(record) {
  const rows = await supabaseAdminRequest("/rest/v1/user_subscriptions?on_conflict=user_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: record,
  });
  return Array.isArray(rows) ? rows[0] || null : null;
}

export function subscriptionRecordFromStripe(subscription, userId, event = null) {
  const price = subscription?.items?.data?.[0]?.price;
  const status = String(subscription?.status || "inactive").toLowerCase();
  return {
    user_id: userId,
    provider: "stripe",
    status,
    is_premium: stripeStatusGrantsPremium(status),
    stripe_customer_id: typeof subscription?.customer === "string" ? subscription.customer : subscription?.customer?.id || null,
    stripe_subscription_id: subscription?.id || null,
    stripe_price_id: price?.id || null,
    started_at: unixToIso(subscription?.start_date || subscription?.created),
    current_period_end: unixToIso(stripeSubscriptionPeriodEnd(subscription)),
    canceled_at: unixToIso(subscription?.canceled_at),
    trial_started_at: unixToIso(subscription?.trial_start),
    last_stripe_event_id: event?.id || null,
    last_stripe_event_created_at: unixToIso(event?.created),
  };
}

/**
 * Row shape for a future Google Play Billing writer (for example a
 * RevenueCat webhook handled by a Netlify Function). The writer must use the
 * service role. The app must not insert this row itself.
 *
 * `provider` stays `google_play` even when RevenueCat delivers the event, so
 * entitlement checks do not grow a second store vocabulary. Stripe columns
 * are omitted on purpose: a merge update must not blank a web subscription
 * that entitlementWriteShouldReplace still needs to see.
 */
export function subscriptionRecordFromGooglePlay({
  userId,
  productId,
  transactionId = null,
  status,
  currentPeriodEnd,
  startedAt = null,
  canceledAt = null,
}) {
  if (!userId) throw new Error("A Google Play entitlement requires a user id.");
  if (!productId) throw new Error("A Google Play entitlement requires a product id.");
  const normalizedStatus = String(status || "inactive").toLowerCase();
  return {
    user_id: userId,
    provider: GOOGLE_PLAY_PROVIDER,
    status: normalizedStatus,
    is_premium: stripeStatusGrantsPremium(normalizedStatus),
    store_product_id: productId,
    store_transaction_id: transactionId,
    started_at: startedAt,
    current_period_end: currentPeriodEnd,
    canceled_at: canceledAt,
  };
}

/**
 * One subscription row exists per user. A future Play writer should refuse to
 * replace a Stripe subscription that is still Premium. Stripe webhooks keep
 * updating their own rows and do not call this helper.
 */
export function entitlementWriteShouldReplace(existing, incoming) {
  if (!existing) return true;
  if (!incoming?.user_id || incoming.user_id !== existing.user_id) return false;
  const incomingProvider = String(incoming.provider || "").toLowerCase();
  const existingProvider = String(existing.provider || "").toLowerCase();
  if (
    incomingProvider === GOOGLE_PLAY_PROVIDER
    && existingProvider === "stripe"
    && isPremiumSubscription(existing)
  ) {
    return false;
  }
  return true;
}

export function assertUserId(value) {
  const userId = String(value || "").trim();
  if (!USER_ID_PATTERN.test(userId)) {
    throw new Error("Invalid user id.");
  }
  return userId;
}

/** Active Stripe subscription id to cancel before the auth user is deleted. */
export function stripeSubscriptionToCancel(record) {
  if (!record) return null;
  if (String(record.provider || "stripe").toLowerCase() !== "stripe") return null;
  const subscriptionId = String(record.stripe_subscription_id || "").trim();
  if (!subscriptionId) return null;
  const status = String(record.status || "").toLowerCase();
  if (!STRIPE_CANCELABLE_STATUSES.has(status)) return null;
  return subscriptionId;
}

export function nativeCorsHeaders(request) {
  const origin = request?.headers?.get?.("origin") || "";
  if (!NATIVE_APP_ORIGINS.has(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Checkout-Request-Id",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    Vary: "Origin",
  };
}
