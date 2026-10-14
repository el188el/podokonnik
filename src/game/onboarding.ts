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

// ─────────── «Первые шаги»: короткие задания на первые часы ───────────
// Пока растения растут, новичку есть чем заняться: каждое действие — сразу награда.

export interface FirstStep {
  icon: string;
  title: string;
  hint: string;
  leaves: number;
  feed?: number;
  boost?: number;
  pots?: number;
  done: (g: GameState) => boolean;
}

export const FIRST_STEPS: FirstStep[] = [
  { icon: '💧', title: 'Полей растение', hint: 'Возьми лейку внизу и тапни по горшку', leaves: 10, done: (g) => g.stats.waters > 0 },
  { icon: '✏️', title: 'Дай растению имя', hint: 'Открой карточку растения и нажми на название', leaves: 10, done: (g) => g.plants.some((p) => !!p.nick) },
  { icon: '💦', title: 'Опрыскай растение', hint: 'Опрыскиватель — рядом с лейкой', leaves: 10, done: (g) => g.stats.mists > 0 },
  { icon: '🍂', title: 'Поймай падающий листик', hint: 'Иногда сверху падают листики — лови!', leaves: 15, done: (g) => (g.stats.caughtAll ?? 0) > 0 },
  { icon: '🌱', title: 'Посади второе растение', hint: 'Купи черенок в магазине и поставь в воду', leaves: 20, pots: 1, done: (g) => g.stats.planted >= 2 },
  { icon: '📖', title: 'Загляни в Гербарий', hint: 'Вкладка внизу — там всё о твоих видах', leaves: 10, done: (g) => (g.stats.herbarium ?? 0) > 0 },
  { icon: '🛒', title: 'Купи что-нибудь в магазине', hint: 'Горшок, декор или средство ухода', leaves: 15, done: (g) => g.stats.bought > 0 },
  { icon: '📋', title: 'Помоги соседу', hint: 'Записки соседей — на главном экране', leaves: 30, feed: 1, done: (g) => (g.orders?.done ?? 0) > 0 },
  { icon: '🌿', title: 'Вырасти молодое растение', hint: 'Поливай вовремя — растёт само', leaves: 30, boost: 1, done: (g) => g.plants.some((p) => p.stage >= 3) },
  { icon: '💌', title: 'Отправь открытку другу', hint: 'Шапка → «Комната ▾» → «Открытка»', leaves: 20, done: (g) => (g.stats.postcards ?? 0) > 0 },
  { icon: '⭐', title: 'Достигни 3 уровня', hint: 'Опыт дают уход, задания и заказы', leaves: 40, feed: 2, done: (g) => g.level >= 3 },
  { icon: '✂️', title: 'Возьми первый черенок', hint: 'У взрослого растения — ножницами', leaves: 50, boost: 1, done: (g) => g.stats.cuts > 0 },
];

export const firstStepsLeft = (g: GameState) => FIRST_STEPS.map((_, i) => i).filter((i) => !(g.firstSteps ?? []).includes(i));
/** Текущий шаг (первый незабранный) и готов ли он. */
export function firstStepNow(g: GameState): { i: number; step: FirstStep; ready: boolean } | null {
  const i = firstStepsLeft(g)[0];
  if (i === undefined) return null;
  return { i, step: FIRST_STEPS[i], ready: FIRST_STEPS[i].done(g) };
}

export { newbieLeft, NEWBIE_MULT } from './sim';
