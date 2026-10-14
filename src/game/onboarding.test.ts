import { describe, expect, it } from 'vitest';
import { D } from './constants';
import { roundInfo, starterDaysOpen, starterLeft } from './onboarding';
import { newPlant, newState } from './storage';

const at = (d: number, h: number) => new Date(2026, 5, d, h).getTime();

describe('подарки новичка', () => {
  it('открываются по одному в день и копятся, если пропустить', () => {
    const g = newState(at(1, 20));
    expect(starterDaysOpen(g, at(1, 23))).toBe(1);
    expect(starterDaysOpen(g, at(2, 1))).toBe(2); // следующий календарный день
    g.starter = { claimed: [0] };
    expect(starterLeft(g, at(4, 12))).toEqual([1, 2, 3]);
    expect(starterDaysOpen(g, at(1, 12) + 30 * D)).toBe(7);
  });
});

describe('обход', () => {
  it('утром и вечером, только если растений в горшках хотя бы два', () => {
    const g = newState(at(1, 8));
    const pot = (slot: number) => newPlant({ sp: 'chlorophytum', sill: 'room', slot, zone: 'glass', stage: 2 }, at(1, 8));
    g.plants.push(pot(0));
    expect(roundInfo(g, at(1, 8))).toBeNull();
    g.plants.push(pot(1));
    expect(roundInfo(g, at(1, 8))?.label).toBe('утренний');
    expect(roundInfo(g, at(1, 15))).toBeNull();
    expect(roundInfo(g, at(1, 20))?.label).toBe('вечерний');
    g.round = { key: roundInfo(g, at(1, 8))!.key, checked: [g.plants[0].id], done: false };
    expect(roundInfo(g, at(1, 9))?.checked).toBe(1);
    expect(roundInfo(g, at(1, 20))?.checked).toBe(0); // вечером — новый обход
  });
});

describe('первая победа', () => {
  it('сундучок первого часа', async () => {
    const { firstChest } = await import('./onboarding');
    const { newState } = await import('./storage');
    const T = Date.UTC(2026, 9, 14, 10);
    const g = newState(T);
    g.tutorial = 99;
    expect(firstChest(g, T)).toBeNull();
    g.stats.planted = 1;
    expect(firstChest(g, T + 30 * 60e3)).toEqual({ ready: false, left: 30 * 60e3 });
    expect(firstChest(g, T + 61 * 60e3)?.ready).toBe(true);
    g.firstChest = true;
    expect(firstChest(g, T + 61 * 60e3)).toBeNull();
  });
});
