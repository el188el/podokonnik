import { describe, expect, it } from 'vitest';
import { activeEvent, eventEndsAt, eventSeason, isEmptyReward, tierOf, EVENTS } from './events';
import { hueOf } from './breeding';
import { FORM_BY_ID, PRODUCTS } from './products';
import { ITEM_BY_ID } from './shop';

const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime();

describe('ивенты', () => {
  it('осень идёт в октябре, новый год — через смену года', () => {
    expect(activeEvent(at(2026, 10, 14))?.id).toBe('autumn');
    expect(activeEvent(at(2026, 12, 31))?.id).toBe('newyear');
    expect(activeEvent(at(2027, 1, 10))?.id).toBe('newyear');
    expect(activeEvent(at(2027, 1, 20))?.id).toBe('cozy');
    expect(activeEvent(at(2027, 3, 8))?.id).toBe('spring');
    expect(activeEvent(at(2027, 5, 9))?.id).toBe('dacha');
    expect(activeEvent(at(2027, 7, 1))?.id).toBe('summer');
    expect(activeEvent(at(2027, 8, 19))?.id).toBe('apples');
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

  it('сезоны идут круглый год без пропусков', () => {
    for (let d = 0; d < 366; d++) expect(activeEvent(at(2028, 1, 1 + d)), String(d)).not.toBeNull();
  });

  it('30 уровней, порог растёт', () => {
    const e = EVENTS[0];
    expect(e.tiers).toHaveLength(30);
    for (let i = 1; i < 30; i++) expect(e.tiers[i] - e.tiers[i - 1]).toBeGreaterThan(e.tiers[Math.max(0, i - 1)] - e.tiers[Math.max(0, i - 2)] - 1);
  });
});

describe('стимуляторы в пропуске и за звёзды', () => {
  it('есть в бесплатной ветке каждого сезона', () => {
    for (const e of EVENTS) expect(e.free.filter((r) => r.boost).length).toBeGreaterThanOrEqual(4);
  });

  it('в платной ветке — только эксклюзив, которого больше нигде нет', () => {
    const freeItems = new Set(EVENTS.flatMap((e) => e.free.map((r) => r.item).filter(Boolean)));
    const seen = new Set<string>();
    for (const e of EVENTS) {
      const prem = e.premium.filter((r) => !isEmptyReward(r));
      expect(prem.length).toBe(8);
      for (const r of prem) {
        expect(r.leaves ?? r.feed ?? r.pots ?? r.boost).toBeUndefined();
        if (r.item) {
          expect(ITEM_BY_ID[r.item]?.eventOnly).toBe(true);
          expect(freeItems.has(r.item)).toBe(false);
        }
        if (r.hue) expect(hueOf(r.hue.sp, r.hue.hue)?.event).toBe(true);
        if (r.form) expect(FORM_BY_ID[r.form]?.event).toBe(e.id);
        const key = JSON.stringify(r);
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    }
  });

  it('паки за звёзды: чем больше, тем выгоднее', () => {
    const packs = PRODUCTS.filter((p) => p.kind === 'boost').sort((a, b) => a.stars - b.stars);
    expect(packs.length).toBe(3);
    for (let i = 1; i < packs.length; i++) expect(packs[i].stars / packs[i].count!).toBeLessThan(packs[i - 1].stars / packs[i - 1].count!);
  });
});
