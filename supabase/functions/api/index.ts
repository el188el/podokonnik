// API игры: вход (Telegram или гость), синхронизация сохранения,
// подарки с глобальной проверкой «одна ссылка — один получатель», входящие награды.

import { verifyInitData, signSession, verifySession } from '../_shared/crypto.ts';
import { db } from '../_shared/db.ts';
import { BOT_TOKEN, TG_BOT, TG_CHANNEL, appLink, env, secret } from '../_shared/env.ts';
import { publicView, thirstyCount, VISIT_DAY_LIMIT, VISIT_HOST_LIMIT, VISIT_REWARD, type FriendWater } from '../_shared/game/social.ts';
import { sp as species } from '../_shared/game/species.ts';
import type { GameState } from '../_shared/game/types.ts';
import { CORS, fail, json } from '../_shared/http.ts';
import { alreadyBought, invoiceLink } from '../_shared/pay.ts';
import { PLUS_DAYS, PRODUCT_BY_ID } from '../_shared/game/products.ts';
import { activeEvent } from '../_shared/game/events.ts';
import { FORM_BY_ID } from '../_shared/game/products.ts';
import { hueOf } from '../_shared/game/breeding.ts';
import { escHtml, send } from '../_shared/tg.ts';
import { COOP_MAX_MEMBERS, COOP_MAX_PER_PLAYER, cleanAction, coopAct, coopAdvance, newCoop, type CoopState } from '../_shared/game/coop.ts';
import type { WindowSide } from '../_shared/game/types.ts';
import { CONTEST_PRIZES, CONTEST_VOTES, contestShot, prevWeekKey, themeOf, weekEndsAt, weekKey } from '../_shared/game/contest.ts';

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
  const { data } = await db.from('saves').select('state, version, device').eq('player_id', playerId).maybeSingle();
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

/** Discord Activity: обмен кода авторизации на токен и профиль. */
async function discordLogin(code: string): Promise<{ id: string; name: string; accessToken: string } | null> {
  const clientId = env('DISCORD_CLIENT_ID');
  const secret = env('DISCORD_CLIENT_SECRET');
  if (!clientId || !secret) return null;
  try {
    const r = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: secret, grant_type: 'authorization_code', code }),
    });
    const tok = await r.json();
    if (!tok.access_token) return null;
    const u = await (await fetch('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${tok.access_token}` } })).json();
    if (!u.id) return null;
    return { id: String(u.id), name: String(u.global_name || u.username || 'Садовник').slice(0, 48), accessToken: tok.access_token };
  } catch (e) {
    console.warn('discord', e);
    return null;
  }
}

