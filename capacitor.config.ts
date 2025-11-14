import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.personalfinance.pro',
  appName: 'PersonalFinance Pro',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https'
  }
};

export default config;
