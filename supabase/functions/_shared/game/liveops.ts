// СГЕНЕРИРОВАНО из src/game/liveops.ts командой npm run sync:shared — не редактировать.
// Ивенты-модификаторы, которые запускают из панели без новой версии игры:
// ×2 листиков за задания и серию, быстрый рост, скидка в магазине, редкий черенок дня.
// Список приходит с сервера (live_events); здесь — только чистые правила.
// Файл общий для игры и сервера (sync:shared).

export type LiveKind = 'leaves2x' | 'growth' | 'discount' | 'cutting';

export interface LiveEvent {
  id: number;
  kind: LiveKind;
  title: string;
  starts: number; // мс
  ends: number;
  mult?: number;  // growth: множитель роста
  pct?: number;   // discount: скидка в процентах
  form?: string;  // cutting: id редкой формы
}

export const LIVE_KINDS: LiveKind[] = ['leaves2x', 'growth', 'discount', 'cutting'];
/** Границы, чтобы опечатка в панели не сломала экономику. */
export const GROWTH_MAX = 3;
export const DISCOUNT_MAX = 50;

let list: LiveEvent[] = [];

/** Принять список с сервера: лишнее и битое отбрасываем, числа зажимаем в границы. */
export function setLive(raw: unknown): LiveEvent[] {
  if (!Array.isArray(raw)) return list;
  list = raw.flatMap((r): LiveEvent[] => {
    const x = r as Partial<LiveEvent>;
    const starts = Number(x.starts), ends = Number(x.ends);
    if (!LIVE_KINDS.includes(x.kind as LiveKind) || !Number.isFinite(starts) || !(ends > starts)) return [];
    return [{
      id: Number(x.id) || 0,
      kind: x.kind as LiveKind,
      title: String(x.title ?? '').slice(0, 80),
      starts,
      ends,
      ...(x.kind === 'growth' ? { mult: Math.min(GROWTH_MAX, Math.max(1, Number(x.mult) || 1)) } : {}),
      ...(x.kind === 'discount' ? { pct: Math.min(DISCOUNT_MAX, Math.max(0, Math.round(Number(x.pct) || 0))) } : {}),
      ...(x.kind === 'cutting' && x.form ? { form: String(x.form) } : {}),
    }];
  });
  return list;
}

export const liveEvents = () => list;
export const liveActive = (t: number) => list.filter((e) => e.starts <= t && t < e.ends);
const top = (kind: LiveKind, t: number) => liveActive(t).filter((e) => e.kind === kind);

/** Множитель листиков за задания и ежедневную серию. */
export const leavesMul = (t: number) => (top('leaves2x', t).length ? 2 : 1);
/** Множитель роста растений (берём самый сильный из идущих). */
export const growthMul = (t: number) => Math.max(1, ...top('growth', t).map((e) => e.mult ?? 1));
/** Скидка магазина в процентах. */
export const discountPct = (t: number) => Math.max(0, ...top('discount', t).map((e) => e.pct ?? 0));
/** Цена со скидкой: не меньше 1 листика. */
export const livePrice = (price: number, t: number) => {
  const p = discountPct(t);
  return p > 0 && price > 0 ? Math.max(1, Math.round(price * (1 - p / 100))) : price;
};
/** Редкий черенок дня, который игрок ещё не забрал. */
export const liveCutting = (t: number, claimed: number[] = []) => top('cutting', t).find((e) => e.form && !claimed.includes(e.id));
