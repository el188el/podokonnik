// Обложка 640×360 для мини-аппа в BotFather: npm run gen:cover → docs/botfather-cover.png
import { renderToStaticMarkup } from 'react-dom/server';
import { chromium } from 'playwright-core';
import { PlantArt } from '../src/ui/art/PlantArt';
const a = (sp: string, st: any, pot: string, b = false) => renderToStaticMarkup(<PlantArt sp={sp} stage={st} seed="cover" pot={pot} blooming={b} />);
const html = `<html><body style="margin:0;width:640px;height:360px;overflow:hidden;font-family:system-ui,sans-serif;position:relative;background:linear-gradient(#8fd2ff,#e4f6ff)">
<div style="position:absolute;right:70px;top:34px;width:58px;height:58px;border-radius:50%;background:#ffd85a;box-shadow:0 0 40px #ffd85a"></div>
<div style="position:absolute;left:0;right:0;top:0;height:300px;border:10px solid #fff;border-bottom:0;box-sizing:border-box;border-radius:18px 18px 0 0"></div>
<div style="position:absolute;left:316px;top:120px;width:10px;height:180px;background:#fff"></div>
<div style="position:absolute;left:0;right:0;top:286px;height:22px;background:#E9C9A0;box-shadow:0 7px 0 #d3ad80"></div>
<div style="position:absolute;left:0;right:0;top:315px;bottom:0;background:#f4e7d4"></div>
<div style="position:absolute;left:32px;top:28px;color:#2E4A45">
  <div style="font-size:46px;font-weight:800;letter-spacing:.5px">Подоконник</div>
  <div style="font-size:19px;opacity:.85;margin-top:4px">Расти растения и дари черенки друзьям 🌱</div>
</div>
${[['chlorophytum',4,'terracotta',20],['geranium',4,'gzhel',140,true],['monstera',4,'white',262],['decembrist',4,'khokhloma',384,true],['violet',4,'enamel',506,true]].map(([sp,st,pot,x,b])=>`<div style="position:absolute;left:${x}px;top:118px;width:118px;height:169px">${a(sp as string,st,pot as string,!!b).replace('<svg','<svg width="118" height="169"')}</div>`).join('')}
</body></html>`;
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await br.newPage({ viewport: { width: 640, height: 360 } });
await p.setContent(html);
await p.screenshot({ path: 'docs/botfather-cover.png' });
await br.close();
