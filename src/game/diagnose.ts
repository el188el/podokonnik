// Диагноз: почему у растения падает здоровье и что с этим сделать.
// Повторяет источники урона из симуляции (засуха, перелив, свет, холод, болезнь)
// и подсказывает действия и товары, которые помогут.

import { climateOf, coldLimit, zoneTemp } from './climate';
import { PROBLEMS, cureFor } from './problems';
import { badLight, ctxFor } from './sim';
import { sp } from './species';
import type { GameState, Plant } from './types';

export type Fix =
  | { kind: 'water' | 'mist' | 'vent' | 'tray' | 'soil' | 'drain' | 'wipe'; label: string }
  | { kind: 'move'; to: 'glass' | 'deep'; label: string }
  | { kind: 'buy'; item: string; label: string }
  | { kind: 'cure'; item: string; label: string };

export interface Cause {
  icon: string;
  title: string;
  text: string;
  hurts: boolean;   // прямо сейчас отнимает здоровье
  fixes: Fix[];
}

const owns = (g: GameState, sillDecor: string[], id: string) => sillDecor.includes(id) && (g.owned[id] ?? 0) > 0;

export function diagnose(g: GameState, p: Plant, t: number): Cause[] {
  if (p.stage < 2) return [];
  const s = sp(p.sp);
  const ctx = ctxFor(g, p, t);
  const sill = ctx.sill;
  const out: Cause[] = [];

  if (p.dryFor > s.drought * 24 || p.moisture <= 0) {
    out.push({
      icon: '🏜', title: 'Засуха', hurts: p.dryFor > s.drought * 24,
      text: `Земля сухая уже ${Math.round(p.dryFor)} ч — корни сохнут. ${s.name} терпит без воды около ${s.drought} дн.`,
      fixes: [{ kind: 'water', label: '💧 Полить' }, ...(owns(g, sill.decor, 'meter') ? [] : [{ kind: 'buy' as const, item: 'meter', label: '📟 Влагомер' }])],
    });
  }
  if (p.wetLeaves) {
    out.push({
      icon: '💧', title: 'Мокрые листья', hurts: true,
      text: `${s.name} не любит воду на листьях: появляются пятна, а в сырости — плесень. Протри салфеткой${owns(g, sill.decor, 'fan') ? ' или подожди — вентилятор высушит за полчаса' : ', иначе листья будут сохнуть 3 часа'}.`,
      fixes: [{ kind: 'wipe', label: '🧻 Протереть' }, ...(owns(g, sill.decor, 'fan') ? [] : [{ kind: 'buy' as const, item: 'fan', label: '🌀 Вентилятор' }])],
    });
  }
  if (p.moisture > 1) {
    out.push({
      icon: '🌊', title: 'Перелив', hurts: s.overwater !== 'tolerant',
      text: 'Вода стоит в горшке — корни задыхаются и могут загнить.',
      fixes: [{ kind: 'tray', label: '🫗 Слить из поддона' }, { kind: 'soil', label: '🟫 В сухой грунт' }, ...(p.drain ? [] : [{ kind: 'drain' as const, label: '🪨 Дренаж' }])],
    });
  }
  const bad = badLight(p, t, ctx);
  if (bad) {
    const dark = bad === 'dark';
    out.push({
      icon: dark ? '🌥' : '🔥', title: dark ? 'Мало света' : 'Слишком много солнца', hurts: p.badLightFor > 20 && p.health > 50,
      text: dark ? `Ему нужно больше света. Поставь ${p.zone === 'deep' ? 'к стеклу' : 'на более светлое окно'} или повесь фитолампу.` : 'Прямое солнце обжигает листья. Отодвинь в глубину, задёрни шторы или повесь тюль.',
      fixes: dark
        ? [...(p.zone === 'deep' ? [{ kind: 'move' as const, to: 'glass' as const, label: '↑ К стеклу' }] : []), ...(p.zone === 'deep' ? (owns(g, sill.decor, 'lamp_table') ? [] : [{ kind: 'buy' as const, item: 'lamp_table', label: '💜 Настольная фитолампа' }]) : owns(g, sill.decor, 'lamp') ? [] : [{ kind: 'buy' as const, item: 'lamp', label: '💜 Фитолампа' }])]
        : [...(p.zone === 'glass' ? [{ kind: 'move' as const, to: 'deep' as const, label: '↓ В глубину' }] : []), ...(owns(g, sill.decor, 'curtains') ? [] : [{ kind: 'buy' as const, item: 'curtains', label: '🎐 Шторы' }]), ...(owns(g, sill.decor, 'tulle') ? [] : [{ kind: 'buy' as const, item: 'tulle', label: '🪟 Тюль' }])],
    });
  }
  const c = climateOf(g, sill, t);
  const temp = zoneTemp(c, p.zone);
  if (temp < coldLimit(p.sp)) {
    out.push({
      icon: '🥶', title: 'Холодно', hurts: true,
      text: `${Math.round(temp)}° ${p.zone === 'glass' ? 'у стекла' : 'в комнате'}, а ${s.name.toLowerCase()} мёрзнет ниже ${coldLimit(p.sp)}°.${sill.vent ? ' Открыта форточка — сквозняк.' : ''}`,
      fixes: [...(sill.vent ? [{ kind: 'vent' as const, label: '🪟 Закрыть форточку' }] : []), ...(p.zone === 'glass' ? [{ kind: 'move' as const, to: 'deep' as const, label: '↓ От стекла' }] : []), ...(owns(g, sill.decor, 'heater') ? [] : [{ kind: 'buy' as const, item: 'heater', label: '♨️ Обогреватель' }])],
    });
  }
  if (s.mist === 'love' && c.rh < 35) {
    out.push({
      icon: '🏜', title: 'Сухой воздух', hurts: false,
      text: `Влажность ${c.rh}% — ${s.name.toLowerCase()} любит влажный воздух: растёт медленнее, легко заводится клещ.`,
      fixes: [{ kind: 'mist', label: '💦 Опрыскать' }, ...(owns(g, sill.decor, 'humidifier') ? [] : [{ kind: 'buy' as const, item: 'humidifier', label: '💨 Увлажнитель' }])],
    });
  }
  if (p.problem) {
    const info = PROBLEMS[p.problem.kind];
    out.push({
      icon: info.icon, title: info.name, hurts: info.dmg > 0,
      text: info.heal,
      fixes: cureFor(p.problem.kind).map((id) => ({ kind: 'cure' as const, item: id, label: id })),
    });
  }
  return out;
}

/** Сколько часов до полного здоровья, если сейчас ничего не вредит (+3 в час). */
export const recoverHours = (p: Plant) => Math.ceil((100 - p.health) / 3);
