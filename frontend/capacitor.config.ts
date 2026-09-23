import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.voxshield.dialer',
  appName: 'VoxShield AI',
  webDir: 'dist',

  // Android-specific configuration
  android: {
    // Allow mixed content for development (http backend from https webview)
    allowMixedContent: true,
    // Background color matching the app's dark theme
    backgroundColor: '#020617',
    // WebView settings for audio/WebRTC support
    webContentsDebuggingEnabled: true,
  },

  // Plugin configuration
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1500,
      backgroundColor: '#020617',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#020617',
    },
  },

  // Development server configuration
  // Uncomment the 'server' block below to enable live reload during development.
  // For Android emulator, 10.0.2.2 maps to the host machine's localhost.
  // For physical devices, use your machine's LAN IP address.
  //
  // server: {
  //   url: 'http://10.0.2.2:5173',
  //   cleartext: true,
  // },
};

export default config;
