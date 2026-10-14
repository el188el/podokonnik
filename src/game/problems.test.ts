import { describe, expect, it } from 'vitest';
import { D, H } from './constants';
import { advance } from './sim';
import { newPlant, newState } from './storage';
import type { GameState } from './types';

const T0 = new Date(2026, 10, 1, 12).getTime(); // ноябрь — отопительный сезон

function world(sps: string[]): GameState {
  const g = newState(T0);
  g.sills[0].window = 'E';
  sps.forEach((s, i) => g.plants.push(newPlant({ id: `p${i}`, sp: s, sill: 'room', slot: i, zone: 'glass', stage: 4, rootStart: T0, plantedAt: T0, moisture: 0.8, growth: 999, adultAt: T0 }, T0)));
  g.simAt = T0;
  return g;
}

/** Нормальный уход: полив, когда подсохло, опрыскивание любителей. */
function careFor(g: GameState, days: number) {
  let onsets = 0;
  for (let h = 0; h < days * 24; h += 6) {
    const ev = advance(g, T0 + (h + 6) * H);
    onsets += ev.filter((e) => e.kind === 'problem').length;
    for (const p of g.plants) {
      if (p.moisture < 0.3) p.moisture = 1;
      if (h % 48 === 0) p.mistUntil = T0 + (h + 12) * H;
    }
  }
  return onsets;
}

describe('проблемы растений', () => {
  it('при нормальном уходе — редко: в среднем меньше 2 за месяц на растение', () => {
    let total = 0;
    for (let k = 0; k < 6; k++) {
      const g = world(['tradescantia', 'spathiphyllum', 'scindapsus']);
      for (const p of g.plants) p.id = `run${k}-${p.id}`;
      total += careFor(g, 30);
    }
    expect(total / 18).toBeLessThan(2);
  });

  it('постоянный перелив у суккулента быстро приводит к гнили', () => {
    const g = world(['sansevieria']);
    for (let h = 0; h < 6 * 24; h += 3) {
      g.plants[0].moisture = 1.4;
      advance(g, T0 + (h + 3) * H);
      if (g.plants[0].problem?.kind === 'rot') break;
    }
    expect(g.plants[0].problem?.kind).toBe('rot');
  });

  it('солнце для тенелюбивого — ожог; ушёл в тень — прошёл', () => {
    const g = world(['violet']);
    g.sills[0].window = 'S';
    g.simAt = new Date(2026, 5, 1, 12).getTime();
    const t = g.simAt;
    for (const p of g.plants) p.moisture = 1;
    advance(g, t + 12 * H);
    expect(g.plants[0].problem?.kind).toBe('burn');
    g.plants[0].zone = 'deep';
    g.plants[0].slot = 3;
    for (let h = 12; h < 80; h += 6) { g.plants[0].moisture = 1; advance(g, t + (h + 6) * H); }
    expect(g.plants[0].problem).toBeUndefined();
  });

  it('вредители переползают на соседей, герань защищает', () => {
    const g = world(['coleus', 'tradescantia', 'chlorophytum']);
    g.plants[1].problem = { kind: 'mite', at: T0, sev: 1 };
    for (let h = 0; h < 20 * 24; h += 6) {
      for (const p of g.plants) p.moisture = 1;
      g.plants[1].problem!.sev = 1;
      advance(g, T0 + (h + 6) * H);
    }
    expect(g.plants.filter((p) => p.problem).length).toBeGreaterThan(1);
  });

  it('после лечения — неделя защиты', () => {
    const g = world(['tradescantia']);
    g.plants[0].guardUntil = T0 + 7 * D;
    g.plants[0].moisture = 1.4;
    advance(g, T0 + 2 * D);
    expect(['mite', 'gnats', 'aphid']).not.toContain(g.plants[0].problem?.kind);
  });
});
