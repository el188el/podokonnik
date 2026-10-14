// Какое напоминание отправить игроку — чистая функция, её легко тестировать.

import { canCut } from '../_shared/game/sim.ts';
import { replayFriendWaters, type FriendWater } from '../_shared/game/social.ts';
import { sp } from '../_shared/game/species.ts';
import { PROBLEMS } from '../_shared/game/problems.ts';
import type { GameState } from '../_shared/game/types.ts';
import { MONTH_IN, monthHeadline } from '../_shared/game/calendar.ts';

export interface Reminder {
  text: string;
  button: string;
}

const names = (ids: string[]) => {
  const n = ids.map((id) => sp(id).name);
  return n.length === 1 ? n[0] : n.length === 2 ? `${n[0]} и ${n[1]}` : `${n[0]}, ${n[1]} и ещё ${n.length - 2}`;
};

export function localHour(now: number, tzOffsetMin: number) {
  return new Date(now + tzOffsetMin * 60e3).getUTCHours();
}

export function isQuiet(hour: number, from: number, to: number) {
  return from > to ? hour >= from || hour < to : hour >= from && hour < to;
}

export function pickReminder(state: GameState, now: number, tzOffsetMin: number, lastSeen: number, waters: FriendWater[] = []): Reminder | null {
  const quietFrom = state.settings?.quietFrom ?? 23;
  const quietTo = state.settings?.quietTo ?? 9;
  if (isQuiet(localHour(now, tzOffsetMin), quietFrom, quietTo)) return null;
  // настоящие растения важнее игровых
  const dueTwins = (state.twins ?? []).filter((t) => t.notify && (!t.lastWater || now >= t.lastWater + t.every * 86400e3));
  if (dueTwins.length) {
    const t = dueTwins[0];
    const more = dueTwins.length > 1 ? ` (и ещё ${dueTwins.length - 1})` : '';
    const acc = sp(t.sp).acc;
    const adj = /[ую]$/.test(acc) ? 'ую' : /[эео]$/.test(acc) ? 'ее' : 'ий';
    return { text: `🏠 Пора полить настоящ${adj} ${acc} «${t.nick}»${more} 💧 Потом отметь полив в игре`, button: '💧 Отметить полив' };
  }
  // раз в месяц, 1-го числа днём — главное дело календаря ухода
  const local = new Date(now + tzOffsetMin * 60e3);
  if ((state.twins ?? []).length && local.getUTCDate() === 1 && local.getUTCHours() >= 11) {
    const m = local.getUTCMonth() + 1;
    const head = monthHeadline(m, state.twins!.map((t) => t.sp));
    if (head) return { text: `📅 Что сделать с растениями в ${MONTH_IN[m - 1]}: ${head}`, button: '📅 Календарь ухода' };
  }
  if (!Array.isArray(state.plants) || !state.plants.length) return null;

  const g = structuredClone(state);
  replayFriendWaters(g, waters, now);
  const neighbor = !!g.neighbor && now < g.neighbor.until;
  const potted = g.plants.filter((p) => p.stage >= 2);

  const wilting = potted.filter((p) => p.health < 40 && !neighbor).map((p) => p.sp);
  if (wilting.length) return { text: `🥀 ${names(wilting)} совсем плохо. Загляни, пока не поздно!`, button: '🚑 Спасти' };

  const sick = potted.find((p) => p.problem && (PROBLEMS[p.problem.kind]?.pest || p.problem.kind === 'rot'));
  if (sick?.problem) {
    const info = PROBLEMS[sick.problem.kind];
    return { text: `${info.icon} У растения «${sp(sick.sp).name}» — ${info.name.toLowerCase()}!${info.pest ? ' Вылечи, пока не перебралось на соседей' : ' Нужна помощь'}`, button: '💊 Вылечить' };
  }

  const thirsty = neighbor ? [] : potted.filter((p) => p.moisture < 0.2).map((p) => p.sp);
  if (thirsty.length) return { text: `💧 ${names(thirsty)} ${thirsty.length === 1 ? 'хочет' : 'хотят'} пить`, button: '💧 Полить' };

  const roots = g.plants.filter((p) => p.stage === 1).map((p) => p.sp);
  if (roots.length) return { text: `🌱 ${names(roots)}: корни готовы, пора сажать в горшок!`, button: '🪴 Посадить' };

  const cuts = potted.filter((p) => canCut(p, now)).map((p) => p.sp);
  if (cuts.length && now - lastSeen > 24 * 3600e3) return { text: `✂️ ${names(cuts)}: можно взять черенок и подарить другу`, button: '✂️ Взять черенок' };

  if (now - lastSeen > 3 * 86400e3) return { text: '🌿 Растения скучают по тебе. Загляни на подоконник!', button: '🪴 Открыть' };
  return null;
}
