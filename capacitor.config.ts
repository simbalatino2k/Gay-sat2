import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.aura.gay18',
  appName: 'AURA GAY 18+',
  webDir: 'dist/web',
  server: {
    androidScheme: 'https',
    cleartext: false
  },
  plugins: {
    // Custom plugins or standard plugins if configured
  }
};

export default config;
