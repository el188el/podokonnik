import { describe, expect, it } from 'vitest';
import { normalizeLayout, zoneOfSlot } from './layout';
import { newPlant } from './storage';

describe('раскладка и подвесные кашпо', () => {
  it('кашпо над окном — у стекла', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8].map(zoneOfSlot)).toEqual(['glass', 'glass', 'glass', 'deep', 'deep', 'deep', 'glass', 'glass', 'glass']);
  });

  it('растение в кашпо остаётся на месте при загрузке', () => {
    const p = newPlant({ sp: 'tradescantia', sill: 'room', slot: 7, zone: 'glass' }, 0);
    normalizeLayout([p]);
    expect(p.slot).toBe(7);
  });
});

describe('четвёртые места в ряду', () => {
  it('9 — у стекла, 10 — на столе, ряды по 4', async () => {
    const { layoutRows, rowCell, zoneOfSlot } = await import('./layout');
    expect(zoneOfSlot(9)).toBe('glass');
    expect(zoneOfSlot(10)).toBe('deep');
    const a = newPlant({ sp: 'aloe', sill: 'room', slot: 9, zone: 'glass' }, 0);
    const b = newPlant({ sp: 'aloe', sill: 'room', slot: 10, zone: 'deep' }, 0);
    const rows = layoutRows([a, b]);
    expect(rowCell(rows, 9)).toBe(a);
    expect(rowCell(rows, 10)).toBe(b);
  });

  it('места открываются только покупкой (уровень не открывает)', async () => {
    const { placeOpen } = await import('./store');
    const { newState } = await import('./storage');
    const g = newState(0);
    expect(placeOpen(g, 'room', 2)).toBe(true);
    expect(placeOpen(g, 'room', 9)).toBe(false);
    g.level = 40;
    expect(placeOpen(g, 'room', 9)).toBe(false);
    g.places = [9];
    expect(placeOpen(g, 'room', 9)).toBe(true);
    expect(placeOpen(g, 'room', 10)).toBe(false);
    g.places = [9, 10];
    expect(placeOpen(g, 'room', 10)).toBe(true);
    expect(placeOpen(g, 'room', 6)).toBe(false);
  });
});

describe('пол для больших растений', () => {
  it('пол открывается на уровне FLOOR_LEVEL', async () => {
    const { placeOpen } = await import('./store');
    const { newState } = await import('./storage');
    const { FLOOR_LEVEL, FLOOR_ROW } = await import('./layout');
    const g = newState(0);
    for (const s of FLOOR_ROW) expect(placeOpen(g, 'room', s)).toBe(false);
    g.level = FLOOR_LEVEL;
    for (const s of FLOOR_ROW) expect(placeOpen(g, 'room', s)).toBe(true);
  });

  it('большие — только на пол, на пол — только большие', async () => {
    const { fitsSlot, freeSlot } = await import('./store');
    const { newState } = await import('./storage');
    const { FLOOR_LEVEL } = await import('./layout');
    expect(fitsSlot('palm', 11)).toBe(true);
    expect(fitsSlot('palm', 0)).toBe(false);
    expect(fitsSlot('aloe', 12)).toBe(false);
    expect(fitsSlot('aloe', 0)).toBe(true);
    const g = newState(0);
    expect(freeSlot(g, 'room', undefined, true)).toBe(-1);
    g.level = FLOOR_LEVEL;
    expect(freeSlot(g, 'room', undefined, true)).toBe(11);
    expect([0, 1, 2, 3, 4, 5]).toContain(freeSlot(g, 'room'));
  });

  it('растение на полу не переезжает при загрузке и рисуется в ряду пола', async () => {
    const { layoutRows, rowCell } = await import('./layout');
    const p = newPlant({ sp: 'palm', sill: 'room', slot: 12, zone: 'deep' }, 0);
    normalizeLayout([p]);
    expect(p.slot).toBe(12);
    const rows = layoutRows([p]);
    expect(rows.floor[1]).toBe(p);
    expect(rows.deep.every((x) => x === null)).toBe(true);
    expect(rowCell(rows, 12)).toBe(p);
  });

  it('в магазине есть большие напольные растения', async () => {
    const { SPECIES } = await import('./species');
    const { FLOOR_LEVEL } = await import('./layout');
    const big = SPECIES.filter((s) => s.big);
    expect(big.length).toBeGreaterThanOrEqual(4);
    for (const s of big) expect(s.unlockLevel).toBeGreaterThanOrEqual(FLOOR_LEVEL);
  });
});
