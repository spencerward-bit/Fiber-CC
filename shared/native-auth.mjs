const NATIVE_AUTH_PROTOCOL = "co.coloroptics.app:";

/**
 * Parse the Color Optics auth deep link.
 * Supabase may return either a PKCE `code` or implicit access/refresh tokens.
 */
export function parseAuthCallbackUrl(value) {
  if (!value || typeof value !== "string") return null;

  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.protocol !== NATIVE_AUTH_PROTOCOL || url.hostname !== "auth") return null;

  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const code = url.searchParams.get("code") || hash.get("code") || "";
  const accessToken = hash.get("access_token") || url.searchParams.get("access_token") || "";
  const refreshToken = hash.get("refresh_token") || url.searchParams.get("refresh_token") || "";
  const type = url.searchParams.get("type") || hash.get("type") || "";
  const error = url.searchParams.get("error_description")
    || hash.get("error_description")
    || url.searchParams.get("error")
    || hash.get("error")
    || "";

  if (!code && !(accessToken && refreshToken) && !error) return null;

  return {
    code,
    accessToken,
    refreshToken,
    type,
    error,
  };
}
