// Заказы соседей: на доске объявлений в подъезде соседи просят черенок
// или показать цветущее растение. За выполненный заказ — листики, опыт
// и дружба с соседом: на 5 сердечках сосед дарит особый подарок.

import { H } from './constants';
import { sp, SPECIES } from './species';
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

export const orderText = (o: Order) =>
  o.kind === 'cutting'
    ? `Дай, пожалуйста, черенок ${sp(o.sp).gen} — ${neighborOf(o.who).why}`
    : `Покажи, как цветёт ${sp(o.sp).name.toLowerCase()}! Хочу такую же`;

/** Какие виды игрок может принести: те, что у него растут или росли. */
function poolFor(g: GameState, kind: OrderKind): string[] {
  const have = new Set([...g.plants.map((p) => p.sp), ...g.grownAdult]);
  return SPECIES.filter((s) => have.has(s.id) && (kind === 'cutting' || s.bloom)).map((s) => s.id);
}

/** Добавить новые заказы, убрать просроченные. Возвращает true, если доска изменилась. */
export function rollOrders(g: GameState, t: number, rnd = Math.random): boolean {
  const board = g.orders ?? { list: [], next: t, done: 0, hearts: {} };
  const before = board.list.length;
  board.list = board.list.filter((o) => o.until > t);
  let changed = board.list.length !== before;
  while (board.list.length < ORDERS_MAX && board.next <= t && g.stats.planted > 0) {
    const kind: OrderKind = rnd() < 0.7 ? 'cutting' : 'bloom';
    const pool = poolFor(g, kind).length ? poolFor(g, kind) : poolFor(g, 'cutting');
    if (!pool.length) break;
    const spId = pool[Math.floor(rnd() * pool.length)];
    const busy = new Set(board.list.map((o) => o.who));
    const free = NEIGHBORS.filter((n) => !busy.has(n.id));
    const who = free[Math.floor(rnd() * free.length)] ?? NEIGHBORS[0];
    const diff = sp(spId).difficulty;
    const base = kind === 'cutting' ? 30 + 20 * diff : 25 + 15 * diff;
    board.list.push({
      id: `${Math.floor(t / 1000)}-${board.list.length}-${Math.floor(rnd() * 1e4)}`,
      who: who.id, kind, sp: spId,
      reward: base + Math.min(60, g.level * 3), xp: 10 + 5 * diff,
      at: t, until: t + ORDER_TTL,
    });
    board.next += ORDER_EVERY;
    changed = true;
  }
  if (board.next <= t) board.next = t + ORDER_EVERY; // доска полна — следующий через 3 часа после освобождения
  g.orders = board;
  return changed;
}

/** Можно ли выполнить заказ прямо сейчас. Для черенка — id подходящего черенка из запаса. */
export function canFulfil(g: GameState, o: Order): { ok: boolean; cutting?: string } {
  if (o.kind === 'cutting') {
    const c = g.cuttings.find((x) => x.sp === o.sp && !x.form && !x.seed);
    return { ok: !!c, cutting: c?.id };
  }
  return { ok: g.plants.some((p) => p.sp === o.sp && p.blooming) };
}

export const neighborOf = (id: string) => NEIGHBORS.find((n) => n.id === id) ?? NEIGHBORS[0];
