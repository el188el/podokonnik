import { describe, expect, it } from 'vitest';
import { D } from './constants';
import { decodeGift, encodeGift } from './gifts';
import { childLine, genName, isHeirloom, LINE_MAX } from './lineage';
import { newPlant } from './storage';

const T = new Date(2026, 9, 14, 12).getTime();

describe('родословная', () => {
  it('черенок помнит маму, а от подарка — и дарителя', () => {
    const p = newPlant({ sp: 'monstera', sill: 'room', slot: 0, zone: 'glass', stage: 4, nick: 'Гоша', from: { name: 'Оля', note: 0, code: 'abcdefgh12' } }, T - 400 * D);
    const line = childLine(p, 'Аня', T);
    expect(line).toEqual([{ n: 'Оля', y: 2025 }, { n: 'Аня', y: 2025, k: 'Гоша', h: 1 }]);
    expect(isHeirloom(p, T)).toBe(true);
  });

  it('передаётся по ссылке и не растёт бесконечно', () => {
    const line = Array.from({ length: 10 }, (_, i) => ({ n: `Имя${i}`, y: 2026 }));
    const enc = encodeGift({ sp: 'violet', from: 'Аня', note: 1, code: 'abcDEF2345', line });
    const dec = decodeGift(enc)!;
    expect(dec.ok).toBe(true);
    expect(dec.line?.length).toBe(LINE_MAX);
    expect(dec.line?.[LINE_MAX - 1].n).toBe('Имя9');
  });

  it('мусор в ссылке отбрасывается, старые ссылки работают', () => {
    const bad = encodeGift({ sp: 'violet', from: 'Аня', note: 1, code: 'abcDEF2345', line: [{ n: '<script>', y: 1900 }] });
    expect(decodeGift(bad)?.line).toBeUndefined();
    const old = encodeGift({ sp: 'violet', from: 'Аня', note: 1, code: 'abcDEF2345' });
    expect(decodeGift(old)?.ok).toBe(true);
  });

  it('поколения: мама, бабушка, прабабушка, прапрабабушка', () => {
    expect([0, 1, 2, 3].map(genName)).toEqual(['мама', 'бабушка', 'прабабушка', 'прапрабабушка']);
  });
});
