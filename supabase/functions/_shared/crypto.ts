// Подписи: проверка initData Telegram, токен сессии, производные секреты.

const enc = new TextEncoder();

async function hmacKey(key: Uint8Array<ArrayBuffer> | string) {
  return crypto.subtle.importKey('raw', typeof key === 'string' ? enc.encode(key) : key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

export async function hmac(key: Uint8Array<ArrayBuffer> | string, data: string): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(key), enc.encode(data)));
}

export const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/** Секрет для конкретной цели, выведенный из токена бота: не нужно хранить лишние ключи. */
export async function derive(botToken: string, purpose: string) {
  return hex(await hmac(botToken, `podokonnik:${purpose}`)).slice(0, 48);
}

export interface TgUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

/**
 * Проверка initData Mini App по документации Telegram:
 * secret = HMAC_SHA256("WebAppData", bot_token), hash = HMAC_SHA256(secret, data_check_string).
 */
export async function verifyInitData(initData: string, botToken: string, maxAgeSec = 7 * 86400, nowSec = Date.now() / 1000) {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');
  const check = [...params.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = await hmac('WebAppData', botToken);
  const calc = hex(await hmac(secret, check));
  if (!safeEqual(calc, hash)) return null;
  const authDate = Number(params.get('auth_date') || 0);
  if (!authDate || nowSec - authDate > maxAgeSec) return null;
  try {
    const user = JSON.parse(params.get('user') || 'null') as TgUser | null;
    return user && typeof user.id === 'number' ? { user, startParam: params.get('start_param') } : null;
  } catch {
    return null;
  }
}

/** Токен сессии: «playerId.expires.signature». */
export async function signSession(playerId: string, secret: string, ttlSec = 30 * 86400, nowSec = Math.floor(Date.now() / 1000)) {
  const exp = nowSec + ttlSec;
  const sig = hex(await hmac(secret, `${playerId}.${exp}`));
  return `${playerId}.${exp}.${sig}`;
}

export async function verifySession(token: string | null | undefined, secret: string, nowSec = Math.floor(Date.now() / 1000)) {
  if (!token) return null;
  const [id, exp, sig] = token.split('.');
  if (!id || !exp || !sig || Number(exp) < nowSec) return null;
  const calc = hex(await hmac(secret, `${id}.${exp}`));
  return safeEqual(calc, sig) ? id : null;
}
