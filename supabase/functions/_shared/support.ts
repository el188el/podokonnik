// Поддержка: сообщения игроков боту превращаются в обращения (support_tickets / support_messages).
// О новом сообщении бот сообщает панели поддержки по адресу SUPPORT_HOOK (секрет функции),
// а панель отвечает игроку через этот же бот — запросом с заголовком X-Support-Secret.
// Так же панель делает рассылки: бот игры отправляет пачку сообщений с учётом лимитов Telegram.

import { safeEqual } from './crypto.ts';
import { db } from './db.ts';
import { BOT_TOKEN, appLink, env } from './env.ts';
import { json } from './http.ts';
import { tg } from './tg.ts';

const SUPPORT_SECRET = env('SUPPORT_SECRET');
const SUPPORT_HOOK = env('SUPPORT_HOOK');

export interface SupportFrom { id: number; first_name?: string; last_name?: string; username?: string }

/** Сохранить сообщение игрока. Возвращает true, если это первое сообщение нового (или снова открытого) обращения. */
export async function supportIn(from: SupportFrom, text: string, photo?: string, messageId?: number): Promise<boolean> {
  const name = [from.first_name, from.last_name].filter(Boolean).join(' ').slice(0, 64);
  const { data: p } = await db.from('players').select('id').eq('tg_id', from.id).maybeSingle();
  const { data: cur } = await db.from('support_tickets').select('id, status, unread')
    .eq('tg_id', from.id).neq('status', 'closed').order('id', { ascending: false }).limit(1).maybeSingle();
  let ticket = cur?.id as number | undefined;
  const fresh = !cur || cur.status === 'answered';
  const now = new Date().toISOString();
  if (!ticket) {
    const { data } = await db.from('support_tickets')
      .insert({ player_id: p?.id ?? null, tg_id: from.id, name, username: from.username ?? null, unread: 1 })
      .select('id').single();
    ticket = data?.id;
  } else {
    await db.from('support_tickets').update({ status: 'open', unread: (cur!.unread ?? 0) + 1, updated_at: now, name, username: from.username ?? null }).eq('id', ticket);
  }
  if (!ticket) return false;
  const { data: msg } = await db.from('support_messages')
    .insert({ ticket_id: ticket, dir: 'in', text: text.slice(0, 4000), photo: photo ?? null, tg_message_id: messageId ?? null })
    .select('id').single();
  if (SUPPORT_HOOK && SUPPORT_SECRET) {
    await fetch(SUPPORT_HOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Support-Secret': SUPPORT_SECRET },
      body: JSON.stringify({ ticket, message: msg?.id }),
    }).catch((e) => console.warn('support hook', e));
  }
  return fresh;
}

const BROADCAST_BATCH = 300; // получателей за один запрос панели
const PER_SECOND = 25;        // лимит Telegram — около 30 сообщений в секунду

type Delivery = 'sent' | 'blocked' | 'failed';

/** Одно сообщение рассылки. 403 (бот заблокирован, аккаунт удалён) и «chat not found» — blocked. */
async function deliver(chatId: number, b: { text: string; photo?: string; button?: boolean }, retry = true): Promise<Delivery> {
  const markup = b.button !== false && appLink() ? { reply_markup: { inline_keyboard: [[{ text: '🪴 Открыть подоконник', url: appLink() }]] } } : {};
  const body = b.photo
    ? { chat_id: chatId, photo: b.photo, caption: b.text.slice(0, 1024), ...markup }
    : { chat_id: chatId, text: b.text, link_preview_options: { is_disabled: true }, ...markup };
  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${b.photo ? 'sendPhoto' : 'sendMessage'}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const j = await r.json();
    if (j.ok) return 'sent';
    if (j.error_code === 429 && retry) {
      await new Promise((ok) => setTimeout(ok, Math.min(30, Number(j.parameters?.retry_after) || 1) * 1000));
      return deliver(chatId, b, false);
    }
    if (j.error_code === 403 || /chat not found|user is deactivated/i.test(String(j.description))) return 'blocked';
    console.warn('broadcast', j.description);
    return 'failed';
  } catch {
    return 'failed';
  }
}

/** Рассылка пачкой: не больше PER_SECOND сообщений в секунду. */
export async function broadcast(chatIds: number[], b: { text: string; photo?: string; button?: boolean }) {
  const out: { chat_id: number; status: Delivery }[] = [];
  for (let i = 0; i < chatIds.length; i += PER_SECOND) {
    const t0 = Date.now();
    const part = chatIds.slice(i, i + PER_SECOND);
    const res = await Promise.all(part.map((id) => deliver(id, b)));
    part.forEach((id, k) => out.push({ chat_id: id, status: res[k] }));
    const wait = 1100 - (Date.now() - t0);
    if (wait > 0 && i + PER_SECOND < chatIds.length) await new Promise((ok) => setTimeout(ok, wait));
  }
  return out;
}

/** Запрос панели поддержки к боту: ответить игроку или показать фото из обращения. */
export async function supportApi(req: Request): Promise<Response | null> {
  const got = req.headers.get('x-support-secret');
  if (got === null) return null;
  if (!SUPPORT_SECRET || !safeEqual(got, SUPPORT_SECRET)) return new Response('forbidden', { status: 403 });
  const b = await req.json().catch(() => ({})) as { action?: string; ticket?: number; text?: string; file_id?: string; chat_ids?: unknown[]; photo?: string; button?: boolean };
  if (b.action === 'broadcast') {
    const ids = (Array.isArray(b.chat_ids) ? b.chat_ids : []).map(Number).filter((x) => Number.isSafeInteger(x) && x > 0).slice(0, BROADCAST_BATCH);
    const text = String(b.text ?? '').trim().slice(0, 4000);
    const photo = b.photo ? String(b.photo).slice(0, 512) : undefined;
    if (!ids.length || !text) return json({ error: 'bad_args' }, 400);
    return json({ results: await broadcast(ids, { text, photo, button: b.button !== false }) });
  }
  if (b.action === 'send') {
    const { data: t } = await db.from('support_tickets').select('id, tg_id').eq('id', Number(b.ticket)).maybeSingle();
    const text = String(b.text ?? '').trim().slice(0, 4000);
    if (!t || !text) return json({ error: 'bad_args' }, 400);
    const sent = await tg<{ message_id: number }>('sendMessage', { chat_id: t.tg_id, text: `💬 Поддержка Подоконника:\n\n${text}` });
    if (!sent) return json({ error: 'not_sent' }, 502);
    return json({ ok: true, message_id: sent.message_id });
  }
  if (b.action === 'file' && b.file_id) {
    const f = await tg<{ file_path: string }>('getFile', { file_id: String(b.file_id) });
    if (!f?.file_path) return json({ error: 'no_file' }, 404);
    const r = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${f.file_path}`);
    return new Response(r.body, { status: r.status, headers: { 'Content-Type': r.headers.get('content-type') ?? 'image/jpeg' } });
  }
  return json({ error: 'bad_action' }, 400);
}
