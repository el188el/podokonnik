// Мастерство видов: чем больше растений вида ты вырастил(а), тем выше мастерство.
// Звёзды: 🥉 3, 🥈 10, 🥇 25, 💎 50 очков. Взрослое растение — 3 очка, цветение — 2, черенок — 1.

import type { GameState } from './types';

export const MASTERY = [
  { points: 3, icon: '🥉', name: 'бронза', leaves: 20, xp: 20 },
  { points: 10, icon: '🥈', name: 'серебро', leaves: 50, xp: 40 },
  { points: 25, icon: '🥇', name: 'золото', leaves: 100, xp: 80 },
  { points: 50, icon: '💎', name: 'изумруд', leaves: 200, xp: 150 },
];

export type MasteryKind = 'adult' | 'bloom' | 'cut';
const POINTS: Record<MasteryKind, number> = { adult: 3, bloom: 2, cut: 1 };

export const masteryPoints = (g: GameState, sp: string) => g.mastery?.[sp]?.pts ?? 0;
export const masteryStars = (pts: number) => MASTERY.filter((m) => pts >= m.points).length;

/** Добавить очки мастерства. Возвращает только что полученные звёзды. */
export function addMastery(g: GameState, sp: string, kind: MasteryKind) {
  const m = (g.mastery ??= {});
  const cur = (m[sp] ??= { pts: 0, stars: 0 });
  cur.pts += POINTS[kind];
  const stars = masteryStars(cur.pts);
  const fresh = MASTERY.slice(cur.stars, stars);
  cur.stars = Math.max(cur.stars, stars);
  return fresh;
}

/** Старым сохранениям — по 3 очка за каждый уже выращенный вид, без наград задним числом. */
export function seedMastery(g: GameState) {
  if (g.mastery) return;
  g.mastery = {};
  for (const sp of g.grownAdult) g.mastery[sp] = { pts: 3, stars: 1 };
}
