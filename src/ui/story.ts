// Карточки для сторис: «Мой подоконник», «Зацвёл декабрист!», «100 дней с монстерой».
// Рисуем картинку 1080×1920 на canvas. В Telegram — загружаем на сервер и открываем
// окно публикации сторис, в остальных местах — делимся картинкой как файлом.

import { createElement } from 'react';
import { HANG_ROW, layoutRows } from '../game/layout';
import { plural } from '../game/sim';
import { sp } from '../game/species';
import { notePostcard, toast, useStore } from '../game/store';
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

// ─────────────────── открытка с подоконника ───────────────────
const PW = 1600;
const PH = 1100;

/** Открытка: подоконник в рамке, марка, подпись «Привет с подоконника!» и имя отправителя. */
export async function postcardCard(text: string): Promise<Blob | null> {
  const g = useStore.getState().game;
  const sill = g.sills.find((s) => s.id === g.activeSill) ?? g.sills[0];
  const here = g.plants.filter((p) => p.sill === sill.id && !HANG_ROW.includes(p.slot) && p.stage >= 1);
  const c = document.createElement('canvas');
  c.width = PW;
  c.height = PH;
  const x = c.getContext('2d')!;
  // бумага
  x.fillStyle = '#fbf6ec';
  x.fillRect(0, 0, PW, PH);
  x.strokeStyle = '#e7dcc6';
  x.lineWidth = 3;
  x.strokeRect(24, 24, PW - 48, PH - 48);
  // фото слева
  const fx = 70, fy = 80, fw = 960, fh = 940;
  x.save();
  x.shadowColor = '#0003';
  x.shadowBlur = 24;
  x.shadowOffsetY = 8;
  x.fillStyle = '#fff';
  x.fillRect(fx - 18, fy - 18, fw + 36, fh + 36);
  x.restore();
  const sky = x.createLinearGradient(0, fy, 0, fy + fh * 0.55);
  sky.addColorStop(0, '#8fd2ff');
  sky.addColorStop(1, '#e4f6ff');
  x.fillStyle = sky;
  x.fillRect(fx, fy, fw, fh * 0.55);
  x.fillStyle = '#ffd85a';
  x.beginPath();
  x.arc(fx + fw - 140, fy + 120, 60, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = '#fff';
  x.fillRect(fx + fw / 2 - 8, fy, 16, fh * 0.55);
  x.fillStyle = '#f2e3cd';
  x.fillRect(fx, fy + fh * 0.55, fw, fh * 0.45);
  x.fillStyle = '#e9c9a0';
  x.fillRect(fx, fy + fh * 0.55 - 6, fw, 30);
  x.fillStyle = '#c99a6b';
  x.fillRect(fx, fy + fh - 40, fw, 40);
  const rows = layoutRows(here);
  const cw = fw / 4;
  for (const [ri, row] of [rows.glass, rows.deep].entries()) {
    for (const [i, p] of row.entries()) {
      if (!p) continue;
      const img = await plantImage(p);
      const w = 200, h = 286;
      const base = ri ? fy + fh - 40 : fy + fh * 0.55 - 6;
      x.drawImage(img, fx + cw * i + (cw - w) / 2, base - h + 6, w, h);
    }
  }
  // марка
  const sx = PW - 300, sy = 70;
  x.fillStyle = '#fff';
  x.fillRect(sx, sy, 210, 250);
  x.strokeStyle = '#d9483b';
  x.setLineDash([10, 8]);
  x.lineWidth = 4;
  x.strokeRect(sx + 10, sy + 10, 190, 230);
  x.setLineDash([]);
  x.font = '120px system-ui, sans-serif';
  x.textAlign = 'center';
  x.fillText('🪴', sx + 105, sy + 160);
  x.font = 'bold 30px system-ui, sans-serif';
  x.fillStyle = '#d9483b';
  x.fillText('ПОЧТА', sx + 105, sy + 220);
  // штемпель
  x.strokeStyle = '#3f6fb588';
  x.lineWidth = 5;
  x.beginPath();
  x.arc(sx - 30, sy + 210, 80, 0, Math.PI * 2);
  x.stroke();
  x.font = 'bold 24px system-ui, sans-serif';
  x.fillStyle = '#3f6fb5aa';
  x.fillText(new Date().toLocaleDateString('ru-RU'), sx - 30, sy + 218);
  // текст
  x.textAlign = 'left';
  x.fillStyle = '#2E4A45';
  x.font = 'italic bold 64px Georgia, serif';
  x.fillText('Привет', 1090, 470);
  x.fillText('с подоконника!', 1090, 545);
  x.font = 'italic 38px Georgia, serif';
  x.fillStyle = '#4a5d57';
  const words = text.split(/\s+/);
  let line = '', y = 640;
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (x.measureText(t).width > 440) { x.fillText(line, 1090, y); y += 52; line = w; } else line = t;
  }
  if (line) x.fillText(line, 1090, y);
  x.strokeStyle = '#e1d5bd';
  x.lineWidth = 2;
  for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(1090, 640 + i * 52 + 14); x.lineTo(PW - 90, 640 + i * 52 + 14); x.stroke(); }
  x.font = 'italic bold 44px Georgia, serif';
  x.fillStyle = '#2E4A45';
  x.fillText(`— ${g.name || 'твой садовник'}`, 1090, 920);
  x.font = '28px system-ui, sans-serif';
  x.fillStyle = '#8a9a94';
  x.fillText('🌱 Подоконник — игра в Telegram', 1090, 1000);
  return toBlob(c);
}

export async function sharePostcard(blob: Blob | null) {
  if (!blob) return toast('Не получилось нарисовать открытку');
  track('postcard', { platform: platform().kind });
  notePostcard();
  const file = new File([blob], 'otkrytka.jpg', { type: 'image/jpeg' });
  const r = await platform().share({ text: 'Привет с моего подоконника! 🪴', url: gameLink(), files: [file] });
  if (r === 'copied') toast('Ссылка скопирована — отправь её в чат 📋');
}
