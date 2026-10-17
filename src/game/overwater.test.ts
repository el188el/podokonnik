import { describe, expect, it } from 'vitest';
import { H, MAX_GROWTH_MULT } from './constants';
import { CURES } from './problems';
import { advance, BOOST_GROW_H, ctxFor, FEED_GROW_H, growNow, growthRate, nextStageAt } from './sim';
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
  it('сразу продвигает рост на сутки, и таймер потом не прыгает назад', () => {
    const { g, p } = world({ moisture: 1, sp: 'citrus' });
    p.growth = 1;
    const before = nextStageAt(p, T0, ctxFor(g, p, T0))!;
    expect(growNow(p, BOOST_GROW_H)).toBe(BOOST_GROW_H);
    const after = nextStageAt(p, T0, ctxFor(g, p, T0))!;
    const rate = growthRate(p, T0, ctxFor(g, p, T0));
    expect(before - after).toBeCloseTo((BOOST_GROW_H / rate) * H, -3);
    // ускорение не меняет скорость: через час таймер меньше ровно на час
    expect(nextStageAt(p, T0 + H, ctxFor(g, p, T0 + H))! - (T0 + H)).toBeLessThanOrEqual(after - T0);
  });

  it('в тесном горшке не помогает', () => {
    const { p } = world({ moisture: 1, sp: 'tradescantia' });
    p.stage = 3; p.potSize = 1;
    expect(growNow(p, FEED_GROW_H)).toBe(0);
  });

  it('все ускорения вместе — не больше лимита', () => {
    const { g, p } = world({ moisture: 1, sp: 'scindapsus' });
    g.level = 6; // без бонуса новичка
    p.boostUntil = p.feedUntil = p.mistUntil = T0 + 24 * H;
    expect(growthRate(p, T0, ctxFor(g, p, T0))).toBeLessThanOrEqual(MAX_GROWTH_MULT);
  });

  it('новичок первые двое суток растит втрое быстрее, потом — как все', () => {
    const { g, p } = world({ moisture: 1, sp: 'tradescantia' });
    const fast = growthRate(p, T0, ctxFor(g, p, T0));
    const later = T0 + 49 * H;
    const slow = growthRate(p, later, ctxFor(g, p, later));
    expect(fast / slow).toBeGreaterThan(2.5);
  });
});
