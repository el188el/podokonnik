// Копирует чистую игровую логику (без браузера) в серверные функции Supabase.
// Deno требует расширения в импортах, поэтому дописываем «.ts».
// Запуск: npm run sync:shared   (CI проверяет, что копия не устарела)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const FILES = ['types', 'constants', 'species', 'sim', 'social', 'products', 'events', 'breeding', 'weather', 'layout', 'coop', 'contest', 'calendar', 'tips', 'problems', 'cat', 'chatplant', 'climate', 'liveops', 'shop', 'rarity'];
const out = 'supabase/functions/_shared/game';
mkdirSync(out, { recursive: true });
const check = process.argv.includes('--check');
let stale = false;
for (const f of FILES) {
  const src = readFileSync(`src/game/${f}.ts`, 'utf8').replace(/from '(\.\/[a-z]+)'/g, "from '$1.ts'");
  const body = `// СГЕНЕРИРОВАНО из src/game/${f}.ts командой npm run sync:shared — не редактировать.\n${src}`;
  const path = `${out}/${f}.ts`;
  let cur = '';
  try { cur = readFileSync(path, 'utf8'); } catch { /* нет файла */ }
  if (cur !== body) {
    stale = true;
    if (!check) writeFileSync(path, body);
  }
}
if (check && stale) {
  console.error('supabase/functions/_shared/game устарел: запусти npm run sync:shared');
  process.exit(1);
}
console.log(check ? 'shared game code is up to date' : 'shared game code synced');
