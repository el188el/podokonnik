// Подарки черенков по ссылке. Данные подарка упакованы прямо в ссылку
// (base64url), поэтому работают и без сервера. Код подарка не даёт
// забрать одну ссылку дважды; на сервере проверка станет глобальной.

import { CONFIG, tgAppLink } from '../config';
import { NOTES } from './constants';
import { FORM_BY_ID } from './products';
import { SPECIES_BY_ID } from './species';
import type { PendingGift } from './types';

const ALPHA = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function makeCode(len = 10) {
  const r = new Uint32Array(len);
  crypto.getRandomValues(r);
  return Array.from(r, (x) => ALPHA[x % ALPHA.length]).join('');
}

const b64url = (s: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64url = (s: string) => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};

export function encodeGift(g: PendingGift): string {
  return 'g' + b64url(JSON.stringify(g.form ? [g.sp, g.from, g.note, g.code, g.form] : [g.sp, g.from, g.note, g.code]));
}

export function decodeGift(param: string | null | undefined): (PendingGift & { ok: boolean }) | null {
  if (!param || param[0] !== 'g') return null;
  try {
    const [spId, from, note, code, form] = JSON.parse(unb64url(param.slice(1)));
    return validate({ sp: String(spId), from: String(from), note: Number(note), code: String(code), form: form ? String(form) : undefined });
  } catch {
    return { sp: '', from: '', note: 0, code: '', ok: false };
  }
}

/** Старые ссылки первой версии: ?gift=<вид>&from=…&note=…&c=… */
export function legacyGift(q: URLSearchParams) {
  if (!q.has('gift')) return null;
  return validate({ sp: q.get('gift') || '', from: q.get('from') || '', note: Number(q.get('note')) || 0, code: q.get('c') || '' });
}

function validate(g: PendingGift) {
  const from = g.from.trim().replace(/\s+/g, ' ').slice(0, 24);
  const note = NOTES[g.note] ? g.note : 0;
  const ok = !!SPECIES_BY_ID[g.sp] && /^[A-Za-z0-9]{8,32}$/.test(g.code) && !!from;
  const form = g.form && FORM_BY_ID[g.form]?.sp === g.sp ? g.form : undefined;
  return { sp: g.sp, from, note, code: g.code, ok, ...(form ? { form } : {}) };
}

/** Ссылка на подарок: в Telegram — прямо в мини-апп, иначе — на страницу с красивым превью. */
export function giftLink(g: PendingGift): string {
  const payload = encodeGift(g);
  const tg = tgAppLink(payload);
  if (tg) return tg;
  return `${CONFIG.siteUrl}gift/${g.sp}.html?g=${payload}`;
}
