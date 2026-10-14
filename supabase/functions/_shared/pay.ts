// Оплата Telegram Stars: счёт, проверка перед оплатой, выдача покупки.

import { db } from './db.ts';
import { appLink, SITE_URL } from './env.ts';
import { FORM_BY_ID, PLUS_DAYS, type Product } from './game/products.ts';
import { send, tg } from './tg.ts';

import { parsePayload } from './payload.ts';

export { parsePayload };

export async function invoiceLink(product: Product, playerId: string): Promise<string | null> {
  const form = product.form ? FORM_BY_ID[product.form] : undefined;
  return await tg<string>('createInvoiceLink', {
    title: product.title.slice(0, 32),
    description: product.desc.slice(0, 255),
    payload: `${product.id}|${playerId}`,
    currency: 'XTR',
    prices: [{ label: product.title.slice(0, 32), amount: product.stars }],
    photo_url: `${SITE_URL}og/${form?.sp ?? 'chlorophytum'}.png`,
    ...(product.kind === 'plus' ? { subscription_period: PLUS_DAYS * 86400 } : {}),
  });
}

/** Проверка перед списанием звёзд. Возвращает текст ошибки или null. */
export async function checkPreCheckout(payload: string, currency: string, amount: number): Promise<string | null> {
  const p = parsePayload(payload);
  if (!p || currency !== 'XTR' || amount !== p.product.stars) return 'Товар изменился, открой магазин заново';
  const { data } = await db.from('players').select('id').eq('id', p.playerId).maybeSingle();
  return data ? null : 'Не нашли твой профиль, открой игру заново';
}

export interface Paid {
  chargeId: string;
  payload: string;
  amount: number;
  chatId: number;
  recurring?: boolean;
  expiresAt?: number; // subscription_expiration_date, сек
}

/** Выдать покупку. Повторная доставка того же платежа ничего не выдаёт второй раз. */
export async function grant(paid: Paid) {
  const p = parsePayload(paid.payload);
  if (!p) return;
  const { product, playerId } = p;
  const { data: ins } = await db.from('purchases').upsert(
    { charge_id: paid.chargeId, player_id: playerId, product: product.id, stars: paid.amount, recurring: !!paid.recurring },
    { onConflict: 'charge_id', ignoreDuplicates: true },
  ).select('charge_id');
  if (!ins?.length) return; // уже выдано

  let text = '';
  if (product.kind === 'plus') {
    const until = paid.expiresAt ? new Date(paid.expiresAt * 1000).toISOString() : null;
    const { data: plusUntil } = await db.rpc('extend_plus', { p_player: playerId, p_days: PLUS_DAYS, p_until: until });
    await db.from('inbox').insert({ player_id: playerId, kind: 'purchase', payload: { product: product.id, plusUntil: Date.parse(String(plusUntil)) } });
    text = paid.recurring ? '🌟 «Садовник+» продлён ещё на месяц. Спасибо, что поддерживаешь Подоконник!' : '🌟 «Садовник+» включён! Двойные листики, соседка без ограничений и золотой горшок уже ждут.';
  } else if (product.kind === 'leaves') {
    await db.from('inbox').insert({ player_id: playerId, kind: 'purchase', payload: { product: product.id, leaves: product.leaves } });
    text = `🍃 +${product.leaves} листиков уже на подоконнике. Спасибо!`;
  } else if (product.kind === 'form' && product.form) {
    const f = FORM_BY_ID[product.form];
    await db.from('inbox').insert({ player_id: playerId, kind: 'purchase', payload: { product: product.id, form: f.id, sp: f.sp } });
    text = `✨ Черенок «${f.name}» ждёт в запасе. Поставь его в воду — или подари другу!`;
  }
  if (text) await send(paid.chatId, text, { text: '🪴 Открыть подоконник', url: appLink() });
}

export async function markRefunded(chargeId: string) {
  await db.from('purchases').update({ refunded: true }).eq('charge_id', chargeId);
}
