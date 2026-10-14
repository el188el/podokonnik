// Напоминания от бота. Вызывается по расписанию (GitHub Actions, раз в 30 минут)
// с заголовком x-cron-secret. Пишет не чаще раза в 6 часов и не в тихие часы.

import { safeEqual } from '../_shared/crypto.ts';
import { db } from '../_shared/db.ts';
import { appLink, secret } from '../_shared/env.ts';
import type { GameState } from '../_shared/game/types.ts';
import { send } from '../_shared/tg.ts';
import { pickReminder } from './remind.ts';

const GAP = 6 * 3600e3;

Deno.serve(async (req) => {
  const got = req.headers.get('x-cron-secret') ?? '';
  if (!safeEqual(got, await secret('cron'))) return new Response('forbidden', { status: 403 });

  const now = Date.now();
  const { data: players, error } = await db
    .from('players')
    .select('id, tg_id, tz_offset, last_seen, last_notified, saves(state)')
    .not('tg_id', 'is', null)
    .eq('notify', true)
    .lt('last_seen', new Date(now - 3600e3).toISOString())
    .or(`last_notified.is.null,last_notified.lt.${new Date(now - GAP).toISOString()}`)
    .limit(500);
  if (error) {
    console.error(error);
    return new Response('db error', { status: 500 });
  }

  let sent = 0;
  for (const p of players ?? []) {
    const save = Array.isArray(p.saves) ? p.saves[0] : p.saves;
    if (!save?.state) continue;
    try {
      const r = pickReminder(save.state as GameState, now, p.tz_offset, Date.parse(p.last_seen));
      if (!r) continue;
      const ok = await send(p.tg_id, r.text, { text: r.button, url: appLink() });
      if (ok) {
        sent++;
        await db.from('players').update({ last_notified: new Date(now).toISOString() }).eq('id', p.id);
      }
      await new Promise((ok) => setTimeout(ok, 40)); // лимиты Telegram: ~25 сообщений в секунду
    } catch (e) {
      console.warn(p.id, e);
    }
  }
  return new Response(JSON.stringify({ checked: players?.length ?? 0, sent }), { headers: { 'Content-Type': 'application/json' } });
});
