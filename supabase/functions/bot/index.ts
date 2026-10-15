// Вебхук Telegram-бота: приветствие с кнопкой игры, справка, вкл/выкл напоминаний.
// Telegram подписывает запросы заголовком X-Telegram-Bot-Api-Secret-Token.

import { safeEqual } from '../_shared/crypto.ts';
import { db } from '../_shared/db.ts';
import { TG_CHANNEL, appLink, env, secret } from '../_shared/env.ts';
import { checkPreCheckout, grant, markRefunded } from '../_shared/pay.ts';
import { send, tg } from '../_shared/tg.ts';
import { GROUP_HELLO, groupButton, groupLink, groupPlant } from '../_shared/chat.ts';
import { supportApi, supportIn } from '../_shared/support.ts';

const WELCOME = `Привет! Это <b>Подоконник</b> 🌱

Уютная игра про комнатные растения: поливай, переставляй к свету, бери черенки и дари их друзьям. Растения растут по-настоящему, даже когда игра закрыта, а я напомню, если кто-то захочет пить 💧`;

const HELP = `🪴 <b>Как играть</b>
• Тап по горшку — полить, долгий тап — карточка растения.
• Зажми горшок и потяни вверх или вниз — к стеклу или в глубину комнаты.
• Взрослые растения дают черенки — их можно подарить другу.

Команды:
/start — открыть игру
/notify — включить или выключить напоминания
/support — написать в поддержку
/paysupport — помощь с покупками
/terms — условия покупок

Вопрос или проблема? Просто напиши сюда сообщение — оно попадёт в поддержку 💬`;

const TERMS = `<b>Условия покупок</b>
• Покупки в Подоконнике — цифровые товары за Telegram Stars: листики, редкие формы растений и подписка «Садовник+».
• Покупка выдаётся сразу после оплаты. Если что-то не пришло — напиши /paysupport.
• «Садовник+» продлевается автоматически раз в 30 дней, отменить можно в любой момент в настройках Telegram (Звёзды → Подписки).
• Возврат возможен, если товар не был выдан. Растения в игре никогда не погибают из-за отсутствия покупок.`;

const ADMIN = Number(env('TG_ADMIN_ID')) || 0;

const SUPPORT_THANKS = '💬 Спасибо! Сообщение передано в поддержку — ответим здесь, в этом чате. Можно дописать подробности или прислать скриншот.';

interface Update {
  my_chat_member?: { chat: { id: number; type: string; title?: string }; new_chat_member: { status: string } };
  message?: {
    chat: { id: number; type: string; title?: string };
    message_id?: number;
    from?: { id: number; first_name?: string; last_name?: string; username?: string };
    text?: string;
    caption?: string;
    photo?: { file_id: string }[];
    successful_payment?: {
      currency: string; total_amount: number; invoice_payload: string; telegram_payment_charge_id: string;
      is_recurring?: boolean; subscription_expiration_date?: number;
    };
    refunded_payment?: { telegram_payment_charge_id: string };
  };
  pre_checkout_query?: { id: string; currency: string; total_amount: number; invoice_payload: string };
  callback_query?: { id: string; from: { id: number; first_name?: string; last_name?: string; username?: string }; data?: string; message?: { chat: { id: number }; message_id: number } };
}

const PLATFORM_NAME: Record<string, string> = { web: 'браузере', native: 'телефоне (Android)', discord: 'Discord' };
const LOGIN_TTL = 10 * 60e3;

/** Запрос на вход с другого устройства: просим подтвердить, чтобы чужая ссылка не увела аккаунт. */
async function loginAsk(chatId: number, code: string) {
  const { data: r } = await db.from('login_requests').select('platform, created_at, confirmed_at').eq('code', code).maybeSingle();
  if (!r || r.confirmed_at || Date.now() - Date.parse(r.created_at) > LOGIN_TTL) {
    await send(chatId, 'Ссылка для входа устарела. Нажми «Войти через Telegram» в игре ещё раз 🌱');
    return;
  }
  await tg('sendMessage', {
    chat_id: chatId,
    parse_mode: 'HTML',
    text: `🔐 <b>Вход в Подоконник</b> в ${PLATFORM_NAME[r.platform ?? ''] ?? 'другом приложении'}.

Там будет твой подоконник со всеми растениями. Это ты сейчас входишь?

<i>Если ссылку тебе кто-то прислал — нажми «Нет».</i>`,
    reply_markup: { inline_keyboard: [[{ text: '✅ Да, войти', callback_data: `login:${code}` }, { text: '✖️ Нет', callback_data: `nologin:${code}` }]] },
  });
}