async function auth(b: Body) {
  const tz = Number.isFinite(Number(b.tz)) ? Math.max(-720, Math.min(840, Math.round(Number(b.tz)))) : 180;
  let playerId: string;
  let isNew = false;
  let name = '';
  let start = str(b.start, 512);

  const initData = str(b.initData, 4096);
  const discordCode = str(b.discordCode, 256);
  const platform = ['telegram', 'web', 'discord', 'native'].includes(str(b.platform, 16)) ? str(b.platform, 16) : null;
  let discordToken: string | undefined;
  if (discordCode) {
    const d = await discordLogin(discordCode);
    if (!d) return fail('bad_discord_code', 401);
    discordToken = d.accessToken;
    name = d.name;
    const linked = await linkedPlayer('discord', d.id);
    const { data: ex } = linked ? { data: { id: linked } } : await db.from('players').select('id').eq('discord_id', d.id).maybeSingle();
    if (ex) {
      playerId = ex.id;
      // вошёл в аккаунт Telegram — имя оставляем из Telegram
      await db.from('players').update({ ...(linked ? {} : { name }), tz_offset: tz, last_seen: new Date().toISOString(), platform }).eq('id', playerId);
    } else {
      const { data, error } = await db.from('players').insert({ discord_id: d.id, name, tz_offset: tz, platform }).select('id').single();
      if (error) return fail('db', 500);
      playerId = data.id;
      isNew = true;
    }
  } else if (initData) {
    const v = await verifyInitData(initData, BOT_TOKEN);
    if (!v) return fail('bad_init_data', 401);
    start = v.startParam ?? start;
    name = [v.user.first_name, v.user.last_name].filter(Boolean).join(' ').slice(0, 48);
    const { data: ex } = await db.from('players').select('id').eq('tg_id', v.user.id).maybeSingle();
    if (ex) {
      playerId = ex.id;
      await db.from('players').update({ name, username: v.user.username ?? null, tz_offset: tz, last_seen: new Date().toISOString(), platform }).eq('id', playerId);
    } else {
      const { data, error } = await db.from('players').insert({ tg_id: v.user.id, name, username: v.user.username ?? null, tz_offset: tz, platform }).select('id').single();
      if (error) return fail('db', 500);
      playerId = data.id;
      isNew = true;
    }
  } else {
    const deviceId = str(b.deviceId, 64);
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(deviceId)) return fail('bad_device');
    name = str(b.name, 48);
    const linked = await linkedPlayer('device', deviceId);
    const { data: ex } = linked ? { data: { id: linked } } : await db.from('players').select('id').eq('device_id', deviceId).maybeSingle();
    if (ex) {
      playerId = ex.id;
      await db.from('players').update({ tz_offset: tz, last_seen: new Date().toISOString(), platform }).eq('id', playerId);
    } else {
      const { data, error } = await db.from('players').insert({ device_id: deviceId, name, tz_offset: tz, platform }).select('id').single();
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
    linked: await linkInfo(playerId),
    serverTime: Date.now(),
    save: await loadSave(playerId),
    inbox: await pendingInbox(playerId),
    plusUntil: await plusUntil(playerId),
    ...(discordToken ? { discordToken } : {}),
  });
}

