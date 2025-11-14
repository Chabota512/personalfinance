
# Android APK Build Guide for PersonalFinance Pro

This guide will walk you through building an Android APK for PersonalFinance Pro using Capacitor.

## Prerequisites

- Node.js and npm installed
- Android Studio installed (download from https://developer.android.com/studio)
- Java Development Kit (JDK) 17 or higher

## Backend Setup

Your backend is already deployed at:
```
https://personalfinance-pro-backend.onrender.com
```

The mobile app will connect to this deployed backend.

## Step-by-Step Build Process

### Step 1: Build the Mobile Frontend

Run the mobile build script to create a production build that connects to your deployed backend:

```bash
npm run build:mobile
```

This will:
- Set the API URL to your Render.com backend
- Build the React frontend with Vite
- Output files to `dist/public/`

**Expected Output:** You should see a successful build with no errors, and a `dist/public/` folder containing your built frontend files.

### Step 2: Add Android Platform (First Time Only)

If you haven't added the Android platform yet, run:

```bash
npx cap add android
```

This creates the `android/` folder with your Android project structure.

**Note:** If the `android/` folder already exists, skip this step.

### Step 3: Sync Capacitor with Android

Copy your built web assets to the Android project:

```bash
npx cap sync android
```

This will:
- Copy files from `dist/public/` to `android/app/src/main/assets/public/`
- Update native plugins
- Configure the Android project

### Step 4: Open in Android Studio

Open your project in Android Studio:

```bash
npx cap open android
```

This will launch Android Studio with your project loaded.

### Step 5: Build the APK

In Android Studio:

1. Wait for Gradle sync to complete (bottom status bar)
2. Go to **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
3. Wait for the build to complete (check the Build Output window)
4. Click "locate" in the notification, or find the APK at:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

### Step 6: Install on Android Device

**Option A: USB Debugging**
1. Enable Developer Options on your Android device
2. Enable USB Debugging
3. Connect device via USB
4. In Android Studio, click the green "Run" button
5. Select your device from the list

**Option B: Manual Install**
1. Transfer `app-debug.apk` to your device
2. Open the file on your device
3. Allow installation from unknown sources if prompted
4. Install the app

## Troubleshooting

### Build Fails
- Ensure you ran `npm run build:mobile` first
- Check that `dist/public/` exists and contains files
- Try running `npx cap sync android` again

### App Can't Connect to Backend
- Verify backend is running at https://personalfinance-pro-backend.onrender.com
- Check Android device has internet connection
- Ensure CORS is configured correctly on the backend

### Android Studio Issues
- Make sure you have JDK 17+ installed
- Update Android SDK if prompted
- Sync Gradle files (File → Sync Project with Gradle Files)

## Production Build (Release APK)

For a production-ready APK:

1. In Android Studio: **Build** → **Generate Signed Bundle / APK**
2. Select **APK**
3. Create or select a keystore
4. Choose release build variant
5. Sign the APK

The release APK will be at:
```
android/app/build/outputs/apk/release/app-release.apk
```

## Quick Reference

```bash
# Full build process
npm run build:mobile
npx cap sync android
npx cap open android
# Then build APK in Android Studio
```

## Configuration Files

- **Backend URL**: Set in `capacitor.config.ts` server.url
- **API Configuration**: `client/src/lib/api-config.ts`
- **CORS Settings**: `server/security.ts`
- **Android Manifest**: `android/app/src/main/AndroidManifest.xml`

## Additional Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Studio User Guide](https://developer.android.com/studio/intro)
- [Capacitor Android Guide](https://capacitorjs.com/docs/android)
