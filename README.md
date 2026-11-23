# Meal Planner (Indian breakfast & lunch)

React app, fully offline, no API keys. Data is stored on the device (localStorage).

## Get the APK (easiest: no installs on your computer)
1. Create a free GitHub repository and upload this whole folder.
2. Open the **Actions** tab → **Build Android APK** → **Run workflow**.
3. After ~5 minutes download **meal-planner-apk** → `app-debug.apk`.
4. Send it to the phone, open it, allow "Install unknown apps" when asked.

## Build the APK yourself
Needs Node 20+, JDK 17/21 and Android Studio (SDK):
```
npm install
npm run build
npx cap add android
npm run android:apk
```
APK: `android/app/build/outputs/apk/debug/app-debug.apk`

## Without an APK
`dist-standalone.html` is the entire app in one file – open it in Chrome on the phone.
Or host the `www/` folder (any static host) and use "Add to Home screen".

## Develop
`npm test` (engine tests) · `npm run build` · food data: `src/data/defaultFoods.js` · generator: `src/engine/generator.js`
