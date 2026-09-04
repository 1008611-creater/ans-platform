import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'fun.cauai.prompts',
  appName: '提示词与 Skill 库',
  webDir: 'android-web-assets',
  server: {
    url: 'https://prompts.cauai.fun',
    cleartext: false
  },
  android: {
    backgroundColor: '#ffffff'
  }
};

export default config;
