// Общие типы игры. Всё состояние — простой JSON: его легко хранить
// локально, в Telegram CloudStorage и (на следующем этапе) на сервере.

export type Zone = 'glass' | 'deep';
export type WindowSide = 'N' | 'E' | 'S' | 'W';
export type Mist = 'love' | 'ok' | 'no';
export type Overwater = 'sensitive' | 'normal' | 'tolerant';
/** 1 — неубиваемые, 2 — с характером, 3 — для опытных */
export type Difficulty = 1 | 2 | 3;

/**
 * Стадии: 0 — черенок в стакане с водой, 1 — пустил корни (пора сажать),
 * 2 — росток, 3 — молодое, 4 — взрослое.
 */
export type Stage = 0 | 1 | 2 | 3 | 4;

export type ArtKind =
  | 'grass' | 'trail' | 'heartTrail' | 'blades' | 'dracaena' | 'aloe' | 'rosette'
  | 'crassula' | 'kalanchoe' | 'zamioculcas' | 'monstera' | 'ficus'
  | 'spathiphyllum' | 'anthurium' | 'geranium' | 'decembrist' | 'orchid' | 'hibiscus'
  | 'cactus' | 'hoya' | 'begonia' | 'fern' | 'cyclamen' | 'poinsettia' | 'citrus' | 'coleus';

export interface ArtSpec {
  kind: ArtKind;
  leaf: string;      // основной цвет листа
  leaf2?: string;    // второй цвет: пестролистность, полосы, кайма
  flower?: string;   // цвет цветка (если цветёт)
  variegate?: string; // светлые мазки на листьях (пестролистные виды)
}

export interface Bloom {
  /** месяцы цветения (1–12); если не задано — цветёт круглый год при хорошем уходе */
  months?: number[];
  /** нужен зимний покой (декабрист): осенью меньше полива и в глубине комнаты */
  needsRest?: boolean;
}

export interface Species {
  id: string;
  name: string;
  folk?: string;        // народное имя: «щучий хвост», «женское счастье»
  latin: string;
  difficulty: Difficulty;
  unlockLevel: number;
  price: number;        // цена черенка в магазине, в листиках
  waterDays: number;    // как часто поливать
  drought: number;      // сколько дней после пересыхания терпит без вреда
  overwater: Overwater; // как переносит перелив
  light: [number, number]; // комфортный свет, 1 (тень) … 4 (прямое солнце)
  zone: Zone;           // где обычно лучше
  mist: Mist;
  rootMin: number;      // минут до корней в стакане
  stageHours: [number, number]; // часов роста: росток → молодое, молодое → взрослое
  repotDays: number;    // дней во взрослом виде до «тесно в горшке»
  cutHours: number;     // перерыв между черенками
  bloom?: Bloom;
  art: ArtSpec;
  speed: string;        // «быстро» / «средне» / «медленно» — для игрока
  gen: string;          // род. падеж: «черенок монстеры»
  acc: string;          // вин. падеж: «подарить монстеру»
  facts: string[];
  mistTip: string;
  care: string;         // коротко про уход по-настоящему
  buy: string;          // сколько стоит в России
  free: string;         // как получить бесплатно / укоренить
}

import type { Place, Weather } from './weather';

export interface Plant {
  id: string;
  sp: string;
  form?: string;        // редкая форма (Альбо, Неон…)
  hue?: string;         // цвет цветков после гибридизации
  pollinatedAt?: number;
  sill: string;
  slot: number;
  zone: Zone;
  nick?: string;
  pot: string;          // скин горшка
  bigPot: boolean;      // пересажено в горшок L
  createdAt: number;
  quick?: boolean;      // первый черенок и подарки укореняются за 2 минуты
  rootStart?: number;   // когда налили воду в стакан
  plantedAt?: number;   // когда посадили в грунт
  stage: Stage;
  growth: number;       // накопленный «эффективный» рост в часах с посадки
  moisture: number;     // 0…1.4 (выше 1 — перелив)
  dryFor: number;       // часов подряд с сухой землёй
  badLightFor: number;  // часов подряд с неподходящим светом
  health: number;       // 0…100
  mistUntil?: number;
  feedUntil?: number;   // подкормка
  adultAt?: number;
  repottedAt?: number;
  lastCut?: number;
  rest: number;         // часов зимнего покоя (для декабриста)
  blooming: boolean;
  bloomedOnce?: boolean;
  lowestHealth: number; // для достижения «Спасатель»
  from?: { name: string; note: number; code: string };
  claimedAt?: number;
  showoffDone?: boolean;
  ageSeen?: number;     // последняя отпразднованная отметка возраста (дней)
  waterBy?: { name: string; at: number }; // кто полил последним (общий подоконник)
}

