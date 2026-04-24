# Color Optics Mobile App Setup

This project now has a Capacitor mobile wrapper setup so the website can remain the main codebase while Android and iPhone builds package the app for store releases.

## Commands

- `npm run mobile:prepare`
  Copies the app-facing web files into `mobile-web/`.

- `npm run cap:copy`
  Prepares the mobile bundle and copies it into existing native projects.

- `npm run cap:sync`
  Prepares the mobile bundle and syncs Capacitor plugins and native config.

- `npm run cap:open:android`
  Opens the Android project in Android Studio after it exists.

- `npm run cap:open:ios`
  Opens the iPhone project in Xcode after it exists.

## First-time native project creation

Run these commands after Android Studio and Xcode are installed:

```bash
npx cap add android
npx cap add ios
```

After that, use:

```bash
npm run cap:sync
```

## Recommended workflow

1. Build and test features in the web app first.
2. Push web changes to GitHub and let Netlify deploy them.
3. When a batch of changes is ready for mobile, run `npm run cap:sync`.
4. Open Android Studio or Xcode and build a new store version.

## Next cleanup items

- Add real app icons and splash assets.
- Update `manifest.json` branding to match Color Optics instead of the older FiberMap label.
- Add native app settings like icons, permissions, and splash screen behavior.
