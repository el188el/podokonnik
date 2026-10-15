// Поддержка: сообщения игроков боту превращаются в обращения (support_tickets / support_messages).
// О новом сообщении бот сообщает панели поддержки по адресу SUPPORT_HOOK (секрет функции),
// а панель отвечает игроку через этот же бот — запросом с заголовком X-Support-Secret.

import { safeEqual } from './crypto.ts';
import { db } from './db.ts';
import { BOT_TOKEN, env } from './env.ts';
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

/** Запрос панели поддержки к боту: ответить игроку или показать фото из обращения. */
export async function supportApi(req: Request): Promise<Response | null> {
  const got = req.headers.get('x-support-secret');
  if (got === null) return null;
  if (!SUPPORT_SECRET || !safeEqual(got, SUPPORT_SECRET)) return new Response('forbidden', { status: 403 });
  const b = await req.json().catch(() => ({})) as { action?: string; ticket?: number; text?: string; file_id?: string };
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
