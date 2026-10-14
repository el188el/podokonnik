import type { GameState } from '../functions/_shared/game/types.ts';

/** Игрок с одним хлорофитумом в горшке, политым в момент t. */
export function newStateForTest(t: number): GameState {
  return {
    v: 1, createdAt: t, simAt: t, lastSeen: t, offset: 0, name: 'Тест', xp: 0, level: 1, leaves: 0,
    sills: [{ id: 'room', name: 'Комната', window: 'E', decor: [] }], activeSill: 'room',
    plants: [{
      id: 'p1', sp: 'chlorophytum', sill: 'room', slot: 0, zone: 'glass', pot: 'terracotta', bigPot: false, createdAt: t,
      rootStart: t, plantedAt: t, stage: 2, growth: 0, moisture: 1, dryFor: 0, badLightFor: 0, health: 100, rest: 0,
      blooming: false, lowestHealth: 100,
    }],
    cuttings: [], owned: {}, discovered: [], grownAdult: [], achievements: [], received: [], pending: [], sent: [],
    stats: { waters: 0, mists: 0, cuts: 0, giftsSent: 0, giftsGot: 0, planted: 0, repots: 0, adults: 0, blooms: 0, rescues: 0, neighbor: 0, bought: 0, questsDone: 0, nightWater: 0 },
    neighbor: null, streak: { day: '', count: 0, best: 0, claimedDay: '' }, quests: { day: '', list: [], bonusClaimed: false },
    log: [], settings: { sound: true, haptics: true, quietFrom: 23, quietTo: 9 }, tutorial: 0,
  };
}
