// Погода за окном по настоящему городу игрока (по желанию).
// Пасмурно, дождь или снег — у стекла нет прямого солнца: нежным растениям
// у южного окна легче. Ясный день — светолюбивые растут чуть быстрее.

import { H, MIN } from './constants';
import type { GameState } from './types';

export type Sky = 'clear' | 'partly' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'storm';

export interface Weather {
  sky: Sky;
  temp: number;
  day: boolean;
  at: number;   // когда получили
}

export interface Place {
  city: string;
  lat: number;  // округлено до 0,1° — точный адрес не храним
  lon: number;
}

export const SKY: Record<Sky, { icon: string; name: string }> = {
  clear: { icon: '☀️', name: 'ясно' },
  partly: { icon: '⛅', name: 'переменная облачность' },
  cloudy: { icon: '☁️', name: 'пасмурно' },
  fog: { icon: '🌫', name: 'туман' },
  rain: { icon: '🌧', name: 'дождь' },
  snow: { icon: '🌨', name: 'снег' },
  storm: { icon: '⛈', name: 'гроза' },
};

/** Код погоды WMO (Open-Meteo) → наше небо. */
export function skyFromCode(code: number): Sky {
  if (code <= 1) return 'clear';
  if (code === 2) return 'partly';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'storm';
  if (code >= 51 && code <= 82) return 'rain';
  return 'cloudy';
}

/** Сводка действует с получасом до и три часа после замера — дальше не знаем. */
export function weatherAt(g: Pick<GameState, 'weather' | 'settings'>, t: number): Weather | null {
  const w = g.weather;
  if (!w || !g.settings.place) return null;
  return t >= w.at - 30 * MIN && t <= w.at + 3 * H ? w : null;
}

export const isDim = (w: Weather | null) => !!w && w.sky !== 'clear' && w.sky !== 'partly';
export const isSunny = (w: Weather | null) => !!w && w.sky === 'clear' && w.day;

export const roundCoord = (x: number) => Math.round(x * 10) / 10;
export const tempText = (t: number) => `${t > 0 ? '+' : t < 0 ? '−' : ''}${Math.abs(Math.round(t))}°`;

/** Подсказка, что погода значит для растений. */
export function weatherTip(w: Weather): string {
  if (isDim(w)) return 'У стекла сегодня нет прямого солнца — нежным растениям у южного окна легче, а светолюбивым темновато.';
  if (isSunny(w)) return 'Солнечный день: светолюбивые растения на хорошем месте растут быстрее.';
  if (!w.day) return 'За окном ночь — растения отдыхают.';
  return 'Обычный денёк — всё как всегда.';
}
