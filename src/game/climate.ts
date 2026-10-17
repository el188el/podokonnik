// Микроклимат комнаты: температура и влажность воздуха у каждого подоконника.
// Зимой батареи жарят и сушат воздух, летом — жарко. Форточка впускает уличный
// воздух (холод, сквозняк, насекомых), шторы убирают свет, приборы поправляют
// температуру и влажность. Общий файл для игры и сервера.

import { weatherAt } from './weather';
import type { GameState, Sill, Species, Zone } from './types';

export interface Climate {
  temp: number;     // °C в комнате
  rh: number;       // % влажности воздуха
  out: number;      // °C на улице
  heating: boolean; // идёт отопление (батареи)
  draft: boolean;   // холодный сквозняк из форточки — у стекла
  bugs: boolean;    // в открытую форточку без сетки летят насекомые
}

/** Средняя температура по месяцам (средняя полоса России), если настоящей погоды нет. */
const MONTH_T = [-8, -7, -2, 6, 13, 17, 19, 17, 11, 5, -1, -5];

export function outsideTemp(g: Pick<GameState, 'weather' | 'settings'>, t: number): number {
  const w = weatherAt(g, t);
  if (w) return w.temp;
  const d = new Date(t);
  const h = d.getHours() + d.getMinutes() / 60;
  return MONTH_T[d.getMonth()] + 4 * Math.sin(((h - 9) / 24) * 2 * Math.PI); // днём теплее, ночью холоднее
}

const owns = (g: GameState, sill: Sill, id: string) => sill.decor.includes(id) && (g.owned[id] ?? 0) > 0;
const on = (g: GameState, sill: Sill, id: string) => owns(g, sill, id) && !sill.off?.includes(id);

export function climateOf(g: GameState, sill: Sill, t: number): Climate {
  const out = outsideTemp(g, t);
  const m = new Date(t).getMonth() + 1;
  const heating = (m >= 10 || m <= 4) && out < 12;
  let temp = heating ? 23.5 : 22 + Math.max(0, out - 20) * 0.6;
  let rh = heating ? 28 : 50;
  const vent = !!sill.vent;
  if (vent) {
    temp += (out - temp) * 0.35;
    rh += heating ? 8 : 6;
  }
  if (on(g, sill, 'heater')) { temp += 4; rh -= 6; }
  if (on(g, sill, 'fan')) temp -= 2;
  if (on(g, sill, 'humidifier')) rh += 22;
  return {
    temp: Math.round(Math.max(4, Math.min(38, temp)) * 10) / 10,
    rh: Math.round(Math.max(15, Math.min(85, rh))),
    out: Math.round(out),
    heating,
    draft: vent && out < 12,
    bugs: vent && m >= 4 && m <= 9 && out > 8 && !owns(g, sill, 'net'),
  };
}

/** Температура у стекла и в глубине: зимой у окна холоднее, со сквозняком — заметно. */
export function zoneTemp(c: Climate, zone: Zone): number {
  if (zone === 'deep') return c.temp;
  return Math.round((c.temp - (c.heating ? 2 : 0) - (c.draft ? 6 : 0)) * 10) / 10;
}

/** Теплолюбивые тропические растения: страдают от холода раньше остальных. */
export const TROPICAL = ['monstera', 'scindapsus', 'spathiphyllum', 'ficus', 'orchid', 'citrus', 'hibiscus', 'aglaonema', 'calathea', 'fern', 'begonia', 'coleus', 'poinsettia', 'dracaena', 'peperomia', 'hoya', 'zamioculcas', 'gardenia'];
export const coldLimit = (spId: string) => (TROPICAL.includes(spId) ? 14 : 8);

/** Чем недоволен капризный вид прямо сейчас (или null — всё хорошо). Сквозняк капризным тоже вреден. */
export type FussyIssue = 'cold' | 'hot' | 'dry' | 'draft';
export function fussyIssue(s: Pick<Species, 'fussy'>, temp: number, rh: number, draft?: boolean): FussyIssue | null {
  const fz = s.fussy;
  if (!fz) return null;
  if (fz.temp && temp < fz.temp[0]) return 'cold';
  if (fz.temp && temp > fz.temp[1]) return 'hot';
  if (draft) return 'draft';
  if (fz.rh && rh < fz.rh) return 'dry';
  return null;
}
export const FUSSY_TEXT: Record<FussyIssue, string> = {
  cold: 'ей прохладно', hot: 'ей жарко', dry: 'ей сухо', draft: 'её продувает',
};

/** Множитель роста от температуры и влажности (любителям влажности — свой). */
export function climateGrowth(temp: number, rh: number, mistLove: boolean): number {
  let r = temp < 12 ? 0.3 : temp < 16 ? 0.6 : temp > 32 ? 0.6 : temp > 28 ? 0.85 : 1;
  if (mistLove) r *= rh < 35 ? 0.85 : rh >= 55 ? 1.1 : 1;
  return r;
}

/** Как быстро сохнет земля: в жару и сухом воздухе — быстрее, в прохладе — медленнее. */
export const climateDrying = (temp: number, rh: number) => (temp > 28 ? 1.4 : temp < 16 ? 0.7 : 1) * (rh < 35 ? 1.15 : rh > 65 ? 0.85 : 1);

export const tempWord = (t: number) => (t < 14 ? 'холодно' : t < 18 ? 'прохладно' : t <= 26 ? 'тепло' : t <= 30 ? 'жарко' : 'очень жарко');
export const rhWord = (rh: number) => (rh < 35 ? 'сухо' : rh <= 60 ? 'нормально' : 'влажно');

