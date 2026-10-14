import { describe, expect, it } from 'vitest';
import { D } from './constants';
import { bumpWeekly, rollWeek, weekStart, weeklyVisit } from './quests';
import { newPlant, newState } from './storage';

const MON = new Date(2026, 9, 12, 10).getTime(); // понедельник

function game() {
  const g = newState(MON);
  g.plants.push(newPlant({ sp: 'violet', sill: 'room', slot: 0, zone: 'glass', stage: 4 }, MON));
  return g;
}

describe('задания недели', () => {
  it('неделя с понедельника', () => {
    expect(weekStart(MON + 6 * D)).toBe('2026-10-12');
    expect(weekStart(MON + 7 * D)).toBe('2026-10-19');
  });

  it('три задания на неделю, новые — в понедельник', () => {
    const g = game();
    expect(rollWeek(g, MON)).toBe(true);
    expect(g.weekly!.list).toHaveLength(3);
    expect(rollWeek(g, MON + 3 * D)).toBe(false);
    expect(rollWeek(g, MON + 7 * D)).toBe(true);
    expect(g.weekly!.week).toBe('2026-10-19');
  });

  it('прогресс копится и не переполняется', () => {
    const g = game();
    rollWeek(g, MON);
    for (const x of g.weekly!.list) x.kind = 'bloom';
    const q = g.weekly!.list[0];
    q.kind = 'water';
    q.target = 3;
    q.progress = 0;
    expect(bumpWeekly(g, 'water', 2)).toHaveLength(0);
    expect(bumpWeekly(g, 'water', 5)).toHaveLength(1);
    expect(q.progress).toBe(3);
  });

  it('заходы считаются по разным дням', () => {
    const g = game();
    rollWeek(g, MON);
    const q = g.weekly!.list[0];
    q.kind = 'days';
    q.target = 2;
    q.progress = 1;
    expect(weeklyVisit(g, MON + 3600e3)).toHaveLength(0);
    expect(weeklyVisit(g, MON + D)).toHaveLength(1);
  });
});
