// Конкурс «Подоконник недели»: раз в неделю игроки выставляют свой подоконник,
// голосуют сердечками (3 голоса в неделю), тройка лидеров получает призы.

import { H } from './constants';
import type { PublicView } from './social';

export const CONTEST_VOTES = 3;      // голосов в неделю у каждого
export const CONTEST_PRIZES = [300, 200, 100];
export const CONTEST_ENTRY_REWARD = 20;
export const CONTEST_VOTE_REWARD = 3;
const MSK = 3 * H;

/** Неделя по Москве: дата понедельника «2026-10-12». */
export function weekKey(t: number): string {
  const d = new Date(t + MSK);
  const dow = (d.getUTCDay() + 6) % 7; // 0 — понедельник
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

/** Когда закончится текущая неделя (полночь понедельника по Москве). */
export function weekEndsAt(t: number): number {
  const start = Date.parse(weekKey(t) + 'T00:00:00Z') - MSK;
  return start + 7 * 24 * H;
}

export const prevWeekKey = (t: number) => weekKey(Date.parse(weekKey(t) + 'T12:00:00Z') - 7 * 24 * H);

export const THEMES = [
  { title: 'Самый цветущий', hint: 'Покажи подоконник, где всё цветёт 🌸' },
  { title: 'Зелёные джунгли', hint: 'Чем гуще и зеленее — тем лучше 🌿' },
  { title: 'Самый уютный', hint: 'Декор, котики и чай на подоконнике ☕' },
  { title: 'Редкости', hint: 'Пёстрые формы и необычные цвета ✨' },
  { title: 'Бабушкин подоконник', hint: 'Герань, алоэ, фиалки и вязаные салфетки 👵' },
];

export function themeOf(week: string) {
  const n = Math.round(Date.parse(week + 'T00:00:00Z') / (7 * 24 * H));
  return THEMES[((n % THEMES.length) + THEMES.length) % THEMES.length];
}

/** Снимок одного подоконника для конкурса. */
export interface ContestShot {
  name: string;
  level: number;
  sill: PublicView['sills'][number];
  plants: PublicView['plants'];
}

export function contestShot(v: PublicView, sillId: string): ContestShot | null {
  const sill = v.sills.find((s) => s.id === sillId) ?? v.sills[0];
  if (!sill) return null;
  const plants = v.plants.filter((p) => p.sill === sill.id).map((p) => ({ ...p, thirsty: false, sad: false }));
  if (!plants.length) return null;
  return { name: v.name, level: v.level, sill, plants };
}
