// Карточки для сторис: «Мой подоконник», «Зацвёл декабрист!», «100 дней с монстерой».
// Рисуем картинку 1080×1920 на canvas. В Telegram — загружаем на сервер и открываем
// окно публикации сторис, в остальных местах — делимся картинкой как файлом.

import { createElement } from 'react';
import { HANG_ROW, layoutRows } from '../game/layout';
import { plural } from '../game/sim';
import { sp } from '../game/species';
import { toast, useStore } from '../game/store';
import type { Plant } from '../game/types';
import * as api from '../net/api';
import { track } from '../net/track';
import { platform } from '../platform';
import { PlantArt } from './art/PlantArt';
import { gameLink } from './share';

const W = 1080;
const H = 1920;

async function plantImage(p: Plant): Promise<HTMLImageElement> {
  const { renderToStaticMarkup } = await import('react-dom/server');
  const svg = renderToStaticMarkup(createElement(PlantArt, { sp: p.sp, form: p.form, hue: p.hue, stage: p.stage, seed: p.id, pot: p.pot, bigPot: p.bigPot, blooming: p.blooming }))
    .replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg" width="420" height="600"');
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await img.decode().catch(() => null);
  return img;
}

function frame(x: CanvasRenderingContext2D, title: string, sub: string) {
  const bg = x.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#dff5e6');
  bg.addColorStop(1, '#fbf3e6');
  x.fillStyle = bg;
  x.fillRect(0, 0, W, H);
  x.fillStyle = '#2E4A45';
  x.textAlign = 'center';
  x.font = 'bold 84px system-ui, sans-serif';
  x.fillText(title, W / 2, 230);
  x.font = '44px system-ui, sans-serif';
  x.fillStyle = '#5b7068';
  x.fillText(sub, W / 2, 310);
  x.font = 'bold 46px system-ui, sans-serif';
  x.fillStyle = '#2E4A45';
  x.fillText('🌱 Подоконник — игра в Telegram', W / 2, H - 150);
}

function windowBox(x: CanvasRenderingContext2D, top: number, h: number) {
  const r = 40;
  x.fillStyle = '#ffffff';
  x.beginPath();
  x.roundRect(60, top, W - 120, h, r);
  x.fill();
  const sky = x.createLinearGradient(0, top, 0, top + h);
  sky.addColorStop(0, '#8fd2ff');
  sky.addColorStop(1, '#e4f6ff');
  x.fillStyle = sky;
  x.beginPath();
  x.roundRect(80, top + 20, W - 160, h - 20, [28, 28, 0, 0]);
  x.fill();
  x.fillStyle = '#ffffff';
  x.fillRect(W / 2 - 8, top + 20, 16, h - 20);
  x.fillStyle = '#ffd85a';
  x.beginPath();
  x.arc(W - 250, top + 110, 55, 0, Math.PI * 2);
  x.fill();
}

const ledge = (x: CanvasRenderingContext2D, y: number) => {
  x.fillStyle = '#e9c9a0';
  x.fillRect(40, y, W - 80, 34);
  x.fillStyle = '#d3ad80';
  x.fillRect(40, y + 34, W - 80, 12);
};

async function toBlob(c: HTMLCanvasElement) {
  return new Promise<Blob | null>((ok) => c.toBlob(ok, 'image/jpeg', 0.86));
}

/** Карточка «Мой подоконник»: все растения активного подоконника. */
export async function sillCard(): Promise<Blob | null> {
  const g = useStore.getState().game;
  const sill = g.sills.find((s) => s.id === g.activeSill) ?? g.sills[0];
  const here = g.plants.filter((p) => p.sill === sill.id && !HANG_ROW.includes(p.slot));
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d')!;
  const blooming = here.filter((p) => p.blooming).length;
  frame(x, 'Мой подоконник', `${here.length} ${plural(here.length, 'растение', 'растения', 'растений')}${blooming ? ` · цветут: ${blooming}` : ''}`);
  const rows = layoutRows(here);
  const top = 420;
  const rowH = 520;
  windowBox(x, top, rowH);
  ledge(x, top + rowH);
  x.fillStyle = '#f2e3cd';
  x.fillRect(40, top + rowH + 46, W - 80, rowH - 40);
  ledge(x, top + 2 * rowH);
  const cellW = (W - 120) / 4;
  for (const [ri, row] of [rows.glass, rows.deep].entries()) {
    for (const [i, p] of row.entries()) {
      if (!p) continue;
      const img = await plantImage(p);
      const w = 260, h = 371;
      x.drawImage(img, 60 + cellW * i + (cellW - w) / 2, top + ri * rowH + rowH - h + (ri ? 20 : 0), w, h);
    }
  }
  return toBlob(c);
}

/** Карточка одного растения с подписью («Зацвела фиалка!», «100 дней вместе»). */
export async function plantCard(p: Plant, title: string, sub: string): Promise<Blob | null> {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d')!;
  frame(x, title, sub);
  windowBox(x, 420, 1040);
  ledge(x, 1460);
  const img = await plantImage(p);
  x.drawImage(img, (W - 700) / 2, 1460 - 1000, 700, 1000);
  return toBlob(c);
}

const blobToDataUrl = (b: Blob) => new Promise<string>((ok, fail) => {
  const r = new FileReader();
  r.onload = () => ok(String(r.result));
  r.onerror = () => fail(r.error);
  r.readAsDataURL(b);
});

/** Поделиться карточкой: в Telegram — в сторис, иначе — как картинкой. */
export async function shareCard(blob: Blob | null, text: string, kind: string) {
  if (!blob) return toast('Не получилось нарисовать картинку');
  const pf = platform();
  track('story', { kind, platform: pf.kind });
  if (pf.story && api.loggedIn()) {
    try {
      toast('Готовим сторис…');
      const { url } = await api.storyUpload(await blobToDataUrl(blob));
      if (pf.story(url, `${text} ${gameLink()}`)) return;
    } catch { /* попробуем обычный «поделиться» */ }
  }
  const file = new File([blob], 'podokonnik.jpg', { type: 'image/jpeg' });
  const r = await pf.share({ text, url: gameLink(), files: [file] });
  if (r === 'copied') toast('Ссылка скопирована — отправь её в чат 📋');
}

export const shareSillStory = async () => shareCard(await sillCard(), 'Мой подоконник 🪴', 'sill');

export async function sharePlantStory(p: Plant, title: string, sub: string, kind = 'plant') {
  return shareCard(await plantCard(p, title, sub), `${title} ${sp(p.sp).name} на моём подоконнике 🌿`, kind);
}
