import { describe, expect, it } from 'vitest';
import { pour, WET_FULL } from './sim';
import { newPlant } from './storage';

const T0 = new Date(2026, 5, 1, 12).getTime();
const mk = (moisture: number) => newPlant({ sp: 'chlorophytum', sill: 'room', slot: 0, zone: 'glass', stage: 3, moisture }, T0);

describe('полив', () => {
  it('сухую землю поливает до 100%', () => {
    const p = mk(0.2);
    expect(pour(p)).toBe('watered');
    expect(p.moisture).toBe(1);
  });

  it('влажную (88%) — подливает до краёв без перелива', () => {
    const p = mk(0.88);
    expect(pour(p)).toBe('topped');
    expect(p.moisture).toBe(1);
  });

  it('мокрую (90%+) — вода уходит в поддон', () => {
    const p = mk(WET_FULL);
    expect(pour(p)).toBe('over');
    expect(p.moisture).toBeGreaterThan(1);
    const q = mk(1.3);
    pour(q);
    expect(q.moisture).toBeLessThanOrEqual(1.4);
  });
});
