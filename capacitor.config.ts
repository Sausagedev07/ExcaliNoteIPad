import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.excalinote.app',
  appName: 'ExcaliNote',
  webDir: 'dist',
  ios: {
    contentInset: 'always',
  },
};

export default config;
