import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.excalinote.app',
  appName: 'ExcaliNote',
  webDir: 'dist',
  ios: {
    // Safe-Areas regelt das CSS (viewport-fit=cover), nicht das native WebView
    contentInset: 'never',
    // Kein natives Scrollen/Bouncen: verhindert verrutschtes Layout
    scrollEnabled: false,
    backgroundColor: '#ffffff',
  },
};

export default config;