async function loginAnswer(q: NonNullable<Update['callback_query']>) {
  const [act, code] = (q.data ?? '').split(':');
  const done = (text: string) => Promise.all([
    tg('answerCallbackQuery', { callback_query_id: q.id }),
    q.message ? tg('editMessageText', { chat_id: q.message.chat.id, message_id: q.message.message_id, text, parse_mode: 'HTML' }) : null,
  ]);
  if (!code || !/^[A-Za-z0-9]{20,40}$/.test(code)) return done('Ссылка недействительна.');
  if (act === 'nologin') {
    await db.from('login_requests').delete().eq('code', code).is('confirmed_at', null);
    return done('Вход отменён. Твой подоконник в безопасности 🌿');
  }
  const { data: r } = await db.from('login_requests').select('created_at, confirmed_at').eq('code', code).maybeSingle();
  if (!r || r.confirmed_at || Date.now() - Date.parse(r.created_at) > LOGIN_TTL) return done('Ссылка для входа устарела. Попробуй ещё раз из игры.');
  // аккаунт Telegram: если игрок ещё ни разу не открывал игру здесь — заводим
  const name = [q.from.first_name, q.from.last_name].filter(Boolean).join(' ').slice(0, 48);
  let { data: p } = await db.from('players').select('id').eq('tg_id', q.from.id).maybeSingle();
  if (!p) ({ data: p } = await db.from('players').insert({ tg_id: q.from.id, name, username: q.from.username ?? null, platform: 'telegram' }).select('id').single());
  if (!p) return done('Не получилось войти, попробуй ещё раз.');
  await db.from('login_requests').update({ player_id: p.id, confirmed_at: new Date().toISOString() }).eq('code', code).is('confirmed_at', null);
  return done('✅ Готово! Возвращайся в игру — вход выполнен, подоконник уже там.');
}

