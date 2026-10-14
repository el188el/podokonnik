// API игры: вход (Telegram или гость), синхронизация сохранения,
// подарки с глобальной проверкой «одна ссылка — один получатель», входящие награды.

import { verifyInitData, signSession, verifySession } from '../_shared/crypto.ts';
import { db } from '../_shared/db.ts';
import { BOT_TOKEN, appLink, secret } from '../_shared/env.ts';
import { publicView, thirstyCount, VISIT_DAY_LIMIT, VISIT_HOST_LIMIT, VISIT_REWARD, type FriendWater } from '../_shared/game/social.ts';
import { sp as species } from '../_shared/game/species.ts';
import type { GameState } from '../_shared/game/types.ts';
import { CORS, fail, json } from '../_shared/http.ts';
import { invoiceLink } from '../_shared/pay.ts';
import { PRODUCT_BY_ID } from '../_shared/game/products.ts';
import { activeEvent } from '../_shared/game/events.ts';
import { escHtml, send } from '../_shared/tg.ts';

const MAX_STATE = 300_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CODE = /^[A-Za-z0-9]{8,32}$/;

type Body = Record<string, unknown>;
const str = (v: unknown, max = 64) => (typeof v === 'string' ? v.slice(0, max) : '');

async function pendingInbox(playerId: string) {
  const { data } = await db.from('inbox').select('id, kind, payload, created_at').eq('player_id', playerId).is('delivered_at', null).order('id').limit(20);
  return data ?? [];
}

async function plusUntil(playerId: string) {
  const { data } = await db.from('players').select('plus_until').eq('id', playerId).single();
  return data?.plus_until ? Date.parse(data.plus_until) : 0;
}

async function loadSave(playerId: string) {
  const { data } = await db.from('saves').select('state, version').eq('player_id', playerId).maybeSingle();
  return data;
}

/** Реферал: новый игрок пришёл по приглашению или по подарку. */
async function linkReferrer(playerId: string, referrer: string, newName: string) {
  if (!UUID.test(referrer) || referrer === playerId) return;
  const { data: ref } = await db.from('players').select('id, tg_id').eq('id', referrer).maybeSingle();
  if (!ref) return;
  const { data: upd } = await db.from('players').update({ referrer }).eq('id', playerId).is('referrer', null).select('id');
  if (!upd?.length) return;
  await db.from('inbox').insert([
    { player_id: referrer, kind: 'referral', payload: { name: newName } },
    { player_id: playerId, kind: 'welcome', payload: {} },
  ]);
  if (ref.tg_id) {
    await send(ref.tg_id, `👯 <b>${escHtml(newName || 'Новый друг')}</b> пришёл(ла) по твоему приглашению! Тебе +50 🍃`, { text: '🪴 Открыть подоконник', url: appLink() });
  }
}

async function auth(b: Body) {
  const tz = Number.isFinite(Number(b.tz)) ? Math.max(-720, Math.min(840, Math.round(Number(b.tz)))) : 180;
  let playerId: string;
  let isNew = false;
  let name = '';
  let start = str(b.start, 512);

  const initData = str(b.initData, 4096);
  if (initData) {
    const v = await verifyInitData(initData, BOT_TOKEN);
    if (!v) return fail('bad_init_data', 401);
    start = v.startParam ?? start;
    name = [v.user.first_name, v.user.last_name].filter(Boolean).join(' ').slice(0, 48);
    const { data: ex } = await db.from('players').select('id').eq('tg_id', v.user.id).maybeSingle();
    if (ex) {
      playerId = ex.id;
      await db.from('players').update({ name, username: v.user.username ?? null, tz_offset: tz, last_seen: new Date().toISOString() }).eq('id', playerId);
    } else {
      const { data, error } = await db.from('players').insert({ tg_id: v.user.id, name, username: v.user.username ?? null, tz_offset: tz }).select('id').single();
      if (error) return fail('db', 500);
      playerId = data.id;
      isNew = true;
    }
  } else {
    const deviceId = str(b.deviceId, 64);
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(deviceId)) return fail('bad_device');
    name = str(b.name, 48);
    const { data: ex } = await db.from('players').select('id').eq('device_id', deviceId).maybeSingle();
    if (ex) {
      playerId = ex.id;
      await db.from('players').update({ tz_offset: tz, last_seen: new Date().toISOString() }).eq('id', playerId);
    } else {
      const { data, error } = await db.from('players').insert({ device_id: deviceId, name, tz_offset: tz }).select('id').single();
      if (error) return fail('db', 500);
      playerId = data.id;
      isNew = true;
    }
  }

  // r<id> — приглашение, v<id> — «полей, я в отпуске»: в обоих случаях становимся друзьями
  if (/^[rv]/.test(start) && UUID.test(start.slice(1))) {
    if (isNew) await linkReferrer(playerId, start.slice(1), name);
    await befriend(playerId, start.slice(1), name);
  }

  return json({
    token: await signSession(playerId, await secret('session')),
    playerId,
    serverTime: Date.now(),
    save: await loadSave(playerId),
    inbox: await pendingInbox(playerId),
    plusUntil: await plusUntil(playerId),
  });
}

