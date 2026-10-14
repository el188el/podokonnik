import { describe, expect, it } from 'vitest';
import { FORM_BY_ID } from './products';
import { ITEM_BY_ID } from './shop';
import { levelPerks, rankOf, SILL_UNLOCK } from './progression';

describe('путь садовода', () => {
  it('ранги растут с уровнем', () => {
    expect(rankOf(1).title).toBe('Новичок');
    expect(rankOf(12).title).toBe('Цветовод');
    expect(rankOf(77).title).toBe('Хранитель сада');
  });
  it('все награды существуют', () => {
    for (let l = 2; l <= 80; l++) for (const p of levelPerks(l)) {
      if (p.item) expect(ITEM_BY_ID[p.item], p.item).toBeTruthy();
      if (p.form) expect(FORM_BY_ID[p.form], p.form).toBeTruthy();
    }
  });
  it('у каждой комнаты есть уровень и цена', () => {
    for (const u of Object.values(SILL_UNLOCK)) expect(u.name.length).toBeGreaterThan(2);
  });
});

describe('мастерство видов', () => {
  it('звёзды за очки, каждая — один раз', async () => {
    const { addMastery } = await import('./mastery');
    const { newState } = await import('./storage');
    const g = newState(0);
    expect(addMastery(g, 'violet', 'adult').map((m) => m.icon)).toEqual(['🥉']);
    for (let i = 0; i < 6; i++) addMastery(g, 'violet', 'cut');
    expect(addMastery(g, 'violet', 'cut').map((m) => m.icon)).toEqual(['🥈']);
    expect(addMastery(g, 'violet', 'cut')).toEqual([]);
  });
});
