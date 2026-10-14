import { derive } from './crypto.ts';

export const env = (k: string) => Deno.env.get(k) ?? '';

export const BOT_TOKEN = env('TELEGRAM_BOT_TOKEN');
export const SITE_URL = env('SITE_URL') || 'https://el188el.github.io/podokonnik/';
export const TG_BOT = env('TG_BOT');
export const TG_APP = env('TG_APP');
/** Канал игры (@имя): бот публикует туда совет дня и итоги конкурса. Бот должен быть админом канала. */
export const TG_CHANNEL = env('TG_CHANNEL') ? '@' + env('TG_CHANNEL').replace(/^@/, '') : '';

let cache: Record<string, string> = {};
export async function secret(purpose: 'session' | 'webhook' | 'cron') {
  if (!BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN не задан');
  return (cache[purpose] ??= await derive(BOT_TOKEN, purpose));
}

/** Ссылка, открывающая мини-апп (с параметром запуска) или сайт. */
export function appLink(startParam?: string) {
  if (TG_BOT && TG_APP) return `https://t.me/${TG_BOT}/${TG_APP}${startParam ? `?startapp=${startParam}` : ''}`;
  return SITE_URL + (startParam ? `?g=${startParam}` : '');
}
