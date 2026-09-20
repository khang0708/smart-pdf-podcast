import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.smartpdf.podcastreader',
  appName: 'Smart PDF Podcast Reader',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
