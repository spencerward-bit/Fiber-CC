export const NATIVE_AUTH_REDIRECT = "co.coloroptics.app://auth/callback";
export const PRODUCTION_APP_URL = "https://www.coloroptics.co/";

export function isNativeCapacitor(capacitor) {
  return Boolean(
    capacitor
    && typeof capacitor.isNativePlatform === "function"
    && capacitor.isNativePlatform()
  );
}

/** Web Checkout and the billing portal stay available only outside the native shell. */
export function allowsWebBilling(isNative) {
  return isNative !== true;
}

export function authRedirectUrl({
  isNative,
  hostname,
  origin,
  productionUrl = PRODUCTION_APP_URL,
} = {}) {
  if (isNative) return NATIVE_AUTH_REDIRECT;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    const base = origin || "http://localhost";
    return base.endsWith("/") ? base : `${base}/`;
  }
  return productionUrl;
}

export function apiUrl(path, { isNative, productionUrl = PRODUCTION_APP_URL } = {}) {
  if (!isNative) return path;
  return new URL(path, productionUrl).toString();
}

/**
 * Copy shown inside the Capacitor app. It must not mention a price, Stripe,
 * or a place to buy the subscription on the web.
 */
export function nativeAccountCopy({ isPremium, status, periodLabel }) {
  if (isPremium) {
    const trial = status === "trialing" && periodLabel
      ? `Trial access is active through ${periodLabel}. `
      : "";
    return {
      badge: "Premium Access",
      accessCopy: "This account can open the full Color Optics library on this device.",
      details: `${trial}Premium access is active on this account.`.trim(),
      planTitle: "Premium Active",
      planCopy: "This account includes the full reference library on this device.",
    };
  }

  return {
    badge: "Free Access",
    accessCopy: "Sign in with an account that already includes Premium to open the full library on this device.",
    details: "Free access includes Fiber up to 48ct with 12ct tubes and 1-ribbon 16ct, Twisted Pair up to 50 pair, Ethernet CAT 1 and CAT 2, and no Coax access.",
    planTitle: "Color Optics Premium",
    planCopy: "The full Fiber, Twisted Pair, Ethernet, and Coax library is included with accounts that already have Premium.",
  };
}
