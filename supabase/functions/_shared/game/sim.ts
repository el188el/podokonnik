// СГЕНЕРИРОВАНО из src/game/sim.ts командой npm run sync:shared — не редактировать.
// Симуляция ухода. Всё считается от реального времени шагами по 15 минут,
// поэтому растения честно живут и растут, даже когда игра закрыта.
// Функции здесь чистые относительно входа: меняют только переданные объекты.

import { D, H, MAX_GROWTH_MULT, MIN, QUICK_ROOT_MIN, WINDOWS } from './constants.ts';
import { sp } from './species.ts';
import { isDim, isSunny, weatherAt } from './weather.ts';
import { PROBLEMS, problemEffect, SHADY, stepProblem, trySpread } from './problems.ts';
import { rowSlots, zoneOfSlot } from './layout.ts';
import { catStep, type CatAction } from './cat.ts';
import type { GameState, Plant, ProblemKind, Sill, Stage } from './types.ts';

export const STEP_H = 0.25;
const MAX_CATCHUP = 60 * D;

export type SimEvent =
  | { kind: 'roots'; plant: string }
  | { kind: 'stage'; plant: string; stage: Stage }
  | { kind: 'wilt'; plant: string }
  | { kind: 'bloom'; plant: string }
  | { kind: 'neighbor'; plant: string }
  | { kind: 'problem'; plant: string; problem: ProblemKind; spread?: boolean }
  | { kind: 'cat'; plant: string; action: CatAction };

// ─────────── сезоны ───────────
export const month = (t: number) => new Date(t).getMonth() + 1;
export const isWinter = (t: number) => [12, 1, 2].includes(month(t));
export const isRestSeason = (t: number) => [10, 11].includes(month(t));
export function seasonName(t: number) {
  const m = month(t);
  return m === 12 || m <= 2 ? 'зима' : m <= 5 ? 'весна' : m <= 8 ? 'лето' : 'осень';
}

// ─────────── свет ───────────
/** dim — пасмурно за окном: у стекла нет прямого солнца. */
export function lightLevel(sill: Sill, zone: Plant['zone'], t: number, lamp: boolean, dim = false, shade = false): number {
  const w = WINDOWS[sill.window ?? 'E'];
  let l = w[zone] - (isWinter(t) ? 1 : 0);
  if (dim && zone === 'glass') l = Math.min(l, 3);
  if (shade) l -= 1;
  l += lamp ? 1 : 0;
  return Math.max(1, Math.min(4, l));
}

export function lightBad(p: Plant, sill: Sill, t: number, lamp: boolean, dim = false, shade = false): 'hot' | 'dark' | null {
  if (p.stage < 2) return null;
  const s = sp(p.sp);
  const l = lightLevel(sill, p.zone, t, lamp, dim, shade);
  return l > s.light[1] ? 'hot' : l < s.light[0] ? 'dark' : null;
}

export const badLight = (p: Plant, t: number, ctx: Ctx) => lightBad(p, ctx.sill, t, ctx.lamp, ctx.dim || ctx.tulle, ctx.shade);

export function bestZone(spId: string, sill: Sill, t: number, lamp: boolean, dim = false): Plant['zone'] {
  const s = sp(spId);
  const ok = (z: Plant['zone']) => {
    const l = lightLevel(sill, z, t, lamp, dim);
    return l >= s.light[0] && l <= s.light[1];
  };
  const other = s.zone === 'glass' ? 'deep' : 'glass';
  return ok(s.zone) ? s.zone : ok(other) ? other : s.zone;
}

// ─────────── производные ───────────
export const stageMarks = (spId: string): [number, number] => {
  const [a, b] = sp(spId).stageHours;
  return [a, a + b];
};

export function stageFromGrowth(spId: string, growth: number): Stage {
  const [a, b] = stageMarks(spId);
  return growth >= b ? 4 : growth >= a ? 3 : 2;
}

export const rootMs = (p: Plant) => (p.quick ? QUICK_ROOT_MIN : sp(p.sp).rootMin) * MIN;
export const rootsAt = (p: Plant) => (p.rootStart ? p.rootStart + rootMs(p) : null);

export const isThirstySad = (p: Plant) => p.stage >= 2 && p.dryFor > sp(p.sp).drought * 24;
export const isLightSad = (p: Plant) => p.badLightFor >= 20;
export const isSad = (p: Plant) => p.stage >= 2 && (p.health < 60 || isThirstySad(p) || isLightSad(p));

