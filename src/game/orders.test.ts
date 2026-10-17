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
    expect(canFulfil(g, o)).toMatchObject({ ok: true, cutting: 'c1' });
  });

  it('просроченные записки исчезают', () => {
    const g = game();
    rollOrders(g, T0);
    rollOrders(g, T0 + 25 * H);
    expect(g.orders!.list.every((o) => o.until > T0 + 25 * H)).toBe(true);
  });

  it('на старте — простые просьбы, на высоком уровне — редкости, цвета и по нескольку черенков', () => {
    const kinds = (level: number) => {
      const seen = new Set<string>();
      for (let i = 0; i < 300; i++) {
        const g = game();
        g.level = level;
        g.forms = ['albo'];
        g.plants.push(newPlant({ sp: 'monstera', sill: 'room', slot: 1, zone: 'glass', stage: 4 }, T0));
        g.hues = { violet: ['pink'] };
        rollOrders(g, T0);
        for (const o of g.orders!.list) seen.add(o.kind + (o.n && o.n > 1 ? `×${o.n}` : ''));
      }
      return seen;
    };
    const low = kinds(1);
    expect([...low].every((k) => ['cutting', 'adult', 'healthy'].includes(k))).toBe(true);
    const high = kinds(12);
    expect(high.has('rare')).toBe(true);
    expect(high.has('hue')).toBe(true);
    expect([...high].some((k) => k.startsWith('cutting×'))).toBe(true);
  });

  it('несколько черенков — нужно столько, сколько просят', () => {
    const g = game();
    g.orders = { list: [{ id: 'o', who: 'tamara', kind: 'cutting', sp: 'geranium', n: 2, reward: 50, xp: 10, at: T0, until: T0 + 24 * H }], next: T0 + 1e9, done: 0, hearts: {} };
    g.cuttings.push({ id: 'c1', sp: 'geranium', at: T0 });
    expect(canFulfil(g, g.orders.list[0]).ok).toBe(false);
    g.cuttings.push({ id: 'c2', sp: 'geranium', at: T0 });
    expect(canFulfil(g, g.orders.list[0])).toMatchObject({ ok: true, cuttings: ['c1', 'c2'] });
  });
});

describe('доска без повторов', () => {
  it('три записки — не одно и то же, цветение только у взрослых и в сезон', async () => {
    const { newState, newPlant } = await import('./storage');
    const { rollOrders } = await import('./orders');
    const T = new Date(2026, 9, 15, 12).getTime();
    for (let seed = 1; seed < 40; seed++) {
      const g = newState(T);
      g.level = 5; g.stats.planted = 3;
      g.plants.push(newPlant({ sp: 'spathiphyllum', sill: 'room', slot: 0, zone: 'deep', stage: 4 }, T));
      g.plants.push(newPlant({ sp: 'chlorophytum', sill: 'room', slot: 1, zone: 'glass', stage: 3 }, T));
      g.plants.push(newPlant({ sp: 'violet', sill: 'room', slot: 2, zone: 'glass', stage: 2 }, T));
      let x = seed;
      const rnd = () => ((x = (x * 16807) % 2147483647) / 2147483647);
      g.orders = { list: [], next: T - 10 * 3600e3, done: 0, hearts: {} };
      rollOrders(g, T, rnd);
      const keys = g.orders!.list.map((o) => o.kind + o.sp);
      expect(new Set(keys).size).toBe(keys.length);
      expect(g.orders!.list.filter((o) => o.kind === 'bloom').every((o) => o.sp === 'spathiphyllum')).toBe(true);
    }
  });

  it('старая доска с тремя одинаковыми записками чистится', async () => {
    const { newState } = await import('./storage');
    const { rollOrders } = await import('./orders');
    const T = new Date(2026, 9, 15, 12).getTime();
    const g = newState(T);
    const o = (id: string, who: string) => ({ id, who, kind: 'bloom' as const, sp: 'spathiphyllum', reward: 64, xp: 20, at: T, until: T + 3600e3 * 10 });
    g.orders = { list: [o('a', 'zina'), o('b', 'petya'), o('c', 'ashot')], next: T + 3600e3, done: 0, hearts: {} };
    rollOrders(g, T, () => 0.5);
    expect(g.orders!.list.filter((x) => x.kind === 'bloom' && x.sp === 'spathiphyllum').length).toBe(1);
  });
});

describe('соседи покупают растения', () => {
  it('заказ «куплю» выполним только со взрослым растением этого вида и платит больше черенка', () => {
    const g = game();
    const buy = { id: 'b', who: 'ashot', kind: 'buy' as const, sp: 'geranium', reward: 200, xp: 30, at: T0, until: T0 + 24 * H };
    expect(canFulfil(g, buy)).toMatchObject({ ok: true, plant: g.plants[0].id });
    g.plants[0].stage = 3;
    expect(canFulfil(g, buy).ok).toBe(false);
    let seed = 3;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const g2 = game(); g2.level = 8;
    let sawBuy = false;
    for (let i = 0; i < 40 && !sawBuy; i++) {
      g2.orders = undefined;
      rollOrders(g2, T0 + i * 24 * H, rnd);
      sawBuy = !!(g2 as { orders?: { list: { kind: string; sp: string }[] } }).orders?.list.some((o) => o.kind === 'buy' && o.sp === 'geranium');
    }
    expect(sawBuy).toBe(true);
  });
});
