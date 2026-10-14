import { PRODUCT_BY_ID, type Product } from './game/products.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** payload счёта: «товар|игрок». Telegram ограничивает его 128 байтами. */
export function parsePayload(payload: string): { product: Product; playerId: string } | null {
  const [pid, playerId] = payload.split('|');
  const product = PRODUCT_BY_ID[pid];
  return product && UUID.test(playerId ?? '') ? { product, playerId } : null;
}
