// Заказы соседей: на доске объявлений в подъезде соседи просят черенок
// или показать цветущее растение. За выполненный заказ — листики, опыт
// и дружба с соседом: на 5 сердечках сосед дарит особый подарок.

import { H } from './constants';
import { sp, SPECIES } from './species';
import { FORM_BY_ID, FORMS } from './products';
import { canBreed, hueOf } from './breeding';
import type { GameState, Order, OrderKind } from './types';

export type { Order, OrderKind };

export interface Neighbor {
  id: string;
  name: string;
  flat: string;
  icon: string;
  why: string;   // зачем просит черенок
  gift: { item?: string; leaves?: number; text: string }; // подарок на 5 сердечках
}

export const NEIGHBORS: Neighbor[] = [
  { id: 'tamara', why: 'внучке на подоконник', name: 'Тамара Ивановна', flat: 'кв. 12', icon: '👵', gift: { item: 'pickles', text: 'банка огурцов' } },
  { id: 'kolya', why: 'на дачу, в теплицу', name: 'Дядя Коля', flat: 'кв. 3', icon: '👴', gift: { item: 'radio', text: 'советское радио' } },
  { id: 'lena', why: 'в офис, на ресепшен', name: 'Лена', flat: 'кв. 27', icon: '👩', gift: { item: 'candle', text: 'ароматная свеча' } },
  { id: 'petya', why: 'для живого уголка в школе', name: 'Петя', flat: 'кв. 8', icon: '👦', gift: { leaves: 300, text: '300 листиков из копилки' } },
  { id: 'zina', why: 'подруге на день рождения', name: 'Зинаида Петровна', flat: 'кв. 41', icon: '👩‍🦳', gift: { item: 'teapot', text: 'чайник в горошек' } },
  { id: 'ashot', why: 'в своё кафе на первом этаже', name: 'Ашот', flat: 'кв. 15', icon: '🧔', gift: { item: 'tangerines', text: 'мандарины' } },
];

export const ORDERS_MAX = 3;
export const ORDER_EVERY = 3 * H;  // новый заказ — раз в 3 часа
export const ORDER_TTL = 24 * H;
export const HEARTS_FOR_GIFT = 5;

export function orderText(o: Order): string {
  const s = sp(o.sp);
  const why = neighborOf(o.who).why;
  switch (o.kind) {
    case 'cutting': return o.n && o.n > 1 ? `Дай, пожалуйста, ${o.n} черенка ${s.gen} — ${why}` : `Дай, пожалуйста, черенок ${s.gen} — ${why}`;
    case 'bloom': return `Покажи, как цветёт ${s.name.toLowerCase()}! Хочу такую же`;
    case 'adult': return `Хочу посмотреть на взрослое растение — ${s.name.toLowerCase()}. Какое оно вырастает?`;
    case 'healthy': return `Мой ${s.name.toLowerCase()} хиреет… Покажи своё здоровое — как ты ухаживаешь?`;
    case 'rare': return `Ищу редкость — черенок «${FORM_BY_ID[o.form!]?.name ?? s.name}». Выручишь?`;
    case 'hue': return `Мечтаю увидеть, как цветёт ${s.name.toLowerCase()} цвета «${hueOf(o.sp, o.hue)?.name ?? o.hue}»!`;
  }
}

/** Какие виды игрок может принести: те, что у него растут или росли. */
function poolFor(g: GameState, kind: OrderKind): string[] {
  const have = new Set([...g.plants.map((p) => p.sp), ...g.grownAdult]);
  return SPECIES.filter((s) => have.has(s.id) && (kind !== 'bloom' || s.bloom)).map((s) => s.id);
}

/** Набор заказов по уровню: чем выше уровень, тем интереснее и сложнее просьбы. */
function kindsFor(level: number): [OrderKind, number][] {
  if (level <= 2) return [['cutting', 5], ['adult', 3], ['healthy', 2]];
  if (level <= 6) return [['cutting', 4], ['bloom', 3], ['adult', 2], ['healthy', 1]];
  return [['cutting', 4], ['bloom', 3], ['adult', 1], ['healthy', 1], ['rare', 2], ['hue', 2]];
}

const MULT: Record<OrderKind, number> = { cutting: 1, bloom: 1.2, adult: 0.9, healthy: 0.7, rare: 2.5, hue: 2.2 };

