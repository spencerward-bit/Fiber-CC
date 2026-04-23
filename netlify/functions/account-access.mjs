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
    `${supabaseUrl}/rest/v1/user_subscriptions?user_id=eq.${encodeURIComponent(userId)}&select=*&order=updated_at.desc.nullslast,created_at.desc&limit=1`,
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
  return rows[0] || null;
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
