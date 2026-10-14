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
