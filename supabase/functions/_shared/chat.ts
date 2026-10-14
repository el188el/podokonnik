// Растение в групповом чате: команды бота, кнопки полива и рейтинг заботливых.

import { db } from './db.ts';
import { TG_BOT, appLink } from './env.ts';
import { chatCard, newChatPlant, stepChat, waterChat, type ChatPlant } from './game/chatplant.ts';
import { escHtml, tg } from './tg.ts';

const CARE_REWARD = 3;          // листиков в игре за полив растения чата
const CARE_REWARD_PER_DAY = 3;  // наград в день на человека

export const groupLink = () => (TG_BOT ? `https://t.me/${TG_BOT}?startgroup=plant` : '');

function keyboard(p: ChatPlant) {
  return {
    inline_keyboard: [
      [{ text: p.wilted ? '💧 Спасти!' : '💧 Полить', callback_data: 'cp:water' }, { text: '🏆 Заботливые', callback_data: 'cp:top' }],
      [{ text: '🪴 Свой подоконник', url: appLink() }],
    ],
  };
}

async function load(chatId: number): Promise<{ p: ChatPlant; message_id: number | null } | null> {
  const { data } = await db.from('chat_plants').select('state, message_id').eq('chat_id', chatId).maybeSingle();
  return data ? { p: data.state as ChatPlant, message_id: data.message_id } : null;
}

/** Прислать в чат свежую карточку растения (старую не трогаем — она уходит вверх по ленте). */
export async function postCard(chatId: number, p: ChatPlant, extra = '') {
  const m = await tg<{ message_id: number }>('sendMessage', {
    chat_id: chatId, parse_mode: 'HTML', text: (extra ? extra + '\n\n' : '') + chatCard(p, Date.now()), reply_markup: keyboard(p),
  });
  if (m) await db.from('chat_plants').update({ message_id: m.message_id }).eq('chat_id', chatId);
  return m;
}

/** /plant в группе: завести растение или показать текущее. */
export async function groupPlant(chatId: number, title: string, name: string) {
  const ex = await load(chatId);
  const t = Date.now();
  if (ex) {
    stepChat(ex.p, t);
    await db.from('chat_plants').update({ state: ex.p, active: true, title }).eq('chat_id', chatId);
    return postCard(chatId, ex.p);
  }
  const p = newChatPlant(name, t);
  await db.from('chat_plants').insert({ chat_id: chatId, title, state: p });
  return postCard(chatId, p, `🌱 В чате «${escHtml(title)}» теперь живёт растение! Поливайте его по очереди — я напомню, когда захочет пить. Кто заботится чаще всех — тот в рейтинге 🏆`);
}

export const GROUP_HELLO = `Привет! Я — бот игры «Подоконник» 🪴\n\nМогу поселить в этом чате общее растение: поливайте его все вместе кнопкой, а я напомню, когда оно захочет пить. Если неделю никто не польёт — засохнет 🥀\n\nЗавести: /plant или /plant Имя растения`;

/** Кнопки под карточкой: полить или показать рейтинг. */
export async function groupButton(q: { id: string; from: { id: number; first_name?: string; last_name?: string }; data?: string; message?: { chat: { id: number }; message_id: number } }) {
  const chatId = q.message?.chat.id;
  if (!chatId) return tg('answerCallbackQuery', { callback_query_id: q.id });
  const ex = await load(chatId);
  if (!ex) return tg('answerCallbackQuery', { callback_query_id: q.id, text: 'Растения пока нет — напишите /plant' });
  const name = [q.from.first_name, q.from.last_name].filter(Boolean).join(' ').slice(0, 40) || 'Кто-то';
  if (q.data === 'cp:top') {
    const { data: top } = await db.from('chat_care').select('name, waters').eq('chat_id', chatId).order('waters', { ascending: false }).limit(5);
    const medals = ['🥇', '🥈', '🥉', '4.', '5.'];
    const text = top?.length ? `🏆 Самые заботливые — «${escHtml(ex.p.name)}»:\n` + top.map((r, i) => `${medals[i]} ${escHtml(r.name)} — ${r.waters} 💧`).join('\n') : 'Пока никто не поливал — будь первым! 💧';
    await tg('answerCallbackQuery', { callback_query_id: q.id });
    return tg('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML' });
  }
  const t = Date.now();
  const r = waterChat(ex.p, { id: q.from.id, name }, t);
  const answers: Record<string, string> = {
    wet: 'Земля ещё мокрая — спасибо, но рано! 💧',
    already: 'Ты уже полил(а) — нужны ещё другие люди 🙏',
    ok: 'Полито! Спасибо 💚',
    revive: 'Есть! Нужны ещё помощники 💧',
    revived: 'Ожило! Вы спасли его 🌱',
  };
  await tg('answerCallbackQuery', { callback_query_id: q.id, text: answers[r] });
  if (r === 'wet' || r === 'already') return;
  await db.from('chat_plants').update({ state: ex.p, active: true }).eq('chat_id', chatId);
  const { data: c } = await db.from('chat_care').select('waters').eq('chat_id', chatId).eq('tg_id', q.from.id).maybeSingle();
  await db.from('chat_care').upsert({ chat_id: chatId, tg_id: q.from.id, name, waters: (c?.waters ?? 0) + 1, last_at: new Date(t).toISOString() });
  await careReward(q.from.id, ex.p.name);
  // обновляем карточку, по которой нажали
  if (q.message) {
    const extra = r === 'revived' ? `🎉 ${escHtml(name)} и друзья спасли растение!` : r === 'revive' ? `💧 ${escHtml(name)} пытается спасти растение` : `💧 ${escHtml(name)} полил(а) растение`;
    await tg('editMessageText', { chat_id: chatId, message_id: q.message.message_id, parse_mode: 'HTML', text: extra + '\n\n' + chatCard(ex.p, t), reply_markup: keyboard(ex.p) });
  }
}

/** Игроку «Подоконника» — немного листиков за заботу о растении чата (не больше 3 раз в день). */
async function careReward(tgId: number, plantName: string) {
  const { data: pl } = await db.from('players').select('id').eq('tg_id', tgId).maybeSingle();
  if (!pl) return;
  const since = new Date(Date.now() - 86400e3).toISOString();
  const { count } = await db.from('inbox').select('id', { count: 'exact', head: true }).eq('player_id', pl.id).eq('kind', 'chat_water').gte('created_at', since);
  if ((count ?? 0) >= CARE_REWARD_PER_DAY) return;
  await db.from('inbox').insert({ player_id: pl.id, kind: 'chat_water', payload: { leaves: CARE_REWARD, name: plantName } });
}
