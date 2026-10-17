// Совместный подоконник: один подоконник на двоих (или на всю квартиру, до 4 человек).
// Хранится на сервере, любое действие проходит через coopAct — одинаково
// на клиенте (для предпросмотра) и на сервере (решающее слово).

import { GLASS_ROW, DEEP_ROW, FLOOR_ROW, isFloor, zoneOfSlot } from './layout';
import { hueOf } from './breeding';
import { FORM_BY_ID, RARE_DROP, formsOf, pickForm } from './products';
import { advance, BLOOM_FEED_EVERY, BLOOM_FEED_MS, BOOST_GROW_H, canCut, FEED_GROW_H, growNow, needSize, neighborsOf, potSizeOf, pour, ROOT_BOOST, rootsAt, tight, WET_FULL } from './sim';
import { BOOST_COOLDOWN, FEED_MS, MIST_MS } from './constants';
import { CURES, GUARD_MS, PROBLEMS } from './problems';
import { sp } from './species';
import { ITEM_BY_ID, placeOf, POT_SHAPES, POTS } from './shop';
import type { DecorPos, GameState, Plant, Sill, WindowSide } from './types';

export const COOP_MAX_MEMBERS = 4;
export const COOP_MAX_PER_PLAYER = 2;
export const COOP_SILL = 'coop';
/** На общем подоконнике сразу открыты все 8 мест и пол для больших растений. */
export const COOP_SLOTS = [...GLASS_ROW, ...DEEP_ROW, ...FLOOR_ROW];
/** Большие растения — только на полу, на пол — только большие (как дома). */
const fits = (spId: string, slot: number) => !!sp(spId).big === isFloor(slot);

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
  /** Общий декор: участники приносят свои предметы. decorBy — чей предмет (id игрока). */
  decor?: string[];
  decorBy?: Record<string, string>;
  pos?: Record<string, DecorPos>;
  off?: string[];
  vent?: boolean;
  curtains?: boolean;
  colors?: Sill['colors'];
}

/** Что можно принести на общий подоконник: декор и приборы (не котики, не подвесные кашпо). */
export const coopDecorOk = (id: string) => {
  const it = ITEM_BY_ID[id];
  return !!it && it.cat === 'decor' && !it.consumable && !!it.place && it.place !== 'spot' && !['cat', 'cat2', 'cat3'].includes(id);
};

/** Общий подоконник как комната — для симуляции, климата и сцены. */
export const coopSill = (c: CoopState): Sill => ({
  id: COOP_SILL, name: c.name, window: c.window, decor: c.decor ?? [], shared: true,
  ...(c.pos ? { pos: c.pos } : {}), ...(c.off ? { off: c.off } : {}), ...(c.vent ? { vent: true } : {}),
  ...(c.curtains ? { curtains: true } : {}), ...(c.colors ? { colors: c.colors } : {}),
});

export interface CoopCutting {
  sp: string;
  form?: string;
  hue?: string;
}

export type CoopAction =
  | { kind: 'water'; plant: string; insist?: boolean }
  | { kind: 'mist'; plant: string; insist?: boolean }
  | { kind: 'wipe'; plant: string }
  | { kind: 'tray'; plant: string }
  | { kind: 'design'; plant: string; pot?: string; shape?: string }
  | { kind: 'nick'; plant: string; nick: string }
  | { kind: 'move'; plant: string; slot: number }
  | { kind: 'plant'; slot: number; cutting: CoopCutting }
  | { kind: 'pot'; plant: string }
  | { kind: 'cut'; plant: string }
  | { kind: 'remove'; plant: string }
  | { kind: 'repot'; plant: string; size?: number }
  | { kind: 'use'; plant: string; item: CoopItem }
  | { kind: 'window'; side: WindowSide }
  | { kind: 'decor'; item: string; on: boolean }
  | { kind: 'switch'; item: string }
  | { kind: 'place'; item: string; x: number; row?: 'sill' | 'table' }
  | { kind: 'vent' }
  | { kind: 'curtains' }
  | { kind: 'color'; part: 'wall' | 'table' | 'sill'; id: string };

/** Что из своего инвентаря можно применить к растению на общем подоконнике. */
export const COOP_ITEMS = ['feed', 'bloomfeed', 'kornevin', 'boost', 'soap', 'acaricide', 'traps', 'fungicide', 'soil', 'drain'] as const;
export type CoopItem = (typeof COOP_ITEMS)[number];

