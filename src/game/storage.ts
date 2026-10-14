// Сохранение: localStorage + (в Telegram) CloudStorage, чтобы прогресс
// был на всех устройствах. Берём ту копию, что новее.
// Сюда же — перенос сохранений первой версии игры (podokonnik-v1).

import type { CloudStore } from '../platform';
import { H } from './constants';
import { makeCode } from './gifts';
import { stageFromGrowth } from './sim';
import { sp } from './species';
import { normalizeLayout } from './layout';
import type { GameState, Plant, Zone } from './types';

export const SAVE_KEY = 'podokonnik-v2';
const LEGACY_KEY = 'podokonnik-v1';
export const VERSION = 1;

export function newState(t: number): GameState {
  return {
    v: VERSION,
    createdAt: t,
    simAt: t,
    lastSeen: t,
    offset: 0,
    name: '',
    xp: 0,
    level: 1,
    leaves: 30,
    sills: [{ id: 'room', name: 'Комната', window: null, decor: [] }],
    activeSill: 'room',
    plants: [],
    cuttings: [],
    owned: { pot_terracotta: 1, potL: 1, feed: 1 },
    discovered: [],
    grownAdult: [],
    achievements: [],
    received: [],
    pending: [],
    sent: [],
    stats: { waters: 0, mists: 0, cuts: 0, giftsSent: 0, giftsGot: 0, planted: 0, repots: 0, adults: 0, blooms: 0, rescues: 0, neighbor: 0, bought: 0, questsDone: 0, nightWater: 0 },
    neighbor: null,
    streak: { day: '', count: 0, best: 0, claimedDay: '' },
    quests: { day: '', list: [], bonusClaimed: false },
    log: [],
    settings: { sound: true, haptics: true, quietFrom: 23, quietTo: 9 },
    tutorial: 0,
  };
}

export function newPlant(p: Partial<Plant> & Pick<Plant, 'sp' | 'sill' | 'slot' | 'zone'>, t: number): Plant {
  return {
    id: makeCode(8),
    pot: 'terracotta',
    bigPot: false,
    createdAt: t,
    stage: 0,
    growth: 0,
    moisture: 0,
    dryFor: 0,
    badLightFor: 0,
    health: 100,
    rest: 0,
    blooming: false,
    lowestHealth: 100,
    ...p,
  };
}

/** Дозаполняет поля, которых не было в старых сохранениях этой версии. */
export function upgrade(s: GameState, t: number): GameState {
  const base = newState(t);
  const out = { ...base, ...s };
  out.stats = { ...base.stats, ...s.stats };
  out.settings = { ...base.settings, ...s.settings };
  out.owned = { ...s.owned };
  normalizeLayout(out.plants);
  if (!out.bloomed) out.bloomed = [...new Set(out.plants.filter((p) => p.bloomedOnce).map((p) => p.sp))];
  if (out.tutorial < 99 && out.stats.planted > 0) out.tutorial = 99; // опытным игрокам обучение не показываем
  return out;
}

export function loadLocal(t: number): { state: GameState; migrated: boolean; savedAt: number } {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const j = JSON.parse(raw);
      return { state: upgrade(j.state, t), migrated: false, savedAt: j.savedAt || 0 };
    }
  } catch { /* битое сохранение — начнём заново, но старое не трогаем */ }
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) return { state: fromLegacy(JSON.parse(legacy), t), migrated: true, savedAt: 0 };
  } catch { /* ignore */ }
  return { state: newState(t), migrated: false, savedAt: 0 };
}

export function saveLocal(state: GameState) {
  const savedAt = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ savedAt, state }));
  } catch { /* приватный режим или переполнено */ }
  return savedAt;
}

// ─────────── Telegram CloudStorage: значения до 4096 символов, режем на куски ───────────
const CHUNK = 4000;

export async function loadCloud(cloud: CloudStore): Promise<{ state: GameState; savedAt: number } | null> {
  try {
    const head = await cloud.get(['save_n', 'save_at']);
    const n = Number(head.save_n || 0);
    if (!n) return null;
    const keys = Array.from({ length: n }, (_, i) => `save_${i}`);
    const parts = await cloud.get(keys);
    const raw = keys.map((k) => parts[k] ?? '').join('');
    return { state: JSON.parse(raw), savedAt: Number(head.save_at || 0) };
  } catch {
    return null;
  }
}

export async function saveCloud(cloud: CloudStore, state: GameState, savedAt: number) {
  const raw = JSON.stringify(state);
  const n = Math.ceil(raw.length / CHUNK);
  for (let i = 0; i < n; i++) await cloud.set(`save_${i}`, raw.slice(i * CHUNK, (i + 1) * CHUNK));
  await cloud.set('save_n', String(n));
  await cloud.set('save_at', String(savedAt));
}

export function pickNewer(local: { state: GameState; savedAt: number }, cloud: { state: GameState; savedAt: number } | null, t: number) {
  if (cloud && cloud.savedAt > local.savedAt) return upgrade(cloud.state, t);
  return local.state;
}

// ─────────── перенос из первой версии ───────────
interface LegacyPlant {
  slot: number; sp: string; planted?: number; zone?: Zone | null; firstWater?: number; lastWater?: number;
  mistAt?: number; repotted?: number; cutAt?: number; from?: string; claimedAt?: number; giftCode?: string; showoffDone?: boolean;
}
interface LegacyState {
  plants?: LegacyPlant[]; received?: string[]; window?: 'N' | 'E' | 'S' | 'W' | null; name?: string;
  pending?: { sp: string; from: string; note: number; c: string } | null;
}

export function fromLegacy(old: LegacyState, t: number): GameState {
  const s = newState(t);
  s.sills[0].window = old.window ?? null;
  s.name = old.name ?? '';
  s.received = Array.isArray(old.received) ? old.received : [];
  s.leaves += 100; // спасибо, что играли в первую версию
  if (old.pending) s.pending = [{ sp: old.pending.sp, from: old.pending.from, note: old.pending.note || 0, code: old.pending.c }];
  for (const lp of old.plants ?? []) {
    const species = sp(lp.sp);
    if (species.id !== lp.sp || lp.slot < 0 || lp.slot > 5) continue;
    const p = newPlant({ sp: lp.sp, sill: 'room', slot: lp.slot, zone: lp.zone === 'deep' ? 'deep' : lp.zone === 'glass' ? 'glass' : species.zone, quick: true }, lp.planted ?? t);
    if (lp.firstWater) {
      const plantedAt = lp.firstWater + 2 * 60e3;
      if (t >= plantedAt) {
        p.rootStart = lp.firstWater;
        p.plantedAt = plantedAt;
        p.growth = (t - plantedAt) / H;
        p.stage = stageFromGrowth(lp.sp, p.growth);
        if (p.stage === 4) p.adultAt = t;
        p.moisture = Math.max(0, 1 - (t - (lp.lastWater ?? lp.firstWater)) / (species.waterDays * 24 * H));
      } else {
        p.rootStart = lp.firstWater;
      }
    }
    if (lp.repotted) { p.bigPot = true; p.repottedAt = lp.repotted; }
    if (lp.cutAt) p.lastCut = lp.cutAt;
    if (lp.from) p.from = { name: lp.from, note: 0, code: lp.giftCode || makeCode() };
    if (lp.claimedAt) p.claimedAt = lp.claimedAt;
    p.showoffDone = lp.showoffDone;
    s.plants.push(p);
    if (!s.discovered.includes(lp.sp)) s.discovered.push(lp.sp);
  }
  normalizeLayout(s.plants);
  return s;
}
