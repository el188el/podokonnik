import { SPECIES } from './species';

/** Сколько опыта нужно, чтобы перейти с уровня l на l+1. */
export const xpToNext = (l: number) => Math.round(40 * Math.pow(l, 1.45));
export const levelReward = (l: number) => 15 + 5 * l;

export const XP = {
  water: 2,
  mist: 2,
  root: 5,
  plant: 10,
  stage: 15,
  adult: 25,
  repot: 15,
  cut: 10,
  giftSent: 20,
  giftGot: 20,
  bloom: 20,
  feed: 3,
  quest: 10,
};

/** Что открывается на уровне: новые виды и подоконники. */
export function unlocksAt(level: number): string[] {
  const out = SPECIES.filter((s) => s.unlockLevel === level).map((s) => s.name);
  if (level === 5) out.push('подоконник «Кухня»');
  if (level === 9) out.push('подоконник «Балкон»');
  return out;
}

export const SILL_UNLOCK: Record<string, { level: number; price: number }> = {
  room: { level: 1, price: 0 },
  kitchen: { level: 5, price: 150 },
  balcony: { level: 9, price: 300 },
};
