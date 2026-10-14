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
