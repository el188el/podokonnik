import { describe, expect, it } from 'vitest';
import { activeEvent, eventEndsAt, eventSeason, tierOf, EVENTS } from './events';
import { FORM_BY_ID } from './products';
import { ITEM_BY_ID } from './shop';

const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime();

describe('ивенты', () => {
  it('осень идёт в октябре, новый год — через смену года', () => {
    expect(activeEvent(at(2026, 10, 14))?.id).toBe('autumn');
    expect(activeEvent(at(2026, 12, 31))?.id).toBe('newyear');
    expect(activeEvent(at(2027, 1, 10))?.id).toBe('newyear');
    expect(activeEvent(at(2027, 1, 20))).toBeNull();
    expect(activeEvent(at(2027, 3, 8))?.id).toBe('spring');
  });

  it('один новогодний сезон — один ключ прогресса, даже после 1 января', () => {
    const e = activeEvent(at(2026, 12, 20))!;
    expect(eventSeason(e, at(2026, 12, 20))).toBe('newyear-2026');
    expect(eventSeason(e, at(2027, 1, 5))).toBe('newyear-2026');
    expect(new Date(eventEndsAt(e, at(2026, 12, 20))).getFullYear()).toBe(2027);
  });

  it('уровни пропуска и награды ссылаются на существующие предметы', () => {
    for (const e of EVENTS) {
      expect(e.free.length).toBe(e.tiers.length);
      expect(e.premium.length).toBe(e.tiers.length);
      for (const r of [...e.free, ...e.premium]) {
        if (r.item) expect(ITEM_BY_ID[r.item], r.item).toBeTruthy();
        if (r.form) expect(FORM_BY_ID[r.form]?.event, r.form).toBe(e.id);
      }
      expect(tierOf(e, 0)).toBe(0);
      expect(tierOf(e, 10_000)).toBe(e.tiers.length);
    }
  });
});
