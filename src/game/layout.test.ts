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
