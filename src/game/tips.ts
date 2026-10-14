// «Совет дня» для Telegram-канала игры: факты о растениях и сезонные дела по кругу.

import { careTasks, MONTH_IN } from './calendar';
import { SPECIES } from './species';

export interface Tip {
  title: string;
  text: string;
}

/** Совет на день: чередуем «вид дня» и сезонное дело месяца. */
export function dailyTip(t: number): Tip {
  const day = Math.floor((t + 3 * 3600e3) / 86400e3); // сутки по Москве
  const month = new Date(t + 3 * 3600e3).getUTCMonth() + 1;
  if (day % 3 === 2) {
    const tasks = careTasks(month, SPECIES.map((x) => x.id));
    const k = tasks[Math.floor(day / 3) % tasks.length];
    const who = k.sp ? `${SPECIES.find((x) => x.id === k.sp)!.name}: ` : '';
    return { title: `📅 Что сделать с растениями в ${MONTH_IN[month - 1]}`, text: `${k.icon} ${who}${k.text}` };
  }
  const s = SPECIES[day % SPECIES.length];
  const fact = s.facts[Math.floor(day / SPECIES.length) % s.facts.length];
  return {
    title: `🌿 Растение дня: ${s.name}${s.folk ? ` («${s.folk}»)` : ''}`,
    text: `${fact}\n\n💧 Уход: ${s.care}\n💸 ${s.buy}\n✂️ Бесплатно: ${s.free}`,
  };
}
