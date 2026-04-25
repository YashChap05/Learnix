import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.learnix.app',
  appName: 'Learnix',
  webDir: 'public',
  server: {
    cleartext: true,
    androidScheme: 'http'
  }
};

export default config;