async function sync(playerId: string, b: Body) {
  const state = b.state as Record<string, unknown> | undefined;
  const version = Number(b.version) || 0;
  if (!state || typeof state !== 'object' || Array.isArray(state)) return fail('bad_state');
  if (JSON.stringify(state).length > MAX_STATE) return fail('too_big', 413);
  // Сохранения с перемоткой времени (панель ?debug) на сервер не попадают.
  if (Number(state.offset) !== 0) return fail('debug_state', 409);
  if (Number(state.simAt) > Date.now() + 10 * 60e3) return fail('future_state', 409);

  const level = Math.max(1, Math.min(999, Number(state.level) || 1));
  await db.from('players').update({ level, last_seen: new Date().toISOString(), name: str(state.name, 48) || undefined }).eq('id', playerId);

  const cur = await loadSave(playerId);
  if (!cur) {
    const { error } = await db.from('saves').insert({ player_id: playerId, state, version: 1 });
    if (error) return json({ conflict: true, save: await loadSave(playerId), serverTime: Date.now() });
    return json({ version: 1, serverTime: Date.now(), inbox: await pendingInbox(playerId) });
  }
  if (cur.version !== version) return json({ conflict: true, save: cur, serverTime: Date.now(), inbox: await pendingInbox(playerId) });
  const { data } = await db.from('saves')
    .update({ state, version: version + 1, updated_at: new Date().toISOString() })
    .eq('player_id', playerId).eq('version', version).select('version');
  if (!data?.length) return json({ conflict: true, save: await loadSave(playerId), serverTime: Date.now() });
  return json({ version: version + 1, serverTime: Date.now(), inbox: await pendingInbox(playerId), plusUntil: await plusUntil(playerId) });
}

async function giftCreate(playerId: string, b: Body) {
  const code = str(b.code, 32);
  const spId = str(b.sp, 32);
  if (!CODE.test(code) || species(spId).id !== spId) return fail('bad_gift');
  await db.from('gifts').upsert({ code, sender: playerId, sp: spId, from_name: str(b.from, 24), note: Number(b.note) || 0 }, { onConflict: 'code', ignoreDuplicates: true });
  return json({ ok: true });
}

async function giftClaim(playerId: string, b: Body) {
  const code = str(b.code, 32);
  const spId = str(b.sp, 32);
  if (!CODE.test(code) || species(spId).id !== spId) return fail('bad_gift');
  const { data, error } = await db.rpc('claim_gift', { p_code: code, p_player: playerId, p_sp: spId, p_from: str(b.from, 24), p_note: Number(b.note) || 0 });
  if (error || !data?.length) return fail('db', 500);
  const r = data[0] as { status: string; sender: string | null; sp: string };
  if (r.status === 'ok' && r.sender) {
    const { data: me } = await db.from('players').select('name, created_at, referrer').eq('id', playerId).single();
    const name = me?.name || 'Друг';
    await db.from('inbox').insert({ player_id: r.sender, kind: 'gift_claimed', payload: { sp: r.sp, name } });
    // подарок от друга привёл нового игрока — это тоже приглашение
    if (me && !me.referrer && Date.now() - Date.parse(me.created_at) < 86400e3) await linkReferrer(playerId, r.sender, name);
    await befriend(playerId, r.sender, name, true);
    const { data: snd } = await db.from('players').select('tg_id').eq('id', r.sender).single();
    if (snd?.tg_id) await send(snd.tg_id, `🎁 <b>${escHtml(name)}</b> забрал(а) твой черенок: ${species(r.sp).name.toLowerCase()} уже в стакане с водой! +10 🍃`, { text: '🪴 Открыть подоконник', url: appLink() });
  }
  return json({ status: r.status });
}

