
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.personalfinance.pro',
  appName: 'PersonalFinance Pro',
  webDir: 'dist/public',
  bundledWebRuntime: false,
  server: {
    url: 'https://personalfinance-pro-backend.onrender.com',
    cleartext: true
  },
  android: {
    allowMixedContent: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#1a1a1a",
      showSpinner: false
    }
  }
};

export default config;
