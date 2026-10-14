import type { CapacitorConfig } from '@capacitor/cli';

// Нативное приложение для RuStore / Google Play. Собирается из того же dist/.
const config: CapacitorConfig = {
  appId: 'ru.podokonnik.app',
  appName: 'Подоконник',
  webDir: 'dist',
  android: { backgroundColor: '#DDF3EC' },
  plugins: {
    LocalNotifications: { iconColor: '#2F8A55' },
  },
};

export default config;
