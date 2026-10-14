// Напоминания от бота. Вызывается планировщиком pg_cron внутри Supabase раз в 30 минут
// с заголовком x-cron-secret. Пишет не чаще раза в 6 часов и не в тихие часы.
// POST ?setup=1 (при деплое) ставит или обновляет само задание в pg_cron.

import { safeEqual } from '../_shared/crypto.ts';
import { db } from '../_shared/db.ts';
import { TG_CHANNEL, appLink, secret } from '../_shared/env.ts';
import { dailyTip } from '../_shared/game/tips.ts';
import type { GameState } from '../_shared/game/types.ts';
import { send } from '../_shared/tg.ts';
import { pickReminder } from './remind.ts';
import { chatNudge, stepChat, type ChatPlant } from '../_shared/game/chatplant.ts';
import { postCard } from '../_shared/chat.ts';

const GAP = 6 * 3600e3;

Deno.serve(async (req) => {
  const got = req.headers.get('x-cron-secret') ?? '';
  if (!safeEqual(got, await secret('cron'))) return new Response('forbidden', { status: 403 });

  if (new URL(req.url).searchParams.has('setup')) {
    const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/notify`;
    const { error } = await db.rpc('schedule_notify', { p_url: url, p_secret: await secret('cron') });
    if (error) {
      console.error(error);
      return new Response(`setup failed: ${error.message}`, { status: 500 });
    }
    return new Response('scheduled');
  }

  const now = Date.now();
  // совет дня в канал: в 10:00–10:29 по Москве (задание запускается раз в 30 минут)
  const msk = new Date(now + 3 * 3600e3);
  if (TG_CHANNEL && msk.getUTCHours() === 10 && msk.getUTCMinutes() < 30) {
    const tip = dailyTip(now);
    await send(TG_CHANNEL, `<b>${tip.title}</b>\n\n${tip.text}`, { text: '🪴 Открыть Подоконник', url: appLink() }).catch((e) => console.warn('channel', e));
  }
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

  const ids = (players ?? []).map((p) => p.id);
  const waters = new Map<string, { plantId: string; at: number }[]>();
  if (ids.length) {
    const { data: rows } = await db.from('inbox').select('player_id, payload').in('player_id', ids).eq('kind', 'friend_water').is('delivered_at', null);
    for (const r of rows ?? []) waters.set(r.player_id, [...(waters.get(r.player_id) ?? []), { plantId: String(r.payload.plantId), at: Number(r.payload.at) }]);
  }

  let sent = 0;
  for (const p of players ?? []) {
    const save = Array.isArray(p.saves) ? p.saves[0] : p.saves;
    if (!save?.state) continue;
    try {
      const r = pickReminder(save.state as GameState, now, p.tz_offset, Date.parse(p.last_seen), waters.get(p.id) ?? []);
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
  const chats = await nudgeChats(now);
  return new Response(JSON.stringify({ checked: players?.length ?? 0, sent, chats }), { headers: { 'Content-Type': 'application/json' } });
});

/** Растения в групповых чатах: досчитать состояние и напомнить, если хотят пить (не ночью по Москве). */
async function nudgeChats(now: number) {
  const msk = new Date(now + 3 * 3600e3).getUTCHours();
  const quiet = msk >= 23 || msk < 9;
  const { data: rows } = await db.from('chat_plants').select('chat_id, state, nudged_at').eq('active', true).limit(500);
  let n = 0;
  for (const r of rows ?? []) {
    const wasWilted = !!(r.state as ChatPlant).wilted;
    const p = stepChat(r.state as ChatPlant, now);
    await db.from('chat_plants').update({ state: p }).eq('chat_id', r.chat_id);
    const text = chatNudge(p);
    const since = r.nudged_at ? now - Date.parse(r.nudged_at) : Infinity;
    // хочет пить — не чаще раза в 12 часов; засохло — сразу, затем раз в сутки
    if (!text || quiet || since < (p.wilted && !wasWilted ? 0 : p.wilted ? 24 : 12) * 3600e3) continue;
    const m = await postCard(r.chat_id, p, text);
    if (m) {
      n++;
      await db.from('chat_plants').update({ nudged_at: new Date(now).toISOString() }).eq('chat_id', r.chat_id);
    } else {
      await db.from('chat_plants').update({ active: false }).eq('chat_id', r.chat_id); // бота убрали из чата
    }
    await new Promise((ok) => setTimeout(ok, 40));
  }
  return n;
}
