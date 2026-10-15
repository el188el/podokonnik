// Античит, этап 0: только наблюдение. Сравниваем прошлое и новое сохранение,
// подозрительное записываем в cheat_flags. Игрока ничего не блокирует.

import { db } from './db.ts';
import { PRODUCT_BY_ID } from './game/products.ts';
import { analyze, inboxLeaves, type Ctx, type State } from './cheatrules.ts';

async function grantsOf(playerId: string): Promise<Set<string>> {
  const g = new Set<string>();
  const [{ data: buys }, { data: inbox }, { data: pl }] = await Promise.all([
    db.from('purchases').select('product').eq('player_id', playerId).eq('refunded', false),
    db.from('inbox').select('kind, payload').eq('player_id', playerId).in('kind', ['purchase', 'admin_gift', 'tester', 'plus_gift']).limit(500),
    db.from('players').select('plus_until').eq('id', playerId).maybeSingle(),
  ]);
  for (const b of buys ?? []) g.add(PRODUCT_BY_ID[b.product]?.kind ?? b.product);
  for (const i of inbox ?? []) {
    const p = (i.payload ?? {}) as Record<string, unknown>;
    if (i.kind === 'tester') g.add('tester');
    if (i.kind === 'plus_gift') g.add('plus');
    if (i.kind === 'purchase') g.add(PRODUCT_BY_ID[String(p.product)]?.kind ?? String(p.product));
    if (i.kind === 'admin_gift') { if (p.pass) g.add('pass'); if (p.plusUntil || p.plusDays) g.add('plus'); }
  }
  if (pl?.plus_until) g.add('plus');
  return g;
}

/**
 * Записать прошлую версию в историю и проверить разницу. Никогда не бросает исключений:
 * синк игрока важнее античита.
 */
export async function observeSync(playerId: string, prev: { state: unknown; version: number; device?: string | null; updated_at?: string }, next: State, newVersion: number) {
  try {
    await db.rpc('keep_save_version', { p_player: playerId, p_version: prev.version, p_state: prev.state, p_device: prev.device ?? null, p_keep: 20 });
    if (!prev.state || typeof prev.state !== 'object') return;
    const now = Date.now();
    const since = prev.updated_at ? Date.parse(prev.updated_at) : now;
    const { data: inbox } = await db.from('inbox').select('kind, payload').eq('player_id', playerId)
      .gte('delivered_at', new Date(since - 10 * 60e3).toISOString()).limit(200);
    const ctx: Ctx = {
      now,
      elapsedMs: Math.max(0, now - since),
      inboxLeaves: (inbox ?? []).reduce((s, i) => s + inboxLeaves(i.kind, (i.payload ?? {}) as Record<string, unknown>), 0),
      grants: new Set(),
    };
    // покупки нужны только если что-то платное появилось — не ходим в базу зря
    const pre = analyze(prev.state as State, next, { ...ctx, grants: new Set(['pass', 'plus', 'starter']) });
    const flags = pre.length || hasNewPaid(prev.state as State, next) ? analyze(prev.state as State, next, { ...ctx, grants: await grantsOf(playerId) }) : [];
    if (flags.length) await db.from('cheat_flags').insert(flags.map((f) => ({ player_id: playerId, kind: f.kind, points: f.points, detail: f.detail, version: newVersion })));
  } catch (e) {
    console.warn('anticheat', playerId, e);
  }
}

function hasNewPaid(prev: State, next: State) {
  return analyze(prev, next, { now: Date.now(), elapsedMs: 1e12, inboxLeaves: 1e12, grants: new Set() }).some((f) => f.kind === 'paid_item');
}
