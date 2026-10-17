// СГЕНЕРИРОВАНО из src/game/coop.ts командой npm run sync:shared — не редактировать.
// Совместный подоконник: один подоконник на двоих (или на всю квартиру, до 4 человек).
// Хранится на сервере, любое действие проходит через coopAct — одинаково
// на клиенте (для предпросмотра) и на сервере (решающее слово).

import { GLASS_ROW, DEEP_ROW, zoneOfSlot } from './layout.ts';
import { hueOf } from './breeding.ts';
import { FORM_BY_ID, RARE_DROP, formsOf, pickForm } from './products.ts';
import { advance, canCut, needSize, potSizeOf, pour, tight, WET_FULL } from './sim.ts';
import { BOOST_COOLDOWN, BOOST_MS, FEED_MS } from './constants.ts';
import { CURES, GUARD_MS, PROBLEMS } from './problems.ts';
import { sp } from './species.ts';
import type { GameState, Plant, WindowSide } from './types.ts';

export const COOP_MAX_MEMBERS = 4;
export const COOP_MAX_PER_PLAYER = 2;
export const COOP_SILL = 'coop';
/** На общем подоконнике сразу открыты все 8 мест. */
export const COOP_SLOTS = [...GLASS_ROW, ...DEEP_ROW];

export interface CoopLog {
  at: number;
  who: string;
  text: string;
}

export interface CoopState {
  v: 1;
  name: string;
  window: WindowSide;
  plants: Plant[];
  simAt: number;
  log: CoopLog[];
}

export interface CoopCutting {
  sp: string;
  form?: string;
  hue?: string;
}

export type CoopAction =
  | { kind: 'water'; plant: string; insist?: boolean }
  | { kind: 'mist'; plant: string }
  | { kind: 'move'; plant: string; slot: number }
  | { kind: 'plant'; slot: number; cutting: CoopCutting }
  | { kind: 'pot'; plant: string }
  | { kind: 'cut'; plant: string }
  | { kind: 'remove'; plant: string }
  | { kind: 'repot'; plant: string }
  | { kind: 'use'; plant: string; item: CoopItem }
  | { kind: 'window'; side: WindowSide };

/** Что из своего инвентаря можно применить к растению на общем подоконнике. */
export const COOP_ITEMS = ['feed', 'boost', 'soap', 'acaricide', 'traps', 'fungicide', 'soil', 'drain'] as const;
export type CoopItem = (typeof COOP_ITEMS)[number];

export type CoopResult =
  | { ok: true; effect: 'watered' | 'rooting' | 'misted' | 'moved' | 'planted' | 'potted' | 'cut' | 'removed' | 'window' | 'repotted' | 'used'; cutting?: CoopCutting; size?: number; item?: CoopItem }
  | { ok: false; reason: 'gone' | 'enough' | 'busy' | 'no_mist' | 'not_ready' | 'bad' | 'no_need' };

export function newCoop(name: string, window: WindowSide, t: number): CoopState {
  return { v: 1, name: name.trim().slice(0, 24) || 'Наш подоконник', window, plants: [], simAt: t, log: [] };
}

/** Мир игры вокруг общего подоконника — чтобы считать рост той же симуляцией. */
export function coopWorld(c: CoopState): GameState {
  return {
    plants: c.plants,
    sills: [{ id: COOP_SILL, name: c.name, window: c.window, decor: [] }],
    owned: {},
    simAt: c.simAt,
    settings: { sound: false, haptics: false, quietFrom: 23, quietTo: 9 },
  } as unknown as GameState;
}

/** Досчитать рост до момента t. */
export function coopAdvance(c: CoopState, t: number) {
  const w = coopWorld(c);
  const ev = advance(w, t);
  c.simAt = w.simAt;
  for (const e of ev) {
    const p = c.plants.find((x) => x.id === e.plant);
    if (!p) continue;
    if (e.kind === 'wilt') log(c, '', `${sp(p.sp).name} засохло — полейте и поставьте на свет 🥀`, t);
    if (e.kind === 'stage' && e.stage === 4) log(c, '', `${sp(p.sp).name} совсем взрослое 🌿`, t);
    if (e.kind === 'bloom') log(c, '', `${sp(p.sp).name} зацвело 🌸`, t);
  }
}

function log(c: CoopState, who: string, text: string, at: number) {
  c.log = [{ at, who, text }, ...c.log].slice(0, 30);
}

const plantAt = (c: CoopState, slot: number) => c.plants.find((p) => p.slot === slot);

