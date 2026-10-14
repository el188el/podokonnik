// Аналитика: короткие события копятся и уходят на сервер пачками.
// Никаких личных данных — только что сделал игрок и на какой платформе.

import { CONFIG } from '../config';
import { platform } from '../platform';
import { postTrack } from './api';

interface Ev { name: string; props?: Record<string, string | number | boolean>; at: number }

let queue: Ev[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

export function track(name: string, props?: Ev['props']) {
  if (!CONFIG.apiUrl) return;
  queue.push({ name, props, at: Date.now() });
  if (queue.length > 200) queue = queue.slice(-200);
  if (!timer) timer = setTimeout(() => flushTrack(), 20e3);
}

export async function flushTrack(keepalive = false) {
  if (timer) { clearTimeout(timer); timer = null; }
  if (!queue.length) return;
  const batch = queue.splice(0, 50);
  const ok = await postTrack(batch, keepalive);
  if (!ok) queue = [...batch, ...queue].slice(-200);
  else if (queue.length) timer = setTimeout(() => flushTrack(), 5e3);
}

export const sessionStart = () => track('session_start', { platform: platform().kind });
