import { describe, expect, it } from 'vitest';
import { H } from './constants';
import { ORDERS_MAX, canFulfil, rollOrders } from './orders';
import { newPlant, newState } from './storage';

const T0 = new Date(2026, 9, 14, 12).getTime();

function game() {
  const g = newState(T0);
  g.stats.planted = 1;
  g.plants.push(newPlant({ sp: 'geranium', sill: 'room', slot: 0, zone: 'glass', stage: 4 }, T0));
  return g;
}

describe('заказы соседей', () => {
  it('первая записка сразу, потом раз в 3 часа, не больше трёх', () => {
    const g = game();
    rollOrders(g, T0);
    expect(g.orders!.list).toHaveLength(1);
    rollOrders(g, T0 + H);
    expect(g.orders!.list).toHaveLength(1);
    rollOrders(g, T0 + 3 * H);
    expect(g.orders!.list).toHaveLength(2);
    rollOrders(g, T0 + 20 * H);
    expect(g.orders!.list.length).toBeLessThanOrEqual(ORDERS_MAX);
  });

  it('просят только то, что у игрока растёт', () => {
    const g = game();
    rollOrders(g, T0);
    expect(g.orders!.list[0].sp).toBe('geranium');
  });

  it('черенок — из запаса, цветение — живое', () => {
    const g = game();
    rollOrders(g, T0, () => 0.1);
    const o = g.orders!.list[0];
    expect(canFulfil(g, o).ok).toBe(false);
    g.cuttings.push({ id: 'c1', sp: 'geranium', at: T0 });
    expect(canFulfil(g, o)).toEqual({ ok: true, cutting: 'c1' });
  });

  it('просроченные записки исчезают', () => {
    const g = game();
    rollOrders(g, T0);
    rollOrders(g, T0 + 25 * H);
    expect(g.orders!.list.every((o) => o.until > T0 + 25 * H)).toBe(true);
  });
});
