// Что сейчас действует на растение: подкормка, стимулятор, защита после лечения и т. п.
// Показываем значками на подоконнике и списком в карточке — со временем до конца.

import { PROBLEMS } from './problems';
import { newbieLeft, wetLeavesH } from './sim';
import { H } from './constants';
import type { GameState, Plant } from './types';

export interface Effect {
  id: string;
  icon: string;
  name: string;
  text: string;      // что делает
  left?: number;     // сколько ещё действует, мс (нет — постоянно или пока не вылечишь)
  bad?: boolean;     // мешает растению
}

export function plantEffects(p: Plant, t: number, g?: Pick<GameState, 'createdAt' | 'level'>, fan?: boolean): Effect[] {
  const out: Effect[] = [];
  const until = (x?: number) => (x && t < x ? x - t : 0);
  if (until(p.boostUntil)) out.push({ id: 'boost', icon: '⚡', name: 'Стимулятор', text: 'растёт вдвое быстрее', left: until(p.boostUntil) });
  if (until(p.feedUntil)) out.push({ id: 'feed', icon: '🧪', name: 'Подкормка', text: 'растёт в 1,5 раза быстрее', left: until(p.feedUntil) });
  if (until(p.mistUntil)) out.push({ id: 'mist', icon: '💦', name: 'Опрыскано', text: 'влажный воздух: растёт в 1,5 раза быстрее', left: until(p.mistUntil) });
  if (until(p.guardUntil)) out.push({ id: 'guard', icon: '🛡', name: 'Защита после лечения', text: 'вредители и болезни не пристают', left: until(p.guardUntil) });
  if (p.drain) out.push({ id: 'drain', icon: '🪨', name: 'Дренаж', text: 'лишняя вода уходит вчетверо быстрее' });
  if (g && p.stage >= 2 && p.stage < 4 && newbieLeft(g, t) > 0) out.push({ id: 'newbie', icon: '🌟', name: 'Бонус новичка', text: 'растёт втрое быстрее', left: newbieLeft(g, t) });
  if (p.wetLeaves) out.push({ id: 'wet', icon: '💧', name: 'Мокрые листья', text: 'этому виду вредна вода на листьях', left: Math.max(0, p.wetLeaves + wetLeavesH(fan) * H - t), bad: true });
  if (p.problem) {
    const info = PROBLEMS[p.problem.kind];
    out.push({ id: 'problem', icon: info.icon, name: info.name, text: info.dmg > 0 ? 'отнимает здоровье — нужно лечить' : 'мешает расти', bad: true });
  }
  return out;
}

/** Коротко «осталось»: 5 д, 3 ч, 20 мин. */
export function leftShort(ms: number) {
  const m = Math.ceil(ms / 60e3);
  if (m < 60) return `${m} мин`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} ч`;
  return `${Math.round(h / 24)} д`;
}
