// Сезонные ивенты: своя валюта, сезонный пропуск (бесплатная и платная ветки),
// эксклюзивный декор, горшки и редкие формы. Общий файл для игры и сервера.

export interface PassReward {
  leaves?: number;
  feed?: number;
  item?: string;   // id товара магазина (декор, горшок)
  form?: string;   // редкая форма — черенок в запас
}

export interface GameEvent {
  id: string;
  title: string;
  token: string;      // значок валюты ивента
  tokenName: string;  // «кленовых листьев»
  start: [number, number]; // [месяц, день] включительно
  end: [number, number];
  desc: string;
  theme: 'autumn' | 'winter' | 'spring';
  tiers: number[];          // сколько валюты нужно для уровня пропуска
  free: PassReward[];
  premium: PassReward[];
}

const TIERS = [10, 25, 45, 70, 100, 135, 175, 220, 270, 330];

export const EVENTS: GameEvent[] = [
  {
    id: 'autumn', title: 'Золотая осень', token: '🍂', tokenName: 'кленовых листьев', theme: 'autumn',
    start: [10, 1], end: [11, 15],
    desc: 'За окном листопад, а на подоконнике — уют. Собирай кленовые листья за заботу о растениях и открывай осенние награды.',
    tiers: TIERS,
    free: [{ leaves: 20 }, { feed: 1 }, { leaves: 30 }, { item: 'plaid' }, { leaves: 40 }, { feed: 2 }, { leaves: 50 }, { item: 'pumpkin' }, { leaves: 60 }, { leaves: 100 }],
    premium: [{ leaves: 50 }, { item: 'pot_autumn' }, { feed: 3 }, { leaves: 80 }, { item: 'lantern' }, { leaves: 100 }, { feed: 5 }, { leaves: 150 }, { leaves: 200 }, { form: 'sunset' }],
  },
  {
    id: 'newyear', title: 'Новогодний подоконник', token: '❄️', tokenName: 'снежинок', theme: 'winter',
    start: [12, 15], end: [1, 14],
    desc: 'Снег, гирлянды и мандарины. Декабрист готовится цвести, а ты собираешь снежинки за заботу и подарки друзьям.',
    tiers: TIERS,
    free: [{ leaves: 20 }, { feed: 1 }, { item: 'garland' }, { leaves: 30 }, { leaves: 40 }, { feed: 2 }, { item: 'tangerines' }, { leaves: 50 }, { leaves: 60 }, { leaves: 100 }],
    premium: [{ leaves: 50 }, { item: 'pot_snow' }, { feed: 3 }, { item: 'tree' }, { leaves: 80 }, { leaves: 100 }, { feed: 5 }, { leaves: 150 }, { leaves: 200 }, { form: 'snowwhite' }],
  },
  {
    id: 'spring', title: 'Весеннее пробуждение', token: '🌷', tokenName: 'тюльпанов', theme: 'spring',
    start: [3, 1], end: [3, 31],
    desc: 'Солнца становится больше, растения просыпаются. Самое время пересаживать и дарить черенки!',
    tiers: TIERS,
    free: [{ leaves: 20 }, { feed: 1 }, { leaves: 30 }, { item: 'tulips' }, { leaves: 40 }, { feed: 2 }, { leaves: 50 }, { item: 'birdhouse' }, { leaves: 60 }, { leaves: 100 }],
    premium: [{ leaves: 50 }, { item: 'pot_pastel' }, { feed: 3 }, { leaves: 80 }, { item: 'watering_can' }, { leaves: 100 }, { feed: 5 }, { leaves: 150 }, { leaves: 200 }, { form: 'lemon' }],
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
};