export function cramped(p: Plant, t: number) {
  return p.stage === 4 && !p.bigPot && !!p.adultAt && t - p.adultAt >= sp(p.sp).repotDays * D;
}

export function cutCooldown(p: Plant, t: number) {
  const s = sp(p.sp);
  const k = p.bigPot ? 0.75 : cramped(p, t) ? 1.5 : 1;
  return s.cutHours * H * k;
}

export function cutLeft(p: Plant, t: number) {
  if (!p.lastCut) return 0;
  return Math.max(0, p.lastCut + cutCooldown(p, t) - t);
}

export const canCut = (p: Plant, t: number) => p.stage === 4 && !isSad(p) && cutLeft(p, t) <= 0;

export interface Ctx {
  sill: Sill;
  lamp: boolean;
  neighbor: boolean;
  dim?: boolean;   // пасмурно за окном
  sunny?: boolean; // ясный день
  shade?: boolean; // затеняет большой сосед
  humid?: boolean; // на подоконнике увлажнитель
  repel?: boolean; // рядом взрослая герань — отпугивает вредителей
  tulle?: boolean; // тюль рассеивает прямое солнце у стекла
  radio?: boolean; // радио на подоконнике: под музыку растут чуть быстрее
}

export function growthRate(p: Plant, t: number, ctx: Ctx) {
  if (p.stage < 2) return 0;
  let r = 1;
  if (p.moisture <= 0) r = 0.3;
  const bad = badLight(p, t, ctx);
  if (bad) r *= 0.5;
  else if (ctx.sunny && sp(p.sp).light[1] === 4) r *= 1.15;
  if (p.mistUntil && t < p.mistUntil) r *= 1.5;
  if (p.feedUntil && t < p.feedUntil) r *= 1.5;
  if (p.boostUntil && t < p.boostUntil) r *= 2;
  if (isWinter(t)) r *= 0.75;
  if (p.health < 30) r *= 0.4;
  r *= problemEffect(p).slow;
  if (ctx.humid && sp(p.sp).mist === 'love') r *= 1.1;
  if (ctx.radio) r *= 1.05;
  r = Math.min(r, MAX_GROWTH_MULT);
  return r;
}

/** Когда наступит следующая стадия при текущем темпе (мс), или null. */
export function nextStageAt(p: Plant, t: number, ctx: Ctx): number | null {
  if (p.stage === 0) return rootsAt(p);
  if (p.stage === 1 || p.stage === 4) return null;
  const [a, b] = stageMarks(p.sp);
  const left = (p.stage === 2 ? a : b) - p.growth;
  const r = growthRate(p, t, ctx);
  return r > 0 ? t + (left / r) * H : null;
}

export function stageProgress(p: Plant, t: number): number {
  if (p.stage === 0) {
    const r = rootsAt(p);
    return r && p.rootStart ? Math.min(1, (t - p.rootStart) / (r - p.rootStart)) : 0;
  }
  if (p.stage === 1 || p.stage === 4) return 1;
  const [a, b] = stageMarks(p.sp);
  return p.stage === 2 ? p.growth / a : (p.growth - a) / (b - a);
}

