import { createElement } from 'react';
import { CONFIG, tgAppLink } from '../config';
import { playerId } from '../net/api';
import { NOTES } from '../game/constants';
import { sp } from '../game/species';
import { setShowoffDone, toast } from '../game/store';
import type { PendingGift, Plant, Twin } from '../game/types';
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

/** Ссылка-приглашение: новичок получит +30 🍃, а пригласивший +50 🍃. */
export const inviteLink = () => {
  const id = playerId();
  if (!id) return gameLink();
  return tgAppLink('r' + id) || `${CONFIG.siteUrl}?start=r${id}`;
};

/** «Полей, я в отпуске»: друг по ссылке сразу попадает ко мне в гости. */
export async function shareVacation(name: string) {
  const id = playerId();
  if (!id) return;
  const url = tgAppLink('v' + id) || `${CONFIG.siteUrl}?start=v${id}`;
  const r = await platform().share({ text: `${name ? name + ' уезжает' : 'Я уезжаю'} 🧳 Польёшь мои растения? Загляни на мой подоконник:`, url });
  report(r);
}

export async function shareInvite() {
  if (platform().invite && (await platform().invite!())) return;
  const r = await platform().share({ text: 'Я выращиваю растения на подоконнике 🌿 Заходи — дадут бонус на первые черенки!', url: inviteLink() });
  report(r);
}

/** PNG-картинка растения для «Показать, как подросло». */
export async function plantPng(p: Plant, caption?: string): Promise<File | null> {
  const { renderToStaticMarkup } = await import('react-dom/server');
  const svg = renderToStaticMarkup(createElement(PlantArt, { sp: p.sp, form: p.form, hue: p.hue, stage: p.stage, seed: p.id, pot: p.pot, bigPot: p.bigPot, blooming: p.blooming }))
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
  x.fillText(caption ?? `${sp(p.sp).name} · Подоконник 🌱`, 400, 760);
  return new Promise((ok) => c.toBlob((b) => ok(b && new File([b], `podokonnik-${p.sp}.png`, { type: 'image/png' })), 'image/png'));
}

export async function shareShowoff(p: Plant) {
  const s = sp(p.sp);
  setShowoffDone(p.id);
  const file = await plantPng(p).catch(() => null);
  const r = await platform().share({ text: `Смотри, как подрос твой черенок: ${s.name} 🌱`, url: gameLink(), files: file ? [file] : undefined });
  report(r);
}

/** Коллаж «было / стало» из двух снимков настоящего растения. */
export async function shareBeforeAfter(tw: Twin, a: { id: string; at: number }, b: { id: string; at: number }) {
  const { loadPhoto } = await import('../net/photos');
  const [ba, bb] = await Promise.all([loadPhoto(a.id), loadPhoto(b.id)]);
  if (!ba || !bb) return toast('Фото есть только на том устройстве, где снимали');
  const [ia, ib] = await Promise.all([createImageBitmap(ba), createImageBitmap(bb)]);
  const c = document.createElement('canvas');
  c.width = 1080;
  c.height = 760;
  const x = c.getContext('2d')!;
  x.fillStyle = '#F4FBF6';
  x.fillRect(0, 0, c.width, c.height);
  const cover = (img: ImageBitmap, dx: number) => {
    const w = 500, h = 560;
    const k = Math.max(w / img.width, h / img.height);
    const sw = w / k, sh = h / k;
    x.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, dx, 30, w, h);
  };
  cover(ia, 30);
  cover(ib, 550);
  const day = (at: number) => new Date(at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  x.fillStyle = '#2E4A45';
  x.textAlign = 'center';
  x.font = 'bold 34px system-ui, sans-serif';
  x.fillText(`Было · ${day(a.at)}`, 280, 640);
  x.fillText(`Стало · ${day(b.at)}`, 800, 640);
  x.font = 'bold 30px system-ui, sans-serif';
  x.fillText(`${tw.nick} · Подоконник 🌱`, 540, 715);
  const file = await new Promise<File | null>((ok) => c.toBlob((bl) => ok(bl && new File([bl], 'bylo-stalo.jpg', { type: 'image/jpeg' })), 'image/jpeg', 0.88));
  const days = Math.max(1, Math.round((b.at - a.at) / 86400e3));
  const r = await platform().share({ text: `${tw.nick}: было и стало за ${days} дн. 🌿 Слежу за своими растениями в «Подоконнике»`, url: gameLink(), files: file ? [file] : undefined });
  report(r);
}