/** Применить действие игрока who. id — новый id растения при посадке. */
export function coopAct(c: CoopState, a: CoopAction, who: string, t: number, id = '', rnd = Math.random): CoopResult {
  coopAdvance(c, t);
  if (a.kind === 'window') {
    c.window = a.side;
    log(c, who, 'переставил(а) подоконник к другому окну', t);
    return { ok: true, effect: 'window' };
  }
  if (a.kind === 'plant') {
    if (!COOP_SLOTS.includes(a.slot) || plantAt(c, a.slot)) return { ok: false, reason: 'busy' };
    const s = sp(a.cutting.sp);
    if (s.id !== a.cutting.sp) return { ok: false, reason: 'bad' };
    c.plants.push({
      id, sp: s.id, sill: COOP_SILL, slot: a.slot, zone: zoneOfSlot(a.slot), pot: 'terracotta', bigPot: false,
      createdAt: t, stage: 0, growth: 0, moisture: 0, dryFor: 0, badLightFor: 0, health: 100, rest: 0,
      blooming: false, lowestHealth: 100, quick: true,
      ...(a.cutting.form ? { form: a.cutting.form } : {}), ...(a.cutting.hue ? { hue: a.cutting.hue } : {}),
      from: { name: who, note: 0, code: '' },
    });
    log(c, who, `поставил(а) черенок ${s.gen} в воду`, t);
    return { ok: true, effect: 'planted' };
  }
  const p = c.plants.find((x) => x.id === a.plant);
  if (!p) return { ok: false, reason: 'gone' };
  const name = sp(p.sp).name;
  switch (a.kind) {
    case 'water': {
      if (p.stage === 0 && !p.rootStart) {
        p.rootStart = t;
        log(c, who, `налил(а) воды черенку ${sp(p.sp).gen}`, t);
        return { ok: true, effect: 'rooting' };
      }
      if (p.stage <= 1) return { ok: false, reason: 'not_ready' };
      if (p.moisture >= WET_FULL && !a.insist) return { ok: false, reason: 'enough' };
      pour(p);
      p.waterBy = { name: who, at: t };
      log(c, who, `полил(а) ${sp(p.sp).acc}${p.moisture > 1 ? ' — перелили 😵' : ''}`, t);
      return { ok: true, effect: 'watered' };
    }
    case 'mist': {
      if (p.stage < 2) return { ok: false, reason: 'not_ready' };
      if (sp(p.sp).mist === 'no') return { ok: false, reason: 'no_mist' };
      p.mistUntil = t + (sp(p.sp).mist === 'love' ? 12 : 6) * 3600e3;
      log(c, who, `опрыскал(а) ${sp(p.sp).acc}`, t);
      return { ok: true, effect: 'misted' };
    }
    case 'move': {
      if (!COOP_SLOTS.includes(a.slot)) return { ok: false, reason: 'bad' };
      const other = plantAt(c, a.slot);
      if (other && other.id !== p.id) {
        other.slot = p.slot;
        other.zone = zoneOfSlot(p.slot);
      }
      p.slot = a.slot;
      p.zone = zoneOfSlot(a.slot);
      log(c, who, `переставил(а) ${sp(p.sp).acc} ${p.zone === 'glass' ? 'к стеклу' : 'в глубину'}`, t);
      return { ok: true, effect: 'moved' };
    }
    case 'pot': {
      if (p.stage !== 1) return { ok: false, reason: 'not_ready' };
      Object.assign(p, { stage: 2, plantedAt: t, growth: 0, moisture: 1, health: 100 });
      log(c, who, `посадил(а) ${sp(p.sp).acc} в горшок`, t);
      return { ok: true, effect: 'potted' };
    }
    case 'cut': {
      if (!canCut(p, t)) return { ok: false, reason: 'not_ready' };
      p.lastCut = t;
      let form = p.form;
      const options = formsOf(p.sp);
      if (!form && options.length && rnd() < RARE_DROP) form = pickForm(options, rnd)!.id;
      log(c, who, `взял(а) черенок ${sp(p.sp).gen}${form && FORM_BY_ID[form] ? ` — «${FORM_BY_ID[form].name}»!` : ''}`, t);
      return { ok: true, effect: 'cut', cutting: { sp: p.sp, ...(form ? { form } : {}), ...(p.hue ? { hue: p.hue } : {}) } };
    }
    case 'repot': {
      if (p.stage < 2) return { ok: false, reason: 'not_ready' };
      const cur = potSizeOf(p);
      const to = Math.max(cur + 1, needSize(p.stage));
      if (to > 4) return { ok: false, reason: 'no_need' };
      p.potSize = to;
      p.bigPot = to >= 4;
      p.repottedAt = t;
      log(c, who, `пересадил(а) ${sp(p.sp).acc} в горшок побольше`, t);
      return { ok: true, effect: 'repotted', size: to };
    }
    case 'use': {
      if (p.stage < 2) return { ok: false, reason: 'not_ready' };
      const it = a.item;
      if (it === 'feed') {
        if ((p.feedUntil && t < p.feedUntil) || p.stage >= 4) return { ok: false, reason: 'no_need' };
        p.feedUntil = t + FEED_MS;
        log(c, who, `подкормил(а) ${sp(p.sp).acc}`, t);
      } else if (it === 'boost') {
        if (p.stage >= 4 || p.problem || p.health < 60 || (p.boostAt && t - p.boostAt < BOOST_COOLDOWN)) return { ok: false, reason: 'no_need' };
        p.boostAt = t;
        p.boostUntil = t + BOOST_MS;
        log(c, who, `дал(а) стимулятор: ${sp(p.sp).name.toLowerCase()} растёт вдвое быстрее ⚡`, t);
      } else if (it === 'drain') {
        if (p.drain) return { ok: false, reason: 'no_need' };
        p.drain = true;
        log(c, who, `насыпал(а) дренаж ${sp(p.sp).gen}`, t);
      } else if (it === 'soil' && !(p.problem && CURES.soil.includes(p.problem.kind))) {
        if (p.moisture <= 1) return { ok: false, reason: 'no_need' };
        p.moisture = 0.6;
        p.wetFor = 0;
        log(c, who, `пересадил(а) ${sp(p.sp).acc} в сухой грунт`, t);
      } else {
        if (!p.problem || !CURES[it]?.includes(p.problem.kind)) return { ok: false, reason: 'no_need' };
        const pr = PROBLEMS[p.problem.kind];
        if (p.problem.kind === 'rot' && p.moisture > 1) p.moisture = 1;
        if (it === 'soil') { p.moisture = 0.6; p.wetFor = 0; }
        p.problem = undefined;
        p.guardUntil = t + GUARD_MS;
        log(c, who, `вылечил(а) ${sp(p.sp).acc}: ${pr.name.toLowerCase()} 💊`, t);
      }
      return { ok: true, effect: 'used', item: it };
    }
    case 'remove': {
      c.plants = c.plants.filter((x) => x.id !== p.id);
      log(c, who, `убрал(а) ${name.toLowerCase()} с подоконника`, t);
      return { ok: true, effect: 'removed' };
    }
  }
  return { ok: false, reason: 'bad' };
}

