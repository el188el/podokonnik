import { describe, expect, it } from 'vitest';
import { D } from './constants';
import { ageDays, ageMark, daysText, freshAgeMarks, nextAgeMark } from './age';
import { checkAchievements } from './achievements';
import { newPlant, newState } from './storage';

const T0 = new Date(2026, 5, 1, 12).getTime();
const plant = () => newPlant({ id: 'p1', sp: 'monstera', sill: 'room', slot: 0, zone: 'glass', stage: 2, rootStart: T0, plantedAt: T0, moisture: 1 }, T0);

describe('долгожители', () => {
  it('считает возраст в полных днях', () => {
    const p = plant();
    expect(ageDays(p, T0 + D - 1)).toBe(0);
    expect(ageDays(p, T0 + 31 * D)).toBe(31);
    expect(ageMark(p, T0 + 31 * D)?.icon).toBe('🎂');
    expect(nextAgeMark(p, T0 + 31 * D)?.days).toBe(100);
    expect(ageMark(p, T0 + 100 * D)?.frame).toBe('gold');
  });

  it('каждую отметку празднуем один раз, даже если пропустили несколько', () => {
    const p = plant();
    expect(freshAgeMarks(p, T0 + 3 * D)).toEqual([]);
    expect(freshAgeMarks(p, T0 + 40 * D).map((m) => m.days)).toEqual([7, 30]);
    expect(freshAgeMarks(p, T0 + 41 * D)).toEqual([]);
    expect(freshAgeMarks(p, T0 + 100 * D).map((m) => m.days)).toEqual([100]);
  });

  it('достижение «Месяц вместе»', () => {
    const g = newState(T0);
    g.plants.push(plant());
    g.simAt = T0 + 30 * D;
    expect(checkAchievements(g).map((a) => a.id)).toContain('age_30');
  });

  it('склоняет дни', () => {
    expect(daysText(1)).toBe('1 день');
    expect(daysText(3)).toBe('3 дня');
    expect(daysText(11)).toBe('11 дней');
    expect(daysText(100)).toBe('100 дней');
  });
});
