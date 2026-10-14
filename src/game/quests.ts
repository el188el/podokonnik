// Ежедневные задания и серия заходов: короткая причина вернуться завтра.

import { badLight, cramped, ctxFor } from './sim';
import { sp } from './species';
import type { GameState, QuestKind, QuestState, WeeklyKind, WeeklyQuest } from './types';

export const dayKey = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const prevDay = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d - 1, 12).getTime());
};

function rng(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export const QUEST_TEXT: Record<QuestKind, (n: number) => string> = {
  water: (n) => `Полей ${n} ${n === 1 ? 'растение' : 'растения'}`,
  mist: () => 'Опрыскай любителя влажного воздуха',
  cut: () => 'Возьми черенок у взрослого растения',
  plant: () => 'Посади укоренившийся черенок в горшок',
  gift: () => 'Подари черенок другу',
  fixLight: () => 'Переставь растение туда, где ему хватает света',
  buy: () => 'Купи что-нибудь в магазине',
  repot: () => 'Пересади растение, которому тесно',
  feed: () => 'Подкорми растение',
  visitHerbarium: () => 'Загляни в гербарий',
};

export const QUEST_ICON: Record<QuestKind, string> = {
  water: '💧', mist: '💦', cut: '✂️', plant: '🪴', gift: '🎁', fixLight: '☀️', buy: '🛒', repot: '🏡', feed: '🧪', visitHerbarium: '📖',
};

function candidates(s: GameState, t: number): { kind: QuestKind; target: number; reward: number }[] {
  const potted = s.plants.filter((p) => p.stage >= 2);
  const out: { kind: QuestKind; target: number; reward: number }[] = [];
  if (potted.length) out.push({ kind: 'water', target: Math.min(3, potted.length), reward: 10 + 3 * Math.min(3, potted.length) });
  if (potted.some((p) => sp(p.sp).mist === 'love')) out.push({ kind: 'mist', target: 1, reward: 12 });
  if (potted.some((p) => p.stage === 4)) {
    out.push({ kind: 'cut', target: 1, reward: 18 });
    out.push({ kind: 'gift', target: 1, reward: 30 });
  }
  if (s.cuttings.length || s.plants.some((p) => p.stage <= 1)) out.push({ kind: 'plant', target: 1, reward: 15 });
  if (potted.some((p) => badLight(p, t, ctxFor(s, p, t)))) out.push({ kind: 'fixLight', target: 1, reward: 15 });
  if (potted.some((p) => cramped(p, t))) out.push({ kind: 'repot', target: 1, reward: 20 });
  if (potted.length && s.leaves >= 15) out.push({ kind: 'feed', target: 1, reward: 12 });
  if (s.leaves >= 20) out.push({ kind: 'buy', target: 1, reward: 10 });
  out.push({ kind: 'visitHerbarium', target: 1, reward: 8 });
  return out;
}

/** Обновить серию заходов и задания на сегодня. Возвращает true, если наступил новый день. */
export function rollDay(s: GameState, t: number, plus = false): boolean {
  const today = dayKey(t);
  let fresh = false;
  if (s.streak.day !== today) {
    // с «Садовник+» один пропущенный день серию не сжигает
    const kept = s.streak.day === prevDay(today) || (plus && s.streak.day === prevDay(prevDay(today)));
    s.streak.count = kept ? s.streak.count + 1 : 1;
    s.streak.best = Math.max(s.streak.best, s.streak.count);
    s.streak.day = today;
    fresh = true;
  }
  if (s.quests.day === today && s.quests.list.length < 3) {
    // утром растений ещё не было — добираем задания, когда они появились
    const have = new Set(s.quests.list.map((q) => q.kind));
    const pool = candidates(s, t).filter((q) => !have.has(q.kind));
    const r = rng(today + s.createdAt + s.quests.list.length);
    while (s.quests.list.length < 3 && pool.length) {
      const q = pool.splice(Math.floor(r() * pool.length), 1)[0];
      s.quests.list.push({ id: `${today}-${q.kind}`, kind: q.kind, target: q.target, progress: 0, reward: q.reward, claimed: false });
      s.quests.bonusClaimed = false;
    }
  }
  if (s.quests.day !== today) {
    const r = rng(today + s.createdAt);
    const pool = candidates(s, t);
    const list: QuestState[] = [];
    while (list.length < 3 && pool.length) {
      const i = Math.floor(r() * pool.length);
      const q = pool.splice(i, 1)[0];
      list.push({ id: `${today}-${q.kind}`, kind: q.kind, target: q.target, progress: 0, reward: q.reward, claimed: false });
    }
    s.quests = { day: today, list, bonusClaimed: false };
    fresh = true;
  }
  return fresh;
}

/** Засчитать действие в задания. Возвращает задания, которые только что выполнились. */
export function bumpQuest(s: GameState, kind: QuestKind, by = 1): QuestState[] {
  const done: QuestState[] = [];
  for (const q of s.quests.list) {
    if (q.kind !== kind || q.progress >= q.target) continue;
    q.progress = Math.min(q.target, q.progress + by);
    if (q.progress >= q.target) done.push(q);
  }
  return done;
}

export const STREAK_REWARDS = [10, 15, 20, 25, 30, 40, 60];
export const streakReward = (count: number) => STREAK_REWARDS[(count - 1) % 7];
export const QUEST_BONUS = 30;

// ─────────────── еженедельные «большие» задания ───────────────
export const WEEKLY_TEXT: Record<WeeklyKind, (n: number) => string> = {
  water: (n) => `Полей растения ${n} раз`,
  plant: (n) => `Посади в горшок ${n} черенка`,
  gift: (n) => `Подари ${n} черенка друзьям`,
  cut: (n) => `Возьми ${n} черенков`,
  mist: (n) => `Опрыскай растения ${n} раз`,
  adult: (n) => (n === 1 ? 'Вырасти растение до взрослого' : `Вырасти ${n} растения до взрослых`),
  bloom: () => 'Добейся цветения',
  friendWater: (n) => `Полей ${n} растения у друзей`,
  days: (n) => `Заходи ${n} разных дней`,
  feed: (n) => `Подкорми растения ${n} раза`,
};

export const WEEKLY_ICON: Record<WeeklyKind, string> = {
  water: '💧', plant: '🪴', gift: '🎁', cut: '✂️', mist: '💦', adult: '🌿', bloom: '🌸', friendWater: '🤝', days: '📅', feed: '🧪',
};

export const WEEKLY_CHEST = 100; // + редкий черенок

/** Понедельник текущей недели (по местному времени). */
export function weekStart(t: number): string {
  const d = new Date(t);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return dayKey(d.getTime());
}

export function weekLeftMs(t: number): number {
  const [y, m, d] = weekStart(t).split('-').map(Number);
  return new Date(y, m - 1, d + 7).getTime() - t;
}

function weeklyPool(s: GameState): Omit<WeeklyQuest, 'id' | 'progress' | 'claimed'>[] {
  const potted = s.plants.filter((p) => p.stage >= 2).length;
  const big = s.level >= 6;
  const out: Omit<WeeklyQuest, 'id' | 'progress' | 'claimed'>[] = [
    { kind: 'water', target: big ? 30 : 15, reward: big ? 120 : 80 },
    { kind: 'days', target: 5, reward: 100 },
    { kind: 'plant', target: 3, reward: 90 },
    { kind: 'cut', target: big ? 5 : 3, reward: 90 },
  ];
  if (s.plants.some((p) => p.stage === 4)) out.push({ kind: 'gift', target: 2, reward: 120 });
  if (potted) out.push({ kind: 'adult', target: big ? 2 : 1, reward: 130 });
  if (s.plants.some((p) => p.stage >= 2 && sp(p.sp).mist === 'love')) out.push({ kind: 'mist', target: 8, reward: 80 });
  if (s.plants.some((p) => p.stage >= 3 && sp(p.sp).bloom)) out.push({ kind: 'bloom', target: 1, reward: 120 });
  if (s.level >= 3) out.push({ kind: 'friendWater', target: 3, reward: 100 });
  if (potted && s.level >= 4) out.push({ kind: 'feed', target: 3, reward: 80 });
  return out;
}

/** Новая неделя — новые три больших задания. Возвращает true, если неделя сменилась. */
export function rollWeek(s: GameState, t: number): boolean {
  const week = weekStart(t);
  if (s.weekly?.week === week) return false;
  if (!s.plants.length) return false;
  const pool = weeklyPool(s);
  const r = rng(week + s.createdAt);
  const list: WeeklyQuest[] = [];
  while (list.length < 3 && pool.length) {
    const q = pool.splice(Math.floor(r() * pool.length), 1)[0];
    list.push({ ...q, id: `${week}-${q.kind}`, progress: 0, claimed: false });
  }
  s.weekly = { week, list, chest: false, days: [dayKey(t)] };
  const d = list.find((q) => q.kind === 'days');
  if (d) d.progress = 1;
  return true;
}

export function bumpWeekly(s: GameState, kind: WeeklyKind, by = 1): WeeklyQuest[] {
  const done: WeeklyQuest[] = [];
  for (const q of s.weekly?.list ?? []) {
    if (q.kind !== kind || q.progress >= q.target) continue;
    q.progress = Math.min(q.target, q.progress + by);
    if (q.progress >= q.target) done.push(q);
  }
  return done;
}

/** Отметить заход сегодня (для задания «заходи N дней»). */
export function weeklyVisit(s: GameState, t: number): WeeklyQuest[] {
  const w = s.weekly;
  if (!w) return [];
  const today = dayKey(t);
  if (w.days.includes(today)) return [];
  w.days.push(today);
  return bumpWeekly(s, 'days');
}