/** Проверить и почистить действие из запроса (на сервере). */
export function cleanAction(v: unknown): CoopAction | null {
  const o = (v ?? {}) as Record<string, unknown>;
  const plant = typeof o.plant === 'string' ? o.plant.slice(0, 16) : '';
  const slot = Number(o.slot);
  switch (o.kind) {
    case 'water': return plant ? { kind: 'water', plant, insist: o.insist === true } : null;
    case 'mist': case 'pot': case 'cut': case 'remove': case 'repot': return plant ? { kind: o.kind, plant } : null;
    case 'use': return plant && (COOP_ITEMS as readonly string[]).includes(String(o.item)) ? { kind: 'use', plant, item: o.item as CoopItem } : null;
    case 'move': return plant && Number.isInteger(slot) ? { kind: 'move', plant, slot } : null;
    case 'window': return ['N', 'E', 'S', 'W'].includes(String(o.side)) ? { kind: 'window', side: o.side as WindowSide } : null;
    case 'plant': {
      const c = (o.cutting ?? {}) as Record<string, unknown>;
      const spId = String(c.sp ?? '');
      if (sp(spId).id !== spId || !Number.isInteger(slot)) return null;
      const form = typeof c.form === 'string' && FORM_BY_ID[c.form]?.sp === spId ? c.form : undefined;
      const hue = typeof c.hue === 'string' && hueOf(spId, c.hue) ? c.hue : undefined;
      return { kind: 'plant', slot, cutting: { sp: spId, ...(form ? { form } : {}), ...(hue ? { hue } : {}) } };
    }
  }
  return null;
}

/** Сколько растений на общем подоконнике хотят пить. */
export const coopThirsty = (c: CoopState) => c.plants.filter((p) => p.stage >= 2 && p.moisture < 0.5).length;
/** Растению тесно — пора пересадить. */
export const coopTight = (p: Plant) => tight(p);