/** Придумать один заказ под игрока (или null, если нечего просить). */
function makeOrder(g: GameState, t: number, rnd: () => number, busy: Set<string>): Order | null {
  const weights = kindsFor(g.level);
  const total = weights.reduce((n, [, w]) => n + w, 0);
  for (let tries = 0; tries < 6; tries++) {
    let r = rnd() * total;
    const kind = weights.find(([, w]) => (r -= w) < 0)?.[0] ?? 'cutting';
    let spId = '';
    let form: string | undefined;
    let hue: string | undefined;
    if (kind === 'rare') {
      const forms = FORMS.filter((f) => (g.forms ?? []).includes(f.id) && !f.event);
      if (!forms.length) continue;
      const f = forms[Math.floor(rnd() * forms.length)];
      spId = f.sp; form = f.id;
    } else if (kind === 'hue') {
      const opts = Object.entries(g.hues ?? {}).flatMap(([s, hs]) => hs.map((h) => [s, h] as const)).filter(([s]) => canBreed(s));
      if (!opts.length) continue;
      [spId, hue] = opts[Math.floor(rnd() * opts.length)];
    } else {
      // на высоких уровнях — чаще сложные виды
      let pool = poolFor(g, kind);
      if (g.level >= 8) { const hard = pool.filter((s) => sp(s).difficulty >= 2); if (hard.length && rnd() < 0.6) pool = hard; }
      if (!pool.length) continue;
      spId = pool[Math.floor(rnd() * pool.length)];
    }
    const n = kind === 'cutting' ? (g.level >= 10 ? 1 + Math.floor(rnd() * 3) : g.level >= 4 ? 1 + Math.floor(rnd() * 2) : 1) : undefined;
    const free = NEIGHBORS.filter((x) => !busy.has(x.id));
    const who = free[Math.floor(rnd() * free.length)] ?? NEIGHBORS[0];
    const diff = sp(spId).difficulty;
    const base = (30 + 20 * diff) * MULT[kind] * (n ?? 1) * (n && n > 1 ? 0.85 : 1);
    return {
      id: `${Math.floor(t / 1000)}-${Math.floor(rnd() * 1e6)}`,
      who: who.id, kind, sp: spId, ...(n && n > 1 ? { n } : {}), ...(form ? { form } : {}), ...(hue ? { hue } : {}),
      reward: Math.round(base + Math.min(80, g.level * 3)), xp: Math.round((10 + 5 * diff) * MULT[kind] * (n ?? 1)),
      at: t, until: t + ORDER_TTL * (kind === 'rare' || kind === 'hue' ? 2 : 1),
    };
  }
  return null;
}

/** Добавить новые заказы, убрать просроченные. Возвращает true, если доска изменилась. */
export function rollOrders(g: GameState, t: number, rnd = Math.random): boolean {
  const board = g.orders ?? { list: [], next: t, done: 0, hearts: {} };
  const before = board.list.length;
  board.list = board.list.filter((o) => o.until > t);
  let changed = board.list.length !== before;
  while (board.list.length < ORDERS_MAX && board.next <= t && g.stats.planted > 0) {
    const o = makeOrder(g, t, rnd, new Set(board.list.map((x) => x.who)));
    if (!o) break;
    board.list.push(o);
    board.next += ORDER_EVERY;
    changed = true;
  }
  if (board.next <= t) board.next = t + ORDER_EVERY; // доска полна — следующий через 3 часа после освобождения
  g.orders = board;
  return changed;
}

/** Можно ли выполнить заказ прямо сейчас. Для черенков — id подходящих черенков из запаса. */
export function canFulfil(g: GameState, o: Order): { ok: boolean; cutting?: string; cuttings?: string[] } {
  switch (o.kind) {
    case 'cutting': {
      const list = g.cuttings.filter((x) => x.sp === o.sp && !x.form && !x.seed).slice(0, o.n ?? 1).map((x) => x.id);
      return { ok: list.length >= (o.n ?? 1), cutting: list[0], cuttings: list };
    }
    case 'rare': {
      const c = g.cuttings.find((x) => x.form === o.form);
      return { ok: !!c, cutting: c?.id, cuttings: c ? [c.id] : [] };
    }
    case 'bloom': return { ok: g.plants.some((p) => p.sp === o.sp && p.blooming) };
    case 'hue': return { ok: g.plants.some((p) => p.sp === o.sp && p.blooming && p.hue === o.hue) };
    case 'adult': return { ok: g.plants.some((p) => p.sp === o.sp && p.stage === 4) };
    case 'healthy': return { ok: g.plants.some((p) => p.sp === o.sp && p.stage >= 2 && p.health >= 95 && !p.problem) };
  }
}

/** Что не хватает для заказа — для кнопки. */
export function orderNeed(o: Order): string {
  switch (o.kind) {
    case 'cutting': return o.n && o.n > 1 ? `нужно ${o.n} черенка` : 'нет черенка';
    case 'rare': return 'нет такого черенка';
    case 'bloom': return 'не цветёт';
    case 'hue': return 'нет цветущей такого цвета';
    case 'adult': return 'ещё не взрослое';
    case 'healthy': return 'нет здорового';
  }
}

export const orderGives = (o: Order) => o.kind === 'cutting' || o.kind === 'rare';

export const neighborOf = (id: string) => NEIGHBORS.find((n) => n.id === id) ?? NEIGHBORS[0];