// ─────────── шаг симуляции ───────────
function stepPlant(p: Plant, dtH: number, t: number, ctx: Ctx, ev: SimEvent[]) {
  if (p.stage === 0) {
    const r = rootsAt(p);
    if (r && t >= r) {
      p.stage = 1;
      ev.push({ kind: 'roots', plant: p.id });
    }
    return;
  }
  if (p.stage === 1) return;

  const s = sp(p.sp);
  const winter = isWinter(t);

  if (ctx.neighbor && p.moisture < 0.35) {
    p.moisture = 1;
    ev.push({ kind: 'neighbor', plant: p.id });
  }

  const drain = dtH / (s.waterDays * 24 * (winter ? 1.3 : 1));
  if (p.moisture > 1) p.moisture = Math.max(1, p.moisture - dtH / (p.drain ? 6 : 24));
  else p.moisture = Math.max(0, p.moisture - drain);

  p.dryFor = p.moisture <= 0 ? p.dryFor + dtH : 0;
  const bad = badLight(p, t, ctx);
  p.badLightFor = bad ? p.badLightFor + dtH : 0;

  let dmg = 0;
  let lightDmg = 0;
  if (!ctx.neighbor && p.dryFor > s.drought * 24) dmg += 2 * dtH;
  if (p.moisture > 1) dmg += (s.overwater === 'sensitive' ? 2 : s.overwater === 'normal' ? 0.6 : 0) * (p.drain ? 0.5 : 1) * dtH;
  if (p.badLightFor > 20 && p.health > 50) lightDmg = Math.min(dtH, p.health - 50);
  dmg += problemEffect(p).dmg * dtH;
  if (dmg + lightDmg > 0) p.health = Math.max(0, p.health - dmg - lightDmg);
  else p.health = Math.min(100, p.health + 3 * dtH);
  p.lowestHealth = Math.min(p.lowestHealth, p.health);

  p.growth += growthRate(p, t, ctx) * dtH;

  if (p.health <= 0) {
    // засохло: теряет стадию, но не погибает — его можно выходить
    const [a] = stageMarks(p.sp);
    if (p.stage === 4) p.growth = a;
    else if (p.stage === 3) p.growth = 0;
    else p.growth = Math.max(0, p.growth - 6);
    p.health = 35;
    p.lowestHealth = 0;
    p.blooming = false;
    ev.push({ kind: 'wilt', plant: p.id });
  }

  const st = stageFromGrowth(p.sp, p.growth);
  if (st > p.stage) {
    if (st === 4 && !p.adultAt) p.adultAt = t;
    ev.push({ kind: 'stage', plant: p.id, stage: st });
  }
  if (st === 4 && !p.adultAt) p.adultAt = t;
  p.stage = st;

  // зимний покой для декабриста: осенью в глубине комнаты
  if (s.bloom?.needsRest) {
    if (isRestSeason(t) && p.zone === 'deep' && p.moisture < 0.8) p.rest += dtH;
    if (month(t) === 3) p.rest = 0;
  }

  const wasBlooming = p.blooming;
  p.blooming = canBloom(p, t, ctx);
  if (p.blooming && !wasBlooming) ev.push({ kind: 'bloom', plant: p.id });
}

export function canBloom(p: Plant, t: number, ctx: Ctx) {
  const b = sp(p.sp).bloom;
  if (!b || p.stage !== 4 || p.health < 70 || p.dryFor > 0) return false;
  if (p.problem && (p.problem.kind === 'rot' || p.problem.kind === 'leggy' || p.problem.sev > 0.6)) return false;
  if (badLight(p, t, ctx)) return false;
  if (b.months && !b.months.includes(month(t))) return false;
  if (b.needsRest && p.rest < 7 * 24) return false;
  return true;
}

export const hasLamp = (state: GameState, sill: Sill) => sill.decor.includes('lamp') && (state.owned.lamp ?? 0) > 0;

/** Соседи по ряду: слева и справа. */
export function neighborsOf(state: Pick<GameState, 'plants'>, p: Plant): Plant[] {
  const row = rowSlots(zoneOfSlot(p.slot));
  const i = row.indexOf(p.slot);
  if (i < 0) return [];
  const near = [row[i - 1], row[i + 1]].filter((x) => x !== undefined);
  return state.plants.filter((x) => x.sill === p.sill && x.id !== p.id && near.includes(x.slot));
}

export const hasDecorOn = (state: GameState, sill: Sill, id: string) => sill.decor.includes(id) && (state.owned[id] ?? 0) > 0;

export function ctxFor(state: GameState, p: Plant, t: number): Ctx {
  const sill = state.sills.find((s) => s.id === p.sill) ?? state.sills[0];
  const w = weatherAt(state, t);
  const near = neighborsOf(state, p);
  return {
    sill, lamp: hasLamp(state, sill), neighbor: !!state.neighbor && t < state.neighbor.until, dim: isDim(w), sunny: isSunny(w),
    shade: !SHADY.includes(p.sp) && near.some((n) => SHADY.includes(n.sp) && n.stage === 4),
    humid: hasDecorOn(state, sill, 'humidifier'),
    repel: near.some((n) => n.sp === 'geranium' && n.stage === 4),
    tulle: hasDecorOn(state, sill, 'tulle'),
    radio: hasDecorOn(state, sill, 'radio'),
  };
}

