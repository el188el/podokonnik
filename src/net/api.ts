// Связь с сервером (Supabase Edge Functions). Игра остаётся полностью
// рабочей без сети: всё, что не дошло, просто ждёт следующей попытки.

import { CONFIG } from '../config';
import type { PublicView } from '../game/social';
import type { GameState, PendingGift } from '../game/types';
import { platform } from '../platform';

const NET_KEY = 'podokonnik-net';

interface NetState {
  deviceId: string;
  token?: string;
  playerId?: string;
  version: number;
}

export interface InboxItem {
  id: number;
  kind: 'gift_claimed' | 'referral' | 'welcome' | string;
  payload: Record<string, unknown>;
}

export interface ServerSave {
  state: GameState;
  version: number;
  device?: string | null; // с какого устройства записано
}

let net: NetState = loadNet();
let skew = 0;
let plus = 0;
/** До какого момента активен «Садовник+» по данным сервера. */
export const serverPlusUntil = () => plus;

export const online = () => !!CONFIG.apiUrl;
export const serverSkew = () => skew;
export const playerId = () => net.playerId;
export const knownVersion = () => net.version;
export const deviceId = () => net.deviceId;

function loadNet(): NetState {
  try {
    const j = JSON.parse(localStorage.getItem(NET_KEY) || 'null');
    if (j?.deviceId) return { version: 0, ...j };
  } catch { /* ignore */ }
  const r = new Uint8Array(18);
  crypto.getRandomValues(r);
  const deviceId = btoa(String.fromCharCode(...r)).replace(/\+/g, '-').replace(/\//g, '_');
  return { deviceId, version: 0 };
}

function saveNet() {
  try { localStorage.setItem(NET_KEY, JSON.stringify(net)); } catch { /* ignore */ }
}

async function call<T>(path: string, body: unknown, opts: { auth?: boolean; keepalive?: boolean; timeout?: number } = {}): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeout ?? 10e3);
  try {
    const r = await fetch(`${CONFIG.apiUrl}/api${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(opts.auth !== false && net.token ? { Authorization: `Bearer ${net.token}` } : {}) },
      body: JSON.stringify(body),
      signal: ctrl.signal,
      keepalive: opts.keepalive,
    });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 && opts.auth !== false) {
      net.token = undefined;
      saveNet();
    }
    if (!r.ok) throw new Error(j.error || `http ${r.status}`);
    if (typeof j.serverTime === 'number') skew = j.serverTime - Date.now();
    if (typeof j.plusUntil === 'number') plus = j.plusUntil;
    return j as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Вход: в Telegram — по подписанным initData, в браузере — как гость по id устройства. */
export async function login(name: string): Promise<{ save: ServerSave | null; inbox: InboxItem[] }> {
  const pf = platform();
  const r = await call<{ token: string; playerId: string; save: ServerSave | null; inbox: InboxItem[]; discordToken?: string }>(
    '/auth',
    {
      initData: pf.kind === 'telegram' ? pf.initData : undefined,
      discordCode: pf.authCode,
      platform: pf.kind,
      deviceId: net.deviceId,
      name,
      tz: -new Date().getTimezoneOffset(),
      start: pf.startParam ?? undefined,
    },
    { auth: false, timeout: 8e3 },
  );
  net.token = r.token;
  net.playerId = r.playerId;
  saveNet();
  pf.afterLogin?.(r);
  return { save: r.save, inbox: r.inbox ?? [] };
}

export type SyncResult =
  | { kind: 'ok'; inbox: InboxItem[] }
  | { kind: 'conflict'; save: ServerSave; inbox: InboxItem[] }
  | { kind: 'skip' };

export async function push(state: GameState, opts: { keepalive?: boolean; force?: number } = {}): Promise<SyncResult> {
  if (!net.token || state.offset) return { kind: 'skip' };
  const version = opts.force ?? net.version;
  const r = await call<{ version?: number; conflict?: boolean; save?: ServerSave; inbox?: InboxItem[] }>('/sync', { state, version, device: net.deviceId }, { keepalive: opts.keepalive });
  if (r.conflict && r.save) return { kind: 'conflict', save: r.save, inbox: r.inbox ?? [] };
  if (r.version) {
    net.version = r.version;
    saveNet();
  }
  return { kind: 'ok', inbox: r.inbox ?? [] };
}

export function adoptVersion(v: number) {
  net.version = v;
  saveNet();
}

export const giftCreate = (g: PendingGift) => call('/gift/create', g).catch(() => null);

export async function giftClaim(g: PendingGift): Promise<'ok' | 'mine' | 'own' | 'taken' | 'offline'> {
  if (!net.token) return 'offline';
  try {
    const r = await call<{ status: 'ok' | 'mine' | 'own' | 'taken' }>('/gift/claim', g);
    return r.status;
  } catch {
    return 'offline';
  }
}

export async function payInvoice(product: string): Promise<string> {
  const r = await call<{ link: string }>('/pay/invoice', { product });
  return r.link;
}

export const inboxAck = (ids: number[]) => (ids.length ? call('/inbox/ack', { ids }).catch(() => null) : null);
export const sendSettings = (s: { notify?: boolean }) => call('/settings', s).catch(() => null);

// ─────────────────── друзья ───────────────────
export interface Friend {
  id: string;
  name: string;
  level: number;
  lastSeen: number;
  thirsty: number;
  plants: number;
  plus?: boolean;
}

export const loggedIn = () => !!net.token;

export async function friends(): Promise<Friend[]> {
  const r = await call<{ friends: Friend[] }>('/friends', {});
  return r.friends;
}

export const friendAdd = (id: string) => call<{ ok: boolean; fresh: boolean }>('/friends/add', { id }).catch(() => null);

export async function visit(id: string): Promise<{ view: PublicView | null; watersLeft: number }> {
  return call('/visit', { id });
}

export async function visitWater(id: string, plantId: string): Promise<{ status: 'ok' | 'limit' | 'not_needed'; watersLeft?: number }> {
  return call('/visit/water', { id, plantId });
}

/** Отправить пачку событий аналитики. */
export async function postTrack(events: unknown[], keepalive = false): Promise<boolean> {
  if (!net.token) return false;
  try {
    await call('/track', { events }, { keepalive });
    return true;
  } catch {
    return false;
  }
}

// ─────────────────── барахолка ───────────────────
export interface SwapOffer {
  id: number;
  sp: string;
  form?: string | null;
  hue?: string | null;
  wants: string[];
  note?: string;
  at: number;
  owner: string;
  level: number;
}
export interface MySwap {
  id: number;
  sp: string;
  form?: string | null;
  hue?: string | null;
  wants: string[];
  at: number;
  taken: boolean;
  given?: { sp: string; form?: string; hue?: string } | null;
}
type CuttingRef = { sp: string; form?: string; hue?: string };

export const swaps = () => call<{ market: SwapOffer[]; mine: MySwap[] }>('/swaps', {});
export const swapCreate = (c: CuttingRef & { wants: string[]; note?: string }) => call<{ id: number }>('/swaps/create', c);
export const swapTake = (id: number, give: CuttingRef) => call<{ status: 'ok' | 'gone' }>('/swaps/take', { id, give });
export const swapCancel = (id: number) => call<{ status: 'ok' | 'gone' }>('/swaps/cancel', { id });

// ─────────────────── совместный подоконник ───────────────────
export interface CoopView {
  id: number;
  code: string;
  version: number;
  state: import('../game/coop').CoopState;
  members: { id: string; name: string }[];
}

export const coopList = () => call<{ coops: CoopView[] }>('/coop', {});
export const coopCreate = (name: string, window: string) => call<{ coop: CoopView }>('/coop/create', { name, window });
export const coopJoin = (code: string) => call<{ status: 'ok' | 'gone' | 'full' | 'too_many'; coop?: CoopView }>('/coop/join', { code });
export const coopAct = (id: number, action: import('../game/coop').CoopAction) =>
  call<{ result: import('../game/coop').CoopResult; coop?: CoopView }>('/coop/act', { id, action });
export const coopLeave = (id: number) => call<{ status: string }>('/coop/leave', { id });

// ─────────────────── подоконник недели ───────────────────
export interface ContestEntry {
  id: string;
  shot: import('../game/contest').ContestShot;
  votes: number;
  friend: boolean;
}

export interface ContestData {
  week: string;
  endsAt: number;
  theme: { title: string; hint: string };
  total: number;
  entries: ContestEntry[];
  mine: ContestEntry | null;
  votes: string[];
  votesMax: number;
  last: { week: string; theme: { title: string; hint: string }; top: ContestEntry[] };
}

export const contest = () => call<ContestData>('/contest', {});
export const contestEnter = (sill: string) => call<{ status: 'ok' | 'empty' }>('/contest/enter', { sill });
export const contestVote = (target: string) => call<{ status: 'ok' | 'dup' | 'limit' | 'self' | 'no_entry' }>('/contest/vote', { target });

/** Загрузить картинку для сторис — вернётся публичная ссылка. */
export const storyUpload = (image: string) => call<{ url: string }>('/story', { image }, { timeout: 20e3 });

/** Забрать подарочную подписку по коду. */
export const plusClaim = (code: string) => call<{ status: 'ok' | 'gone' | 'own' | 'dup' | 'taken'; from?: string; plusUntil?: number }>('/plus/claim', { code });
