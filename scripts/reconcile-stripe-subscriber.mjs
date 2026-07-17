import Stripe from "stripe";

const args = new Map(
  process.argv.slice(2).map((argument) => {
    const [key, ...value] = argument.split("=");
    return [key, value.join("=") || true];
  }),
);

const email = String(args.get("--email") || "").trim().toLowerCase();
const apply = args.has("--apply");
const confirmation = String(args.get("--confirm") || "").trim().toLowerCase();

if (!email) {
  throw new Error("Usage: npm run subscriptions:reconcile -- --email=user@example.com");
}
if (apply && confirmation !== email) {
  throw new Error("Writes require both --apply and --confirm=user@example.com.");
}

function requireEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function supabaseRequest(path, options = {}) {
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(`${requireEnv("SUPABASE_URL")}${path}`, {
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
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`Supabase request failed (${response.status}): ${text}`);
  }
  return data;
}

async function findAuthUserByEmail(targetEmail) {
  for (let page = 1; page <= 100; page += 1) {
    const result = await supabaseRequest(`/auth/v1/admin/users?page=${page}&per_page=100`);
    const users = Array.isArray(result) ? result : result?.users || [];
    const user = users.find((candidate) => String(candidate.email || "").toLowerCase() === targetEmail);
    if (user) return user;
    if (users.length < 100) return null;
  }
  return null;
}

function periodEnd(subscription) {
  const candidates = [
    subscription.current_period_end,
    ...(subscription.items?.data || []).map((item) => item.current_period_end),
  ].filter(Number.isFinite);
  return candidates.length ? Math.max(...candidates) : null;
}

function toIso(value) {
  return Number.isFinite(value) ? new Date(value * 1000).toISOString() : null;
}

function subscriptionRecord(subscription, userId) {
  const status = String(subscription.status || "inactive").toLowerCase();
  return {
    user_id: userId,
    provider: "stripe",
    status,
    is_premium: ["active", "trialing"].includes(status),
    stripe_customer_id: typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id || null,
    stripe_subscription_id: subscription.id,
    stripe_price_id: subscription.items?.data?.[0]?.price?.id || null,
    started_at: toIso(subscription.start_date || subscription.created),
    current_period_end: toIso(periodEnd(subscription)),
    canceled_at: toIso(subscription.canceled_at),
    trial_started_at: toIso(subscription.trial_start),
  };
}

const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
const expectedPriceId = requireEnv("STRIPE_PRICE_ID");
const authUser = await findAuthUserByEmail(email);
if (!authUser) throw new Error(`No Supabase authentication user exists for ${email}.`);

const customers = await stripe.customers.list({ email, limit: 100 });
const customersById = new Map(customers.data.map((customer) => [customer.id, customer]));
const candidates = [];
for (const customer of customers.data) {
  const subscriptions = await stripe.subscriptions.list({
    customer: customer.id,
    status: "all",
    limit: 100,
    expand: ["data.items.data.price"],
  });
  for (const subscription of subscriptions.data) {
    const hasExpectedPrice = subscription.items.data.some((item) => item.price?.id === expectedPriceId);
    if (hasExpectedPrice) candidates.push(subscription);
  }
}

const rank = { active: 3, trialing: 3, past_due: 2, unpaid: 1, paused: 1, canceled: 0 };
const premiumCandidates = candidates.filter((candidate) => ["active", "trialing"].includes(candidate.status));
if (premiumCandidates.length > 1) {
  throw new Error(
    `Multiple active or trialing Stripe subscriptions were found for ${email}. Resolve the duplicate subscriptions before reconciling.`,
  );
}

candidates.sort((left, right) => {
  const statusDifference = (rank[right.status] || 0) - (rank[left.status] || 0);
  return statusDifference || right.created - left.created;
});

const subscription = candidates[0];
if (!subscription) {
  throw new Error(`No Stripe subscription for price ${expectedPriceId} was found for ${email}.`);
}

const record = subscriptionRecord(subscription, authUser.id);
const matchedCustomer = customersById.get(record.stripe_customer_id);
const metadataUserId = String(matchedCustomer?.metadata?.supabase_user_id || "").trim();
if (metadataUserId && metadataUserId !== authUser.id) {
  throw new Error(
    `Stripe customer ${record.stripe_customer_id} is linked to a different Supabase user. No changes were made.`,
  );
}

const safeSummary = {
  mode: apply ? "apply" : "dry-run",
  email,
  supabase_user_id: authUser.id,
  stripe_customer_id: record.stripe_customer_id,
  stripe_subscription_id: record.stripe_subscription_id,
  stripe_price_id: record.stripe_price_id,
  status: record.status,
  is_premium: record.is_premium,
  current_period_end: record.current_period_end,
};

console.log(JSON.stringify(safeSummary, null, 2));

if (!apply) {
  console.log("Dry run only. No Supabase data was changed.");
  process.exit(0);
}

const rows = await supabaseRequest("/rest/v1/user_subscriptions?on_conflict=user_id", {
  method: "POST",
  headers: { Prefer: "resolution=merge-duplicates,return=representation" },
  body: record,
});
if (!Array.isArray(rows) || !rows[0]) {
  throw new Error("Supabase did not return the reconciled subscription row.");
}

console.log("Supabase subscription entitlement reconciled successfully.");