async function sync(playerId: string, b: Body) {
  const state = b.state as Record<string, unknown> | undefined;
  const version = Number(b.version) || 0;
  const device = str(b.device, 64) || null;
  if (!state || typeof state !== 'object' || Array.isArray(state)) return fail('bad_state');
  if (JSON.stringify(state).length > MAX_STATE) return fail('too_big', 413);
  // Сохранения с перемоткой времени (панель ?debug) на сервер не попадают.
  if (Number(state.offset) !== 0) return fail('debug_state', 409);
  if (Number(state.simAt) > Date.now() + 10 * 60e3) return fail('future_state', 409);

  const level = Math.max(1, Math.min(999, Number(state.level) || 1));
  await db.from('players').update({ level, last_seen: new Date().toISOString(), name: str(state.name, 48) || undefined }).eq('id', playerId);

  const cur = await loadSave(playerId);
  if (!cur) {
    const { error } = await db.from('saves').insert({ player_id: playerId, state, version: 1, device });
    if (error) return json({ conflict: true, save: await loadSave(playerId), serverTime: Date.now() });
    return json({ version: 1, serverTime: Date.now(), inbox: await pendingInbox(playerId) });
  }
  if (cur.version !== version) return json({ conflict: true, save: cur, serverTime: Date.now(), inbox: await pendingInbox(playerId) });
  const { data } = await db.from('saves')
    .update({ state, version: version + 1, device, updated_at: new Date().toISOString() })
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

/** Сколько друзей пришло по приглашению; засчитываются те, кто дошёл до 2 уровня. */
async function invites(playerId: string) {
  const { count: joined } = await db.from('players').select('id', { count: 'exact', head: true }).eq('referrer', playerId);
  const { count: active } = await db.from('players').select('id', { count: 'exact', head: true }).eq('referrer', playerId).gte('level', 2);
  return json({ joined: joined ?? 0, active: active ?? 0 });
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

// ─────────────────── аналитика ───────────────────
async function trackEvents(playerId: string, b: Body) {
  const list = Array.isArray(b.events) ? b.events.slice(0, 50) : [];
  const now = Date.now();
  const rows = list
    .filter((e): e is { name: string; props?: Record<string, unknown>; at?: number } => !!e && typeof (e as { name?: unknown }).name === 'string')
    .filter((e) => /^[a-z_]{2,40}$/.test(e.name))
    .map((e) => {
      const at = Number(e.at);
      const props = e.props && typeof e.props === 'object' && JSON.stringify(e.props).length < 500 ? e.props : {};
      return { player_id: playerId, name: e.name, props, at: new Date(Number.isFinite(at) && Math.abs(now - at) < 7 * 86400e3 ? at : now).toISOString() };
    });
  if (rows.length) await db.from('analytics_events').insert(rows);
  return json({ ok: true, n: rows.length });
}

// ─────────────────── барахолка ───────────────────
const SWAP_TTL = 7 * 86400e3;
const SWAP_MAX_OPEN = 3;

/** Проверить черенок из запроса: вид существует, форма и цвет подходят к виду. */
function cleanCutting(v: unknown): { sp: string; form?: string; hue?: string } | null {
  const o = (v ?? {}) as Record<string, unknown>;
  const spId = str(o.sp, 32);
  if (species(spId).id !== spId) return null;
  const form = str(o.form, 32);
  const hue = str(o.hue, 32);
  return {
    sp: spId,
    ...(form && FORM_BY_ID[form]?.sp === spId ? { form } : {}),
    ...(hue && hueOf(spId, hue) ? { hue } : {}),
  };
}

async function swapsList(playerId: string) {
  const since = new Date(Date.now() - SWAP_TTL).toISOString();
  const { data: market } = await db.from('swaps')
    .select('id, owner, sp, form, hue, wants, note, created_at, players!swaps_owner_fkey(name, level)')
    .is('taken_by', null).eq('cancelled', false).neq('owner', playerId).gte('created_at', since)
    .order('created_at', { ascending: false }).limit(60);
  const { data: mine } = await db.from('swaps')
    .select('id, sp, form, hue, wants, note, created_at, taken_at, given, cancelled')
    .eq('owner', playerId).or(`taken_by.is.null,taken_at.gte.${new Date(Date.now() - 14 * 86400e3).toISOString()}`)
    .eq('cancelled', false).order('created_at', { ascending: false }).limit(20);
  return json({
    market: (market ?? []).map((m) => {
      const pl = (Array.isArray(m.players) ? m.players[0] : m.players) as { name?: string; level?: number } | null;
      return { id: m.id, sp: m.sp, form: m.form, hue: m.hue, wants: m.wants, note: m.note, at: Date.parse(m.created_at), owner: pl?.name || 'Садовник', level: pl?.level ?? 1 };
    }),
    mine: (mine ?? []).map((m) => ({ id: m.id, sp: m.sp, form: m.form, hue: m.hue, wants: m.wants, at: Date.parse(m.created_at), taken: !!m.taken_at, given: m.given })),
  });
}

async function swapCreate(playerId: string, b: Body) {
  const c = cleanCutting(b);
  if (!c) return fail('bad_cutting');
  const wants = (Array.isArray(b.wants) ? b.wants : []).map((w) => str(w, 32)).filter((w) => species(w).id === w).slice(0, 3);
  const { count } = await db.from('swaps').select('id', { count: 'exact', head: true }).eq('owner', playerId).is('taken_by', null).eq('cancelled', false);
  if ((count ?? 0) >= SWAP_MAX_OPEN) return fail('too_many', 429);
  const { data, error } = await db.from('swaps').insert({ owner: playerId, ...c, wants, note: str(b.note, 80) }).select('id').single();
  if (error) return fail('db', 500);
  return json({ id: data.id });
}

async function swapTake(playerId: string, b: Body) {
  const id = Number(b.id);
  const give = cleanCutting(b.give);
  if (!Number.isFinite(id) || !give) return fail('bad_args');
  const { data: offer } = await db.from('swaps').select('id, owner, sp, form, hue, wants').eq('id', id).maybeSingle();
  if (!offer) return json({ status: 'gone' });
  if (offer.wants?.length && !offer.wants.includes(give.sp)) return fail('not_wanted');
  const { data: s } = await db.rpc('take_swap', { p_id: id, p_taker: playerId, p_given: give });
  if (!s?.id) return json({ status: 'gone' });
  const { data: names } = await db.from('players').select('id, name, tg_id, notify').in('id', [playerId, offer.owner]);
  const me = names?.find((x) => x.id === playerId);
  const owner = names?.find((x) => x.id === offer.owner);
  await db.from('inbox').insert([
    { player_id: playerId, kind: 'swap_got', payload: { sp: offer.sp, form: offer.form, hue: offer.hue, from: owner?.name || 'Садовник' } },
    { player_id: offer.owner, kind: 'swap_got', payload: { ...give, from: me?.name || 'Садовник', traded: offer.sp } },
  ]);
  if (owner?.tg_id && owner.notify) {
    await send(owner.tg_id, `🔄 ${escHtml(me?.name || 'Кто-то')} обменял(а) твой черенок ${species(offer.sp).gen} на черенок ${species(give.sp).gen}! Он уже ждёт в запасе.`, { text: '🪴 Открыть подоконник', url: appLink() });
  }
  return json({ status: 'ok' });
}

async function swapCancel(playerId: string, b: Body) {
  const { data: s } = await db.rpc('cancel_swap', { p_id: Number(b.id), p_owner: playerId });
  if (!s?.id) return json({ status: 'gone' });
  await db.from('inbox').insert({ player_id: playerId, kind: 'swap_return', payload: { sp: s.sp, form: s.form, hue: s.hue } });
  return json({ status: 'ok' });
}

// ─────────────────── совместный подоконник ───────────────────
const randomCode = (n: number) => {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const r = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(r, (x) => abc[x % abc.length]).join('');
};

async function playerName(id: string) {
  const { data } = await db.from('players').select('name').eq('id', id).single();
  return (data?.name as string) || 'Садовник';
}

async function isMember(sill: number, playerId: string) {
  const { data } = await db.from('coop_members').select('sill_id').eq('sill_id', sill).eq('player_id', playerId).maybeSingle();
  return !!data;
}

/** Подоконник для клиента: состояние, досчитанное до текущего момента, и участники. */
async function coopView(row: { id: number; code: string; state: CoopState; version: number }) {
  const state = row.state;
  coopAdvance(state, Date.now());
  const { data: ms } = await db.from('coop_members').select('player_id, players(name)').eq('sill_id', row.id).order('joined_at');
  const members = (ms ?? []).map((m) => {
    const pl = (Array.isArray(m.players) ? m.players[0] : m.players) as { name?: string } | null;
    return { id: m.player_id as string, name: pl?.name || 'Садовник' };
  });
  return { id: row.id, code: row.code, version: row.version, state, members };
}

async function coopList(playerId: string) {
  const { data: mine } = await db.from('coop_members').select('sill_id').eq('player_id', playerId);
  const ids = (mine ?? []).map((m) => m.sill_id);
  if (!ids.length) return json({ coops: [] });
  const { data: rows } = await db.from('coop_sills').select('id, code, state, version').in('id', ids).order('id');
  return json({ coops: await Promise.all((rows ?? []).map((r) => coopView(r as never))) });
}

async function coopCreate(playerId: string, b: Body) {
  const { count } = await db.from('coop_members').select('sill_id', { count: 'exact', head: true }).eq('player_id', playerId);
  if ((count ?? 0) >= COOP_MAX_PER_PLAYER) return fail('too_many', 429);
  const side = (['N', 'E', 'S', 'W'].includes(str(b.window, 1)) ? str(b.window, 1) : 'E') as WindowSide;
  const state = newCoop(str(b.name, 24), side, Date.now());
  for (let i = 0; i < 3; i++) {
    const { data, error } = await db.from('coop_sills').insert({ code: randomCode(10), state, created_by: playerId }).select('id, code, state, version').single();
    if (error) continue;
    await db.from('coop_members').insert({ sill_id: data.id, player_id: playerId });
    return json({ coop: await coopView(data as never) });
  }
  return fail('db', 500);
}

async function coopJoin(playerId: string, b: Body) {
  const code = str(b.code, 16);
  if (!/^[A-Za-z0-9]{10}$/.test(code)) return json({ status: 'gone' });
  const { data: found } = await db.from('coop_sills').select('id').eq('code', code).maybeSingle();
  if (!found) return json({ status: 'gone' });
  const already = await isMember(found.id, playerId);
  if (!already) {
    const { count } = await db.from('coop_members').select('sill_id', { count: 'exact', head: true }).eq('player_id', playerId);
    if ((count ?? 0) >= COOP_MAX_PER_PLAYER) return json({ status: 'too_many' });
    const { data: sid } = await db.rpc('join_coop', { p_code: code, p_player: playerId, p_max: COOP_MAX_MEMBERS });
    if (sid === null || sid === undefined) return json({ status: 'gone' });
    if (sid === 0) return json({ status: 'full' });
  }
  const { data: row } = await db.from('coop_sills').select('id, code, state, version').eq('id', found.id).single();
  const view = await coopView(row as never);
  if (already) return json({ status: 'ok', coop: view });
  const me = await playerName(playerId);
  const others = view.members.filter((m) => m.id !== playerId);
  if (others.length) {
    await db.from('inbox').insert(others.map((m) => ({ player_id: m.id, kind: 'coop_join', payload: { name: me, sill: view.state.name } })));
    for (const o of others) await befriend(playerId, o.id, me, true).catch(() => false);
    const { data: tg } = await db.from('players').select('tg_id, notify').in('id', others.map((m) => m.id));
    for (const p of tg ?? []) {
      if (p.tg_id && p.notify) await send(p.tg_id, `💞 <b>${escHtml(me)}</b> теперь вместе с тобой ухаживает за подоконником «${escHtml(view.state.name)}»!`, { text: '🪴 Открыть подоконник', url: appLink() });
    }
  }
  return json({ status: 'ok', coop: view });
}

async function coopActRoute(playerId: string, b: Body) {
  const id = Number(b.id);
  const action = cleanAction(b.action);
  if (!Number.isFinite(id) || !action) return fail('bad_args');
  if (!(await isMember(id, playerId))) return fail('not_member', 403);
  const who = await playerName(playerId);
  for (let i = 0; i < 4; i++) {
    const { data: row } = await db.from('coop_sills').select('id, code, state, version').eq('id', id).maybeSingle();
    if (!row) return json({ result: { ok: false, reason: 'gone' } });
    const state = row.state as CoopState;
    const result = coopAct(state, action, who, Date.now(), randomCode(8));
    if (!result.ok) return json({ result, coop: await coopView({ ...row, state } as never) });
    const { data: upd } = await db.from('coop_sills')
      .update({ state, version: row.version + 1, updated_at: new Date().toISOString() })
      .eq('id', id).eq('version', row.version).select('id');
    if (upd?.length) return json({ result, coop: await coopView({ ...row, state, version: row.version + 1 } as never) });
  }
  return fail('busy', 409);
}

async function coopLeave(playerId: string, b: Body) {
  const id = Number(b.id);
  if (!Number.isFinite(id)) return fail('bad_args');
  await db.rpc('leave_coop', { p_sill: id, p_player: playerId });
  return json({ status: 'ok' });
}

// ─────────────────── подоконник недели ───────────────────
const entryOut = (e: { player_id: string; snapshot: unknown; votes: number }, friends: Set<string>) =>
  ({ id: e.player_id, shot: e.snapshot, votes: e.votes, friend: friends.has(e.player_id) });

/** Раздать призы за прошлую неделю — один раз, кто первый зашёл после конца недели. */
async function awardContest(week: string) {
  const { data: top } = await db.from('contest_entries').select('player_id, snapshot, votes')
    .eq('week', week).gt('votes', 0).order('votes', { ascending: false }).order('created_at').limit(CONTEST_PRIZES.length);
  const winners = (top ?? []).map((e, i) => ({ id: e.player_id, place: i + 1, votes: e.votes, name: (e.snapshot as { name?: string })?.name ?? 'Садовник' }));
  const { data: fresh } = await db.from('contest_awards').upsert({ week, winners }, { onConflict: 'week', ignoreDuplicates: true }).select('week');
  if (!fresh?.length) return;
  if (!winners.length) return;
  await db.from('inbox').insert(winners.map((w) => ({ player_id: w.id, kind: 'contest_win', payload: { place: w.place, leaves: CONTEST_PRIZES[w.place - 1], votes: w.votes, week } })));
  if (TG_CHANNEL) {
    const medal = ['🥇', '🥈', '🥉'];
    const lines = winners.map((w) => `${medal[w.place - 1]} ${escHtml(w.name)} — ❤️ ${w.votes}`).join('\n');
    await send(TG_CHANNEL, `🏆 <b>Подоконник недели</b> · «${escHtml(themeOf(week).title)}»\n\n${lines}\n\nНовая тема уже началась — выставляй свой подоконник!`, { text: '🏆 Участвовать', url: appLink() }).catch(() => false);
  }
  const { data: tg } = await db.from('players').select('id, tg_id, notify').in('id', winners.map((w) => w.id));
  for (const p of tg ?? []) {
    const w = winners.find((x) => x.id === p.id)!;
    if (p.tg_id && p.notify) await send(p.tg_id, `🏆 Твой подоконник занял <b>${w.place} место</b> в конкурсе «Подоконник недели»! Приз +${CONTEST_PRIZES[w.place - 1]} 🍃 уже ждёт в игре.`, { text: '🪴 Забрать приз', url: appLink() });
  }
}

async function contest(playerId: string) {
  const now = Date.now();
  const week = weekKey(now);
  const prev = prevWeekKey(now);
  const { data: awarded } = await db.from('contest_awards').select('winners').eq('week', prev).maybeSingle();
  if (!awarded) await awardContest(prev).catch((e) => console.warn('award', e));
  const [{ data: entries }, { data: mine }, { data: votes }, { data: fr }, { data: last }] = await Promise.all([
    db.from('contest_entries').select('player_id, snapshot, votes').eq('week', week).order('votes', { ascending: false }).order('created_at').limit(60),
    db.from('contest_entries').select('player_id, snapshot, votes').eq('week', week).eq('player_id', playerId).maybeSingle(),
    db.from('contest_votes').select('target').eq('week', week).eq('voter', playerId),
    db.from('friends').select('b').eq('a', playerId),
    db.from('contest_entries').select('player_id, snapshot, votes').eq('week', prev).gt('votes', 0).order('votes', { ascending: false }).order('created_at').limit(3),
  ]);
  const friends = new Set((fr ?? []).map((f) => f.b as string));
  // друзья — наверх, остальные по голосам
  const list = (entries ?? []).filter((e) => e.player_id !== playerId).map((e) => entryOut(e, friends))
    .sort((a, b) => Number(b.friend) - Number(a.friend) || b.votes - a.votes);
  return json({
    week, endsAt: weekEndsAt(now), theme: themeOf(week), total: entries?.length ?? 0,
    entries: list, mine: mine ? entryOut(mine, friends) : null,
    votes: (votes ?? []).map((v) => v.target), votesMax: CONTEST_VOTES,
    last: { week: prev, theme: themeOf(prev), top: (last ?? []).map((e) => entryOut(e, friends)) },
  });
}

async function contestEnter(playerId: string, b: Body) {
  const save = await loadSave(playerId);
  if (!save?.state) return fail('no_save');
  const shot = contestShot(publicView(save.state as GameState, Date.now()), str(b.sill, 32));
  if (!shot) return json({ status: 'empty' });
  const week = weekKey(Date.now());
  const { error } = await db.from('contest_entries').upsert({ week, player_id: playerId, snapshot: shot, updated_at: new Date().toISOString() }, { onConflict: 'week,player_id' });
  if (error) return fail('db', 500);
  return json({ status: 'ok' });
}

async function contestVote(playerId: string, b: Body) {
  const target = str(b.target, 40);
  if (!UUID.test(target)) return fail('bad_args');
  const { data } = await db.rpc('vote_contest', { p_week: weekKey(Date.now()), p_voter: playerId, p_target: target, p_max: CONTEST_VOTES });
  return json({ status: data ?? 'error' });
}

// ─────────────────── карточки для сторис ───────────────────
const STORY_DAY_LIMIT = 15;

async function storyUpload(playerId: string, b: Body) {
  const data = typeof b.image === 'string' ? b.image : '';
  const m = /^data:image\/(jpeg|png);base64,([A-Za-z0-9+/=]+)$/.exec(data);
  if (!m || m[2].length > 2_000_000) return fail('bad_image');
  const since = new Date(Date.now() - 86400e3).toISOString();
  const { count } = await db.from('story_uploads').select('id', { count: 'exact', head: true }).eq('player_id', playerId).gte('created_at', since);
  if ((count ?? 0) >= STORY_DAY_LIMIT) return fail('limit', 429);
  const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
  const path = `${new Date().toISOString().slice(0, 10)}/${randomCode(16)}.${m[1] === 'png' ? 'png' : 'jpg'}`;
  const { error } = await db.storage.from('stories').upload(path, bytes, { contentType: `image/${m[1]}`, upsert: false });
  if (error) return fail('storage', 500);
  await db.from('story_uploads').insert({ player_id: playerId, path });
  const { data: pub } = db.storage.from('stories').getPublicUrl(path);
  return json({ url: pub.publicUrl });
}

// ─────────────────── подарочная подписка ───────────────────
async function plusClaim(playerId: string, b: Body) {
  const code = str(b.code, 16);
  if (!/^[A-Za-z0-9]{12}$/.test(code)) return json({ status: 'gone' });
  const { data: g } = await db.rpc('claim_plus_gift', { p_code: code, p_player: playerId });
  if (!g?.code) {
    const { data: row } = await db.from('plus_gifts').select('buyer, claimed_by').eq('code', code).maybeSingle();
    return json({ status: !row ? 'gone' : row.buyer === playerId ? 'own' : row.claimed_by === playerId ? 'dup' : 'taken' });
  }
  const { data: until } = await db.rpc('extend_plus', { p_player: playerId, p_days: PLUS_DAYS, p_until: null });
  const plusUntil = Date.parse(String(until));
  const me = await playerName(playerId);
  await db.from('inbox').insert({ player_id: playerId, kind: 'purchase', payload: { product: 'plus', plusUntil } });
  await befriend(playerId, g.buyer, me, true).catch(() => false);
  const { data: buyer } = await db.from('players').select('tg_id, name').eq('id', g.buyer).maybeSingle();
  if (buyer?.tg_id) await send(buyer.tg_id, `🌟 ${escHtml(me)} получил(а) твой подарок — месяц «Садовник+». Спасибо за щедрость!`);
  return json({ status: 'ok', from: buyer?.name || 'Друг', plusUntil });
}

// ─────────────────── вход через Telegram на других платформах ───────────────────
// Браузер, Android или Discord создают запрос, игрок подтверждает его в боте —
// и это устройство (или Discord) навсегда входит в его аккаунт Telegram.

const LOGIN_TTL = 10 * 60e3;

async function linkedPlayer(kind: 'device' | 'discord', key: string): Promise<string | null> {
  const { data } = await db.from('account_links').select('player_id').eq('kind', kind).eq('key', key).maybeSingle();
  return data?.player_id ?? null;
}

/** Чей аккаунт Telegram: имя для профиля («Вошли как …»). */
async function linkInfo(playerId: string) {
  const { data } = await db.from('players').select('tg_id, username, name').eq('id', playerId).single();
  return data?.tg_id ? { tg: true, name: data.name, username: data.username ?? undefined } : null;
}

function loginCode() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const r = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(r, (x) => abc[x % abc.length]).join('');
}

async function loginStart(playerId: string, b: Body) {
  if (!TG_BOT) return fail('no_bot', 503);
  const { data: me } = await db.from('players').select('tg_id, discord_id, device_id').eq('id', playerId).single();
  if (me?.tg_id) return fail('already_telegram');
  const deviceId = str(b.deviceId, 64);
  const link = me?.discord_id ? { kind: 'discord', key: String(me.discord_id) }
    : /^[A-Za-z0-9_-]{16,64}$/.test(deviceId) ? { kind: 'device', key: deviceId } : null;
  if (!link) return fail('bad_device');
  const code = loginCode();
  const { error } = await db.from('login_requests').insert({ code, link_kind: link.kind, link_key: link.key, platform: str(b.platform, 16) || null });
  if (error) return fail('db', 500);
  await db.from('login_requests').delete().lt('created_at', new Date(Date.now() - 24 * 3600e3).toISOString());
  return json({ code, url: `https://t.me/${TG_BOT}?start=login_${code}`, ttl: LOGIN_TTL });
}

/** Устройство ждёт подтверждения. Когда игрок нажал «Да» в боте — выдаём вход. */
async function loginPoll(b: Body) {
  const code = str(b.code, 40);
  if (!/^[A-Za-z0-9]{20,40}$/.test(code)) return fail('bad_code');
  const { data: r } = await db.from('login_requests').select('*').eq('code', code).maybeSingle();
  if (!r || r.used_at || Date.now() - Date.parse(r.created_at) > LOGIN_TTL) return json({ status: 'expired' });
  if (!r.player_id || !r.confirmed_at) return json({ status: 'wait' });
  const { data: upd } = await db.from('login_requests').update({ used_at: new Date().toISOString() }).eq('code', code).is('used_at', null).select('code');
  if (!upd?.length) return json({ status: 'expired' });
  await db.from('account_links').upsert({ kind: r.link_kind, key: r.link_key, player_id: r.player_id });
  const playerId = r.player_id as string;
  return json({
    status: 'ok',
    token: await signSession(playerId, await secret('session')),
    playerId,
    linked: await linkInfo(playerId),
    serverTime: Date.now(),
    save: await loadSave(playerId),
    inbox: await pendingInbox(playerId),
    plusUntil: await plusUntil(playerId),
  });
}

/** Выйти из аккаунта Telegram на этом устройстве — снова гостевая игра. */
async function loginUnlink(playerId: string, b: Body) {
  const deviceId = str(b.deviceId, 64);
  if (b.discord === true) await db.from('account_links').delete().eq('kind', 'discord').eq('player_id', playerId);
  else if (deviceId) await db.from('account_links').delete().eq('kind', 'device').eq('key', deviceId).eq('player_id', playerId);
  return json({ ok: true });
}

// ─────────────────── оплата ───────────────────
async function payInvoice(playerId: string, b: Body) {
  const product = PRODUCT_BY_ID[str(b.product, 40)];
  if (!product) return fail('bad_product');
  if (product.kind === 'pass' && !activeEvent(Date.now())) return fail('no_event');
  if (product.once && (await alreadyBought(playerId, product.id))) return fail('already');
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
    if (route === '/login/poll') return await loginPoll(body);

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
      case '/invites': return await invites(playerId);
      case '/visit': return await visit(playerId, body);
      case '/visit/water': return await visitWater(playerId, body);
      case '/pay/invoice': return await payInvoice(playerId, body);
      case '/track': return await trackEvents(playerId, body);
      case '/swaps': return await swapsList(playerId);
      case '/swaps/create': return await swapCreate(playerId, body);
      case '/swaps/take': return await swapTake(playerId, body);
      case '/swaps/cancel': return await swapCancel(playerId, body);
      case '/coop': return await coopList(playerId);
      case '/coop/create': return await coopCreate(playerId, body);
      case '/coop/join': return await coopJoin(playerId, body);
      case '/coop/act': return await coopActRoute(playerId, body);
      case '/coop/leave': return await coopLeave(playerId, body);
      case '/contest': return await contest(playerId);
      case '/contest/enter': return await contestEnter(playerId, body);
      case '/contest/vote': return await contestVote(playerId, body);
      case '/story': return await storyUpload(playerId, body);
      case '/plus/claim': return await plusClaim(playerId, body);
      case '/login/start': return await loginStart(playerId, body);
      case '/login/unlink': return await loginUnlink(playerId, body);
      default: return fail('not_found', 404);
    }
  } catch (e) {
    console.error(route, e);
    return fail('server', 500);
  }
});
