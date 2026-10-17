import { describe, expect, it } from 'vitest';
import { fussyIssue } from './climate';
import { canBloom, growthRate } from './sim';
import { sp } from './species';
import { newPlant, newState } from './storage';

const t = Date.UTC(2026, 5, 15, 12);
const base = (temp: number, rh: number) => {
  const g = newState(t);
  return { sill: g.sills[0], lamp: false, neighbor: false, temp, rh, sunny: true };
};

describe('капризные растения', () => {
  it('роза: жара и сухость — капризничает, в прохладе — нет', () => {
    expect(fussyIssue(sp('rose'), 28, 50)).toBe('hot');
    expect(fussyIssue(sp('rose'), 20, 30)).toBe('dry');
    expect(fussyIssue(sp('rose'), 20, 50)).toBeNull();
    expect(fussyIssue(sp('rose'), 20, 50, true)).toBe('draft');
    expect(fussyIssue(sp('monstera'), 35, 10)).toBeNull();
  });
  it('неуютно — растёт вдвое медленнее и не цветёт', () => {
    const p = newPlant({ sp: 'rose', sill: 'room', slot: 0, zone: 'glass', stage: 4, growth: 9999, health: 100, moisture: 0.8 } as never, t);
    p.health = 100;
    const ok = growthRate({ ...p, stage: 3 }, t, base(20, 50));
    const bad = growthRate({ ...p, stage: 3 }, t, base(29, 50));
    expect(bad).toBeLessThan(ok * 0.6);
    expect(canBloom(p, t, base(20, 50))).toBe(true);
    expect(canBloom(p, t, base(29, 50))).toBe(false);
  });
});

describe('разбор роста', () => {
  it('множители складываются в скорость роста', async () => {
    const { growthFactors } = await import('./sim');
    const p = newPlant({ sp: 'rose', sill: 'room', slot: 0, zone: 'glass', stage: 3, growth: 60, moisture: 0.8 } as never, t);
    p.health = 100; p.mistUntil = t + 3600e3;
    const ctx = base(29, 30);
    const f = growthFactors(p, t, ctx);
    expect(f.map((x) => x.id)).toEqual(expect.arrayContaining(['mist', 'temp', 'fussy']));
    expect(f.reduce((r, x) => r * x.mul, 1)).toBeCloseTo(growthRate(p, t, ctx), 6);
  });
});

describe('удобрения', () => {
  it('удобрение для цветения: цветёт и не в сезон', async () => {
    const { canBloom } = await import('./sim');
    const winter = Date.UTC(2026, 0, 15, 12);
    // спатифиллум цветёт весной–летом; зимой — только с удобрением
    const p = newPlant({ sp: 'spathiphyllum', sill: 'room', slot: 0, zone: 'glass', stage: 4, moisture: 0.8 } as never, winter);
    p.health = 100;
    const ctx = { ...base(20, 50), sunny: false };
    p.bloomUntil = winter + 3 * 86400e3;
    expect(canBloom(p, winter, ctx)).toBe(true);
  });
});
