import { describe, expect, it } from 'vitest';
import { SHELVES, hasItem, shelfDone, shelvesReady } from './album';
import { ITEM_BY_ID } from './shop';
import { newState } from './storage';

describe('альбом редкостей', () => {
  it('у каждой полки есть предметы и существующая награда', () => {
    for (const s of SHELVES) {
      expect(s.items.length).toBeGreaterThan(2);
      expect(ITEM_BY_ID[s.reward.item]?.album).toBe(true);
    }
  });

  it('полка собирается из форм, цветов и цветений', () => {
    const g = newState(Date.now());
    const leaves = SHELVES.find((s) => s.id === 'leaves')!;
    g.forms = leaves.items.map((i) => i.form!).slice(0, -1);
    expect(shelfDone(g, leaves)).toBe(false);
    g.forms.push(leaves.items.at(-1)!.form!);
    expect(shelvesReady(g).map((s) => s.id)).toEqual(['leaves']);
    g.shelves = ['leaves'];
    expect(shelvesReady(g)).toEqual([]);
    g.hues = { violet: ['green'] };
    expect(hasItem(g, 'hue:violet:green')).toBe(true);
    g.bloomed = ['geranium'];
    expect(hasItem(g, 'bloom:geranium')).toBe(true);
  });
});
