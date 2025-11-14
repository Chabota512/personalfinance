
# Android Permissions Configuration

After running `npx cap add android`, ensure the following permissions are in your `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

These permissions are typically added automatically by Capacitor, but verify they exist.

## Location
File: `android/app/src/main/AndroidManifest.xml`

## How to Check
1. Run `npx cap add android` (if not already done)
2. Open `android/app/src/main/AndroidManifest.xml`
3. Look for the `<uses-permission>` tags
4. If missing, add them before the `<application>` tag
