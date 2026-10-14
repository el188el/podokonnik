import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './ui/App';
import { boot, pushNow, saveNow, tick } from './game/store';
import { initPlatform, launchedInTelegram, loadTelegramScript } from './platform';
import './ui/styles.css';

async function start() {
  // Скрипт Telegram грузим только внутри Telegram — веб-версия от него не зависит.
  if (launchedInTelegram()) await loadTelegramScript();
  const pf = initPlatform();
  document.documentElement.dataset.platform = pf.kind;
  pf.setColors('#bfe8ff', '#DDF3EC');
  await boot();
  createRoot(document.getElementById('root')!).render(<App />);
  setInterval(tick, 1000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      saveNow();
      pushNow(true);
    } else tick();
  });
  addEventListener('pagehide', saveNow);
  if (pf.kind === 'web' && location.protocol !== 'file:') registerSW({ immediate: true });
  // кэш первой версии игры больше не нужен
  if ('caches' in window) caches.keys().then((ks) => ks.filter((k) => /^podokonnik-v\d/.test(k)).forEach((k) => caches.delete(k))).catch(() => {});
}

start();
