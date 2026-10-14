import { SPECIES } from './species';
import { hueOf } from './breeding';
import type { GameState } from './types';

export interface Achievement {
  id: string;
  icon: string;
  title: string;
  text: string;
  reward: number;
  done: (s: GameState) => boolean;
  progress?: (s: GameState) => [number, number];
}

const n = (v: number, max: number): [number, number] => [Math.min(v, max), max];

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_plant', icon: '🌱', title: 'Первый черенок', text: 'Поставь первый черенок в воду', reward: 10, done: (s) => s.plants.length > 0 || s.stats.planted > 0 },
  { id: 'first_water', icon: '💧', title: 'Первый полив', text: 'Полей растение в горшке', reward: 10, done: (s) => s.stats.waters > 0 },
  { id: 'first_pot', icon: '🪴', title: 'В свой горшок', text: 'Посади укоренившийся черенок', reward: 15, done: (s) => s.stats.planted > 0 },
  { id: 'first_adult', icon: '🌿', title: 'Совсем взрослое', text: 'Вырасти растение до взрослого', reward: 30, done: (s) => s.stats.adults > 0 },
  { id: 'first_cut', icon: '✂️', title: 'Садовые ножницы', text: 'Возьми первый черенок', reward: 20, done: (s) => s.stats.cuts > 0 },
  { id: 'gift_sent', icon: '🎁', title: 'Щедрый подоконник', text: 'Подари черенок другу', reward: 30, done: (s) => s.stats.giftsSent > 0 },
  { id: 'gift_got', icon: '💌', title: 'Подарок от друга', text: 'Получи черенок в подарок', reward: 30, done: (s) => s.stats.giftsGot > 0 },
  { id: 'gift_5', icon: '🤝', title: 'Делись зеленью', text: 'Подари 5 черенков', reward: 60, done: (s) => s.stats.giftsSent >= 5, progress: (s) => n(s.stats.giftsSent, 5) },
  { id: 'full_sill', icon: '🪟', title: 'Заполненный подоконник', text: 'Поставь растения во все 6 мест', reward: 40, done: (s) => s.sills.some((sl) => s.plants.filter((p) => p.sill === sl.id).length >= 6) },
  { id: 'collector_5', icon: '📗', title: 'Юный ботаник', text: 'Вырасти 5 разных видов до взрослых', reward: 50, done: (s) => s.grownAdult.length >= 5, progress: (s) => n(s.grownAdult.length, 5) },
  { id: 'collector_10', icon: '📚', title: 'Ботаник', text: 'Вырасти 10 разных видов', reward: 100, done: (s) => s.grownAdult.length >= 10, progress: (s) => n(s.grownAdult.length, 10) },
  { id: 'collector_all', icon: '🏆', title: 'Полный гербарий', text: `Вырасти все ${SPECIES.length} видов`, reward: 300, done: (s) => s.grownAdult.length >= SPECIES.length, progress: (s) => n(s.grownAdult.length, SPECIES.length) },
  { id: 'first_bloom', icon: '🌸', title: 'Зацвело!', text: 'Добейся цветения', reward: 40, done: (s) => s.stats.blooms > 0 },
  { id: 'decembrist', icon: '🎄', title: 'Новогоднее чудо', text: 'Декабрист зацвёл после зимнего покоя', reward: 80, done: (s) => s.plants.some((p) => p.sp === 'decembrist' && p.bloomedOnce) },
  { id: 'repot', icon: '🏡', title: 'Новоселье', text: 'Пересади растение в большой горшок', reward: 20, done: (s) => s.stats.repots > 0 },
  { id: 'rescue', icon: '🚑', title: 'Спасатель', text: 'Выходи растение, которое совсем засохло', reward: 50, done: (s) => s.stats.rescues > 0 },
  { id: 'neighbor', icon: '👵', title: 'Соседка выручит', text: 'Оставь растения на соседку', reward: 15, done: (s) => s.stats.neighbor > 0 },
  { id: 'level_5', icon: '⭐', title: 'Уровень 5', text: 'Дорасти до 5 уровня', reward: 30, done: (s) => s.level >= 5, progress: (s) => n(s.level, 5) },
  { id: 'level_10', icon: '🌟', title: 'Уровень 10', text: 'Дорасти до 10 уровня', reward: 80, done: (s) => s.level >= 10, progress: (s) => n(s.level, 10) },
  { id: 'streak_7', icon: '🔥', title: 'Неделя заботы', text: 'Заходи 7 дней подряд', reward: 50, done: (s) => s.streak.best >= 7, progress: (s) => n(s.streak.best, 7) },
  { id: 'streak_30', icon: '💎', title: 'Месяц заботы', text: 'Заходи 30 дней подряд', reward: 200, done: (s) => s.streak.best >= 30, progress: (s) => n(s.streak.best, 30) },
  { id: 'night_owl', icon: '🦉', title: 'Ночной садовник', text: 'Полей растение глубокой ночью', reward: 15, done: (s) => s.stats.nightWater > 0 },
  { id: 'hybrid', icon: '🐝', title: 'Селекционер', text: 'Получи первое семечко от опыления', reward: 30, done: (s) => (s.stats.hybrids ?? 0) > 0 },
  { id: 'hybrid_rare', icon: '🌈', title: 'Небывалый цвет', text: 'Выведи редкий цвет цветков', reward: 100, done: (s) => Object.entries(s.hues ?? {}).some(([sp, list]) => list.some((h) => hueOf(sp, h)?.rare)) },
  { id: 'violet_rainbow', icon: '🎨', title: 'Радуга фиалок', text: 'Собери 5 цветов фиалок', reward: 120, done: (s) => (s.hues?.violet ?? []).filter((h) => h !== 'purple').length >= 4, progress: (s) => n((s.hues?.violet ?? []).filter((h) => h !== 'purple').length + 1, 5) },
  { id: 'quests_20', icon: '📋', title: 'Ответственный', text: 'Выполни 20 ежедневных заданий', reward: 60, done: (s) => s.stats.questsDone >= 20, progress: (s) => n(s.stats.questsDone, 20) },
];

/** Возвращает только что открытые достижения и сразу помечает их. */
export function checkAchievements(s: GameState): Achievement[] {
  const fresh = ACHIEVEMENTS.filter((a) => !s.achievements.includes(a.id) && a.done(s));
  for (const a of fresh) {
    s.achievements.push(a.id);
    s.leaves += a.reward;
  }
  return fresh;
}
