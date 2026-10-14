import { createElement } from 'react';
import { CONFIG, tgAppLink } from '../config';
import { NOTES } from '../game/constants';
import { sp } from '../game/species';
import { setShowoffDone, toast } from '../game/store';
import type { PendingGift, Plant } from '../game/types';
import { platform } from '../platform';
import { PlantArt } from './art/PlantArt';

export const gameLink = () => tgAppLink() || CONFIG.siteUrl;

function report(r: string) {
  if (r === 'copied') toast('Ссылка скопирована — отправь её в чат 📋');
  else if (r === 'fail') toast('Не получилось поделиться, скопируй ссылку вручную');
}

export async function shareGift(gift: PendingGift, link: string) {
  const s = sp(gift.sp);
  const note = NOTES[gift.note] ? ` ${NOTES[gift.note]}.` : '';
  const r = await platform().share({ text: `Дарю тебе черенок ${s.gen} 🌱${note} Забирай на свой подоконник:`, url: link });
  report(r);
  return r;
}

export async function shareThanks(spId: string) {
  const s = sp(spId);
  const r = await platform().share({ text: `Спасибо за черенок! ${s.name} уже у меня на подоконнике 🌱`, url: gameLink() });
  report(r);
}

export async function shareInvite() {
  const r = await platform().share({ text: 'Я выращиваю растения на подоконнике 🌿 Присоединяйся — подарю черенок!', url: gameLink() });
  report(r);
}

/** PNG-картинка растения для «Показать, как подросло». */
export async function plantPng(p: Plant): Promise<File | null> {
  const { renderToStaticMarkup } = await import('react-dom/server');
  const svg = renderToStaticMarkup(createElement(PlantArt, { sp: p.sp, stage: p.stage, seed: p.id, pot: p.pot, bigPot: p.bigPot, blooming: p.blooming }))
    .replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg" width="560" height="800"');
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await img.decode().catch(() => null);
  const c = document.createElement('canvas');
  c.width = c.height = 800;
  const x = c.getContext('2d')!;
  const grd = x.createLinearGradient(0, 0, 0, 800);
  grd.addColorStop(0, '#bfe8ff');
  grd.addColorStop(1, '#e9f8ff');
  x.fillStyle = grd;
  x.fillRect(0, 0, 800, 700);
  x.fillStyle = '#E9C9A0';
  x.fillRect(0, 690, 800, 110);
  x.drawImage(img, 120, -30, 560, 800);
  x.fillStyle = '#2E4A45';
  x.font = 'bold 34px system-ui, sans-serif';
  x.textAlign = 'center';
  x.fillText(`${sp(p.sp).name} · Подоконник 🌱`, 400, 760);
  return new Promise((ok) => c.toBlob((b) => ok(b && new File([b], `podokonnik-${p.sp}.png`, { type: 'image/png' })), 'image/png'));
}

export async function shareShowoff(p: Plant) {
  const s = sp(p.sp);
  setShowoffDone(p.id);
  const file = await plantPng(p).catch(() => null);
  const r = await platform().share({ text: `Смотри, как подрос твой черенок: ${s.name} 🌱`, url: gameLink(), files: file ? [file] : undefined });
  report(r);
}
