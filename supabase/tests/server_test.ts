// deno test supabase/tests
import { assert, assertEquals } from 'jsr:@std/assert@1';
import { hex, hmac, signSession, verifyInitData, verifySession } from '../functions/_shared/crypto.ts';
import { newStateForTest } from './fixtures.ts';
import { isQuiet, localHour, pickReminder } from '../functions/notify/remind.ts';

const BOT = '123456:TEST-token';

async function makeInitData(fields: Record<string, string>, token = BOT) {
  const check = Object.entries(fields).sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join('\n');
  const hash = hex(await hmac(await hmac('WebAppData', token), check));
  return new URLSearchParams({ ...fields, hash }).toString();
}

Deno.test('initData: верная подпись принимается', async () => {
  const now = Math.floor(Date.now() / 1000);
  const data = await makeInitData({ auth_date: String(now), user: JSON.stringify({ id: 42, first_name: 'Аня' }), start_param: 'gabc' });
  const v = await verifyInitData(data, BOT);
  assertEquals(v?.user.id, 42);
  assertEquals(v?.startParam, 'gabc');
});

Deno.test('initData: чужой токен и подделка отклоняются', async () => {
  const now = Math.floor(Date.now() / 1000);
  const data = await makeInitData({ auth_date: String(now), user: JSON.stringify({ id: 42, first_name: 'Аня' }) }, '999:other');
  assertEquals(await verifyInitData(data, BOT), null);
  const good = await makeInitData({ auth_date: String(now), user: JSON.stringify({ id: 42, first_name: 'Аня' }) });
  assertEquals(await verifyInitData(good.replace('42', '43'), BOT), null);
});

Deno.test('initData: устаревшая отклоняется', async () => {
  const old = Math.floor(Date.now() / 1000) - 30 * 86400;
  const data = await makeInitData({ auth_date: String(old), user: JSON.stringify({ id: 1, first_name: 'A' }) });
  assertEquals(await verifyInitData(data, BOT), null);
});

Deno.test('токен сессии', async () => {
  const t = await signSession('p1', 'secret');
  assertEquals(await verifySession(t, 'secret'), 'p1');
  assertEquals(await verifySession(t, 'other'), null);
  assertEquals(await verifySession(t.replace('p1', 'p2'), 'secret'), null);
  const expired = await signSession('p1', 'secret', 10, 1000);
  assertEquals(await verifySession(expired, 'secret'), null);
});

Deno.test('тихие часы', () => {
  assert(isQuiet(23, 23, 9));
  assert(isQuiet(3, 23, 9));
  assert(!isQuiet(12, 23, 9));
  // 10:00 UTC = 13:00 по Москве
  assertEquals(localHour(Date.UTC(2026, 5, 1, 10), 180), 13);
});

Deno.test('напоминание: растение хочет пить', () => {
  const day = Date.UTC(2026, 5, 1, 10); // 13:00 МСК
  const s = newStateForTest(day - 5 * 86400e3);
  const r = pickReminder(s, day, 180, day - 2 * 86400e3);
  assert(r && r.text.includes('пить'), r?.text);
});

Deno.test('напоминание: ночью молчим, соседка поливает', () => {
  const night = Date.UTC(2026, 5, 1, 0); // 03:00 МСК
  const s = newStateForTest(night - 5 * 86400e3);
  assertEquals(pickReminder(s, night, 180, night - 86400e3), null);
  const day = Date.UTC(2026, 5, 1, 10);
  const s2 = newStateForTest(day - 5 * 86400e3);
  s2.neighbor = { until: day + 86400e3, cooldownUntil: day + 8 * 86400e3 };
  const r = pickReminder(s2, day, 180, day - 86400e3);
  assert(!r || !r.text.includes('пить'));
});

Deno.test('напоминание: друг полил — бот не пишет «хочет пить»', () => {
  const day = Date.UTC(2026, 5, 1, 10);
  const s = newStateForTest(day - 5 * 86400e3);
  const r = pickReminder(s, day, 180, day - 2 * 86400e3, [{ plantId: 'p1', at: day - 3600e3 }]);
  assert(!r || !r.text.includes('пить'), r?.text);
});

import { parsePayload } from '../functions/_shared/payload.ts';
import { PRODUCTS } from '../functions/_shared/game/products.ts';

Deno.test('оплата: payload счёта', () => {
  const id = '11111111-1111-1111-1111-111111111111';
  for (const p of PRODUCTS) {
    const payload = `${p.id}|${id}`;
    assert(new TextEncoder().encode(payload).length <= 128, p.id);
    assertEquals(parsePayload(payload)?.product.id, p.id);
    assert(p.stars >= 1 && p.stars <= 10000);
  }
  assertEquals(parsePayload(`fake|${id}`), null);
  assertEquals(parsePayload('plus|not-a-uuid'), null);
});
