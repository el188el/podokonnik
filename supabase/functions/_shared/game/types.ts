// СГЕНЕРИРОВАНО из src/game/types.ts командой npm run sync:shared — не редактировать.
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

import type { Place, Weather } from './weather.ts';

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
  bigPot: boolean;      // старое поле: пересажено в большой горшок (теперь XL)
  potSize?: number;     // размер горшка: 1 S, 2 M, 3 L, 4 XL
  shape?: string;       // форма горшка
  wetLeaves?: number;   // когда опрыскали растение, которое мочить нельзя (листья ещё мокрые)
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
  drain?: boolean;      // в горшке дренаж из керамзита — лишняя вода уходит быстро
  boostUntil?: number;  // действует стимулятор роста
  boostAt?: number;     // когда давали стимулятор (не чаще раза в неделю)
  adultAt?: number;
  repottedAt?: number;
  lastCut?: number;
  rest: number;         // часов зимнего покоя (для декабриста)
  blooming: boolean;
  bloomedOnce?: boolean;
  lowestHealth: number; // для достижения «Спасатель»
  from?: { name: string; note: number; code: string };
  line?: Ancestor[];    // родословная: от чьих растений этот черенок
  claimedAt?: number;
  showoffDone?: boolean;
  ageSeen?: number;     // последняя отпразднованная отметка возраста (дней)
  waterBy?: { name: string; at: number }; // кто полил последним (общий подоконник)
  problem?: { kind: ProblemKind; at: number; sev: number }; // вредитель или болезнь (sev 0…1)
  guardUntil?: number;  // защита после лечения
  wetFor?: number;      // часов подряд с переливом
  hotFor?: number;      // часов подряд на слишком ярком солнце
  coldFor?: number;     // часов подряд в холоде (сквозняк, холодное стекло)
  warmFor?: number;     // часов подряд в тепле после холода
  darkFor?: number;     // часов подряд в темноте
  goodFor?: number;     // часов подряд при хорошем свете
  splashedAt?: number;  // когда на листья попала вода (для тех, кому нельзя)
  named?: boolean;      // награда за имя уже выдана
}

export interface Sill {
  id: string;
  name: string;
  window: WindowSide | null;
  decor: string[];      // id расставленного декора
  pos?: Record<string, DecorPos>; // куда игрок переставил предметы
  off?: string[];       // выключенные предметы (фитолампа, радио, свеча…)
  vent?: boolean;       // форточка открыта
  curtains?: boolean;   // шторы задёрнуты
  colors?: { wall?: string; table?: string; sill?: string }; // цвета стен, столика и подоконника
}

/** Положение предмета: доля ширины ряда (0…1) и ряд — подоконник или столик. */
export interface DecorPos { x: number; row?: 'sill' | 'table' }

export interface Cutting {
  id: string;
  sp: string;
  form?: string;
  hue?: string;
  seed?: boolean;      // семечко от гибридизации
  at: number;
  fromPlant?: string;
  line?: Ancestor[];
}

/** Предок в родословной черенка: чьё растение, с какого года, как его звали, было ли оно реликвией. */
export interface Ancestor { n: string; y: number; k?: string; h?: 1 }

export interface PendingGift {
  sp: string;
  form?: string;
  hue?: string;
  from: string;
  note: number;
  code: string;
  line?: Ancestor[];
}

export type ProblemKind = 'rot' | 'gnats' | 'mite' | 'aphid' | 'mealybug' | 'mildew' | 'burn' | 'leggy' | 'cold';

export type WeeklyKind = 'water' | 'plant' | 'gift' | 'cut' | 'mist' | 'adult' | 'bloom' | 'friendWater' | 'days' | 'feed';

export interface WeeklyQuest {
  id: string;
  kind: WeeklyKind;
  target: number;
  progress: number;
  reward: number;
  claimed: boolean;
}

export type OrderKind = 'cutting' | 'bloom' | 'adult' | 'healthy' | 'rare' | 'hue';

export interface Order {
  id: string;
  who: string;   // id соседа
  kind: OrderKind;
  sp: string;
  n?: number;     // сколько черенков
  form?: string;  // редкая форма (kind: 'rare')
  hue?: string;   // цвет цветков (kind: 'hue')
  reward: number;
  xp: number;
  at: number;
  until: number;
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
  cured?: number;       // вылечено растений
  caughtAll?: number;   // всего поймано падающих листиков
  herbarium?: number;   // заглядывал в гербарий
  postcards?: number;   // отправлено открыток
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
  settings: { sound: boolean; haptics: boolean; quietFrom: number; quietTo: number; notify?: boolean; place?: Place | null; theme?: 'auto' | 'light' | 'dark' };
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
  starterPack?: boolean; // стартовый пакет куплен
  plusGifts?: { code: string; at: number; sent?: boolean }[]; // купленные подписки в подарок
  box?: string;          // день, когда открывали ящик-сюрприз
  firstChest?: boolean;  // сундучок первого часа забран
  places?: number[];     // купленные заранее места (9, 10)
  perksTo?: number;      // до какого уровня выданы награды «Пути садовода»
  mastery?: Record<string, { pts: number; stars: number }>; // мастерство видов
  grannyPot?: string;    // день, когда Валентина Петровна выручила горшком
  caught?: { day: string; n: number }; // пойманные падающие жетоны сезона
  firstSteps?: number[];  // забранные награды «Первых шагов»
  daily?: string;         // день, когда открыт ежедневный сундучок (после первой недели)
  catColors?: Record<string, string>; // окрасы котиков
  invites?: number[];    // забранные ступени лестницы приглашений
  catPet?: string;       // день, когда гладили Барсика
  boosts?: { day: string; n: number }; // сколько стимуляторов дали сегодня
  orders?: { list: Order[]; next: number; done: number; hearts: Record<string, number> }; // заказы соседей
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
