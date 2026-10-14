// Вебхук Telegram-бота: приветствие с кнопкой игры, справка, вкл/выкл напоминаний.
// Telegram подписывает запросы заголовком X-Telegram-Bot-Api-Secret-Token.

import { safeEqual } from '../_shared/crypto.ts';
import { db } from '../_shared/db.ts';
import { TG_CHANNEL, appLink, env, secret } from '../_shared/env.ts';
import { checkPreCheckout, grant, markRefunded } from '../_shared/pay.ts';
import { send, tg } from '../_shared/tg.ts';

const WELCOME = `Привет! Это <b>Подоконник</b> 🌱

Уютная игра про комнатные растения: поливай, переставляй к свету, бери черенки и дари их друзьям. Растения растут по-настоящему, даже когда игра закрыта, а я напомню, если кто-то захочет пить 💧`;

const HELP = `🪴 <b>Как играть</b>
• Тап по горшку — полить, долгий тап — карточка растения.
• Зажми горшок и потяни вверх или вниз — к стеклу или в глубину комнаты.
• Взрослые растения дают черенки — их можно подарить другу.

Команды:
/start — открыть игру
/notify — включить или выключить напоминания
/paysupport — помощь с покупками
/terms — условия покупок`;

const TERMS = `<b>Условия покупок</b>
• Покупки в Подоконнике — цифровые товары за Telegram Stars: листики, редкие формы растений и подписка «Садовник+».
• Покупка выдаётся сразу после оплаты. Если что-то не пришло — напиши /paysupport.
• «Садовник+» продлевается автоматически раз в 30 дней, отменить можно в любой момент в настройках Telegram (Звёзды → Подписки).
• Возврат возможен, если товар не был выдан. Растения в игре никогда не погибают из-за отсутствия покупок.`;

const ADMIN = Number(env('TG_ADMIN_ID')) || 0;

interface Update {
  message?: {
    chat: { id: number; type: string };
    from?: { id: number; first_name?: string; username?: string };
    text?: string;
    successful_payment?: {
      currency: string; total_amount: number; invoice_payload: string; telegram_payment_charge_id: string;
      is_recurring?: boolean; subscription_expiration_date?: number;
    };
    refunded_payment?: { telegram_payment_charge_id: string };
  };
  pre_checkout_query?: { id: string; currency: string; total_amount: number; invoice_payload: string };
}

async function handle(u: Update) {
  if (u.pre_checkout_query) {
    const q = u.pre_checkout_query;
    const err = await checkPreCheckout(q.invoice_payload, q.currency, q.total_amount);
    await tg('answerPreCheckoutQuery', err ? { pre_checkout_query_id: q.id, ok: false, error_message: err } : { pre_checkout_query_id: q.id, ok: true });
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
  if (!m?.text || m.chat.type !== 'private') return;
  const [cmd, arg] = m.text.trim().split(/\s+/, 2);
  if (cmd === '/start') {
    const param = arg && /^[A-Za-z0-9_-]{1,512}$/.test(arg) ? arg : undefined;
    const text = param?.startsWith('g') ? `${WELCOME}\n\n🎁 Тебе прислали черенок! Открой игру, чтобы забрать его.` : WELCOME;
    await send(m.chat.id, text, { text: param?.startsWith('g') ? '🎁 Забрать черенок' : '🪴 Открыть подоконник', url: appLink(param) });
  } else if (cmd === '/paysupport') {
    const text = m.text.slice('/paysupport'.length).trim();
    if (!text) {
      await send(m.chat.id, 'Опиши проблему с покупкой одним сообщением, начав с /paysupport. Например:\n<code>/paysupport оплатил листики, но они не пришли</code>');
    } else {
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
  } else {
    await send(m.chat.id, 'Я умею только напоминать о растениях 🌿 Нажми, чтобы открыть игру:', { text: '🪴 Открыть подоконник', url: appLink() });
  }
}

Deno.serve(async (req) => {
  const got = req.headers.get('x-telegram-bot-api-secret-token') ?? '';
  if (req.method !== 'POST' || !safeEqual(got, await secret('webhook'))) return new Response('forbidden', { status: 403 });
  try {
    await handle(await req.json());
  } catch (e) {
    console.error(e);
  }
  return new Response('ok');
});
