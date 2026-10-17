// Картинки-превью для ссылок (og:image) и страницы подарков public/gift/<вид>.html.
// Рисуются теми же стикерами, что и в игре. Запуск: npx vite-node scripts/og.tsx
// (нужен Chromium: PLAYWRIGHT_BROWSERS_PATH или /opt/pw-browsers).

import { mkdirSync, writeFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { chromium } from 'playwright-core';
import { PlantArt } from '../src/ui/art/PlantArt';
import { SPECIES } from '../src/game/species';

const SITE = 'https://el188el.github.io/podokonnik/';
const W = 1200, H = 630;

const plant = (sp: string, pot: string, w: number, seed = 'og') =>
  `<div class="pl" style="width:${w}px">${renderToStaticMarkup(<PlantArt sp={sp} stage={4} seed={seed} blooming pot={pot} />)}</div>`;

const page = (body: string) => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;800;900&display=swap&subset=cyrillic" rel="stylesheet">
<style>
*{box-sizing:border-box}body{margin:0}
.c{position:relative;width:${W}px;height:${H}px;overflow:hidden;font-family:Nunito,system-ui,sans-serif;color:#3b2a22;
  background:repeating-linear-gradient(90deg,#f6ead8 0 34px,#f1e1c9 34px 68px)}
.sill{position:absolute;left:0;right:0;bottom:0;height:120px;background:#d9a873;border-top:10px solid #c48f5a;box-shadow:inset 0 -14px 0 #c48f5a}
.plants{position:absolute;left:50px;bottom:112px;display:flex;align-items:flex-end;gap:0;z-index:2}
.pl svg{width:100%;height:auto;overflow:visible;display:block}
.txt{position:absolute;left:560px;right:56px;top:110px}
.chip{display:inline-flex;align-items:center;gap:10px;padding:10px 20px;border-radius:99px;background:#fffaf2;border:3px solid #3b2a22;font-weight:800;font-size:28px;box-shadow:0 4px 0 #3b2a22}
h1{margin:26px 0 14px;font-weight:900;font-size:70px;line-height:1.02;letter-spacing:-1px}
p{margin:0;font-weight:600;font-size:30px;line-height:1.3;color:#6b5240}
.brand{position:absolute;right:56px;bottom:34px;font-weight:900;font-size:34px;color:#fffaf2;text-shadow:0 3px 0 #a8743f}
</style></head><body><div class="c">${body}<div class="sill"></div><div class="brand">Подоконник</div></div></body></html>`;

const gift = `<svg width="30" height="30" viewBox="0 0 24 24" fill="#e0574f" stroke="#3b2a22" stroke-width="2" stroke-linejoin="round"><rect x="3" y="8" width="18" height="5" rx="1"/><path d="M5 13v7h14v-7" /><path d="M12 8v12" fill="none"/><path d="M12 8c-2-4-6-4-6-1.5S10 8 12 8c2 0 6 .5 6-1.5S14 4 12 8z" fill="#ffd27a"/></svg>`;
const leaf = `<svg width="30" height="30" viewBox="0 0 24 24" fill="#5fae5c" stroke="#3b2a22" stroke-width="2" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" fill="none"/></svg>`;

const POTS = ['terracotta', 'pink', 'mint', 'white'];
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

const b = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: W, height: H } });
const shot = async (html: string, file: string) => {
  await p.setContent(html, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: file });
};

mkdirSync('public/og', { recursive: true });
mkdirSync('public/gift', { recursive: true });

// общая картинка игры
await shot(page(`<div class="plants">${plant('monstera', 'terracotta', 250, 'a')}${plant('rose', 'pink', 200, 'b')}${plant('chlorophytum', 'mint', 200, 'c')}</div>
<div class="txt"><span class="chip">${leaf} Уютная игра</span><h1>Подоконник</h1><p>Поливай, расти и дари черенки друзьям — как настоящие растения дома</p></div>`), 'public/og/main.png');

for (const [i, s] of SPECIES.entries()) {
  const acc = s.acc;
  await shot(page(`<div class="plants">${plant(s.id, POTS[i % POTS.length], 400)}</div>
<div class="txt"><span class="chip">${gift} Подарок на подоконник</span><h1>Тебе подарили ${acc}</h1><p>Забери черенок и вырасти его в игре «Подоконник»</p></div>`), `public/og/${s.id}.png`);

  const title = `Тебе подарили ${acc} 🌱`;
  const desc = `Черенок ${s.gen} ждёт тебя. Забери его на свой подоконник в игре «Подоконник».`;
  writeFileSync(`public/gift/${s.id}.html`, `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><meta name="description" content="${desc}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Подоконник">
<meta property="og:title" content="${title}"><meta property="og:description" content="${desc}">
<meta property="og:url" content="${SITE}gift/${s.id}.html"><meta property="og:image" content="${SITE}og/${s.id}.png?v=2">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${cap(s.name)} в горшке">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${desc}"><meta name="twitter:image" content="${SITE}og/${s.id}.png?v=2">
<meta name="theme-color" content="#f6ead8"><style>body{margin:0;background:#f6ead8;color:#3b2a22;font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;text-align:center}a{color:#3d8b56}</style>
<script>(function(){var q=new URLSearchParams(location.search);if(!q.get('g')&&!q.get('gift')&&q.get('c'))q.set('gift','${s.id}');location.replace('../index.html?'+q.toString());})();</script>
</head><body><p>🌱 Несём черенок…<br><a href="../index.html">Открыть Подоконник</a></p></body></html>
`);
}
await b.close();
console.log('og: main +', SPECIES.length);
