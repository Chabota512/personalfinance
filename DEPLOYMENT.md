
# PersonalFinance Pro - Deployment & Build Guide

## Overview
This guide covers deploying the backend to Render.com and building an Android APK using Capacitor.

---

## Part 1: Backend Deployment to Render.com

### Prerequisites
- Render.com account (free tier available)
- Neon PostgreSQL database (or use Render's PostgreSQL)

### Step 1: Prepare Your Repository
1. Ensure your code is pushed to GitHub
2. Make sure `render.yaml` is in your repository root

### Step 2: Deploy to Render.com

#### Option A: Using render.yaml (One-Click Deploy)
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Blueprint"
3. Connect your GitHub repository
4. Render will automatically detect `render.yaml`
5. Click "Apply" to create services

#### Option B: Manual Setup
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: personalfinance-pro
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free

### Step 3: Configure Environment Variables
In Render dashboard, add these environment variables:

**Required:**
- `NODE_ENV`: `production`
- `DATABASE_URL`: Your Neon PostgreSQL connection string
  - Format: `postgresql://username:password@hostname/database?sslmode=require`
- `SESSION_SECRET`: Generate a random string (or let Render auto-generate)
- `PORT`: `10000` (Render default)

**Optional:**
- `GEMINI_API_KEY`: Your Google Gemini API key (for AI features)

### Step 4: Database Setup
Your Neon database should already have tables from local development.

If starting fresh:
```bash
npm run db:push
```

### Step 5: Get Your Deployment URL
After deployment, Render will provide a URL like:
`https://personalfinance-pro.onrender.com`

**Save this URL** - you'll need it for the mobile app configuration.

---

## Part 2: Building Android APK with Capacitor

### Prerequisites
- Node.js and npm installed
- Android Studio installed
- Java Development Kit (JDK) 11 or higher
- Your backend deployed and running on Render.com

### Step 1: Configure API URL
1. Create `.env.production.local` file in project root:
```bash
VITE_API_URL=https://your-app-name.onrender.com
```

2. Replace `your-app-name` with your actual Render.com URL

### Step 2: Build the Web App
```bash
npm run build
```

This creates optimized production files in `dist/public/`

### Step 3: Sync with Capacitor
```bash
npx cap sync android
```

This copies the web build to Android platform and installs native plugins.

### Step 4: Open in Android Studio
```bash
npx cap open android
```

This launches Android Studio with your project.

### Step 5: Configure Android App

#### Update App Information
1. In Android Studio, open `android/app/src/main/AndroidManifest.xml`
2. Verify permissions:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

#### Set App Icon (Optional)
1. Place your app icon in `android/app/src/main/res/mipmap-*` folders
2. Or use Android Studio's Image Asset tool: Right-click `res` → New → Image Asset

### Step 6: Build APK

#### Debug APK (for testing)
1. In Android Studio: Build → Build Bundle(s) / APK(s) → Build APK(s)
2. APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

#### Release APK (for distribution)
1. Generate signing key:
```bash
keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

2. Create `android/gradle.properties` (if not exists) and add:
```properties
MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
MYAPP_RELEASE_KEY_ALIAS=my-key-alias
MYAPP_RELEASE_STORE_PASSWORD=your-password
MYAPP_RELEASE_KEY_PASSWORD=your-password
```

3. Update `android/app/build.gradle`:
```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file(MYAPP_RELEASE_STORE_FILE)
            storePassword MYAPP_RELEASE_STORE_PASSWORD
            keyAlias MYAPP_RELEASE_KEY_ALIAS
            keyPassword MYAPP_RELEASE_KEY_PASSWORD
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            ...
        }
    }
}
```

4. Build release APK:
```bash
cd android
./gradlew assembleRelease
```

5. APK location: `android/app/build/outputs/apk/release/app-release.apk`

### Step 7: Test the APK
1. Install on Android device:
```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

2. Or transfer APK file to device and install manually

---

## Part 3: Testing & Verification

### Backend Testing
1. Visit your Render.com URL
2. Test API endpoints:
   - `https://your-app.onrender.com/api/health`
   - Try logging in via web interface

### Mobile App Testing
1. Install APK on Android device
2. Open the app
3. Try logging in
4. Test core features:
   - Create transaction
   - View accounts
   - Create budget
   - Set goals

### Common Issues

#### CORS Errors
- Ensure `server/security.ts` includes Capacitor origins
- Check browser console for specific origin being blocked

#### API Connection Failed
- Verify `VITE_API_URL` in `.env.production.local`
- Ensure backend is running on Render.com
- Check network connectivity on device

#### Session Not Persisting
- Verify `credentials: 'include'` in all fetch calls
- Check CORS settings allow credentials
- Ensure secure cookies are configured correctly

---

## Part 4: Updates & Maintenance

### Updating the Backend
1. Push changes to GitHub
2. Render auto-deploys from main branch
3. Or manually trigger deploy in Render dashboard

### Updating the Mobile App
1. Update code
2. Bump version in `android/app/build.gradle`:
```gradle
versionCode 2
versionName "1.1.0"
```
3. Rebuild: `npm run build`
4. Sync: `npx cap sync android`
5. Build new APK in Android Studio
6. Distribute new APK

---

## Security Notes

1. **Never commit**:
   - `.env.production.local`
   - `my-release-key.keystore`
   - `android/gradle.properties` with sensitive data

2. **Use environment variables** for all secrets

3. **Enable HTTPS** - Render.com provides this automatically

4. **Rotate SESSION_SECRET** periodically

---

## Support & Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Render Documentation](https://render.com/docs)
- [Android Developer Guide](https://developer.android.com/studio)

---

## Quick Reference Commands

```bash
# Build web app
npm run build

# Sync with Capacitor
npx cap sync android

# Open Android Studio
npx cap open android

# Build debug APK (via command line)
cd android && ./gradlew assembleDebug

# Build release APK (via command line)
cd android && ./gradlew assembleRelease

# Install APK on device
adb install path/to/app.apk
```
