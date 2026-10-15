import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './ui/App';
import { boot, pushNow, saveNow, tick } from './game/store';
import { inDiscord, inNative, initPlatform, launchedInTelegram, loadTelegramScript } from './platform';
import { flushTrack, sessionStart } from './net/track';
import './ui/styles.css';
import './ui/skin.css';

async function start() {
  // Скрипт Telegram грузим только внутри Telegram — веб-версия от него не зависит.
  if (launchedInTelegram()) await loadTelegramScript();
  // Discord и нативное приложение подгружают свой код только у себя
  if (inDiscord()) await (await import('./platform/discord')).initDiscord().catch(() => initPlatform());
  else if (inNative()) (await import('./platform/native')).initNative();
  const pf = initPlatform();
  document.documentElement.dataset.platform = pf.kind;
  pf.setColors('#F2F6F1', '#F2F6F1');
  await boot();
  sessionStart();
  createRoot(document.getElementById('root')!).render(<App />);
  setInterval(tick, 1000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      saveNow();
      pushNow(true);
      flushTrack(true);
    } else tick();
  });
  addEventListener('pagehide', saveNow);
  if (pf.kind === 'web' && location.protocol !== 'file:') registerSW({ immediate: true });
  // кэш первой версии игры больше не нужен
  if ('caches' in window) caches.keys().then((ks) => ks.filter((k) => /^podokonnik-v\d/.test(k)).forEach((k) => caches.delete(k))).catch(() => {});
}

start();
