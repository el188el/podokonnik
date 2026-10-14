import { describe, expect, it } from 'vitest';
import { H } from './constants';
import { growthRate, lightBad, lightLevel, ctxFor } from './sim';
import { newPlant, newState } from './storage';
import { isDim, skyFromCode, weatherAt } from './weather';

const T0 = new Date(2026, 5, 1, 12).getTime(); // лето

function world(spId: string, window: 'S' | 'N' = 'S') {
  const g = newState(T0);
  g.sills[0].window = window;
  const p = newPlant({ id: 'p1', sp: spId, sill: 'room', slot: 0, zone: 'glass', stage: 2, rootStart: T0, plantedAt: T0, moisture: 1 }, T0);
  g.plants.push(p);
  return { g, p };
}

describe('погода за окном', () => {
  it('переводит коды WMO в небо', () => {
    expect(skyFromCode(0)).toBe('clear');
    expect(skyFromCode(3)).toBe('cloudy');
    expect(skyFromCode(63)).toBe('rain');
    expect(skyFromCode(75)).toBe('snow');
    expect(skyFromCode(95)).toBe('storm');
  });

  it('сводка действует 3 часа и только при включённом городе', () => {
    const { g } = world('violet');
    g.weather = { sky: 'cloudy', temp: 5, day: true, at: T0 };
    expect(weatherAt(g, T0 + H)).toBeNull();
    g.settings.place = { city: 'Казань', lat: 55.8, lon: 49.1 };
    expect(isDim(weatherAt(g, T0 + H))).toBe(true);
    expect(weatherAt(g, T0 + 4 * H)).toBeNull();
  });

  it('в пасмурный день у южного стекла нет прямого солнца', () => {
    const { g, p } = world('violet');
    const sill = g.sills[0];
    expect(lightLevel(sill, 'glass', T0, false)).toBe(4);
    expect(lightBad(p, sill, T0, false)).toBe('hot');
    g.settings.place = { city: 'Казань', lat: 55.8, lon: 49.1 };
    g.weather = { sky: 'rain', temp: 12, day: true, at: T0 };
    const ctx = ctxFor(g, p, T0);
    expect(ctx.dim).toBe(true);
    expect(lightLevel(sill, 'glass', T0, false, true)).toBe(3);
    expect(lightLevel(sill, 'deep', T0, false, true)).toBe(2);
  });

  it('в ясный день светолюбивые растут быстрее', () => {
    const { g, p } = world('cactus');
    const base = growthRate(p, T0, ctxFor(g, p, T0));
    g.settings.place = { city: 'Сочи', lat: 43.6, lon: 39.7 };
    g.weather = { sky: 'clear', temp: 25, day: true, at: T0 };
    expect(growthRate(p, T0, ctxFor(g, p, T0))).toBeCloseTo(base * 1.15);
  });
});
