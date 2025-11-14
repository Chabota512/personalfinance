import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.personalfinance.pro',
  appName: 'PersonalFinance Pro',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    // Uncomment and set this to your Render.com URL for production builds
    // url: 'https://your-app-name.onrender.com',
    // cleartext: true
  },
  android: {
    allowMixedContent: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false
    }
  }
};

export default config;