async function inboxAck(playerId: string, b: Body) {
  const ids = Array.isArray(b.ids) ? b.ids.map(Number).filter(Number.isFinite).slice(0, 50) : [];
  if (ids.length) await db.from('inbox').update({ delivered_at: new Date().toISOString() }).eq('player_id', playerId).in('id', ids);
  return json({ ok: true });
}

async function settings(playerId: string, b: Body) {
  const patch: Record<string, unknown> = {};
  if (typeof b.notify === 'boolean') patch.notify = b.notify;
  if (Number.isFinite(Number(b.tz))) patch.tz_offset = Math.max(-720, Math.min(840, Math.round(Number(b.tz))));
  if (Object.keys(patch).length) await db.from('players').update(patch).eq('id', playerId);
  return json({ ok: true });
}


// ─────────────────── друзья ───────────────────
async function befriend(me: string, other: string, myName: string, quiet = false) {
  if (!UUID.test(other) || other === me) return false;
  const { data: exists } = await db.from('players').select('id').eq('id', other).maybeSingle();
  if (!exists) return false;
  const { data: fresh } = await db.rpc('add_friend', { p_a: me, p_b: other });
  if (fresh && !quiet) await db.from('inbox').insert({ player_id: other, kind: 'friend_added', payload: { name: myName } });
  return !!fresh;
}

async function areFriends(a: string, b: string) {
  const { data } = await db.from('friends').select('a').eq('a', a).eq('b', b).maybeSingle();
  return !!data;
}

async function pendingWaters(host: string): Promise<FriendWater[]> {
  const { data } = await db.from('inbox').select('payload').eq('player_id', host).eq('kind', 'friend_water').is('delivered_at', null).limit(100);
  return (data ?? []).map((r) => ({ plantId: String(r.payload.plantId), at: Number(r.payload.at) || Date.now() }));
}

async function hostView(host: string) {
  const save = await loadSave(host);
  if (!save?.state || !Array.isArray((save.state as GameState).plants)) return null;
  return publicView(save.state as GameState, Date.now(), await pendingWaters(host));
}

async function friendsList(playerId: string) {
  const { data: rows } = await db.from('friends').select('b, created_at').eq('a', playerId).order('created_at', { ascending: false }).limit(60);
  const ids = (rows ?? []).map((r) => r.b);
  if (!ids.length) return json({ friends: [] });
  const { data: players } = await db.from('players').select('id, name, level, last_seen, plus_until, saves(state)').in('id', ids);
  const pending = new Map<string, FriendWater[]>();
  const { data: waters } = await db.from('inbox').select('player_id, payload').in('player_id', ids).eq('kind', 'friend_water').is('delivered_at', null);
  for (const w of waters ?? []) {
    const list = pending.get(w.player_id) ?? [];
    list.push({ plantId: String(w.payload.plantId), at: Number(w.payload.at) || Date.now() });
    pending.set(w.player_id, list);
  }
  const now = Date.now();
  const friends = (players ?? []).map((p) => {
    const save = Array.isArray(p.saves) ? p.saves[0] : p.saves;
    let thirsty = 0, plants = 0;
    try {
      if (save?.state) {
        const v = publicView(save.state as GameState, now, pending.get(p.id) ?? []);
        thirsty = thirstyCount(v);
        plants = v.plants.length;
      }
    } catch (e) { console.warn('view', p.id, e); }
    return { id: p.id, name: p.name || 'Садовник', level: p.level, lastSeen: Date.parse(p.last_seen), thirsty, plants, plus: !!p.plus_until && Date.parse(p.plus_until) > now };
  });
  friends.sort((a, b) => b.thirsty - a.thirsty || b.lastSeen - a.lastSeen);
  return json({ friends, serverTime: now });
}

async function friendAdd(playerId: string, b: Body) {
  const other = str(b.id, 40);
  const { data: me } = await db.from('players').select('name').eq('id', playerId).single();
  const fresh = await befriend(playerId, other, me?.name ?? '');
  return json({ ok: true, fresh });
}

