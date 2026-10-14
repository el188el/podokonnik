// Ящик-сюрприз: раз в день за листики. Чаще всего — немного листиков или подкормки,
// иногда горшок или декор, и совсем редко — черенок редкой формы.

import { FORMS } from './products';
import { ITEMS } from './shop';
import type { GameState } from './types';

export const BOX_PRICE = 30;

export type BoxPrize =
  | { kind: 'leaves'; n: number }
  | { kind: 'feed'; n: number }
  | { kind: 'item'; id: string }
  | { kind: 'form'; id: string };

/** Что выпало. rnd — случайные числа 0…1. */
export function rollBox(g: GameState, rnd: () => number): BoxPrize {
  const r = rnd();
  const notOwned = (cat: 'pots' | 'decor') => ITEMS.filter((i) => i.cat === cat && !i.eventOnly && !i.months && i.price > 0 && i.price <= 160 && !(g.owned[i.id] > 0));
  const pickOf = <T,>(list: T[]) => list[Math.floor(rnd() * list.length)];
  if (r < 0.04) {
    const f = pickOf(FORMS.filter((x) => !x.event));
    if (f) return { kind: 'form', id: f.id };
  }
  if (r < 0.08) return { kind: 'leaves', n: 150 };
  if (r < 0.20) {
    const it = pickOf(notOwned('pots'));
    return it ? { kind: 'item', id: it.id } : { kind: 'leaves', n: 80 };
  }
  if (r < 0.30) {
    const it = pickOf(notOwned('decor'));
    return it ? { kind: 'item', id: it.id } : { kind: 'leaves', n: 80 };
  }
  if (r < 0.45) return { kind: 'leaves', n: 60 };
  if (r < 0.65) return { kind: 'feed', n: 2 };
  return { kind: 'leaves', n: 15 + Math.floor(rnd() * 26) };
}
