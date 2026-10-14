// СГЕНЕРИРОВАНО из src/game/constants.ts командой npm run sync:shared — не редактировать.
import type { WindowSide, Zone } from './types.ts';

export const MIN = 60e3;
export const H = 60 * MIN;
export const D = 24 * H;

export const SLOTS = 6;
/** Подвесные кашпо над окном: места 6–8 (появляются после покупки). */
export const HANG_SLOTS = [6, 7, 8];
export const MIST_MS = 12 * H;
export const FEED_MS = 24 * H;
/** Самый первый черенок и подарки всегда укореняются за 2 минуты — чтобы сразу было «вау». */
export const QUICK_ROOT_MIN = 2;
export const SHOWOFF_MS = 3 * D;
export const MAX_CUTTINGS = 10;
export const NEIGHBOR_FREE_DAYS = 3;
export const NEIGHBOR_COOLDOWN = 7 * D;

/** Свет по сторонам окна: 1 — тень … 4 — прямое солнце. Зимой всё на ступень темнее. */
export const WINDOWS: Record<WindowSide, { name: string; short: string; glass: number; deep: number }> = {
  N: { name: 'на север', short: 'Север', glass: 3, deep: 1 },
  E: { name: 'на восток', short: 'Восток', glass: 3, deep: 2 },
  S: { name: 'на юг', short: 'Юг', glass: 4, deep: 2 },
  W: { name: 'на запад', short: 'Запад', glass: 4, deep: 2 },
};

export const ZONE_NAME: Record<Zone, string> = { glass: 'у стекла', deep: 'в глубине комнаты' };
export const LIGHT_NAME = ['', 'тень', 'полутень', 'яркий рассеянный', 'прямое солнце'];

export const STAGE_NAME = ['черенок в воде', 'пустил корни', 'росток', 'молодое', 'взрослое'];

export const NOTES: Record<number, string> = {
  1: 'Пусть растёт вместе с тобой 🌿',
  2: 'Поливай и вспоминай меня 💧',
  3: 'Кусочек моего подоконника для тебя',
  4: 'Для уюта дома 🏡',
  5: 'С праздником! 🎉',
  6: 'Просто так, потому что ты классный(ая) 💚',
};

export const SILL_NAMES: Record<string, string> = {
  room: 'Комната',
  kitchen: 'Кухня',
  balcony: 'Балкон',
};
