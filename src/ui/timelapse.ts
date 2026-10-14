// Таймлапс растения: короткое видео «от черенка до цветения» для сторис.
// Кадры — стадии роста этого же растения (тот же вид, форма, цвет, горшок),
// между ними плавные переходы и счётчик дней. Видео пишем с canvas через MediaRecorder.

import { createElement } from 'react';
import { ageDays } from '../game/age';
import { STAGE_NAME } from '../game/constants';
import { sp } from '../game/species';
import type { Plant } from '../game/types';
import { PlantArt } from './art/PlantArt';

const W = 720;
const H = 1280;
const STEP_MS = 1100;   // сколько показываем каждую стадию
const FADE_MS = 450;    // плавный переход
const END_MS = 1800;    // финальный кадр с надписью

async function art(p: Plant, stage: number, blooming: boolean): Promise<HTMLImageElement> {
  const { renderToStaticMarkup } = await import('react-dom/server');
  const svg = renderToStaticMarkup(createElement(PlantArt, { sp: p.sp, form: p.form, hue: p.hue, stage: stage as Plant['stage'], seed: p.id, pot: p.pot, bigPot: stage >= 4 && p.bigPot, blooming }))
    .replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg" width="420" height="600"');
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await img.decode().catch(() => null);
  return img;
}

/** Какой формат видео умеет записывать браузер. mp4 подходит для сторис Telegram. */
export function videoType(): string | null {
  if (typeof MediaRecorder === 'undefined' || typeof HTMLCanvasElement.prototype.captureStream !== 'function') return null;
  for (const t of ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm']) if (MediaRecorder.isTypeSupported(t)) return t;
  return null;
}

export interface Timelapse { blob: Blob; type: string; days: number }

export async function timelapse(p: Plant, now: number, onProgress?: (v: number) => void): Promise<Timelapse | null> {
  const type = videoType();
  if (!type) return null;
  const s = sp(p.sp);
  const stages = Array.from({ length: Math.max(1, p.stage) + 1 }, (_, i) => i);
  const frames: { img: HTMLImageElement; label: string }[] = [];
  for (const st of stages) frames.push({ img: await art(p, st, false), label: st === 0 ? 'черенок в стакане' : STAGE_NAME[st] });
  if (p.blooming || p.bloomedOnce) frames.push({ img: await art(p, p.stage, true), label: 'цветёт 🌸' });
  const days = Math.max(1, ageDays(p, now));
  const total = frames.length * STEP_MS + END_MS;

  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d')!;
  const name = p.nick || s.name;

  const draw = (ms: number) => {
    const bg = x.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#dff5e6');
    bg.addColorStop(1, '#fbf3e6');
    x.fillStyle = bg;
    x.fillRect(0, 0, W, H);
    // окно
    x.fillStyle = '#fff';
    x.beginPath();
    x.roundRect(40, 250, W - 80, 760, 30);
    x.fill();
    const sky = x.createLinearGradient(0, 260, 0, 1000);
    sky.addColorStop(0, '#8fd2ff');
    sky.addColorStop(1, '#e4f6ff');
    x.fillStyle = sky;
    x.beginPath();
    x.roundRect(56, 266, W - 112, 744, [22, 22, 0, 0]);
    x.fill();
    x.fillStyle = '#ffd85a';
    x.beginPath();
    x.arc(W - 170, 360, 46, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#e9c9a0';
    x.fillRect(24, 1000, W - 48, 30);
    x.fillStyle = '#d3ad80';
    x.fillRect(24, 1030, W - 48, 10);
    // кадр растения с плавным переходом
    const i = Math.min(frames.length - 1, Math.floor(ms / STEP_MS));
    const local = ms - i * STEP_MS;
    const fade = i > 0 && local < FADE_MS ? local / FADE_MS : 1;
    const pw = 460, ph = 657, px = (W - pw) / 2, py = 1012 - ph;
    if (fade < 1) {
      x.globalAlpha = 1 - fade;
      x.drawImage(frames[i - 1].img, px, py, pw, ph);
    }
    x.globalAlpha = fade;
    const pop = 1 + 0.04 * Math.sin(Math.min(1, local / STEP_MS) * Math.PI);
    x.drawImage(frames[i].img, px - (pw * (pop - 1)) / 2, py - ph * (pop - 1), pw * pop, ph * pop);
    x.globalAlpha = 1;
    // подписи
    const prog = Math.min(1, ms / (frames.length * STEP_MS));
    const day = Math.max(1, Math.round(1 + (days - 1) * prog));
    x.textAlign = 'center';
    x.fillStyle = '#2E4A45';
    x.font = '900 64px Nunito, system-ui, sans-serif';
    x.fillText(name, W / 2, 130);
    x.font = '700 38px Nunito, system-ui, sans-serif';
    x.fillStyle = '#5b7068';
    x.fillText(`день ${day} · ${frames[i].label}`, W / 2, 196);
    // полоска прогресса
    x.fillStyle = '#ffffffaa';
    x.beginPath();
    x.roundRect(120, 1090, W - 240, 14, 7);
    x.fill();
    x.fillStyle = '#4caf6a';
    x.beginPath();
    x.roundRect(120, 1090, Math.max(14, (W - 240) * prog), 14, 7);
    x.fill();
    if (ms > frames.length * STEP_MS) {
      x.font = '900 46px Nunito, system-ui, sans-serif';
      x.fillStyle = '#2E4A45';
      x.fillText(`${days} ${days % 10 === 1 && days % 100 !== 11 ? 'день' : 'дней'} заботы 💚`, W / 2, 1170);
    }
    x.font = '700 30px Nunito, system-ui, sans-serif';
    x.fillStyle = '#5b7068';
    x.fillText('🌱 Подоконник — игра в Telegram', W / 2, 1236);
  };

  draw(0);
  const stream = c.captureStream(30);
  const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 2_500_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const done = new Promise<void>((ok) => { rec.onstop = () => ok(); });
  rec.start(250);
  const t0 = performance.now();
  await new Promise<void>((ok) => {
    const tick = () => {
      const ms = performance.now() - t0;
      draw(Math.min(ms, total));
      onProgress?.(Math.min(1, ms / total));
      if (ms >= total) return ok();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  rec.stop();
  await done;
  stream.getTracks().forEach((t) => t.stop());
  return { blob: new Blob(chunks, { type: type.split(';')[0] }), type: type.split(';')[0], days };
}
