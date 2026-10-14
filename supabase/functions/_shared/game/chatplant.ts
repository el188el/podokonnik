// СГЕНЕРИРОВАНО из src/game/chatplant.ts командой npm run sync:shared — не редактировать.
// Растение в групповом чате Telegram: одно на чат, поливают все участники кнопкой.
// Упрощённая модель: земля сохнет за waterDays вида, растение растёт, пока земля влажная,
// без воды дольше засухи — болеет, а через неделю засыхает. Засохшее оживает,
// если его польют трое разных людей. Общий файл для игры и сервера.

import { D } from './constants.ts';
import { sp } from './species.ts';

export const CHAT_SPECIES = ['chlorophytum', 'scindapsus', 'spathiphyllum', 'sansevieria', 'monstera', 'ficus', 'tradescantia', 'geranium'];
export const REVIVE_PEOPLE = 3;
export const WILT_DAYS = 7;       // столько дней без воды — и засохло
const GROW = [0, 4, 12];          // дней роста до ростка, молодого, взрослого
const BLOOM_DAYS = 20;

export interface ChatPlant {
  sp: string;
  name: string;
  born: number;
  at: number;          // момент, на который посчитано состояние
  moisture: number;    // 0…1
  grown: number;       // дней роста (только пока земля влажная)
  dry: number;         // дней подряд с сухой землёй
  health: number;      // 0…100
  wilted?: boolean;
  revive?: number[];   // кто уже полил засохшее (tg id)
  last?: { name: string; at: number };
  waters: number;
}

export function newChatPlant(name: string, t: number, rnd = Math.random): ChatPlant {
  const s = CHAT_SPECIES[Math.floor(rnd() * CHAT_SPECIES.length)];
  return { sp: s, name: name.trim().slice(0, 40) || `${sp(s).name} чата`, born: t, at: t, moisture: 1, grown: 0, dry: 0, health: 100, waters: 0 };
}

/** Досчитать состояние до момента t. */
export function stepChat(p: ChatPlant, t: number): ChatPlant {
  if (t <= p.at) return p;
  const s = sp(p.sp);
  let days = (t - p.at) / D;
  p.at = t;
  if (p.wilted) return p;
  // сначала земля сохнет — растение растёт
  const wetDays = Math.min(days, p.moisture * s.waterDays);
  p.moisture = Math.max(0, p.moisture - days / s.waterDays);
  p.grown += wetDays;
  if (wetDays > 0) p.dry = 0;
  days -= wetDays;
  if (days > 0) {
    // потом сухо: после засухи вида теряет здоровье, через неделю — засыхает
    const before = p.dry;
    p.dry += days;
    const sick = Math.max(0, p.dry - Math.max(before, s.drought));
    p.health = Math.max(0, p.health - sick * 18);
    if (p.dry >= WILT_DAYS || p.health <= 0) { p.wilted = true; p.health = 0; p.revive = []; }
  } else p.health = Math.min(100, p.health + wetDays * 6);
  return p;
}

export const chatStage = (p: ChatPlant) => (p.grown >= GROW[2] ? 4 : p.grown >= GROW[1] ? 3 : 2) as 2 | 3 | 4;
export const chatBlooming = (p: ChatPlant) => !p.wilted && !!sp(p.sp).bloom && p.grown >= BLOOM_DAYS && p.health > 60;
export const chatThirsty = (p: ChatPlant) => !p.wilted && p.moisture < 0.2;

export type ChatWater = 'ok' | 'wet' | 'revive' | 'revived' | 'already';

/** Полить: обычный полив, «уже мокро», или шаг оживления засохшего. */
export function waterChat(p: ChatPlant, who: { id: number; name: string }, t: number): ChatWater {
  stepChat(p, t);
  if (p.wilted) {
    const r = new Set(p.revive ?? []);
    if (r.has(who.id)) return 'already';
    r.add(who.id);
    p.revive = [...r];
    p.last = { name: who.name, at: t };
    p.waters += 1;
    if (r.size < REVIVE_PEOPLE) return 'revive';
    p.wilted = false;
    p.revive = undefined;
    p.health = 40;
    p.moisture = 1;
    p.dry = 0;
    return 'revived';
  }
  if (p.moisture > 0.6) return 'wet';
  p.moisture = 1;
  p.dry = 0;
  p.waters += 1;
  p.last = { name: who.name, at: t };
  return 'ok';
}

const STAGE_TXT = { 2: 'росток 🌱', 3: 'молодое 🌿', 4: 'взрослое 🪴' } as const;
const bar = (v: number, n = 8) => '▰'.repeat(Math.round(v * n)) + '▱'.repeat(n - Math.round(v * n));
const ago = (ms: number) => (ms < 3600e3 ? `${Math.max(1, Math.round(ms / 60e3))} мин назад` : ms < D ? `${Math.round(ms / 3600e3)} ч назад` : `${Math.round(ms / D)} дн назад`);
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Карточка растения для сообщения в чате (HTML Telegram). */
export function chatCard(p: ChatPlant, t: number): string {
  const s = sp(p.sp);
  const day = Math.max(1, Math.floor((t - p.born) / D) + 1);
  if (p.wilted) {
    return [
      `🥀 <b>${esc(p.name)}</b> засохло…`,
      `Неделю никто не поливал. Его ещё можно спасти: нужно, чтобы полили <b>${REVIVE_PEOPLE} разных человека</b>.`,
      `Уже полили: ${(p.revive ?? []).length}/${REVIVE_PEOPLE}`,
    ].join('\n');
  }
  const lines = [
    `${chatBlooming(p) ? '🌸' : '🪴'} <b>${esc(p.name)}</b> · ${s.name.toLowerCase()}`,
    `${STAGE_TXT[chatStage(p)]}${chatBlooming(p) ? ' · цветёт!' : ''} · день ${day}`,
    `💧 ${bar(p.moisture)} ${Math.round(p.moisture * 100)}%${chatThirsty(p) ? ' — хочет пить!' : ''}`,
    `❤️ ${bar(p.health / 100)} ${Math.round(p.health)}%`,
  ];
  if (p.last) lines.push(`Последним поливал(а): ${esc(p.last.name)}, ${ago(t - p.last.at)}`);
  return lines.join('\n');
}

/** Напоминание в чат: что сказать, если растению плохо. */
export function chatNudge(p: ChatPlant): string | null {
  if (p.wilted) return `🥀 <b>${esc(p.name)}</b> засохло… Спасите! Нужно ${REVIVE_PEOPLE} разных человека с лейкой.`;
  if (p.dry >= sp(p.sp).drought) return `😢 <b>${esc(p.name)}</b> вянет — земля совсем сухая уже ${Math.floor(p.dry)} дн. Кто польёт?`;
  if (chatThirsty(p)) return `💧 <b>${esc(p.name)}</b> хочет пить! Кто польёт?`;
  return null;
}
