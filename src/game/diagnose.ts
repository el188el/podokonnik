// Диагноз: почему у растения падает здоровье и что с этим сделать.
// Повторяет источники урона из симуляции (засуха, перелив, свет, холод, болезнь)
// и подсказывает действия и товары, которые помогут.

import { climateOf, coldLimit, FUSSY_TEXT, fussyIssue, zoneTemp } from './climate';
import { PROBLEMS, cureFor } from './problems';
import { badLight, ctxFor } from './sim';
import { sp } from './species';
import type { GameState, Plant, Sill } from './types';

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

const owns = (g: GameState, sill: Sill, id: string) => sill.decor.includes(id) && (!!sill.shared || (g.owned[id] ?? 0) > 0);

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
      fixes: [{ kind: 'water', label: '💧 Полить' }, ...(owns(g, sill, 'meter') ? [] : [{ kind: 'buy' as const, item: 'meter', label: '📟 Влагомер' }])],
    });
  }
  if (p.wetLeaves) {
    out.push({
      icon: '💧', title: 'Мокрые листья', hurts: true,
      text: `${s.name} не любит воду на листьях: появляются пятна, а в сырости — плесень. Протри салфеткой${owns(g, sill, 'fan') ? ' или подожди — вентилятор высушит за полчаса' : ', иначе листья будут сохнуть 3 часа'}.`,
      fixes: [{ kind: 'wipe', label: '🧻 Протереть' }, ...(owns(g, sill, 'fan') ? [] : [{ kind: 'buy' as const, item: 'fan', label: '🌀 Вентилятор' }])],
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
        ? [...(p.zone === 'deep' ? [{ kind: 'move' as const, to: 'glass' as const, label: '↑ К стеклу' }] : []), ...(p.zone === 'deep' ? (owns(g, sill, 'lamp_table') ? [] : [{ kind: 'buy' as const, item: 'lamp_table', label: '💜 Настольная фитолампа' }]) : owns(g, sill, 'lamp') ? [] : [{ kind: 'buy' as const, item: 'lamp', label: '💜 Фитолампа' }])]
        : [...(p.zone === 'glass' ? [{ kind: 'move' as const, to: 'deep' as const, label: '↓ В глубину' }] : []), ...(owns(g, sill, 'curtains') ? [] : [{ kind: 'buy' as const, item: 'curtains', label: '🎐 Шторы' }]), ...(owns(g, sill, 'tulle') ? [] : [{ kind: 'buy' as const, item: 'tulle', label: '🪟 Тюль' }])],
    });
  }
  const c = climateOf(g, sill, t);
  const temp = zoneTemp(c, p.zone);
  if (temp < coldLimit(p.sp)) {
    out.push({
      icon: '🥶', title: 'Холодно', hurts: true,
      text: `${Math.round(temp)}° ${p.zone === 'glass' ? 'у стекла' : 'в комнате'}, а ${s.name.toLowerCase()} мёрзнет ниже ${coldLimit(p.sp)}°.${sill.vent ? ' Открыта форточка — сквозняк.' : ''}`,
      fixes: [...(sill.vent ? [{ kind: 'vent' as const, label: '🪟 Закрыть форточку' }] : []), ...(p.zone === 'glass' ? [{ kind: 'move' as const, to: 'deep' as const, label: '↓ От стекла' }] : []), ...(owns(g, sill, 'heater') ? [] : [{ kind: 'buy' as const, item: 'heater', label: '♨️ Обогреватель' }])],
    });
  }
  const fi = fussyIssue(s, temp, c.rh, c.draft && p.zone === 'glass');
  if (fi) {
    const vent = (label: string) => ({ kind: 'vent' as const, label });
    const fixes: Fix[] =
      fi === 'hot' ? [...(sill.vent ? [] : [vent('🪟 Открыть форточку')]), ...(p.zone === 'deep' && c.heating ? [{ kind: 'move' as const, to: 'glass' as const, label: '↑ К прохладному стеклу' }] : []), ...(owns(g, sill, 'fan') ? [] : [{ kind: 'buy' as const, item: 'fan', label: '🌀 Вентилятор' }])]
      : fi === 'cold' ? [...(sill.vent ? [vent('🪟 Закрыть форточку')] : []), ...(p.zone === 'glass' ? [{ kind: 'move' as const, to: 'deep' as const, label: '↓ От стекла' }] : []), ...(owns(g, sill, 'heater') ? [] : [{ kind: 'buy' as const, item: 'heater', label: '♨️ Обогреватель' }])]
      : fi === 'draft' ? [vent('🪟 Закрыть форточку'), { kind: 'move', to: 'deep', label: '↓ От стекла' }]
      : [{ kind: 'mist', label: '💦 Опрыскать' }, ...(owns(g, sill, 'humidifier') ? [] : [{ kind: 'buy' as const, item: 'humidifier', label: '💨 Увлажнитель' }])];
    out.push({
      icon: fi === 'hot' ? '🥵' : fi === 'cold' ? '🥶' : fi === 'dry' ? '🏜' : '🪟', title: 'Капризничает', hurts: p.health > 60,
      text: `${s.name} — ${FUSSY_TEXT[fi]} (${Math.round(temp)}°, влажность ${c.rh}%). Растёт вдвое медленнее и не цветёт. ${s.fussy!.note}`,
      fixes,
    });
  } else if (s.mist === 'love' && c.rh < 35) {
    out.push({
      icon: '🏜', title: 'Сухой воздух', hurts: false,
      text: `Влажность ${c.rh}% — ${s.name.toLowerCase()} любит влажный воздух: растёт медленнее, легко заводится клещ.`,
      fixes: [{ kind: 'mist', label: '💦 Опрыскать' }, ...(owns(g, sill, 'humidifier') ? [] : [{ kind: 'buy' as const, item: 'humidifier', label: '💨 Увлажнитель' }])],
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
