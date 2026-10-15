import { afterEach, describe, expect, it } from 'vitest';
import { discountPct, growthMul, leavesMul, liveActive, liveCutting, livePrice, setLive } from './liveops';

const H = 3600e3;
const t0 = Date.UTC(2026, 9, 20, 12);

afterEach(() => { setLive([]); });

describe('ивенты-модификаторы', () => {
  it('без ивентов всё как обычно', () => {
    setLive([]);
    expect(leavesMul(t0)).toBe(1);
    expect(growthMul(t0)).toBe(1);
    expect(livePrice(100, t0)).toBe(100);
    expect(liveCutting(t0)).toBeUndefined();
  });

  it('действуют только между началом и концом', () => {
    setLive([{ id: 1, kind: 'leaves2x', title: 'x2', starts: t0, ends: t0 + H }]);
    expect(leavesMul(t0 - 1)).toBe(1);
    expect(leavesMul(t0)).toBe(2);
    expect(leavesMul(t0 + H - 1)).toBe(2);
    expect(leavesMul(t0 + H)).toBe(1);
  });

  it('множитель роста и скидка зажаты в разумные границы', () => {
    setLive([
      { id: 1, kind: 'growth', title: '', starts: t0, ends: t0 + H, mult: 10 },
      { id: 2, kind: 'discount', title: '', starts: t0, ends: t0 + H, pct: 90 },
    ]);
    expect(growthMul(t0)).toBe(3);
    expect(discountPct(t0)).toBe(50);
    expect(livePrice(100, t0)).toBe(50);
    expect(livePrice(1, t0)).toBe(1);
    expect(livePrice(0, t0)).toBe(0);
  });

  it('битые записи отбрасываются', () => {
    const l = setLive([
      { id: 1, kind: 'nope', starts: t0, ends: t0 + H },
      { id: 2, kind: 'growth', starts: t0 + H, ends: t0 },
      { id: 3, kind: 'growth', starts: t0, ends: t0 + H, mult: 1.5 },
      'мусор',
    ]);
    expect(l.map((e) => e.id)).toEqual([3]);
    expect(liveActive(t0).length).toBe(1);
    expect(growthMul(t0)).toBe(1.5);
  });

  it('черенок дня выдаётся один раз', () => {
    setLive([{ id: 7, kind: 'cutting', title: '', starts: t0, ends: t0 + H, form: 'albo' }]);
    expect(liveCutting(t0)?.form).toBe('albo');
    expect(liveCutting(t0, [7])).toBeUndefined();
  });
});
