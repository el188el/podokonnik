// СГЕНЕРИРОВАНО из src/game/events.ts командой npm run sync:shared — не редактировать.
// Сезонные ивенты: своя валюта, сезонный пропуск (бесплатная и платная ветки),
// эксклюзивный декор, горшки и редкие формы. Общий файл для игры и сервера.

export interface PassReward {
  leaves?: number;
  feed?: number;
  pots?: number;   // глиняные горшки
  boost?: number;  // стимуляторы роста
  item?: string;   // id товара магазина (декор, горшок)
  form?: string;   // редкая форма — черенок в запас
  hue?: { sp: string; hue: string }; // черенок сезонного цвета цветков — только из пропуска
  title?: string;  // звание сезона в профиле
}

export type EventTheme = 'autumn' | 'winter' | 'spring' | 'summer';

export interface GameEvent {
  id: string;
  title: string;
  token: string;      // значок валюты ивента
  tokenName: string;  // «кленовых листьев»
  start: [number, number]; // [месяц, день] включительно
  end: [number, number];
  desc: string;
  theme: EventTheme;
  tiers: number[];          // сколько валюты нужно для уровня пропуска
  free: PassReward[];
  premium: PassReward[];
}

export const PASS_LEVELS = 30;

/** Порог каждого уровня: шаг растёт от 10 до 97 — всего ~1600 жетонов за сезон. */
const TIERS = Array.from({ length: PASS_LEVELS }, (_, i) => i).reduce<number[]>((acc, i) => [...acc, (acc[i - 1] ?? 0) + 10 + 3 * i], []);

/**
 * Награды сезона. Бесплатная ветка: декор сезона на 5, 15 и 25 уровнях, между ними —
 * листики, подкормки, горшки и стимуляторы. Платная — только эксклюзив, которого больше
 * нигде не получить: два горшка, обои, два сезонных цвета цветков, декор, звание
 * и редкая форма на 30-м уровне. На остальных уровнях платной ветки наград нет.
 */
export const PREM_AT = { pot: 1, hue1: 4, pot2: 8, wp: 12, hue2: 16, decor: 20, title: 24, form: 29 } as const;
interface PassSpec { free: string[]; prem: string; pot: string; pot2: string; wp: string; hues: [string, string][]; title: string; form: string }
function pass(x: PassSpec): Pick<GameEvent, 'tiers' | 'free' | 'premium'> {
  const free: PassReward[] = [];
  const premium: PassReward[] = [];
  const freeAt = [4, 14, 24];
  for (let i = 0; i < PASS_LEVELS; i++) {
    const fi = freeAt.indexOf(i);
    if (fi >= 0 && x.free[fi]) free.push({ item: x.free[fi] });
    else if (i === PASS_LEVELS - 1) free.push({ leaves: 300 });
    else if (i % 5 === 1) free.push({ feed: 1 + Math.floor(i / 10) });
    else if (i % 5 === 2) free.push({ pots: 2 });
    else if (i % 5 === 3) free.push({ boost: 1 });
    else free.push({ leaves: 15 + 5 * i });

    premium.push(
      i === PREM_AT.pot ? { item: x.pot }
      : i === PREM_AT.hue1 ? { hue: { sp: x.hues[0][0], hue: x.hues[0][1] } }
      : i === PREM_AT.pot2 ? { item: x.pot2 }
      : i === PREM_AT.wp ? { item: x.wp }
      : i === PREM_AT.hue2 ? { hue: { sp: x.hues[1][0], hue: x.hues[1][1] } }
      : i === PREM_AT.decor ? { item: x.prem }
      : i === PREM_AT.title ? { title: x.title }
      : i === PREM_AT.form ? { form: x.form }
      : {},
    );
  }
  return { tiers: TIERS, free, premium };
}

/** Пустая ячейка платной ветки — без награды. */
export const isEmptyReward = (r: PassReward | undefined) => !r || Object.keys(r).length === 0;

