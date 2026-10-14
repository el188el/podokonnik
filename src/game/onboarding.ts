// Удержание новичков: подарки на первые 7 дней и утренний/вечерний обход.

import { dayKey } from './quests';
import type { GameState } from './types';

export interface StarterGift {
  icon: string;
  title: string;
  leaves?: number;
  feed?: number;
  item?: string;     // товар магазина (горшок, декор)
  cutting?: string;  // вид черенка
  form?: string;     // редкая форма
}

/** Подарок на каждый из первых семи дней. Самый ценный — в конце недели. */
export const STARTER: StarterGift[] = [
  { icon: '🩶', title: 'Горшок «Бетон»', item: 'pot_concrete' },
  { icon: '🌱', title: 'Черенок колеуса', cutting: 'coleus' },
  { icon: '🍃', title: '100 листиков', leaves: 100 },
  { icon: '🐈', title: 'Кот Барсик на подоконник', item: 'cat' },
  { icon: '🧪', title: 'Подкормка ×3', feed: 3 },
  { icon: '💙', title: 'Горшок «Гжель»', item: 'pot_gzhel' },
  { icon: '✨', title: 'Редкая Традесканция Нанук', cutting: 'tradescantia', form: 'nanouk' },
];

const dayIndex = (from: number, t: number) => {
  const a = new Date(dayKey(from) + 'T12:00:00').getTime();
  const b = new Date(dayKey(t) + 'T12:00:00').getTime();
  return Math.round((b - a) / 86400e3);
};

/** Сколько дней подарков уже открыто (1…7). */
export const starterDaysOpen = (g: GameState, t: number) => Math.min(STARTER.length, dayIndex(g.createdAt, t) + 1);
export const starterLeft = (g: GameState, t: number) => {
  const claimed = g.starter?.claimed ?? [];
  return Array.from({ length: starterDaysOpen(g, t) }, (_, i) => i).filter((i) => !claimed.includes(i));
};
export const starterDone = (g: GameState) => (g.starter?.claimed.length ?? 0) >= STARTER.length;

// ─────────── обход подоконника ───────────
export interface RoundInfo {
  key: string;
  label: 'утренний' | 'вечерний';
  total: number;
  checked: number;
  done: boolean;
}

/** Обход доступен утром (6–13) и вечером (18–24). Нужно заглянуть к каждому растению в горшке. */
export function roundInfo(g: GameState, t: number): RoundInfo | null {
  const h = new Date(t).getHours();
  const part = h >= 6 && h < 13 ? 'am' : h >= 18 ? 'pm' : null;
  if (!part) return null;
  const potted = g.plants.filter((p) => p.stage >= 2);
  if (potted.length < 2) return null;
  const key = `${dayKey(t)}-${part}`;
  const st = g.round?.key === key ? g.round : null;
  const checked = potted.filter((p) => st?.checked.includes(p.id)).length;
  return { key, label: part === 'am' ? 'утренний' : 'вечерний', total: potted.length, checked, done: !!st?.done };
}

export const ROUND_REWARD = 15;

// ─────────────── мгновенная первая победа ───────────────
/** Первое посаженное растение становится «молодым» уже через 10 минут. */
export const FIRST_YOUNG_H = 10 / 60;
/** Сундучок первого часа: открывается через час после начала игры. */
export const FIRST_CHEST_MS = 60 * 60e3;
export const FIRST_CHEST = { leaves: 60, feed: 2, item: 'pot_white' };

/** null — сундучок уже забран или ещё рано показывать (идёт обучение). */
export function firstChest(g: GameState, t: number): { ready: boolean; left: number } | null {
  if (g.firstChest || g.tutorial < 99 || !g.stats.planted) return null;
  const left = g.createdAt + FIRST_CHEST_MS - t;
  return { ready: left <= 0, left: Math.max(0, left) };
}
