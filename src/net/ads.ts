// Ролики за награду (Adsgram, только в Telegram). Без номера блока — выключено.

import { CONFIG } from '../config';
import { platform } from '../platform';

interface AdController {
  show(): Promise<{ done: boolean; state: string; error: boolean; description: string }>;
}
declare global {
  interface Window {
    Adsgram?: { init(o: { blockId: string }): AdController };
  }
}

export const ADS_PER_DAY = 5;
let controller: AdController | null = null;
let loading: Promise<void> | null = null;

export const adsAvailable = () => !!CONFIG.adsBlock && platform().kind === 'telegram';

function load(): Promise<void> {
  loading ??= new Promise((ok, no) => {
    const s = document.createElement('script');
    s.src = 'https://sad.adsgram.ai/js/sad.min.js';
    s.onload = () => ok();
    s.onerror = () => { loading = null; no(new Error('ads script')); };
    document.head.appendChild(s);
  });
  return loading;
}

/** Показать ролик. true — досмотрен до конца, награду можно выдавать. */
export async function showRewardedAd(): Promise<boolean> {
  if (!adsAvailable()) return false;
  await load();
  controller ??= window.Adsgram?.init({ blockId: CONFIG.adsBlock }) ?? null;
  if (!controller) return false;
  try {
    const r = await controller.show();
    return r.done;
  } catch {
    return false;
  }
}
