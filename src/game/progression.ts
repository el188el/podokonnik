import { SPECIES } from './species';
import { FLOOR_LEVEL } from './layout';

/** Сколько опыта нужно, чтобы перейти с уровня l на l+1. */
export const xpToNext = (l: number) => Math.round(40 * Math.pow(l, 1.45));
export const levelReward = (l: number) => 15 + 5 * Math.min(l, 60);

export const XP = {
  water: 2,
  mist: 2,
  root: 5,
  plant: 10,
  stage: 15,
  adult: 25,
  repot: 15,
  cut: 10,
  giftSent: 20,
  giftGot: 20,
  bloom: 20,
  feed: 3,
  quest: 10,
};

// ─────────────── ранги ───────────────
export interface Rank { level: number; title: string; icon: string }

export const RANKS: Rank[] = [
  { level: 1, title: 'Новичок', icon: '🌱' },
  { level: 3, title: 'Любитель', icon: '🌿' },
  { level: 6, title: 'Садовод', icon: '🪴' },
  { level: 10, title: 'Цветовод', icon: '🌸' },
  { level: 15, title: 'Знаток', icon: '📗' },
  { level: 20, title: 'Ботаник', icon: '🔬' },
  { level: 30, title: 'Мастер оранжереи', icon: '🏡' },
  { level: 40, title: 'Легенда подоконника', icon: '🏆' },
  { level: 50, title: 'Хранитель сада', icon: '👑' },
];

export const rankOf = (level: number) => [...RANKS].reverse().find((r) => level >= r.level)!;
export const nextRank = (level: number) => RANKS.find((r) => r.level > level);

// ─────────────── подоконники в разных комнатах ───────────────
export const SILL_UNLOCK: Record<string, { level: number; price: number; name: string; icon: string; desc: string }> = {
  room: { level: 1, price: 0, name: 'Комната', icon: '🛋', desc: '' },
  kitchen: { level: 5, price: 150, name: 'Кухня', icon: '🍳', desc: 'Подоконник на кухне: своё окно и свой свет.' },
  balcony: { level: 9, price: 300, name: 'Балкон', icon: '🌇', desc: 'Много света — раздолье для светолюбивых.' },
  bedroom: { level: 14, price: 500, name: 'Спальня', icon: '🛏', desc: 'Тихий подоконник для тенелюбивых растений.' },
  loggia: { level: 20, price: 800, name: 'Лоджия', icon: '🪟', desc: 'Застеклённая лоджия — почти оранжерея.' },
  veranda: { level: 30, price: 1500, name: 'Веранда на даче', icon: '🏡', desc: 'Дачная веранда: летом сюда переезжает весь сад.' },
};

// ─────────────── «Путь садовода»: награды за уровни ───────────────
export interface LevelPerk {
  icon: string;
  text: string;
  leaves?: number;
  feed?: number;
  pots?: number;   // глиняные горшки
  item?: string;   // предмет магазина
  form?: string;   // черенок редкой формы
}

const PERKS: Record<number, LevelPerk[]> = {
  2: [{ icon: '🧪', text: 'Подкормка ×2', feed: 2 }, { icon: '🪴', text: 'Горшки ×3', pots: 3 }],
  3: [{ icon: '🧶', text: 'Клубок и спицы на стол', item: 'yarn' }],
  4: [{ icon: '🪴', text: 'Четвёртое место у стекла можно открыть за листики' }],
  5: [{ icon: '🍳', text: 'Подоконник на кухне' }],
  6: [{ icon: '🧪', text: 'Подкормка ×3', feed: 3 }, { icon: '🪴', text: 'Горшки ×5', pots: 5 }],
  7: [{ icon: '🪴', text: 'Четвёртое место на столике можно открыть за листики' }],
  8: [{ icon: '🕰️', text: 'Часы с маятником', item: 'clock' }],
  9: [{ icon: '🌇', text: 'Балкон' }],
  10: [{ icon: '💙', text: 'Горшок «Гжель»', item: 'pot_gzhel' }],
  11: [{ icon: '🧪', text: 'Подкормка ×5', feed: 5 }],
  12: [{ icon: '🪢', text: 'Подвесные кашпо: +3 места', item: 'hangers' }],
  13: [{ icon: '🍃', text: '100 листиков', leaves: 100 }, { icon: '🪴', text: 'Горшки ×5', pots: 5 }],
  14: [{ icon: '🛏', text: 'Подоконник в спальне' }],
  15: [{ icon: '✨', text: 'Редкий черенок «Сциндапсус Неон»', form: 'neon' }],
  16: [{ icon: '🖼️', text: 'Картина «Утро в лесу»', item: 'painting' }],
  17: [{ icon: '🧪', text: 'Подкормка ×5', feed: 5 }],
  18: [{ icon: '🌼', text: 'Обои в цветочек', item: 'wp_flowers' }],
  19: [{ icon: '🍃', text: '200 листиков', leaves: 200 }],
  20: [{ icon: '🪟', text: 'Лоджия' }, { icon: '✨', text: 'Редкий черенок «Сансевиерия Мунлайт»', form: 'moonshine' }],
  22: [{ icon: '❤️', text: 'Горшок «Хохлома»', item: 'pot_khokhloma' }],
  25: [{ icon: '✨', text: 'Редкий черенок «Монстера Альбо»', form: 'albo' }],
  28: [{ icon: '🪵', text: 'Деревянная вагонка', item: 'wp_wood' }],
  30: [{ icon: '🏡', text: 'Веранда на даче' }, { icon: '🍃', text: '500 листиков', leaves: 500 }],
  35: [{ icon: '✨', text: 'Редкий черенок «Фикус Тинеке»', form: 'tineke' }],
  40: [{ icon: '🍃', text: '1000 листиков', leaves: 1000 }],
  45: [{ icon: '✨', text: 'Редкий черенок «Фиалка Химера»', form: 'chimera' }],
  50: [{ icon: '👑', text: '2000 листиков', leaves: 2000 }],
};

/** Особые награды уровня (кроме обычных листиков за уровень). */
export function levelPerks(level: number): LevelPerk[] {
  if (PERKS[level]) return PERKS[level];
  if (level > 50 && level % 5 === 0) return [{ icon: '🎁', text: '300 листиков и подкормка ×5', leaves: 300, feed: 5 }];
  if (level > 20 && level % 2 === 1) return [{ icon: '🧪', text: 'Подкормка ×3', feed: 3 }];
  return [];
}

/** Что открывается на уровне: новые виды, подоконники и особые награды. */
export function unlocksAt(level: number): string[] {
  return [
    ...SPECIES.filter((s) => s.unlockLevel === level).map((s) => s.name),
    ...(level === FLOOR_LEVEL ? ['🌴 Пол у окна — место для больших растений'] : []),
    ...levelPerks(level).map((p) => `${p.icon} ${p.text}`),
  ];
}
