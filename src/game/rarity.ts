// Очки коллекции редкостей: по ним друзья соревнуются, кто соберёт больше.
// Общий файл для игры и сервера.

import { PALETTES } from './breeding';
import { FORM_BY_ID, FORMS, tierOfForm } from './products';
import type { GameState } from './types';

/** Сколько очков даёт форма: редкая 1, очень редкая 3, легендарная 10. */
export const TIER_POINTS = { 1: 1, 2: 3, 3: 10 } as const;
export const RARE_HUE_POINTS = 2;

const rareHues = (hues: GameState['hues']) =>
  Object.entries(hues ?? {}).reduce((n, [sp, list]) => n + list.filter((h) => PALETTES[sp]?.find((x) => x.id === h)?.rare).length, 0);

export function rareScore(g: Pick<GameState, 'forms' | 'hues'>): number {
  const forms = (g.forms ?? []).reduce((n, id) => n + (FORM_BY_ID[id] ? TIER_POINTS[tierOfForm(FORM_BY_ID[id])] : 0), 0);
  return forms + rareHues(g.hues) * RARE_HUE_POINTS;
}

/** Сколько всего форм и сколько собрано. */
export const formsProgress = (g: Pick<GameState, 'forms'>) => ({ got: (g.forms ?? []).filter((id) => FORM_BY_ID[id]).length, total: FORMS.length });

/** Насколько редок черенок или растение: форма, редкий или сезонный цвет. null — обычный. */
export function rarityOf(x: { sp: string; form?: string; hue?: string }): { tier: 1 | 2 | 3; label: string } | null {
  const f = x.form ? FORM_BY_ID[x.form] : undefined;
  if (f) {
    const tier = tierOfForm(f);
    return { tier, label: f.event ? 'Эксклюзив сезона' : tier === 3 ? 'Легендарный' : tier === 2 ? 'Очень редкий' : 'Редкий' };
  }
  const h = x.hue ? PALETTES[x.sp]?.find((c) => c.id === x.hue) : undefined;
  if (h?.event) return { tier: 2, label: 'Сезонный цвет' };
  if (h?.rare) return { tier: 2, label: 'Редкий цвет' };
  return null;
}
