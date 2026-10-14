import { describe, expect, it } from 'vitest';
import { rollBox } from './box';
import { newState } from './storage';

describe('ящик-сюрприз', () => {
  it('выдаёт все виды призов, редкая форма — редко', () => {
    const g = newState(Date.now());
    let seed = 1;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const kinds: Record<string, number> = {};
    for (let i = 0; i < 5000; i++) { const p = rollBox(g, rnd); kinds[p.kind] = (kinds[p.kind] ?? 0) + 1; }
    expect(Object.keys(kinds).sort()).toEqual(['feed', 'form', 'item', 'leaves']);
    expect(kinds.form / 5000).toBeLessThan(0.07);
    expect(kinds.form / 5000).toBeGreaterThan(0.02);
  });
  it('уже купленное не выпадает', () => {
    const g = newState(Date.now());
    for (const k of ['pot_white', 'pot_concrete', 'pot_glass', 'pot_gzhel', 'pot_khokhloma', 'pot_enamel']) g.owned[k] = 1;
    for (let i = 0; i < 300; i++) {
      const p = rollBox(g, Math.random);
      if (p.kind === 'item') expect(g.owned[p.id]).toBeFalsy();
    }
  });
});
