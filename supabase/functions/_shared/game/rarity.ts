// СГЕНЕРИРОВАНО из src/game/rarity.ts командой npm run sync:shared — не редактировать.
// Очки коллекции редкостей: по ним друзья соревнуются, кто соберёт больше.
// Общий файл для игры и сервера.

import { PALETTES } from './breeding.ts';
import { FORM_BY_ID, FORMS, tierOfForm } from './products.ts';
import type { GameState } from './types.ts';

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