export type CoopResult =
  | { ok: true; effect: 'watered' | 'rooting' | 'misted' | 'wetted' | 'wiped' | 'drained' | 'moved' | 'planted' | 'potted' | 'cut' | 'removed' | 'window' | 'repotted' | 'used' | 'designed' | 'named' | 'decor' | 'switched' | 'placed' | 'room'; cutting?: CoopCutting; size?: number; item?: CoopItem; from?: number; splashed?: string[] }
  | { ok: false; reason: 'gone' | 'enough' | 'busy' | 'no_mist' | 'not_ready' | 'bad' | 'no_need' | 'not_yours' };

export function newCoop(name: string, window: WindowSide, t: number): CoopState {
  return { v: 1, name: name.trim().slice(0, 24) || 'Наш подоконник', window, plants: [], simAt: t, log: [] };
}

/** Мир игры вокруг общего подоконника — чтобы считать рост той же симуляцией. */
export function coopWorld(c: CoopState): GameState {
  return {
    plants: c.plants,
    sills: [coopSill(c)],
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
export function coopAct(c: CoopState, a: CoopAction, who: string, t: number, id = '', rnd = Math.random, whoId = ''): CoopResult {
  coopAdvance(c, t);
  const room = coopRoom(c, a, who, whoId, t);
  if (room) return room;
  if (a.kind === 'window') {
    c.window = a.side;
    log(c, who, 'переставил(а) подоконник к другому окну', t);
    return { ok: true, effect: 'window' };
  }
  if (a.kind === 'plant') {
    if (!COOP_SLOTS.includes(a.slot) || plantAt(c, a.slot)) return { ok: false, reason: 'busy' };
    const s = sp(a.cutting.sp);
    if (s.id !== a.cutting.sp || !fits(s.id, a.slot)) return { ok: false, reason: 'bad' };
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
  if (!('plant' in a)) return { ok: false, reason: 'bad' };
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
      p.wateredAt = t;
      log(c, who, `полил(а) ${sp(p.sp).acc}${p.moisture > 1 ? ' — перелили 😵' : ''}`, t);
      return { ok: true, effect: 'watered' };
    }
    case 'mist': {
      if (p.stage < 2) return { ok: false, reason: 'not_ready' };
      const s = sp(p.sp);
      if (s.mist === 'no') {
        // как дома: опрыскать можно, но листья намокнут — придётся протереть
        if (!a.insist) return { ok: false, reason: 'no_mist' };
        p.wetLeaves = t;
        log(c, who, `опрыскал(а) ${s.acc} — листья мокрые, протрите 💧`, t);
        return { ok: true, effect: 'wetted' };
      }
      p.mistUntil = t + (s.mist === 'love' ? MIST_MS : MIST_MS / 2);
      p.mistedAt = t;
      if (p.problem?.kind === 'mite') p.problem.sev = Math.max(0.1, p.problem.sev - 0.15);
      // брызги летят на соседей: тех, кого нельзя мочить, придётся протереть
      const splashed = neighborsOf(c, p).filter((n) => n.stage >= 2 && sp(n.sp).mist === 'no');
      for (const n of splashed) n.wetLeaves = t;
      log(c, who, `опрыскал(а) ${s.acc}`, t);
      return { ok: true, effect: 'misted', ...(splashed.length ? { splashed: splashed.map((n) => n.id) } : {}) };
    }
    case 'wipe': {
      if (!p.wetLeaves) return { ok: false, reason: 'no_need' };
      p.wetLeaves = undefined;
      log(c, who, `протёр(ла) листья ${sp(p.sp).gen} 🧻`, t);
      return { ok: true, effect: 'wiped' };
    }
    case 'tray': {
      if (p.moisture <= 1) return { ok: false, reason: 'no_need' };
      p.moisture = Math.max(1, p.moisture - 0.25);
      log(c, who, `слил(а) воду из поддона ${sp(p.sp).gen}`, t);
      return { ok: true, effect: 'drained' };
    }
    case 'design': {
      if (a.pot && POTS[a.pot]) p.pot = a.pot;
      if (a.shape && (a.shape === 'classic' || POT_SHAPES[a.shape])) p.shape = a.shape === 'classic' ? undefined : a.shape;
      return { ok: true, effect: 'designed' };
    }
    case 'nick': {
      p.nick = a.nick.trim().slice(0, 20) || undefined;
      if (p.nick) log(c, who, `назвал(а) ${sp(p.sp).acc} «${p.nick}»`, t);
      return { ok: true, effect: 'named' };
    }
    case 'move': {
      if (!COOP_SLOTS.includes(a.slot)) return { ok: false, reason: 'bad' };
      const other = plantAt(c, a.slot);
      if (!fits(p.sp, a.slot) || (other && other.id !== p.id && !fits(other.sp, p.slot))) return { ok: false, reason: 'bad' };
      if (other && other.id !== p.id) {
        other.slot = p.slot;
        other.zone = zoneOfSlot(p.slot);
      }
      const zoneWas = p.zone;
      p.slot = a.slot;
      p.zone = zoneOfSlot(a.slot);
      if (zoneWas !== p.zone) log(c, who, `переставил(а) ${sp(p.sp).acc} ${p.zone === 'glass' ? 'к стеклу' : 'в глубину'}`, t);
      return { ok: true, effect: 'moved' };
    }
    case 'pot': {
      if (p.stage !== 1) return { ok: false, reason: 'not_ready' };
      Object.assign(p, { stage: 2, potSize: 1, plantedAt: t, growth: 0, moisture: 1, health: 100 });
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
      const to = a.size && Number.isInteger(a.size) ? a.size : Math.max(cur + 1, needSize(p.stage));
      if (to <= cur || to > 4) return { ok: false, reason: 'no_need' };
      p.potSize = to;
      p.bigPot = to >= 4;
      p.repottedAt = t;
      log(c, who, `пересадил(а) ${sp(p.sp).acc} в горшок побольше`, t);
      return { ok: true, effect: 'repotted', size: to, from: cur };
    }
    case 'use': {
      const it = a.item;
      if (it === 'kornevin') {
        // Корневин — только черенкам в стакане: корни вчетверо быстрее
        if (p.stage !== 0 || p.rootBoost) return { ok: false, reason: 'no_need' };
        if (!p.rootStart) p.rootStart = t;
        const left = Math.max(0, rootsAt(p)! - t);
        p.rootStart -= left * (1 - 1 / ROOT_BOOST);
        p.rootBoost = true;
        log(c, who, `добавил(а) Корневин черенку ${sp(p.sp).gen} 🫙`, t);
        return { ok: true, effect: 'used', item: it };
      }
      if (p.stage < 2) return { ok: false, reason: 'not_ready' };
      if (it === 'bloomfeed') {
        if (!sp(p.sp).bloom || p.stage < 4 || (p.bloomUntil && t < p.bloomUntil) || (p.bloomFedAt && t - p.bloomFedAt < BLOOM_FEED_EVERY)) return { ok: false, reason: 'no_need' };
        p.bloomUntil = t + BLOOM_FEED_MS;
        p.bloomFedAt = t;
        log(c, who, `подкормил(а) ${sp(p.sp).acc} удобрением для цветения 🌸`, t);
      } else if (it === 'feed') {
        if ((p.feedUntil && t < p.feedUntil) || p.stage >= 4 || tight(p)) return { ok: false, reason: 'no_need' };
        p.feedUntil = t + FEED_MS;
        growNow(p, FEED_GROW_H);
        log(c, who, `подкормил(а) ${sp(p.sp).acc}`, t);
      } else if (it === 'boost') {
        if (p.stage >= 4 || p.problem || p.health < 60 || tight(p) || (p.boostAt && t - p.boostAt < BOOST_COOLDOWN)) return { ok: false, reason: 'no_need' };
        p.boostAt = t;
        growNow(p, BOOST_GROW_H);
        log(c, who, `дал(а) стимулятор: ${sp(p.sp).name.toLowerCase()} подрос(ла) на сутки вперёд ⚡`, t);
      } else if (it === 'drain') {
        if (p.drain) return { ok: false, reason: 'no_need' };
        p.drain = true;
        log(c, who, `насыпал(а) дренаж ${sp(p.sp).gen}`, t);
      } else if (it === 'soil' && !(p.problem && CURES.soil.includes(p.problem.kind))) {
        if (p.moisture <= 1) return { ok: false, reason: 'no_need' };
        p.moisture = 0.6;
        p.wetFor = 0;
        p.health = Math.max(0, p.health - 3);
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

/** Действия с комнатой: декор, форточка, шторы, цвета. null — это действие не про комнату. */
function coopRoom(c: CoopState, a: CoopAction, who: string, whoId: string, t: number): CoopResult | null {
  const name = (id: string) => ITEM_BY_ID[id]?.name.toLowerCase() ?? id;
  switch (a.kind) {
    case 'decor': {
      const decor = c.decor ?? [];
      if (a.on) {
        if (!coopDecorOk(a.item)) return { ok: false, reason: 'bad' };
        if (decor.includes(a.item)) return { ok: false, reason: 'busy' };
        // обои — одни на подоконник: чужие снимает только хозяин
        if (placeOf(a.item) === 'wallpaper' && decor.some((d) => placeOf(d) === 'wallpaper')) return { ok: false, reason: 'busy' };
        c.decor = [...decor, a.item];
        c.decorBy = { ...(c.decorBy ?? {}), [a.item]: whoId };
        log(c, who, `принёс(ла) на подоконник: ${name(a.item)}`, t);
        return { ok: true, effect: 'decor' };
      }
      if (!decor.includes(a.item)) return { ok: false, reason: 'gone' };
      const owner = c.decorBy?.[a.item];
      if (owner && owner !== whoId) return { ok: false, reason: 'not_yours' };
      c.decor = decor.filter((d) => d !== a.item);
      if (c.decorBy) { const { [a.item]: _, ...rest } = c.decorBy; void _; c.decorBy = rest; }
      if (c.pos?.[a.item]) { const { [a.item]: _, ...rest } = c.pos; void _; c.pos = rest; }
      if (c.off) c.off = c.off.filter((d) => d !== a.item);
      if (a.item === 'curtains') c.curtains = false;
      log(c, who, `забрал(а) с подоконника: ${name(a.item)}`, t);
      return { ok: true, effect: 'decor' };
    }
    case 'switch': {
      if (!(c.decor ?? []).includes(a.item)) return { ok: false, reason: 'gone' };
      const off = new Set(c.off ?? []);
      if (off.has(a.item)) off.delete(a.item); else off.add(a.item);
      c.off = [...off];
      return { ok: true, effect: 'switched' };
    }
    case 'place': {
      if (!(c.decor ?? []).includes(a.item)) return { ok: false, reason: 'gone' };
      c.pos = { ...(c.pos ?? {}), [a.item]: { x: Math.max(0.02, Math.min(0.98, a.x)), ...(a.row ? { row: a.row } : {}) } };
      return { ok: true, effect: 'placed' };
    }
    case 'vent': {
      c.vent = !c.vent;
      log(c, who, c.vent ? 'открыл(а) форточку 🪟' : 'закрыл(а) форточку 🪟', t);
      return { ok: true, effect: 'room' };
    }
    case 'curtains': {
      if (!(c.decor ?? []).includes('curtains')) return { ok: false, reason: 'bad' };
      c.curtains = !c.curtains;
      return { ok: true, effect: 'room' };
    }
    case 'color': {
      c.colors = { ...(c.colors ?? {}), [a.part]: a.id };
      return { ok: true, effect: 'room' };
    }
  }
  return null;
}

/** Проверить и почистить действие из запроса (на сервере). */
export function cleanAction(v: unknown): CoopAction | null {
  const o = (v ?? {}) as Record<string, unknown>;
  const plant = typeof o.plant === 'string' ? o.plant.slice(0, 16) : '';
  const slot = Number(o.slot);
  switch (o.kind) {
    case 'water': return plant ? { kind: 'water', plant, insist: o.insist === true } : null;
    case 'mist': return plant ? { kind: 'mist', plant, insist: o.insist === true } : null;
    case 'pot': case 'cut': case 'remove': case 'wipe': case 'tray': return plant ? { kind: o.kind, plant } : null;
    case 'repot': return plant ? { kind: 'repot', plant, ...([2, 3, 4].includes(Number(o.size)) ? { size: Number(o.size) } : {}) } : null;
    case 'design': return plant ? { kind: 'design', plant, ...(typeof o.pot === 'string' ? { pot: o.pot.slice(0, 24) } : {}), ...(typeof o.shape === 'string' ? { shape: o.shape.slice(0, 24) } : {}) } : null;
    case 'nick': return plant && typeof o.nick === 'string' ? { kind: 'nick', plant, nick: o.nick.slice(0, 20) } : null;
    case 'use': return plant && (COOP_ITEMS as readonly string[]).includes(String(o.item)) ? { kind: 'use', plant, item: o.item as CoopItem } : null;
    case 'move': return plant && Number.isInteger(slot) ? { kind: 'move', plant, slot } : null;
    case 'window': return ['N', 'E', 'S', 'W'].includes(String(o.side)) ? { kind: 'window', side: o.side as WindowSide } : null;
    case 'decor': return typeof o.item === 'string' && ITEM_BY_ID[o.item] ? { kind: 'decor', item: o.item, on: o.on === true } : null;
    case 'switch': return typeof o.item === 'string' && ITEM_BY_ID[o.item] ? { kind: 'switch', item: o.item } : null;
    case 'place': {
      const x = Number(o.x);
      if (typeof o.item !== 'string' || !ITEM_BY_ID[o.item] || !Number.isFinite(x)) return null;
      return { kind: 'place', item: o.item, x, ...(o.row === 'sill' || o.row === 'table' ? { row: o.row } : {}) };
    }
    case 'vent': case 'curtains': return { kind: o.kind };
    case 'color': return ['wall', 'table', 'sill'].includes(String(o.part)) && typeof o.id === 'string' && /^[a-z0-9_-]{1,24}$/.test(o.id) ? { kind: 'color', part: o.part as 'wall' | 'table' | 'sill', id: o.id } : null;
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
