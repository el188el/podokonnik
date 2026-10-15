// СГЕНЕРИРОВАНО из src/game/cat.ts командой npm run sync:shared — не редактировать.
// Кот Барсик живёт на подоконнике: время от времени жуёт растения (особенно
// хлорофитум — кошки его обожают), садится в горшки и рассыпает землю.
// Ядовитые для кошек растения он обнюхивает и уходит — игра подсказывает, какие опасны.
// Кошачья трава на подоконнике отвлекает его почти всегда. Общий файл для игры и сервера.

import { roll } from './problems.ts';
import { sp } from './species.ts';
import type { Plant } from './types.ts';

/** Что кошки любят пожевать (безопасно для кота, но не для растения). */
export const CAT_CHEWS = ['chlorophytum', 'fern', 'peperomia', 'tradescantia', 'coleus'];
/** Ядовитые для кошек — реальный список частых комнатных растений. */
export const CAT_TOXIC = ['spathiphyllum', 'dracaena', 'poinsettia', 'aloe', 'scindapsus', 'monstera', 'ficus', 'cyclamen', 'kalanchoe', 'aglaonema', 'crassula', 'begonia', 'zamioculcas', 'citrus'];

export type CatAction = 'chew' | 'sit' | 'sniff' | 'grass';

/** До трёх котиков: у каждого своё имя и окрас по умолчанию. */
export const CAT_IDS = ['cat', 'cat2', 'cat3'];
export const CAT_NAMES: Record<string, string> = { cat: 'Барсик', cat2: 'Мурка', cat3: 'Пушок' };
export const CAT_DEFAULT_COLOR: Record<string, string> = { cat: 'ginger', cat2: 'grey', cat3: 'black' };

export interface CatEvent { action: CatAction; plant: string }

const PER_DAY = 0.7; // примерно раз в полтора дня кот что-нибудь вытворяет

/** Проделки кота за шаг симуляции на одном подоконнике. */
export function catStep(plants: Plant[], sillKey: string, dtH: number, step: number, grass: boolean): CatEvent | null {
  if (roll(sillKey, 'cat', step) >= PER_DAY * (dtH / 24)) return null;
  const potted = plants.filter((p) => p.stage >= 2);
  if (!potted.length) return null;
  if (grass && roll(sillKey, 'cat-grass', step) < 0.85) return { action: 'grass', plant: potted[0].id };
  const p = potted[Math.floor(roll(sillKey, 'cat-pick', step) * potted.length)];
  if (CAT_TOXIC.includes(p.sp)) return { action: 'sniff', plant: p.id };
  if (CAT_CHEWS.includes(p.sp) && roll(sillKey, 'cat-act', step) < 0.75) {
    p.health = Math.max(10, p.health - 12);
    p.growth = Math.max(0, p.growth - 2);
    return { action: 'chew', plant: p.id };
  }
  p.moisture = Math.max(0, p.moisture - 0.3);
  p.health = Math.max(10, p.health - 4);
  return { action: 'sit', plant: p.id };
}

export function catText(e: CatEvent, plant: Plant | undefined): string {
  const name = plant ? (plant.nick || sp(plant.sp).name) : 'растение';
  const acc = plant ? (plant.nick || sp(plant.sp).acc) : 'растение';
  switch (e.action) {
    case 'chew': return `🐈 Барсик пожевал ${acc}! Поставь рядом кошачью траву — он отвлечётся`;
    case 'sit': return `🐈 Барсик посидел в горшке: «${name}» — земля рассыпалась`;
    case 'sniff': return `🐈 Барсик понюхал «${name}» и ушёл. Правильно: это растение ядовито для кошек`;
    case 'grass': return '🐈 Барсик жевал кошачью траву и не трогал растения 😺';
  }
}
