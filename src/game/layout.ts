// Раскладка подоконника: верхний ряд — у стекла, нижний — столик в глубине комнаты,
// над окном — подвесные кашпо (если куплены). В каждом ряду по 4 места.
// Номера мест исторические: сначала было 3 × 2 (0–5), потом кашпо (6–8),
// потом по четвёртому месту в ряду (9 — у стекла, 10 — на столе).

import type { Plant, Zone } from './types';

export const ROW = 4;
export const GLASS_ROW = [0, 1, 2, 9];
export const DEEP_ROW = [3, 4, 5, 10];
export const HANG_ROW = [6, 7, 8];
/** Пол под окном: место для больших напольных растений. Открывается на высоком уровне. */
export const FLOOR_ROW = [11, 12, 13];
export const FLOOR_LEVEL = 15;
export const ALL_SLOTS = [...GLASS_ROW, ...DEEP_ROW, ...HANG_ROW, ...FLOOR_ROW];
export const isFloor = (slot: number) => FLOOR_ROW.includes(slot);

// на полу свет как в глубине комнаты
export const zoneOfSlot = (slot: number): Zone => (DEEP_ROW.includes(slot) || FLOOR_ROW.includes(slot) ? 'deep' : 'glass');
export const rowSlots = (zone: Zone) => (zone === 'glass' ? GLASS_ROW : DEEP_ROW);

/** Четвёртые места в ряду: за звёзды — сразу, за листики — с нужного уровня. */
export const EXTRA_PLACES: Record<number, { level: number; price: number; stars: number; product: string; name: string }> = {
  9: { level: 4, price: 150, stars: 25, product: 'place_9', name: 'четвёртое место у стекла' },
  10: { level: 7, price: 250, stars: 35, product: 'place_10', name: 'четвёртое место на столике' },
};

/**
 * Привести старые сохранения к раскладке: каждое растение — в ряд своей зоны.
 * Если в нужном ряду нет места, растение остаётся где есть, а зона берётся по ряду.
 */
export function normalizeLayout(plants: Plant[]) {
  const sills = [...new Set(plants.map((p) => p.sill))];
  for (const sill of sills) {
    const here = plants.filter((p) => p.sill === sill);
    const taken = new Set<number>();
    const misplaced: Plant[] = [];
    for (const p of here) {
      if (isFloor(p.slot)) { taken.add(p.slot); continue; } // пол — отдельно
      if (ALL_SLOTS.includes(p.slot) && zoneOfSlot(p.slot) === p.zone && !taken.has(p.slot)) taken.add(p.slot);
      else misplaced.push(p);
    }
    for (const p of misplaced) {
      const want = [...rowSlots(p.zone).slice(0, 3), ...rowSlots(p.zone === 'glass' ? 'deep' : 'glass').slice(0, 3)];
      const slot = want.find((s) => !taken.has(s));
      if (slot === undefined) continue;
      p.slot = slot;
      p.zone = zoneOfSlot(slot);
      taken.add(slot);
    }
  }
}

/** Разложить по рядам для отрисовки (в том числе подоконники друзей со старой версией). */
export function layoutRows<T extends { slot: number; zone: Zone }>(items: T[]): { glass: (T | null)[]; deep: (T | null)[]; floor: (T | null)[] } {
  const rows: { glass: (T | null)[]; deep: (T | null)[]; floor: (T | null)[] } = { glass: [null, null, null, null], deep: [null, null, null, null], floor: [null, null, null] };
  const rest: T[] = [];
  for (const it of items) {
    if (isFloor(it.slot)) { rows.floor[FLOOR_ROW.indexOf(it.slot)] = it; continue; }
    const z = zoneOfSlot(it.slot);
    const i = rowSlots(z).indexOf(it.slot);
    if (i >= 0 && z === it.zone && !rows[z][i]) rows[z][i] = it;
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

/** Что стоит на месте slot в разложенных рядах. */
export function rowCell<T>(rows: { glass: (T | null)[]; deep: (T | null)[]; floor?: (T | null)[] }, slot: number): T | null {
  if (isFloor(slot)) return rows.floor?.[FLOOR_ROW.indexOf(slot)] ?? null;
  const z = zoneOfSlot(slot);
  return rows[z][rowSlots(z).indexOf(slot)] ?? null;
}
