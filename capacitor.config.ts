import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sageinventory.app',
  appName: 'Sage Inventory',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    backgroundColor: '#F7F9FB',
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
