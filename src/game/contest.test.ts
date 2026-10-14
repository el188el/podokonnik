import { describe, expect, it } from 'vitest';
import { contestShot, prevWeekKey, themeOf, weekEndsAt, weekKey } from './contest';
import { publicView } from './social';
import { newPlant, newState } from './storage';

describe('подоконник недели', () => {
  it('неделя начинается в понедельник по Москве', () => {
    // вс 18 октября 2026, 23:30 МСК = 20:30 UTC — ещё неделя с 12-го
    expect(weekKey(Date.UTC(2026, 9, 18, 20, 30))).toBe('2026-10-12');
    // пн 19 октября, 00:30 МСК = вс 21:30 UTC — уже новая неделя
    expect(weekKey(Date.UTC(2026, 9, 18, 21, 30))).toBe('2026-10-19');
    expect(weekEndsAt(Date.UTC(2026, 9, 14, 12))).toBe(Date.UTC(2026, 9, 18, 21));
    expect(prevWeekKey(Date.UTC(2026, 9, 14, 12))).toBe('2026-10-05');
  });

  it('темы меняются каждую неделю', () => {
    expect(themeOf('2026-10-12').title).not.toBe(themeOf('2026-10-19').title);
  });

  it('снимок берёт один подоконник и не выдаёт жажду', () => {
    const t = Date.UTC(2026, 9, 14, 12);
    const g = newState(t);
    g.plants.push(newPlant({ sp: 'violet', sill: 'room', slot: 0, zone: 'glass', stage: 4 }, t));
    const shot = contestShot(publicView(g, t), 'room')!;
    expect(shot.plants).toHaveLength(1);
    expect(shot.plants[0].thirsty).toBe(false);
    expect(contestShot(publicView(newState(t), t), 'room')).toBeNull();
  });
});
