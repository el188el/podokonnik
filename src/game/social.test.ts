import { describe, expect, it } from 'vitest';
import { D, H } from './constants';
import { publicView, replayFriendWaters, thirstyCount } from './social';
import { newPlant, newState } from './storage';

const T0 = new Date(2026, 5, 1, 12).getTime();

function host() {
  const g = newState(T0);
  g.name = 'Аня';
  g.sills[0].window = 'E';
  g.leaves = 999;
  g.plants.push(newPlant({ id: 'p1', sp: 'tradescantia', sill: 'room', slot: 0, zone: 'glass', stage: 2, rootStart: T0, plantedAt: T0, moisture: 1 }, T0));
  return g;
}

describe('друзья', () => {
  it('через 3 дня без полива растение просит пить', () => {
    const v = publicView(host(), T0 + 3 * D);
    expect(v.plants[0].thirsty).toBe(true);
    expect(thirstyCount(v)).toBe(1);
  });

  it('полив друга засчитывается в момент полива, а не когда хозяин зашёл', () => {
    const a = host();
    const b = host();
    replayFriendWaters(a, [], T0 + 6 * D);
    replayFriendWaters(b, [{ plantId: 'p1', at: T0 + 2 * D }], T0 + 6 * D);
    expect(b.plants[0].health).toBeGreaterThan(a.plants[0].health);
  });

  it('гость не видит экономику хозяина', () => {
    const v = publicView(host(), T0 + H) as unknown as Record<string, unknown>;
    expect(v.leaves).toBeUndefined();
    expect(v.stats).toBeUndefined();
    expect(v.name).toBe('Аня');
  });

  it('пока соседка поливает, друзьям поливать не нужно', () => {
    const g = host();
    g.neighbor = { until: T0 + 7 * D, cooldownUntil: T0 + 14 * D };
    expect(thirstyCount(publicView(g, T0 + 3 * D))).toBe(0);
  });
});
