import { describe, expect, it } from 'vitest';
import { D } from './constants';
import { chatter, moodOf } from './mood';
import { ctxFor } from './sim';
import { newPlant, newState } from './storage';

const T0 = new Date(2026, 5, 1, 12).getTime();

function world(moisture = 1) {
  const g = newState(T0);
  g.sills[0].window = 'E';
  const p = newPlant({ sp: 'tradescantia', sill: 'room', slot: 0, zone: 'glass', stage: 3, rootStart: T0, plantedAt: T0, moisture }, T0);
  g.plants.push(p);
  return { g, p, ctx: ctxFor(g, p, T0) };
}

describe('настроение и реплики', () => {
  it('жажда портит настроение и звучит первой', () => {
    const { p, ctx } = world(0.1);
    expect(moodOf(p, T0, ctx).score).toBeLessThan(80);
    for (const r of [0, 0.3, 0.7, 0.99]) expect(chatter(p, T0, ctx, null, r)).toMatch(/пить|Водички|сухая/i);
  });

  it('дождь за окном попадает в реплики', () => {
    const { p, ctx } = world();
    const all = new Set([...Array(40)].map((_, i) => chatter(p, T0, ctx, { sky: 'rain', temp: 10, day: true, at: T0 }, i / 40)));
    expect([...all].some((x) => x.includes('дожд') || x.includes('Дожд'))).toBe(true);
  });

  it('долгожитель вспоминает, сколько вы вместе', () => {
    const { p, ctx } = world();
    const t = T0 + 40 * D;
    p.moisture = 1;
    const all = new Set([...Array(60)].map((_, i) => chatter(p, t, ctx, null, i / 60)));
    expect([...all].some((x) => x.includes('вместе уже 40'))).toBe(true);
  });
});
