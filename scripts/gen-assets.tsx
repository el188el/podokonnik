// Генерирует страницы подарков public/gift/<вид>.html (с превью для Telegram,
// ВКонтакте и мессенджеров) и картинки превью public/og/<вид>.png.
// Запуск: npm run gen:assets   (нужен Chromium: Playwright уже есть в окружении)

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { SPECIES } from '../src/game/species';
import { PlantArt } from '../src/ui/art/PlantArt';

const SITE = process.env.VITE_SITE_URL || 'https://el188el.github.io/podokonnik/';
mkdirSync('public/gift', { recursive: true });
mkdirSync('public/og', { recursive: true });

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

for (const s of SPECIES) {
  const title = `Тебе подарили ${s.acc} 🌱`;
  const desc = `Черенок ${s.gen} ждёт тебя. Забери его на свой подоконник в игре «Подоконник».`;
  const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Подоконник">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}gift/${s.id}.html"><meta property="og:image" content="${SITE}og/${s.id}.png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(s.name)} в горшке">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${SITE}og/${s.id}.png">
<meta name="theme-color" content="#DDF3EC"><style>body{margin:0;background:#DDF3EC;color:#2E4A45;font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;text-align:center}a{color:#2F8A55}</style>
<script>(function(){var q=new URLSearchParams(location.search);if(!q.get('g')&&!q.get('gift')&&q.get('c'))q.set('gift','${s.id}');location.replace('../index.html?'+q.toString());})();</script>
</head><body><p>🌱 Несём черенок…<br><a href="../index.html">Открыть Подоконник</a></p></body></html>
`;
  writeFileSync(`public/gift/${s.id}.html`, html);
}
console.log(`gift pages: ${SPECIES.length}`);

// ─────────── картинки превью ───────────
const { chromium } = await import('playwright-core');
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', process.env.CHROME_PATH].find((p) => p && existsSync(p));
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const s of SPECIES) {
  const art = renderToStaticMarkup(<PlantArt sp={s.id} stage={4} seed="og" blooming={!!s.bloom} />);
  const cutting = renderToStaticMarkup(<PlantArt sp={s.id} stage={1} seed="og" />);
  await page.setContent(`<html><body style="margin:0;width:1200px;height:630px;font-family:system-ui,sans-serif;background:linear-gradient(#bfe8ff,#eaf8ff);position:relative;overflow:hidden">
    <div style="position:absolute;left:0;right:0;bottom:0;height:120px;background:#E9C9A0;box-shadow:0 -10px 0 #d3ad80 inset"></div>
    <div style="position:absolute;right:110px;top:40px;width:90px;height:90px;border-radius:50%;background:#ffd85a;box-shadow:0 0 60px #ffd85a"></div>
    <div style="position:absolute;left:70px;bottom:92px;width:330px;height:470px">${art.replace('<svg', '<svg width="330" height="470"')}</div>
    <div style="position:absolute;left:470px;top:110px;width:660px;color:#2E4A45">
      <div style="font-size:30px;opacity:.75">🎁 Подарок на подоконник</div>
      <div style="font-size:72px;font-weight:800;line-height:1.05;margin:14px 0">Тебе подарили ${s.acc}</div>
      <div style="font-size:30px;opacity:.8">Забери черенок и вырасти его в игре «Подоконник» 🌱</div>
    </div>
    <div style="position:absolute;right:60px;bottom:96px;width:140px;height:200px">${cutting.replace('<svg', '<svg width="140" height="200"')}</div>
  </body></html>`);
  await page.screenshot({ path: `public/og/${s.id}.png` });
}
await browser.close();
console.log(`og images: ${SPECIES.length}`);
