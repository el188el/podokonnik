// Вебхук Telegram-бота: приветствие с кнопкой игры, справка, вкл/выкл напоминаний.
// Telegram подписывает запросы заголовком X-Telegram-Bot-Api-Secret-Token.

import { safeEqual } from '../_shared/crypto.ts';
import { db } from '../_shared/db.ts';
import { appLink, secret } from '../_shared/env.ts';
import { send, tg } from '../_shared/tg.ts';

const WELCOME = `Привет! Это <b>Подоконник</b> 🌱

Уютная игра про комнатные растения: поливай, переставляй к свету, бери черенки и дари их друзьям. Растения растут по-настоящему, даже когда игра закрыта, а я напомню, если кто-то захочет пить 💧`;

const HELP = `🪴 <b>Как играть</b>
• Тап по горшку — полить, долгий тап — карточка растения.
• Зажми горшок и потяни вверх или вниз — к стеклу или в глубину комнаты.
• Взрослые растения дают черенки — их можно подарить другу.

Команды:
/start — открыть игру
/notify — включить или выключить напоминания`;

interface Update {
  message?: { chat: { id: number; type: string }; from?: { id: number }; text?: string };
  pre_checkout_query?: { id: string };
}

async function handle(u: Update) {
  if (u.pre_checkout_query) {
    // оплата звёздами появится на этапе монетизации
    await tg('answerPreCheckoutQuery', { pre_checkout_query_id: u.pre_checkout_query.id, ok: false, error_message: 'Покупки скоро появятся 🌱' });
    return;
  }
  const m = u.message;
  if (!m?.text || m.chat.type !== 'private') return;
  const [cmd, arg] = m.text.trim().split(/\s+/, 2);
  if (cmd === '/start') {
    const param = arg && /^[A-Za-z0-9_-]{1,512}$/.test(arg) ? arg : undefined;
    const text = param?.startsWith('g') ? `${WELCOME}\n\n🎁 Тебе прислали черенок! Открой игру, чтобы забрать его.` : WELCOME;
    await send(m.chat.id, text, { text: param?.startsWith('g') ? '🎁 Забрать черенок' : '🪴 Открыть подоконник', url: appLink(param) });
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
