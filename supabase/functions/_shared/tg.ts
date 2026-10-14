import { BOT_TOKEN } from './env.ts';

/** Вызов Bot API. Ошибки не роняют функцию — только пишутся в лог. */
export async function tg<T = unknown>(method: string, body: Record<string, unknown>): Promise<T | null> {
  if (!BOT_TOKEN) return null;
  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    if (!j.ok) console.warn(method, j.description);
    return j.ok ? (j.result as T) : null;
  } catch (e) {
    console.warn(method, e);
    return null;
  }
}

export const openButton = (text: string, url: string) => ({ inline_keyboard: [[{ text, url }]] });

export function send(chatId: number, text: string, button?: { text: string; url: string }) {
  return tg('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
    ...(button ? { reply_markup: openButton(button.text, button.url) } : {}),
  });
}

export const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
