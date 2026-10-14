import { describe, expect, it } from 'vitest';
import { crossHue, hueOf, PALETTES } from './breeding';
import { decodeGift, encodeGift } from './gifts';

function seeded(seed: number) {
  let x = seed;
  return () => ((x = (x * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
}

describe('гибридизация', () => {
  it('чаще всего цвет одного из родителей, иногда соседний, редко — редкий', () => {
    const r = seeded(7);
    const counts: Record<string, number> = {};
    for (let i = 0; i < 5000; i++) {
      const h = crossHue('violet', 'purple', 'pink', r);
      counts[h] = (counts[h] ?? 0) + 1;
    }
    const parents = (counts.purple ?? 0) + (counts.pink ?? 0);
    expect(parents / 5000).toBeGreaterThan(0.6);
    expect((counts.green ?? 0) / 5000).toBeGreaterThan(0.03);
    expect((counts.green ?? 0) / 5000).toBeLessThan(0.12);
    for (const k of Object.keys(counts)) expect(hueOf('violet', k), k).toBeTruthy();
  });

  it('у каждой палитры есть исходный и хотя бы один редкий цвет', () => {
    for (const [sp, pal] of Object.entries(PALETTES)) {
      expect(pal.length, sp).toBeGreaterThanOrEqual(5);
      expect(pal.some((h) => h.rare), sp).toBe(true);
      expect(pal[0].rare, sp).toBeFalsy();
    }
  });

  it('цвет передаётся в подарке, чужой цвет отбрасывается', () => {
    const g = { sp: 'violet', from: 'Аня', note: 1, code: 'abcDEF2345', hue: 'green' };
    expect(decodeGift(encodeGift(g))).toEqual({ ...g, ok: true });
    expect(decodeGift(encodeGift({ ...g, hue: 'nonexistent' }))?.hue).toBeUndefined();
  });
});
