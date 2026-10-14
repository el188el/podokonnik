// СГЕНЕРИРОВАНО из src/game/layout.ts командой npm run sync:shared — не редактировать.
// Раскладка подоконника 3 × 2: верхний ряд (места 0–2) — у стекла,
// нижний (3–5) — столик в глубине комнаты. Зона растения = ряд его места.

import type { Plant, Zone } from './types.ts';

export const ROW = 3;
export const zoneOfSlot = (slot: number): Zone => (slot < ROW ? 'glass' : 'deep');
export const rowSlots = (zone: Zone) => (zone === 'glass' ? [0, 1, 2] : [3, 4, 5]);

/**
 * Привести старые сохранения к новой раскладке: каждое растение — в ряд своей зоны.
 * Если в нужном ряду нет места, растение остаётся где есть, а зона берётся по ряду.
 */
export function normalizeLayout(plants: Plant[]) {
  const sills = [...new Set(plants.map((p) => p.sill))];
  for (const sill of sills) {
    const here = plants.filter((p) => p.sill === sill);
    const taken = new Set<number>();
    const misplaced: Plant[] = [];
    for (const p of here) {
      if (p.slot >= 0 && p.slot < ROW * 2 && zoneOfSlot(p.slot) === p.zone && !taken.has(p.slot)) taken.add(p.slot);
      else misplaced.push(p);
    }
    for (const p of misplaced) {
      const want = [...rowSlots(p.zone), ...rowSlots(p.zone === 'glass' ? 'deep' : 'glass')];
      const slot = want.find((s) => !taken.has(s));
      if (slot === undefined) continue;
      p.slot = slot;
      p.zone = zoneOfSlot(slot);
      taken.add(slot);
    }
  }
}

/** Разложить по рядам для отрисовки (в том числе подоконники друзей со старой версией). */
export function layoutRows<T extends { slot: number; zone: Zone }>(items: T[]): { glass: (T | null)[]; deep: (T | null)[] } {
  const rows: { glass: (T | null)[]; deep: (T | null)[] } = { glass: [null, null, null], deep: [null, null, null] };
  const rest: T[] = [];
  for (const it of items) {
    const z = zoneOfSlot(it.slot);
    const i = it.slot % ROW;
    if (it.slot < ROW * 2 && z === it.zone && !rows[z][i]) rows[z][i] = it;
    else rest.push(it);
  }
  for (const it of rest) {
    const order: Zone[] = [it.zone, it.zone === 'glass' ? 'deep' : 'glass'];
    for (const z of order) {
      const i = rows[z].indexOf(null);
      if (i >= 0) { rows[z][i] = it; break; }
    }
  }
  return rows;
}