/** Сезоны идут круглый год, один за другим. */
export const EVENTS: GameEvent[] = [
  {
    id: 'cozy', title: 'Зимний уют', token: '🧣', tokenName: 'шарфиков', theme: 'winter',
    start: [1, 15], end: [2, 29],
    desc: 'Морозы за окном, батареи греют, а растениям не хватает света и влаги. Береги подоконник — и вяжи шарфики.',
    ...pass({ free: ['mittens'], prem: 'cocoa', pot: 'pot_cozy', pot2: 'pot_mitten', wp: 'wp_knit', hues: [['violet', 'snowflake'], ['cyclamen', 'mulled']], title: 'Хранитель уюта', form: 'frost' }),
  },
  {
    id: 'spring', title: 'Весеннее пробуждение', token: '🌷', tokenName: 'тюльпанов', theme: 'spring',
    start: [3, 1], end: [4, 15],
    desc: 'Солнца становится больше, растения просыпаются. Самое время пересаживать и дарить черенки!',
    ...pass({ free: ['tulips', 'birdhouse'], prem: 'watering_can', pot: 'pot_pastel', pot2: 'pot_tulip', wp: 'wp_bloom', hues: [['violet', 'tulip'], ['begonia', 'sakura']], title: 'Вестник весны', form: 'lemon' }),
  },
  {
    id: 'dacha', title: 'Майские на даче', token: '🍓', tokenName: 'ягодок', theme: 'spring',
    start: [4, 16], end: [5, 31],
    desc: 'Рассада на каждом подоконнике, впереди дача и шашлыки. Расти, черенкуй и делись с соседями.',
    ...pass({ free: ['seedlings'], prem: 'strawberry', pot: 'pot_berry', pot2: 'pot_garden', wp: 'wp_veranda', hues: [['geranium', 'wildberry'], ['cactus', 'mint']], title: 'Дачник со стажем', form: 'berry' }),
  },
  {
    id: 'summer', title: 'Лето на подоконнике', token: '☀️', tokenName: 'солнышек', theme: 'summer',
    start: [6, 1], end: [7, 31],
    desc: 'Жара и длинные дни: поливать чаще, притенять нежных. Лови солнышки!',
    ...pass({ free: ['lemonade'], prem: 'watermelon', pot: 'pot_sun', pot2: 'pot_sea', wp: 'wp_sea', hues: [['hibiscus', 'lagoon'], ['kalanchoe', 'sunset']], title: 'Летний садовод', form: 'sunny' }),
  },
  {
    id: 'apples', title: 'Яблочный спас', token: '🍎', tokenName: 'яблочек', theme: 'summer',
    start: [8, 1], end: [9, 30],
    desc: 'Конец лета: варенье, яблоки и последние подкормки сезона. Готовь подоконник к осени.',
    ...pass({ free: ['apples'], prem: 'jam', pot: 'pot_apple', pot2: 'pot_honey', wp: 'wp_orchard', hues: [['rose', 'appleblossom'], ['azalea', 'honey']], title: 'Яблочный мастер', form: 'applebloom' }),
  },
  {
    id: 'autumn', title: 'Золотая осень', token: '🍂', tokenName: 'кленовых листьев', theme: 'autumn',
    start: [10, 1], end: [11, 30],
    desc: 'За окном листопад, а на подоконнике — уют. Собирай кленовые листья за заботу о растениях и открывай осенние награды.',
    ...pass({ free: ['plaid', 'pumpkin'], prem: 'lantern', pot: 'pot_autumn', pot2: 'pot_maple', wp: 'wp_leaffall', hues: [['violet', 'maple'], ['rose', 'amber']], title: 'Золотая осень', form: 'sunset' }),
  },
  {
    id: 'newyear', title: 'Новогодний подоконник', token: '❄️', tokenName: 'снежинок', theme: 'winter',
    start: [12, 1], end: [1, 14],
    desc: 'Снег, гирлянды и мандарины. Декабрист готовится цвести, а ты собираешь снежинки за заботу и подарки друзьям.',
    ...pass({ free: ['garland', 'tangerines'], prem: 'tree', pot: 'pot_snow', pot2: 'pot_gift', wp: 'wp_frost', hues: [['cyclamen', 'tangerine'], ['azalea', 'frost']], title: 'Дед Мороз подоконника', form: 'snowwhite' }),
  },
];

export const EVENT_BY_ID: Record<string, GameEvent> = Object.fromEntries(EVENTS.map((e) => [e.id, e]));

const md = (t: number) => {
  const d = new Date(t);
  return (d.getMonth() + 1) * 100 + d.getDate();
};

function inRange(e: GameEvent, t: number) {
  const x = md(t);
  const a = e.start[0] * 100 + e.start[1];
  const b = e.end[0] * 100 + e.end[1];
  return a <= b ? x >= a && x <= b : x >= a || x <= b; // через Новый год
}

/** Ивент, идущий в момент t (по местной дате игрока). */
export function activeEvent(t: number): GameEvent | null {
  return EVENTS.find((e) => inRange(e, t)) ?? null;
}

/** Когда ивент закончится (конец последнего дня), мс. */
export function eventEndsAt(e: GameEvent, t: number): number {
  const d = new Date(t);
  let y = d.getFullYear();
  if (e.start[0] > e.end[0] && d.getMonth() + 1 >= e.start[0]) y += 1;
  return new Date(y, e.end[0] - 1, e.end[1], 23, 59, 59).getTime();
}

/** Сезон ивента — чтобы пропуск одного года не переходил на следующий. */
export function eventSeason(e: GameEvent, t: number): string {
  const d = new Date(t);
  const y = e.start[0] > e.end[0] && d.getMonth() + 1 <= e.end[0] ? d.getFullYear() - 1 : d.getFullYear();
  return `${e.id}-${y}`;
}

export const tierOf = (e: GameEvent, tokens: number) => e.tiers.filter((n) => tokens >= n).length;

/** Сколько валюты ивента даёт действие. */
export const EVENT_TOKENS = {
  water: 1,
  mist: 1,
  plant: 2,
  cut: 3,
  quest: 5,
  gift: 5,
  friendWater: 3,
  twin: 2,
  catch: 1,  // пойманный падающий жетон
};
