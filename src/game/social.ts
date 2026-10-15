// Общая логика друзей: её используют и игра, и сервер (через sync:shared).

import { advance, type SimEvent } from './sim';
import type { GameState, Plant, Sill } from './types';

export interface FriendWater {
  plantId: string;
  at: number;
  name?: string;
}

/** Растение можно «полить разок», если оно в горшке и земля подсохла. */
export const needsWater = (p: Plant) => p.stage >= 2 && p.moisture < 0.5;

/**
 * Досчитать мир до now с учётом поливов друзей в их настоящие моменты времени:
 * если друг полил вчера, растение не сохло со вчерашнего дня.
 */
export function replayFriendWaters(g: GameState, waters: FriendWater[], now: number): SimEvent[] {
  const ev: SimEvent[] = [];
  for (const w of [...waters].sort((a, b) => a.at - b.at)) {
    const at = Math.min(Math.max(w.at, g.simAt), now);
    ev.push(...advance(g, at));
    const p = g.plants.find((x) => x.id === w.plantId);
    if (p && p.stage >= 2 && p.moisture < 1) {
      p.moisture = 1;
      p.dryFor = 0;
    }
  }
  ev.push(...advance(g, now));
  return ev;
}

export interface PublicPlant {
  id: string;
  sp: string;
  form?: string;
  hue?: string;
  sill: string;
  slot: number;
  zone: Plant['zone'];
  pot: string;
  bigPot: boolean;
  potSize?: number;
  shape?: string;
  stage: Plant['stage'];
  blooming: boolean;
  nick?: string;
  thirsty: boolean;
  sad: boolean;
}

export interface PublicView {
  name: string;
  level: number;
  sills: Pick<Sill, 'id' | 'name' | 'window' | 'decor'>[];
  plants: PublicPlant[];
  neighbor: boolean;
}

/** Что видит гость: только внешний вид подоконника, без экономики и статистики. */
export function publicView(state: GameState, now: number, waters: FriendWater[] = []): PublicView {
  const g: GameState = structuredClone(state);
  replayFriendWaters(g, waters, now);
  return {
    name: g.name || 'Садовник',
    level: g.level,
    sills: g.sills.map((s) => ({ id: s.id, name: s.name, window: s.window, decor: s.decor.filter((d) => (g.owned[d] ?? 0) > 0) })),
    plants: g.plants.map((p) => ({
      id: p.id, sp: p.sp, form: p.form, hue: p.hue, sill: p.sill, slot: p.slot, zone: p.zone, pot: p.pot, bigPot: p.bigPot, potSize: p.potSize, shape: p.shape,
      stage: p.stage, blooming: p.blooming, nick: p.nick, thirsty: needsWater(p), sad: p.stage >= 2 && p.health < 60,
    })),
    neighbor: !!g.neighbor && now < g.neighbor.until,
  };
}

export const thirstyCount = (v: PublicView) => (v.neighbor ? 0 : v.plants.filter((p) => p.thirsty).length);

export const VISIT_HOST_LIMIT = 3;
export const VISIT_DAY_LIMIT = 10;
export const VISIT_REWARD = 5;
