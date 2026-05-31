# Android Release Prep

This checklist is for turning Color Optics into a release-ready Android app for the Google Play Store.

## Current Android Identity

- App name: `Color Optics`
- Package name: `co.coloroptics.app`
- Version code: `1`
- Version name: `1.0.0`

## Before Building a Release

- Confirm the app icon and splash screen are final.
- Test the main pages on a real Android device:
  - Home
  - Fiber Color Code
  - Twisted Pair
  - Ethernet
  - Coax
- Test account flows:
  - register
  - sign in
  - sign out
  - reset password
- Test premium flows:
  - free account restrictions
  - premium account unlock
  - sign out and sign back in
- Confirm Supabase live auth is working.
- Confirm Stripe live checkout and webhook updates are working.
- Review the legal pages before store submission:
  - `privacy.html`
  - `terms.html`

## Files That Control Android Branding

- App config:
  - `C:\Users\ward4\Documents\Website-app\Fiber CC\capacitor.config.json`
- Android app name:
  - `C:\Users\ward4\Documents\Website-app\Fiber CC\android\app\src\main\res\values\strings.xml`
- Android colors:
  - `C:\Users\ward4\Documents\Website-app\Fiber CC\android\app\src\main\res\values\colors.xml`
- Android launcher icons:
  - `C:\Users\ward4\Documents\Website-app\Fiber CC\android\app\src\main\res\mipmap-*`
- Splash styling:
  - `C:\Users\ward4\Documents\Website-app\Fiber CC\android\app\src\main\res\values\styles.xml`
  - `C:\Users\ward4\Documents\Website-app\Fiber CC\android\app\src\main\res\drawable\splash.png`

## Recommended Signing Plan

Create one long-term Android release keystore and keep it backed up safely.

Suggested file name:

- `color-optics-release-key.jks`

Suggested alias:

- `coloroptics`

Do not lose:

- keystore file
- keystore password
- key alias
- key password

Without them, updating the Play Store app later becomes much harder.

## Release Build Flow

1. Open the Android project:
   - `C:\Users\ward4\Documents\Website-app\Fiber CC\android`
2. Bump the app version in:
   - `C:\Users\ward4\Documents\Website-app\Fiber CC\android\app\build.gradle`
3. Build a signed release:
   - preferred format for Play Store: Android App Bundle (`.aab`)
4. Test the signed build on a real Android phone.
5. Upload it to Google Play Console.

## Versioning Suggestion

Use this pattern:

- `1.0.0` = first public release
- `1.0.1` = small bug fix
- `1.1.0` = feature update
- `2.0.0` = major redesign or major platform change

For every Play Store update:

- increase `versionCode`
- update `versionName` when appropriate

## Play Store Assets To Prepare

- App title: `Color Optics`
- Short description
- Full description
- App icon
- Phone screenshots
- Privacy Policy URL
- Terms and Conditions URL
- Public support email
- Optional feature graphic

## Suggested First Release Positioning

Color Optics is a telecom field reference app for:

- fiber color code lookups
- twisted pair reference
- Ethernet category reference
- coax reference
- account sync
- premium access across supported devices

## Recommended Next Steps

1. Finalize the legal pages for live app distribution.
2. Create the Android signing key.
3. Build the first signed `.aab`.
4. Prepare Play Store listing assets and text.
5. Upload the app for internal testing first.

