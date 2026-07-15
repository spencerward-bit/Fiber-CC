const DEFAULT_SUPABASE_URL = "https://xekhxxodxprripdahwdr.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhla2h4eG9keHBycmlwZGFod2RyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MjMzOTgsImV4cCI6MjA5MTQ5OTM5OH0.buCrTi2vnG9JQYIwdtCA1jzs0wdocdT_ul4qLoPEoPQ";

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

async function getSubscriptionAccess(userId) {
  const supabaseUrl = getEnvValue("SUPABASE_URL", DEFAULT_SUPABASE_URL);
  const serviceRoleKey = getEnvValue("SUPABASE_SERVICE_ROLE_KEY");

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/user_subscriptions?user_id=eq.${encodeURIComponent(userId)}&select=*&limit=25`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`
      }
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Unable to load subscription access: ${errorText}`);
  }

  const rows = await response.json();
  return pickBestAccessRecord(rows);
}

function getValueFromRecord(record, keys) {
  for (const key of keys) {
    if (record && record[key] !== undefined && record[key] !== null) {
      return record[key];
    }
  }

  return null;
}

function getAccessTimestamp(record, keys) {
  const value = getValueFromRecord(record, keys);

  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseAccessRecord(record) {
  if (!record) {
    return null;
  }

  const booleanPremium = getValueFromRecord(record, ["is_premium", "premium", "paid", "subscriber"]);
  const tierValue = getValueFromRecord(record, ["tier", "plan", "access_tier", "membership", "role"]);
  const statusValue = getValueFromRecord(record, ["status", "subscription_status", "state"]);
  const sourceValue = getValueFromRecord(record, ["source", "provider", "subscription_source"]);
  const currentPeriodEnd = getValueFromRecord(record, ["current_period_end", "period_end", "renews_at", "expires_at"]);

  const normalizedTier = typeof tierValue === "string" ? tierValue.trim().toLowerCase() : "";
  const normalizedStatus = typeof statusValue === "string" ? statusValue.trim().toLowerCase() : "";
  const normalizedSource = typeof sourceValue === "string" ? sourceValue.trim() : "";
  const currentPeriodEndTimestamp = getAccessTimestamp(record, ["current_period_end", "period_end", "renews_at", "expires_at"]);

  const activeStatuses = new Set(["active", "premium", "paid", "trialing", "trial", "subscriber"]);
  const inactiveStatuses = new Set(["inactive", "canceled", "cancelled", "expired", "unpaid", "past_due", "incomplete", "incomplete_expired"]);
  const premiumTiers = new Set(["premium", "pro", "paid", "subscriber", "active"]);
  const isExplicitPremium = booleanPremium === true || booleanPremium === "true";
  const isExplicitFree = booleanPremium === false || booleanPremium === "false";

  const isPremium = isExplicitPremium
    || premiumTiers.has(normalizedTier)
    || activeStatuses.has(normalizedStatus);

  if (!isPremium) {
    return null;
  }

  if (isExplicitFree && !premiumTiers.has(normalizedTier) && !activeStatuses.has(normalizedStatus)) {
    return null;
  }

  if (!isExplicitPremium && inactiveStatuses.has(normalizedStatus)) {
    return null;
  }

  if (!isExplicitPremium && currentPeriodEndTimestamp && currentPeriodEndTimestamp < Date.now()) {
    return null;
  }

  return {
    tier: "premium",
    status: normalizedStatus || "active",
    source: normalizedSource || "stripe",
    currentPeriodEnd
  };
}

function toTimestamp(value) {
  if (!value) {
    return 0;
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function pickBestAccessRecord(rows = []) {
  const records = Array.isArray(rows) ? rows : [];

  return [...records].sort((left, right) => {
    const premiumDifference = Number(Boolean(parseAccessRecord(right))) - Number(Boolean(parseAccessRecord(left)));

    if (premiumDifference !== 0) {
      return premiumDifference;
    }

    const periodDifference = toTimestamp(getValueFromRecord(right, ["current_period_end", "period_end", "renews_at", "expires_at"]))
      - toTimestamp(getValueFromRecord(left, ["current_period_end", "period_end", "renews_at", "expires_at"]));

    if (periodDifference !== 0) {
      return periodDifference;
    }

    return toTimestamp(getValueFromRecord(right, ["created_at", "started_at"]))
      - toTimestamp(getValueFromRecord(left, ["created_at", "started_at"]));
  }).map(parseAccessRecord).find(Boolean) || null;
}

export default async req => {
  if (req.method !== "GET") {
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
      return new Response(JSON.stringify({ error: "Sign in before checking access." }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const user = await getAuthenticatedUser(accessToken);
    const access = await getSubscriptionAccess(user.id);

    return new Response(JSON.stringify({ access }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || "Unable to check account access." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

export const config = {
  path: "/api/account-access"
};