async function visitsLeft(visitor: string, host: string) {
  const { data } = await db.from('visits').select('host, waters').eq('visitor', visitor).eq('day', new Date().toISOString().slice(0, 10));
  const total = (data ?? []).reduce((n, r) => n + r.waters, 0);
  const here = (data ?? []).find((r) => r.host === host)?.waters ?? 0;
  return Math.max(0, Math.min(VISIT_HOST_LIMIT - here, VISIT_DAY_LIMIT - total));
}

async function visit(playerId: string, b: Body) {
  const host = str(b.id, 40);
  if (!UUID.test(host)) return fail('bad_id');
  if (host !== playerId && !(await areFriends(playerId, host))) return fail('not_friends', 403);
  const view = await hostView(host);
  if (!view) return json({ view: null, watersLeft: 0 });
  return json({ view, watersLeft: host === playerId ? 0 : await visitsLeft(playerId, host), serverTime: Date.now() });
}

async function visitWater(playerId: string, b: Body) {
  const host = str(b.id, 40);
  const plantId = str(b.plantId, 32);
  if (!UUID.test(host) || host === playerId || !plantId) return fail('bad_args');
  if (!(await areFriends(playerId, host))) return fail('not_friends', 403);
  const view = await hostView(host);
  const plant = view?.plants.find((p) => p.id === plantId);
  if (!view || !plant) return fail('no_plant', 404);
  if (!plant.thirsty || view.neighbor) return json({ status: 'not_needed' });
  const { data: ok } = await db.rpc('count_visit_water', { p_visitor: playerId, p_host: host, p_host_limit: VISIT_HOST_LIMIT, p_day_limit: VISIT_DAY_LIMIT });
  if (!ok) return json({ status: 'limit' });
  const { data: me } = await db.from('players').select('name').eq('id', playerId).single();
  const name = me?.name || 'Друг';
  await db.from('inbox').insert([
    { player_id: host, kind: 'friend_water', payload: { plantId, at: Date.now(), name, sp: plant.sp } },
    { player_id: playerId, kind: 'water_reward', payload: { reward: VISIT_REWARD, host: view.name } },
  ]);
  const { data: h } = await db.from('players').select('tg_id, notify').eq('id', host).single();
  if (h?.tg_id && h.notify) {
    await send(h.tg_id, `💧 <b>${escHtml(name)}</b> полил(а) твой ${escHtml(species(plant.sp).name.toLowerCase())}. Спасибо скажешь? 🌿`, { text: '🪴 Открыть подоконник', url: appLink() });
  }
  return json({ status: 'ok', watersLeft: await visitsLeft(playerId, host) });
}

// ─────────────────── оплата ───────────────────
async function payInvoice(playerId: string, b: Body) {
  const product = PRODUCT_BY_ID[str(b.product, 40)];
  if (!product) return fail('bad_product');
  if (product.kind === 'pass' && !activeEvent(Date.now())) return fail('no_event');
  const { data: me } = await db.from('players').select('tg_id').eq('id', playerId).single();
  if (!me?.tg_id) return fail('telegram_only', 403);
  const link = await invoiceLink(product, playerId);
  return link ? json({ link }) : fail('invoice', 502);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const route = new URL(req.url).pathname.replace(/^.*\/api/, '') || '/';
  try {
    if (route === '/time') return json({ serverTime: Date.now() });
    if (req.method !== 'POST') return fail('method', 405);
    const body = (await req.json().catch(() => ({}))) as Body;
    if (route === '/auth') return await auth(body);

    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    const playerId = await verifySession(token, await secret('session'));
    if (!playerId) return fail('unauthorized', 401);
    switch (route) {
      case '/sync': return await sync(playerId, body);
      case '/gift/create': return await giftCreate(playerId, body);
      case '/gift/claim': return await giftClaim(playerId, body);
      case '/inbox/ack': return await inboxAck(playerId, body);
      case '/settings': return await settings(playerId, body);
      case '/friends': return await friendsList(playerId);
      case '/friends/add': return await friendAdd(playerId, body);
      case '/visit': return await visit(playerId, body);
      case '/visit/water': return await visitWater(playerId, body);
      case '/pay/invoice': return await payInvoice(playerId, body);
      default: return fail('not_found', 404);
    }
  } catch (e) {
    console.error(route, e);
    return fail('server', 500);
  }
});
