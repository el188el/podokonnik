// Родословная черенков: каждый черенок помнит, от чьих растений он происходит.
// «Мама» — растение, с которого его срезали, дальше бабушка, прабабушка…
// Растение, прожившее у хозяина год, становится семейной реликвией.

import { D } from './constants';
import type { Ancestor, Plant } from './types';

export const LINE_MAX = 6;
export const HEIRLOOM_DAYS = 365;

export const isHeirloom = (p: Plant, t: number) => p.stage >= 2 && t - p.createdAt >= HEIRLOOM_DAYS * D;

const yearOf = (t: number) => new Date(t).getFullYear();

/** Родословная черенка, срезанного с растения p у игрока с именем owner. */
export function childLine(p: Plant, owner: string, t: number): Ancestor[] {
  const base = p.line ?? (p.from ? [{ n: p.from.name, y: yearOf(p.createdAt) }] : []);
  const me: Ancestor = { n: (owner || 'Садовник').slice(0, 24), y: yearOf(p.plantedAt ?? p.createdAt), ...(p.nick ? { k: p.nick.slice(0, 20) } : {}), ...(isHeirloom(p, t) ? { h: 1 as const } : {}) };
  return [...base, me].slice(-LINE_MAX);
}

/** Проверка родословной из ссылки: только разумные имена и годы. */
export function cleanLine(raw: unknown): Ancestor[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: Ancestor[] = [];
  for (const x of raw.slice(-LINE_MAX)) {
    if (!Array.isArray(x)) continue;
    const n = String(x[0] ?? '').trim().replace(/\s+/g, ' ').slice(0, 24);
    const y = Number(x[1]);
    if (!n || !Number.isInteger(y) || y < 2020 || y > 2200) continue;
    const k = x[2] ? String(x[2]).trim().slice(0, 20) : '';
    out.push({ n, y, ...(k ? { k } : {}), ...(x[3] ? { h: 1 as const } : {}) });
  }
  return out.length ? out : undefined;
}

export const packLine = (l: Ancestor[]) => l.map((a) => [a.n, a.y, a.k ?? 0, a.h ?? 0]);

const GEN = ['мама', 'бабушка', 'прабабушка'];
/** Подпись поколения: последний в списке — «мама». */
export const genName = (fromEnd: number) => GEN[fromEnd] ?? 'пра'.repeat(fromEnd - 1) + 'бабушка';
