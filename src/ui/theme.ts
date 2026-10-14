// Тёмная тема: «как в системе» (или в Telegram), всегда светлая или всегда тёмная.

import { useEffect } from 'react';
import { useStore } from '../game/store';
import { platform } from '../platform';

const LIGHT = '#F2F6F1';
const DARK = '#121A17';

function systemDark() {
  const tg = (window as { Telegram?: { WebApp?: { colorScheme?: string } } }).Telegram?.WebApp?.colorScheme;
  if (tg) return tg === 'dark';
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
}

export function useTheme() {
  const mode = useStore((s) => s.game.settings.theme ?? 'auto');
  useEffect(() => {
    const apply = () => {
      const dark = mode === 'dark' || (mode === 'auto' && systemDark());
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? DARK : LIGHT);
      try { platform().setColors(dark ? DARK : LIGHT, dark ? DARK : LIGHT); } catch { /* ignore */ }
    };
    apply();
    if (mode !== 'auto' || typeof matchMedia === 'undefined') return;
    const mq = matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, [mode]);
}
