import { describe, expect, it } from 'vitest';
import { H, MAX_GROWTH_MULT } from './constants';
import { CURES } from './problems';
import { advance, ctxFor, growthRate } from './sim';
import { newPlant, newState } from './storage';

const T0 = new Date(2026, 5, 1, 12).getTime();

function world(extra: Record<string, unknown> = {}) {
  const g = newState(T0);
  g.sills[0].window = 'E';
  const p = newPlant({ sp: 'aloe', sill: 'room', slot: 0, zone: 'glass', stage: 2, rootStart: T0, plantedAt: T0, moisture: 1.4, guardUntil: T0 + 1e12, ...extra }, T0);
  g.plants.push(p);
  return { g, p };
}

describe('перелив', () => {
  it('без дренажа вода стоит долго, с керамзитом уходит за пару часов', () => {
    const a = world();
    const b = world({ drain: true });
    advance(a.g, T0 + 3 * H);
    advance(b.g, T0 + 3 * H);
    expect(a.p.moisture).toBeGreaterThan(1.2);
    expect(b.p.moisture).toBeLessThanOrEqual(1);
    expect(b.p.health).toBeGreaterThan(a.p.health);
  });

  it('алоэ без дренажа за ночь в мокрой земле заметно страдает', () => {
    const { g, p } = world();
    advance(g, T0 + 10 * H);
    expect(p.health).toBeLessThan(85);
  });

  it('свежий грунт лечит гниль и мошек', () => {
    expect(CURES.soil).toEqual(expect.arrayContaining(['rot', 'gnats']));
  });
});

describe('стимулятор роста', () => {
  it('вдвое ускоряет рост', () => {
    const { g, p } = world({ moisture: 1, sp: 'tradescantia' });
    const base = growthRate(p, T0, ctxFor(g, p, T0));
    p.boostUntil = T0 + 24 * H;
    expect(growthRate(p, T0, ctxFor(g, p, T0))).toBeCloseTo(base * 2, 5);
  });

  it('все ускорения вместе — не больше лимита', () => {
    const { g, p } = world({ moisture: 1, sp: 'scindapsus' });
    p.boostUntil = p.feedUntil = p.mistUntil = T0 + 24 * H;
    expect(growthRate(p, T0, ctxFor(g, p, T0))).toBeLessThanOrEqual(MAX_GROWTH_MULT);
  });
});
