import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native shell loads the Next.js POS over the LAN (or a hosted URL).
 * Override with: CAPACITOR_SERVER_URL=https://pos.example.com
 */
const serverUrl =
  process.env.CAPACITOR_SERVER_URL?.trim() || "http://192.168.0.108:3000";

const config: CapacitorConfig = {
  appId: "com.dinepooja.pos",
  appName: "DinePooja POS",
  webDir: "mobile/www",
  backgroundColor: "#0f766e",
  server: {
    url: serverUrl,
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    backgroundColor: "#0f766e",
  },
  ios: {
    contentInset: "automatic",
    backgroundColor: "#0f766e",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#0f766e",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0f766e",
    },
  },
};

export default config;
