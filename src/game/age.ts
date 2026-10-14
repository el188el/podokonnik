// Растения-долгожители: чем дольше растение живёт у тебя, тем почётнее его возраст.
// Возраст считается с момента, когда черенок поставили в воду (или пришёл подарком).

import { D } from './constants';
import { plural } from './sim';
import type { Plant } from './types';

export interface AgeMark {
  days: number;
  icon: string;
  title: string;
  reward: number;
  frame?: 'gold';
}

export const AGE_MARKS: AgeMark[] = [
  { days: 7, icon: '🌱', title: 'Неделя вместе', reward: 10 },
  { days: 30, icon: '🎂', title: 'Месяц вместе', reward: 50 },
  { days: 100, icon: '🏅', title: '100 дней вместе', reward: 150, frame: 'gold' },
  { days: 365, icon: '👑', title: 'Год вместе', reward: 500, frame: 'gold' },
];

export const ageDays = (p: Plant, t: number) => Math.max(0, Math.floor((t - p.createdAt) / D));

/** Самая высокая достигнутая отметка возраста. */
export function ageMark(p: Plant, t: number): AgeMark | undefined {
  const d = ageDays(p, t);
  return [...AGE_MARKS].reverse().find((m) => d >= m.days);
}

export const nextAgeMark = (p: Plant, t: number) => AGE_MARKS.find((m) => ageDays(p, t) < m.days);

/** Отметки, которые растение прошло, но ещё не отпраздновало. Помечает их отпразднованными. */
export function freshAgeMarks(p: Plant, t: number): AgeMark[] {
  const d = ageDays(p, t);
  const seen = p.ageSeen ?? 0;
  const fresh = AGE_MARKS.filter((m) => m.days > seen && d >= m.days);
  if (fresh.length) p.ageSeen = fresh[fresh.length - 1].days;
  return fresh;
}

export const daysText = (n: number) => `${n} ${plural(n, 'день', 'дня', 'дней')}`;