/** Досчитать мир до момента t. Возвращает события для тостов и экрана «Пока тебя не было». */
export function advance(state: GameState, t: number): SimEvent[] {
  const ev: SimEvent[] = [];
  let from = Math.max(state.simAt, t - MAX_CATCHUP);
  if (t <= from) return ev;
  const stepMs = STEP_H * H;
  while (from < t) {
    const dt = Math.min(stepMs, t - from);
    const at = from + dt;
    const step = Math.floor(at / (STEP_H * H));
    const m = month(at);
    for (const p of state.plants) {
      const ctx = ctxFor(state, p, at);
      stepPlant(p, dt / H, at, ctx, ev);
      const bad = badLight(p, at, ctx);
      const k = stepProblem(p, dt / H, at, { month: m, hot: bad === 'hot', dark: bad === 'dark', humid: !!ctx.humid, repel: !!ctx.repel, step });
      if (k) ev.push({ kind: 'problem', plant: p.id, problem: k });
    }
    // проделки кота
    for (const sill of state.sills ?? []) {
      if (!hasDecorOn(state, sill, 'cat')) continue;
      const e = catStep(state.plants.filter((p) => p.sill === sill.id), `${state.createdAt}-${sill.id}`, dt / H, step, hasDecorOn(state, sill, 'catgrass'));
      if (e) ev.push({ kind: 'cat', plant: e.plant, action: e.action });
    }
    // вредители переползают на соседей
    for (const p of state.plants) {
      if (!p.problem) continue;
      for (const n of neighborsOf(state, p)) {
        if (trySpread(p, n, dt / H, at, step)) ev.push({ kind: 'problem', plant: n.id, problem: n.problem!.kind, spread: true });
      }
    }
    from = at;
  }
  state.simAt = t;
  return ev;
}

// ─────────── подсказка «что нужно сейчас» ───────────
export function need(p: Plant, t: number, ctx: Ctx): string {
  const s = sp(p.sp);
  if (p.stage === 0) return p.rootStart ? 'Черенок пускает корни, подожди немного' : 'Налей воды в стакан, и черенок пустит корни';
  if (p.stage === 1) return 'Корни есть! Посади в горшок 🪴';
  if (p.problem) return `${PROBLEMS[p.problem.kind].icon} ${PROBLEMS[p.problem.kind].name}: ${PROBLEMS[p.problem.kind].heal}`;
  const bad = badLight(p, t, ctx);
  if (p.moisture > 1) return 'Перелили 😬 Слей воду из поддона и дай земле просохнуть';
  if (bad === 'hot') return p.zone === 'glass' ? 'Переставь в глубину комнаты: у стекла слишком жарко' : 'Тут жарковато даже в глубине — поставь фитолампу на другое окно';
  if (bad === 'dark') return p.zone === 'deep' ? 'Переставь ближе к стеклу: тут темновато' : 'Темновато даже у стекла — помогла бы фитолампа';
  if (p.moisture <= 0) return 'Полей прямо сейчас, очень хочет пить';
  if (p.moisture < 0.25) return 'Хочет пить, полей сегодня';
  if (cramped(p, t)) return 'Тесно в горшке: пересади в горшок побольше';
  if (p.health < 60) return 'Восстанавливается, нужен ровный уход';
  const thirstIn = (p.moisture - 0.25) * s.waterDays * D * (isWinter(t) ? 1.3 : 1);
  if (thirstIn < 1.5 * D) return `Захочет пить через ${approx(thirstIn)}`;
  if (s.mist === 'love' && !(p.mistUntil && t < p.mistUntil)) return 'Опрыскай — ему понравится 💦';
  if (canCut(p, t)) return 'Можно взять черенок ✂️';
  return 'Всё хорошо 🌿';
}

// ─────────── форматирование ───────────
export const plural = (n: number, a: string, b: string, c: string) => {
  const m = n % 10, h = n % 100;
  return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c;
};

export function fmt(ms: number) {
  ms = Math.max(0, ms);
  if (ms < H) {
    const s = Math.ceil(ms / 1e3);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }
  if (ms < 2 * D) {
    const m = Math.ceil(ms / MIN);
    return Math.floor(m / 60) + ' ч ' + (m % 60) + ' мин';
  }
  const h = Math.round(ms / H);
  return Math.floor(h / 24) + ' дн ' + (h % 24) + ' ч';
}

export function approx(ms: number) {
  const h = Math.max(1, Math.round(ms / H));
  if (h < 20) return `~${h} ч`;
  const d = Math.max(1, Math.round(ms / D));
  return `~${d} ${plural(d, 'день', 'дня', 'дней')}`;
}