export interface Sill {
  id: string;
  name: string;
  window: WindowSide | null;
  decor: string[];      // id расставленного декора
}

export interface Cutting {
  id: string;
  sp: string;
  form?: string;
  hue?: string;
  seed?: boolean;      // семечко от гибридизации
  at: number;
  fromPlant?: string;
}

export interface PendingGift {
  sp: string;
  form?: string;
  hue?: string;
  from: string;
  note: number;
  code: string;
}

export type WeeklyKind = 'water' | 'plant' | 'gift' | 'cut' | 'mist' | 'adult' | 'bloom' | 'friendWater' | 'days' | 'feed';

export interface WeeklyQuest {
  id: string;
  kind: WeeklyKind;
  target: number;
  progress: number;
  reward: number;
  claimed: boolean;
}

export interface QuestState {
  id: string;
  kind: QuestKind;
  target: number;
  progress: number;
  reward: number;
  claimed: boolean;
}

export type QuestKind =
  | 'water' | 'mist' | 'cut' | 'plant' | 'gift' | 'fixLight' | 'buy' | 'repot' | 'feed' | 'visitHerbarium';

export interface Stats {
  waters: number;
  mists: number;
  cuts: number;
  giftsSent: number;
  giftsGot: number;
  planted: number;
  repots: number;
  adults: number;
  blooms: number;
  rescues: number;
  neighbor: number;
  bought: number;
  questsDone: number;
  nightWater: number;
  hybrids?: number;
  doctor?: number;      // консультаций «доктора»
}

export interface GameState {
  v: number;
  createdAt: number;
  simAt: number;       // до какого момента досчитана симуляция
  lastSeen: number;    // для экрана «Пока тебя не было»
  offset: number;      // перемотка времени в режиме отладки
  name: string;
  xp: number;
  level: number;
  leaves: number;      // мягкая валюта «листики»
  sills: Sill[];
  activeSill: string;
  plants: Plant[];
  cuttings: Cutting[];
  owned: Record<string, number>; // купленные товары: горшки, декор, расходники
  discovered: string[]; // виды, открытые в гербарии
  grownAdult: string[]; // виды, выращенные до взрослого
  achievements: string[];
  received: string[];  // коды подарков, которые уже забраны
  pending: PendingGift[];
  sent: { code: string; sp: string; at: number }[];
  stats: Stats;
  neighbor: { until: number; cooldownUntil: number } | null;
  streak: { day: string; count: number; best: number; claimedDay: string };
  quests: { day: string; list: QuestState[]; bonusClaimed: boolean };
  log: { at: number; text: string }[];
  settings: { sound: boolean; haptics: boolean; quietFrom: number; quietTo: number; notify?: boolean; place?: Place | null };
  weather?: Weather;    // последняя сводка погоды за окном
  contest?: { week: string; entered: boolean; votes: number }; // награды конкурса за неделю
  weekly?: { week: string; list: WeeklyQuest[]; chest: boolean; days: string[] }; // большие задания недели
  inboxSeen?: number[]; // обработанные награды с сервера
  plusUntil?: number;   // «Садовник+» активен до
  events?: Record<string, EventProgress>; // прогресс ивентов по сезонам (autumn-2026)
  twins?: Twin[];       // двойники настоящих растений
  ads?: { day: string; count: number }; // ролики за награду сегодня
  starter?: { claimed: number[] };       // подарки новичка
  round?: { key: string; checked: string[]; done: boolean }; // обход подоконника
  hues?: Record<string, string[]>;      // собранные цвета по видам
  forms?: string[];     // собранные редкие формы
  bloomed?: string[];   // виды, которые цвели у игрока
  shelves?: string[];   // забранные награды полок альбома
  calendar?: { month: string; done: string[] }; // отмеченные дела календаря ухода
  tutorial: number;
}

export interface EventProgress {
  tokens: number;
  free: number[];     // забранные уровни бесплатной ветки
  prem: number[];     // забранные уровни платной ветки
  premium: boolean;   // куплен сезонный пропуск
}

/** Двойник настоящего комнатного растения игрока. */
export interface Twin {
  id: string;
  sp: string;
  nick: string;
  every: number;      // поливать раз в N дней
  createdAt: number;
  lastWater?: number;
  waters: number;
  streak: number;     // поливов вовремя подряд
  notify: boolean;
  photos?: { id: string; at: number }[]; // снимки настоящего растения (сами фото — на устройстве)
}
