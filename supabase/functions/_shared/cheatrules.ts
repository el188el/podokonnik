// Правила античита (без базы — чтобы проверять тестами).

import { PRODUCT_BY_ID } from './game/products.ts';

export type State = Record<string, unknown>;
export interface Flag { kind: string; points: number; detail: Record<string, unknown> }
export interface Ctx {
  elapsedMs: number;        // серверное время с прошлой записи сохранения
  now: number;              // серверное время сейчас
  inboxLeaves: number;      // листики из входящих, доставленных за это время
  grants: Set<string>;      // что игроку законно выдано: pass, plus, starter, tester
}

const H = 3600e3;
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Запас прироста листиков: щедрый, чтобы не ловить честных (уровни, заказы, продажа, сундуки). */
export function leavesAllowance(ctx: Ctx, levelsGained: number) {
  const hours = Math.min(48, Math.max(0, ctx.elapsedMs / H));
  return 500 + 400 * hours + 150 * Math.max(0, levelsGained) + ctx.inboxLeaves;
}

const premiumSeasons = (s: State) => Object.entries((s.events as Record<string, { premium?: boolean }>) ?? {}).filter(([, v]) => v?.premium).map(([k]) => k);

export function analyze(prev: State, next: State, ctx: Ctx): Flag[] {
  const out: Flag[] = [];
  const tester = ctx.grants.has('tester');
  const dLevel = num(next.level) - num(prev.level);

  const dLeaves = num(next.leaves) - num(prev.leaves);
  const allow = leavesAllowance(ctx, dLevel) + (tester ? 6000 : 0);
  if (dLeaves > allow) {
    out.push({ kind: 'leaves_jump', points: dLeaves > allow * 3 ? 5 : 3, detail: { from: num(prev.leaves), to: num(next.leaves), allow: Math.round(allow), minutes: Math.round(ctx.elapsedMs / 60e3) } });
  }

  if (!tester && dLevel > 2 && dLevel > ctx.elapsedMs / (6 * H)) {
    out.push({ kind: 'level_jump', points: dLevel > 5 ? 5 : 3, detail: { from: num(prev.level), to: num(next.level), minutes: Math.round(ctx.elapsedMs / 60e3) } });
  }

  const simPrev = num(prev.simAt), simNext = num(next.simAt);
  if (simNext > ctx.now + 2 * 60e3) {
    out.push({ kind: 'time_future', points: 2, detail: { aheadMin: Math.round((simNext - ctx.now) / 60e3) } });
  }
  if (simPrev && simNext) {
    const gain = simNext - simPrev - ctx.elapsedMs;
    if (gain > 30 * 60e3) out.push({ kind: 'time_fast', points: 2, detail: { extraMin: Math.round(gain / 60e3) } });
    if (simNext < simPrev - 15 * 60e3) out.push({ kind: 'time_back', points: 1, detail: { backMin: Math.round((simPrev - simNext) / 60e3) } });
  }

  if (!tester) {
    const was = new Set(premiumSeasons(prev));
    const newPass = premiumSeasons(next).filter((k) => !was.has(k));
    if (newPass.length && !ctx.grants.has('pass')) out.push({ kind: 'paid_item', points: 5, detail: { item: 'pass', seasons: newPass } });
    if (next.starterPack && !prev.starterPack && !ctx.grants.has('starter')) out.push({ kind: 'paid_item', points: 5, detail: { item: 'starter' } });
    const gold = (s: State) => num((s.owned as Record<string, unknown>)?.pot_gold) > 0;
    if (gold(next) && !gold(prev) && !ctx.grants.has('plus')) out.push({ kind: 'paid_item', points: 4, detail: { item: 'pot_gold' } });
  }
  return out;
}

/** Сколько листиков дают входящие (как их начисляет клиент в applyInbox). */
export function inboxLeaves(kind: string, p: Record<string, unknown>) {
  switch (kind) {
    case 'gift_claimed': return 10;
    case 'referral': return 50;
    case 'welcome': return 30;
    case 'tester': return 5000;
    case 'chat_water': case 'admin_gift': case 'contest_win': return num(p.leaves);
    case 'water_reward': return num(p.reward);
    case 'purchase': { const pr = PRODUCT_BY_ID[String(p.product)]; return num(p.leaves) || pr?.leaves || 0; }
    default: return 0;
  }
}

