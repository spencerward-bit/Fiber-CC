# Android closed-testing checklist

Color Optics is ready to build for a Google Play closed test. The items below are the remaining manual steps. Do not commit the keystore, passwords, or service-role key.

## Already in the project

- App name: `Color Optics`
- Package name: `co.coloroptics.app`
- Version code: `1`
- Version name: `1.0.0`
- `minSdkVersion`: 24
- `compileSdkVersion` / `targetSdkVersion`: 36

Google Play requires new apps submitted after August 31, 2026 to target Android 16 (API 36). The extension window ended November 1, 2026. This project already targets API 36, so no SDK bump is required for the first upload. Re-check Play Console if Google raises the requirement again before you ship.

The Android app does not sell a subscription. Stripe Checkout and the billing portal stay on the website. A person who already has Premium on the web can sign in inside the app and keep that access. Google Play Billing is not implemented yet. A later writer can store Play entitlements in `user_subscriptions` with `provider = 'google_play'`.

## 1. Supabase and Netlify before the first login test

Apply both migrations in order, if they are not already applied:

- `supabase/migrations/202607160001_production_subscriptions.sql`
- `supabase/migrations/202611030001_play_entitlements_and_rls.sql`

In Supabase Auth → URL configuration, keep the site URL on `https://www.coloroptics.co` and add this redirect URL:

`co.coloroptics.app://auth/callback`

Also keep `https://www.coloroptics.co/` allowed. Password reset and signup confirmation from the app use the custom scheme. The same flows on the website still return to the website.

Netlify already needs the variables in `.env.example` / `SUBSCRIPTION_SETUP.md`. Account deletion uses the existing `SUPABASE_SERVICE_ROLE_KEY` and `STRIPE_SECRET_KEY`. No new secret was added. Deploy the site that contains `/api/delete-account` and the CORS headers on `/api/account-access` before testing Premium inside the app. The service-role key stays in Netlify only.

Set the Play Console support email, then use that same address when someone who cannot sign in asks for deletion. The public deletion URL is:

`https://www.coloroptics.co/delete-account.html`

## 2. Create and back up the upload key

Create one long-term upload key and store it outside this repository:

```bash
keytool -genkeypair -v \
  -keystore color-optics-release-key.jks \
  -alias coloroptics \
  -keyalg RSA -keysize 2048 -validity 10000
```

Back up all of these in a password manager or offline copy:

- the `.jks` file
- the keystore password
- the alias `coloroptics`
- the key password

Play App Signing can hold the app signing key. You still need this upload key for every future Android App Bundle. Losing it blocks updates.

Enroll in Play App Signing when the first release is created. Prefer that over signing the store artifact with a key you also use as the only copy.

## 3. Build a signed Android App Bundle

From the repo root, with Android Studio and a JDK installed:

```bash
npm install
npm test
npm run cap:sync
```

`npm run cap:sync` refreshes `mobile-web/` and registers the Capacitor App plugin used for the back button and auth links. Then in Android Studio open the `android/` project and choose **Build → Generate Signed Bundle / APK → Android App Bundle**. Use the upload key from step 2. The file to upload is the `.aab`, not an APK.

Bump `versionCode` in `android/app/build.gradle` for every upload after this first one. `versionName` can stay `1.0.0` for the closed test.

On the first upload, check Play Console for a 16 KB page-size warning. This app does not ship its own native libraries beyond Capacitor. If Console flags one, update the Capacitor Android dependency and rebuild rather than ignoring the warning.

There is no device test in this change. Before inviting testers, install the signed build on a phone and walk through sign-in, sign-up, password reset from the phone's email app, Premium on an account that already subscribed on the web, free-account limits, account deletion, and the system back button from a reference page and from the home page.

## 4. Play Console listing

Create the app with package name `co.coloroptics.app`. For the closed test, prepare:

- App name: Color Optics
- Short and full description of the fiber, twisted pair, Ethernet, and coax reference
- App icon from `icon-512.png` (the same mark as the launcher)
- Phone screenshots of Home, Fiber, Twisted Pair, Ethernet, and Coax
- Feature graphic, if the closed-test form asks for one
- Privacy policy URL: `https://www.coloroptics.co/privacy.html`
- Account deletion URL: `https://www.coloroptics.co/delete-account.html`
- Terms URL: `https://www.coloroptics.co/terms.html`
- A public support email that matches the deletion page

Category: Tools or Books & Reference. The app has no ads and no in-app purchases in this version. Declare that there are no in-app products. Do not add a Stripe purchase link to the store listing.

Content rating: complete the questionnaire. The app is a technical reference and has no user-generated public content.

## 5. Data safety answers

Answer from what this Android build actually does. It does not use the Advertising ID, location, contacts, photos, microphone, camera, or an analytics SDK.

| Data | Collected? | Why | Shared? |
| --- | --- | --- | --- |
| Email address | Yes, if the person creates or signs in to an account | Account management | Sent to Supabase Auth. Not sold and not used for ads. |
| Password | Used to authenticate. Supabase stores the credential. The app does not keep a copy of the password. | Account management | Supabase Auth only. |
| App interactions | Saved reference choices (page, cable size, tube size, and similar selections), on device and on the account when signed in | App functionality | Supabase `user_settings` when signed in. |
| Purchase history | The app reads Premium status for the signed-in account (active or not, and the access period). It does not collect a card number. | App functionality | Color Optics `/api/account-access`. The Android app does not contact Stripe. |

Also answer:

- Data is encrypted in transit (HTTPS to Supabase and `https://www.coloroptics.co`).
- Users can request deletion in the app and at `https://www.coloroptics.co/delete-account.html`.
- Data is not sold.
- Do not claim an independent security review unless one has been completed.
- The website's Stripe Checkout is not part of the Android data-safety form. Card data is not collected by the app.

## 6. Closed test: 12 testers for 14 days

New personal Play Console accounts have to run a closed test with at least 12 testers who stay opted in for 14 consecutive days before Google will consider a production access request. Organization accounts can be exempt. Plan on the stricter rule:

1. Create a closed testing release and upload the signed `.aab`.
2. Add at least 12 tester Gmail addresses, or a Google Group that has at least 12 members.
3. Send the opt-in link and confirm each tester installs from Play, not from a sideloaded APK.
4. Leave the release running for 14 straight days with those testers still opted in.
5. Apply for production only after Play Console says the closed-test requirement is met.

Internal testing is useful first, but it does not replace the 12-tester closed test for a new personal account.

## Branding files

- `capacitor.config.json`
- `android/app/src/main/res/values/strings.xml`
- `android/app/src/main/res/values/colors.xml`
- `android/app/src/main/res/mipmap-*`
- `android/app/src/main/res/values/styles.xml`
- `android/app/src/main/res/drawable/splash.png`
- PWA icons: `icon-192.png`, `icon-512.png`, `icon-maskable-192.png`, `icon-maskable-512.png`
