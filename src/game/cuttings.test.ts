import { describe, expect, it } from 'vitest';
import { D, H } from './constants';
import { compostable, cuttingLeft, cuttingPrice } from './cuttings';
import { canCut, CUT_REST_H, cutLeft, restingAfterCut } from './sim';
import { newPlant } from './storage';

const t = Date.UTC(2026, 5, 1, 12);

describe('баланс черенков', () => {
  it('обычный черенок стоит неделю, редкий — две', () => {
    expect(cuttingLeft({ id: 'a', sp: 'chlorophytum', at: t }, t + 6 * D)).toBeGreaterThan(0);
    expect(cuttingLeft({ id: 'a', sp: 'chlorophytum', at: t }, t + 7 * D)).toBeLessThanOrEqual(0);
    expect(cuttingLeft({ id: 'b', sp: 'monstera', form: 'albo', at: t }, t + 10 * D)).toBeGreaterThan(0);
  });
  it('лавка платит больше за капризные и редкие', () => {
    const common = cuttingPrice({ id: 'a', sp: 'chlorophytum', at: t });
    expect(cuttingPrice({ id: 'b', sp: 'gardenia', at: t })).toBeGreaterThan(common);
    expect(cuttingPrice({ id: 'c', sp: 'monstera', form: 'thai', at: t })).toBeGreaterThan(100);
  });
  it('в компост идут только обычные, старые первыми', () => {
    const list = compostable([
      { id: 'new', sp: 'aloe', at: t + 5 },
      { id: 'rare', sp: 'monstera', form: 'albo', at: t },
      { id: 'old', sp: 'aloe', at: t },
    ]);
    expect(list.map((c) => c.id)).toEqual(['old', 'new']);
  });
  it('после черенка растение отдыхает, а следующий — нескоро', () => {
    const p = newPlant({ sp: 'chlorophytum', sill: 'room', slot: 0, zone: 'glass', stage: 4, moisture: 0.8 } as never, t);
    p.health = 100; p.adultAt = t - D; p.potSize = 3;
    expect(canCut(p, t)).toBe(true);
    p.lastCut = t;
    expect(restingAfterCut(p, t + (CUT_REST_H - 1) * H)).toBe(true);
    expect(restingAfterCut(p, t + (CUT_REST_H + 1) * H)).toBe(false);
    expect(cutLeft(p, t)).toBeGreaterThanOrEqual(2.5 * 24 * H);
  });
});
