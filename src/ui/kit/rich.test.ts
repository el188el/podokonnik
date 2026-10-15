import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { EMOJI_RE, hasEmojiIcon, plain, rich } from './rich';

const files = (d: string): string[] => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(f) && !/\.test\./.test(f) ? [p] : [];
});

describe('эмодзи → иконки', () => {
  it('у каждого эмодзи в текстах игры есть иконка', () => {
    const missing = new Set<string>();
    for (const f of files('src')) {
      if (f.includes('/art/') || f.endsWith('share.ts') || f.endsWith('story.ts')) continue; // рисунки и тексты для Telegram
      for (const m of readFileSync(f, 'utf8').matchAll(EMOJI_RE)) if (!hasEmojiIcon(m[0])) missing.add(`${m[0]} (${f})`);
    }
    expect([...missing]).toEqual([]);
  });
  it('rich разбивает строку и не трогает остальное', () => {
    const r = rich('+5 🍃 и 💧') as unknown[];
    expect(Array.isArray(r)).toBe(true);
    expect(r.filter((x) => typeof x === 'object' && x)).toHaveLength(4);
    expect(rich(5)).toBe(5);
    expect(rich('без эмодзи')).toBe('без эмодзи');
    expect(plain('Полей 🌱 растение ✨')).toBe('Полей растение');
  });
});