async function handle(u: Update) {
  if (u.pre_checkout_query) {
    const q = u.pre_checkout_query;
    const err = await checkPreCheckout(q.invoice_payload, q.currency, q.total_amount);
    await tg('answerPreCheckoutQuery', err ? { pre_checkout_query_id: q.id, ok: false, error_message: err } : { pre_checkout_query_id: q.id, ok: true });
    return;
  }
  if (u.my_chat_member) {
    const c = u.my_chat_member.chat;
    if (c.type !== 'group' && c.type !== 'supergroup') return;
    const st = u.my_chat_member.new_chat_member.status;
    if (st === 'member' || st === 'administrator') {
      await tg('sendMessage', { chat_id: c.id, text: GROUP_HELLO, reply_markup: { inline_keyboard: [[{ text: '🌱 Завести растение', callback_data: 'cp:new' }]] } });
    } else if (st === 'left' || st === 'kicked') {
      await db.from('chat_plants').update({ active: false }).eq('chat_id', c.id);
    }
    return;
  }
  if (u.callback_query) {
    const data = u.callback_query.data ?? '';
    if (data === 'cp:new' && u.callback_query.message) {
      await tg('answerCallbackQuery', { callback_query_id: u.callback_query.id });
      const chat = (u.callback_query.message as { chat: { id: number; title?: string } }).chat;
      await groupPlant(chat.id, chat.title ?? 'чат', '');
    } else if (data.startsWith('cp:')) await groupButton(u.callback_query);
    else if (/^(no)?login:/.test(data)) await loginAnswer(u.callback_query);
    else await tg('answerCallbackQuery', { callback_query_id: u.callback_query.id });
    return;
  }
  const m = u.message;
  if (m?.successful_payment) {
    const sp = m.successful_payment;
    await grant({
      chargeId: sp.telegram_payment_charge_id, payload: sp.invoice_payload, amount: sp.total_amount, chatId: m.chat.id,
      recurring: sp.is_recurring, expiresAt: sp.subscription_expiration_date,
    });
    return;
  }
  if (m?.refunded_payment) {
    await markRefunded(m.refunded_payment.telegram_payment_charge_id);
    return;
  }
  if (m?.photo?.length && m.chat.type === 'private' && m.from) {
    // фото с подписью или без — тоже в поддержку
    const fresh = await supportIn(m.from, m.caption ?? '', m.photo[m.photo.length - 1].file_id, m.message_id);
    if (fresh) await send(m.chat.id, SUPPORT_THANKS);
    return;
  }
  if (!m?.text) return;
  if (m.chat.type === 'group' || m.chat.type === 'supergroup') {
    // в группе бот слышит только команды: /plant [имя], /start plant (ссылка «добавить в группу»)
    const [raw, ...rest] = m.text.trim().split(/\s+/);
    const gcmd = raw.replace(/@\w+$/, '');
    if (gcmd === '/plant' || (gcmd === '/start' && rest[0] === 'plant')) await groupPlant(m.chat.id, m.chat.title ?? 'чат', gcmd === '/plant' ? rest.join(' ') : '');
    else if (gcmd === '/start' || gcmd === '/help') await send(m.chat.id, GROUP_HELLO);
    return;
  }
  if (m.chat.type !== 'private') return;
  const [cmd, arg] = m.text.trim().split(/\s+/, 2);
  if (cmd === '/start' && arg?.startsWith('login_')) {
    await loginAsk(m.chat.id, arg.slice(6));
  } else if (cmd === '/start') {
    const param = arg && /^[A-Za-z0-9_-]{1,512}$/.test(arg) ? arg : undefined;
    const text = param?.startsWith('g') ? `${WELCOME}\n\n🎁 Тебе прислали черенок! Открой игру, чтобы забрать его.` : WELCOME;
    await send(m.chat.id, text, { text: param?.startsWith('g') ? '🎁 Забрать черенок' : '🪴 Открыть подоконник', url: appLink(param) });
  } else if (cmd === '/paysupport') {
    const text = m.text.slice('/paysupport'.length).trim();
    if (!text) {
      await send(m.chat.id, 'Опиши проблему с покупкой одним сообщением, начав с /paysupport. Например:\n<code>/paysupport оплатил листики, но они не пришли</code>');
    } else {
      if (m.from) await supportIn(m.from, `💳 ${text}`, undefined, m.message_id);
      if (ADMIN) await send(ADMIN, `🆘 Поддержка от ${m.from?.first_name ?? ''} (@${m.from?.username ?? '-'}, id ${m.chat.id}):\n${text.slice(0, 1000).replace(/</g, '&lt;')}`);
      await send(m.chat.id, 'Спасибо! Мы получили сообщение и ответим здесь, в этом чате 🌿');
    }
  } else if (cmd === '/stats' && ADMIN && m.chat.id === ADMIN) {
    const { data } = await db.rpc('admin_stats');
    const st = (data ?? {}) as Record<string, unknown>;
    const obj = (o: unknown) => Object.entries((o ?? {}) as Record<string, number>).map(([k, v]) => `${k}: ${v}`).join(', ') || '—';
    await send(m.chat.id, [
      '📊 <b>Подоконник</b>',
      `Игроков: <b>${st.players}</b> (сегодня +${st.new_today}, за неделю +${st.new_7d})`,
      `Активные: день ${st.dau} · неделя ${st.wau} · месяц ${st.mau}`,
      `Удержание: D1 ${st.d1 ?? '—'}% · D7 ${st.d7 ?? '—'}%`,
      `Звёзды: 7 дней ${st.stars_7d} ⭐ · 30 дней ${st.stars_30d} ⭐ · покупателей ${st.buyers_30d}`,
      `Садовник+: ${st.plus_active}`,
      `Платформы: ${obj(st.platforms)}`,
      `События за неделю: ${obj(st.top_events)}`,
    ].join('\n'));
  } else if (cmd === '/plant') {
    const link = groupLink();
    await send(m.chat.id, '🪴 Растение для чата: добавь меня в группу друзей, семьи или коллег — и у вас появится общее растение. Поливайте его вместе, а я напомню, когда оно захочет пить 💧', link ? { text: '➕ Добавить в группу', url: link } : undefined);
  } else if (cmd === '/support') {
    const text = m.text.slice('/support'.length).trim();
    if (text && m.from) {
      await supportIn(m.from, text, undefined, m.message_id);
      await send(m.chat.id, SUPPORT_THANKS);
    } else await send(m.chat.id, '💬 Напиши свой вопрос или опиши проблему одним сообщением прямо сюда (можно с фото или скриншотом) — оно попадёт в поддержку, и мы ответим здесь.');
  } else if (cmd === '/terms') {
    await send(m.chat.id, TERMS);
  } else if (cmd === '/channel') {
    await send(m.chat.id, TG_CHANNEL ? `📢 Канал игры: советы по настоящим растениям каждый день и итоги конкурса «Подоконник недели» — ${TG_CHANNEL}` : 'Канал игры скоро появится 🌱');
  } else if (cmd === '/help') {
    await send(m.chat.id, HELP, { text: '🪴 Открыть подоконник', url: appLink() });
  } else if (cmd === '/notify') {
    const { data: p } = await db.from('players').select('id, notify').eq('tg_id', m.chat.id).maybeSingle();
    if (!p) {
      await send(m.chat.id, 'Сначала открой игру — и я смогу напоминать о растениях 🌱', { text: '🪴 Открыть подоконник', url: appLink() });
      return;
    }
    await db.from('players').update({ notify: !p.notify }).eq('id', p.id);
    await send(m.chat.id, p.notify ? '🔕 Напоминания выключены. Вернуть: /notify' : '🔔 Напоминания включены. Я напишу, когда растения захотят пить.');
  } else if (cmd.startsWith('/')) {
    await send(m.chat.id, 'Такой команды нет 🌿 Список команд — /help. Нажми, чтобы открыть игру:', { text: '🪴 Открыть подоконник', url: appLink() });
  } else if (m.from) {
    // обычное сообщение — в поддержку
    const fresh = await supportIn(m.from, m.text, undefined, m.message_id);
    if (fresh) await send(m.chat.id, SUPPORT_THANKS);
  }
}

Deno.serve(async (req) => {
  // запросы панели поддержки (ответ игроку, фото) — со своим секретом
  if (req.method === 'POST') {
    const r = await supportApi(req);
    if (r) return r;
  }
  const got = req.headers.get('x-telegram-bot-api-secret-token') ?? '';
  if (req.method !== 'POST' || !safeEqual(got, await secret('webhook'))) return new Response('forbidden', { status: 403 });
  try {
    await handle(await req.json());
  } catch (e) {
    console.error(e);
  }
  return new Response('ok');
});
