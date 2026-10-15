import { assertEquals } from 'jsr:@std/assert@1';
import { analyze, type Ctx } from '../functions/_shared/cheatrules.ts';

const now = 1_800_000_000_000;
const ctx = (o: Partial<Ctx> = {}): Ctx => ({ now, elapsedMs: 10 * 60e3, inboxLeaves: 0, grants: new Set(), ...o });
const base = { leaves: 100, level: 3, simAt: now - 10 * 60e3, owned: {}, events: {} };
const kinds = (f: { kind: string }[]) => f.map((x) => x.kind).sort();

Deno.test('античит: честная игра без флагов', () => {
  assertEquals(analyze(base, { ...base, leaves: 400, level: 4, simAt: now }, ctx()), []);
});

Deno.test('античит: листики из воздуха и скачок уровня', () => {
  assertEquals(kinds(analyze(base, { ...base, leaves: 99999, level: 20, simAt: now }, ctx())), ['leaves_jump', 'level_jump']);
});

Deno.test('античит: входящие покрывают прирост', () => {
  assertEquals(analyze(base, { ...base, leaves: 1500, simAt: now }, ctx({ inboxLeaves: 900 })), []);
});

Deno.test('античит: перемотка времени', () => {
  assertEquals(kinds(analyze(base, { ...base, simAt: now + 3 * 3600e3 }, ctx())), ['time_fast', 'time_future']);
});

Deno.test('античит: пропуск без покупки и с покупкой', () => {
  const next = { ...base, simAt: now, events: { s1: { premium: true } } };
  assertEquals(kinds(analyze(base, next, ctx())), ['paid_item']);
  assertEquals(analyze(base, next, ctx({ grants: new Set(['pass']) })), []);
});

Deno.test('античит: тестер не флагается', () => {
  assertEquals(analyze(base, { ...base, leaves: 5100, level: 12, simAt: now, owned: { pot_gold: 1 } }, ctx({ grants: new Set(['tester']), inboxLeaves: 5000 })), []);
});
