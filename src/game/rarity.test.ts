import { describe, expect, it } from 'vitest';
import { FORMS, PRODUCTS, pickForm } from './products';
import { rareScore } from './rarity';

describe('редкости', () => {
  it('очки: редкая 1, очень редкая 3, легендарная 10, редкий цвет 2', () => {
    expect(rareScore({ forms: ['neon', 'albo', 'thai'], hues: { violet: ['purple', 'green'] } })).toBe(1 + 3 + 10 + 2);
    expect(rareScore({})).toBe(0);
  });
  it('легендарные не продаются за звёзды', () => {
    const legends = FORMS.filter((f) => f.tier === 3).map((f) => f.id);
    expect(legends.length).toBeGreaterThan(0);
    expect(PRODUCTS.some((p) => p.form && legends.includes(p.form))).toBe(false);
  });
  it('легендарные выпадают редко', () => {
    let seed = 1;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const list = FORMS.filter((f) => f.sp === 'monstera');
    const n = Array.from({ length: 4000 }, () => pickForm(list, rnd)!.tier === 3).filter(Boolean).length;
    expect(n / 4000).toBeGreaterThan(0.2);
    expect(n / 4000).toBeLessThan(0.33); // albo 3 : thai 1 → 25%
  });
});
