import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  allowsWebBilling,
  apiUrl,
  authRedirectUrl,
  nativeAccountCopy,
  NATIVE_AUTH_REDIRECT,
} from "../shared/billing-policy.mjs";
import { parseAuthCallbackUrl } from "../shared/native-auth.mjs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("auth deep links keep the PKCE code and the recovery type", () => {
  assert.deepEqual(
    parseAuthCallbackUrl("co.coloroptics.app://auth/callback?code=abc&type=recovery"),
    { code: "abc", accessToken: "", refreshToken: "", type: "recovery", error: "" },
  );
  assert.equal(
    parseAuthCallbackUrl("co.coloroptics.app://auth/callback#access_token=a&refresh_token=b&type=signup").accessToken,
    "a",
  );
  assert.equal(parseAuthCallbackUrl("https://www.coloroptics.co/?code=abc"), null);
  assert.match(parseAuthCallbackUrl("co.coloroptics.app://auth/callback?error_description=Expired%20link").error, /Expired/);
});

test("native auth and API calls stay off the website checkout path", () => {
  assert.equal(authRedirectUrl({ isNative: true, hostname: "localhost", origin: "https://localhost" }), NATIVE_AUTH_REDIRECT);
  assert.equal(authRedirectUrl({ isNative: false, hostname: "localhost", origin: "http://localhost:8888" }), "http://localhost:8888/");
  assert.equal(authRedirectUrl({ isNative: false, hostname: "www.coloroptics.co", origin: "https://www.coloroptics.co" }), "https://www.coloroptics.co/");
  assert.equal(allowsWebBilling(true), false);
  assert.equal(allowsWebBilling(false), true);
  assert.equal(apiUrl("/api/account-access", { isNative: false }), "/api/account-access");
  assert.equal(apiUrl("/api/delete-account", { isNative: true }), "https://www.coloroptics.co/api/delete-account");
});

test("native account copy does not offer a web purchase", () => {
  const forbidden = /stripe|checkout|billing portal|\$\s?\d|coloroptics\.co|\bsubscribe\b|\bpurchase\b|\bupgrade\b/i;
  for (const isPremium of [true, false]) {
    const copy = nativeAccountCopy({
      isPremium,
      status: isPremium ? "trialing" : "inactive",
      periodLabel: isPremium ? "August 16, 2026" : "",
    });
    for (const value of Object.values(copy)) {
      assert.equal(forbidden.test(value), false, value);
    }
  }
});

test("manifest, service worker, and Android target match the closed-test build", () => {
  const manifest = JSON.parse(read("manifest.json"));
  assert.equal(manifest.name, "Color Optics");
  assert.equal(manifest.short_name, "Color Optics");
  for (const icon of ["icon-192.png", "icon-512.png", "icon-maskable-192.png", "icon-maskable-512.png"]) {
    assert.equal(manifest.icons.some((entry) => entry.src === icon), true);
    read(icon);
  }
  const worker = read("service-worker.js");
  for (const page of [
    "fiber-color-code.html",
    "twisted-pair-color-code.html",
    "ethernet-reference.html",
    "coax-reference.html",
  ]) {
    assert.match(worker, new RegExp(page));
  }
  assert.match(read("android/variables.gradle"), /targetSdkVersion = 36/);
  assert.match(read("android/app/src/main/AndroidManifest.xml"), /co\.coloroptics\.app/);
});

test("subscription RLS grants no client write policy", () => {
  const schema = read("supabase-schema.sql");
  const migration = read("supabase/migrations/202607160001_production_subscriptions.sql");
  const playMigration = read("supabase/migrations/202611030001_play_entitlements_and_rls.sql");
  const combined = `${schema}\n${migration}\n${playMigration}`;
  assert.match(schema, /revoke all on table public\.user_subscriptions from public, anon, authenticated/i);
  assert.match(migration, /revoke all on table public\.user_subscriptions from public, anon, authenticated/i);
  assert.match(playMigration, /revoke all on table public\.user_subscriptions from public, anon, authenticated/i);
  assert.doesNotMatch(
    combined,
    /create policy[\s\S]{0,200}user_subscriptions[\s\S]{0,80}for\s+(insert|update|delete|all)/i,
  );
  assert.match(read("netlify/functions/delete-account.mjs"), /requireEnv\("SUPABASE_SERVICE_ROLE_KEY"\)|supabaseAdminRequest/);
  assert.doesNotMatch(read("netlify/functions/delete-account.mjs"), /service_role/i);
});

test("user_settings grants block truncate and keep signed-in saves", () => {
  const grants = [
    "revoke all on table public.user_settings from anon;",
    "revoke truncate, delete, references, trigger on table public.user_settings from authenticated;",
    "grant select, insert, update on table public.user_settings to authenticated;",
  ];
  const schema = read("supabase-schema.sql");
  const migration = read("supabase/migrations/202611030002_tighten_user_settings_grants.sql");
  for (const statement of grants) {
    assert.equal(schema.includes(statement), true);
    assert.equal(migration.includes(statement), true);
  }

  const client = read("script.js");
  assert.match(client, /\.from\("user_settings"\)\s*\.upsert/);
  assert.match(client, /\.from\("user_settings"\)\s*\.select/);
  assert.doesNotMatch(client, /\.from\("user_settings"\)[\s\S]{0,240}\.delete\(/);
});
