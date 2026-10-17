// Симуляция ухода. Всё считается от реального времени шагами по 15 минут,
// поэтому растения честно живут и растут, даже когда игра закрыта.
// Функции здесь чистые относительно входа: меняют только переданные объекты.

import { growthMul } from './liveops';
import { D, H, MAX_GROWTH_MULT, MIN, QUICK_ROOT_MIN, WINDOWS } from './constants';
import { sp } from './species';
import { isDim, isSunny, weatherAt } from './weather';
import { PROBLEMS, problemEffect, SHADY, stepProblem, trySpread } from './problems';
import { rowSlots, zoneOfSlot } from './layout';
import { climateDrying, climateGrowth, climateOf, coldLimit, fussyIssue, zoneTemp } from './climate';
import { CAT_IDS, catStep, type CatAction } from './cat';
import type { GameState, Plant, ProblemKind, Sill, Stage } from './types';

export const STEP_H = 0.25;
const MAX_CATCHUP = 60 * D;

export type SimEvent =
  | { kind: 'roots'; plant: string }
  | { kind: 'stage'; plant: string; stage: Stage }
  | { kind: 'wilt'; plant: string }
  | { kind: 'bloom'; plant: string }
  | { kind: 'neighbor'; plant: string }
  | { kind: 'tight'; plant: string }
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
  if (sill.curtains) l -= zone === 'glass' ? 2 : 1; // задёрнутые шторы
  if (shade) l -= 1;
  // фитолампа добавляет свет, но не жжёт, как прямое солнце: не больше «яркого рассеянного»
  if (lamp && l < 3) l += 1;
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

// ─────────── полив ───────────
/** Выше этой влажности земля уже мокрая: вода уходит в поддон. */
export const WET_FULL = 0.9;
/** Через сколько полив снова приносит опыт и засчитывается в задания. */
export const WATER_REWARD_MS = 3 * H;
/**
 * Полить: подсохшую землю — до 100%, влажную — подлить до краёв (без вреда).
 * Если земля и так мокрая (90%+), лишняя вода стоит в поддоне — это перелив.
 */
export function pour(p: Plant): 'watered' | 'topped' | 'over' {
  const before = p.moisture;
  if (before >= WET_FULL) {
    p.moisture = Math.min(1.4, Math.max(1, before) + 0.25);
    return 'over';
  }
  p.moisture = 1;
  p.dryFor = 0;
  return before < 0.5 ? 'watered' : 'topped';
}

// ─────────── размер горшка ───────────
// Растёт растение — растёт и горшок: росток в S, подросток в M, взрослое в L.
// XL — простор для взрослого: черенки отрастают быстрее. В тесном горшке
// растение грустит и перестаёт расти, пока его не пересадят.
export const POT_SIZE_NAME = ['', 'S', 'M', 'L', 'XL'];
export const POT_SIZE_ITEM = ['', 'pot', 'potM', 'potL', 'potXL'];
export const needSize = (stage: number) => (stage >= 4 ? 3 : stage === 3 ? 2 : 1);
export const potSizeOf = (p: Pick<Plant, 'potSize' | 'bigPot' | 'stage'>) => p.potSize ?? (p.bigPot ? 4 : needSize(p.stage));
/** Горшок мал для этой стадии: рост остановлен до пересадки. */
export const tight = (p: Plant) => p.stage >= 2 && potSizeOf(p) < needSize(p.stage);

export function cramped(p: Plant, t: number) {
  if (tight(p)) return true;
  // взрослое в L со временем хочет простора (XL)
  return p.stage === 4 && potSizeOf(p) === 3 && !!p.adultAt && t - p.adultAt >= sp(p.sp).repotDays * D;
}

export function cutCooldown(p: Plant, t: number) {
  const s = sp(p.sp);
  const k = potSizeOf(p) >= 4 ? 0.75 : cramped(p, t) ? 1.5 : 1;
  return s.cutHours * H * k;
}

export function cutLeft(p: Plant, t: number) {
  if (!p.lastCut) return 0;
  return Math.max(0, p.lastCut + cutCooldown(p, t) - t);
}

export const canCut = (p: Plant, t: number) => p.stage === 4 && !isSad(p) && !tight(p) && cutLeft(p, t) <= 0;

export interface Ctx {
  sill: Sill;
  lamp: boolean;
  neighbor: boolean;
  dim?: boolean;   // пасмурно за окном
  sunny?: boolean; // ясный день
  shade?: boolean; // затеняет большой сосед
  humid?: boolean; // на подоконнике работает увлажнитель
  temp?: number;   // температура воздуха у растения, °C
  rh?: number;     // влажность воздуха, %
  draft?: boolean; // сквозняк из форточки
  bugs?: boolean;  // в открытую форточку летят насекомые
  fan?: boolean;   // работает вентилятор
  newbie?: boolean; // бонус новичка: первые двое суток растут втрое быстрее
  repel?: boolean; // рядом взрослая герань — отпугивает вредителей
  tulle?: boolean; // тюль рассеивает прямое солнце у стекла
  radio?: boolean; // радио на подоконнике: под музыку растут чуть быстрее
  lampGrow?: number; // фитолампа над этим рядом: множитель роста
  live?: number;   // ивент «быстрый рост» из панели: множитель роста
}

/** Бонус новичка: первые двое суток (пока уровень ниже 6) растения растут втрое быстрее. */
export const NEWBIE_MS = 48 * H;
export const NEWBIE_MULT = 3;
export const newbieLeft = (g: Pick<GameState, 'createdAt' | 'level'>, t: number) => (g.level < 6 ? Math.max(0, g.createdAt + NEWBIE_MS - t) : 0);

/** Чем недоволен капризный вид (null — всё хорошо). */
export const fussyOf = (p: Plant, ctx: Ctx) => fussyIssue(sp(p.sp), ctx.temp ?? 22, ctx.rh ?? 45, ctx.draft);

/** Что ускоряет и что тормозит рост прямо сейчас (множители). Из них складывается скорость роста. */
export interface GrowthFactor { id: string; label: string; mul: number }
/** steady — без временных ускорений (опрыскивание): по нему считаем таймер, а ускорение видно, как таймер бежит быстрее. */
export function growthFactors(p: Plant, t: number, ctx: Ctx, steady = false): GrowthFactor[] {
  const out: GrowthFactor[] = [];
  const add = (id: string, label: string, mul: number) => { if (Math.abs(mul - 1) > 0.001) out.push({ id, label, mul }); };
  const s = sp(p.sp);
  if (p.moisture <= 0) add('dry', 'Сухая земля', 0.3);
  const bad = badLight(p, t, ctx);
  if (bad) add('light', bad === 'dark' ? 'Мало света' : 'Слишком яркое солнце', 0.5);
  else if (ctx.sunny && s.light[1] === 4) add('sun', 'Солнечный день', 1.15);
  if (!steady && p.mistUntil && t < p.mistUntil) add('mist', 'Опрыскано', 1.5);
  if (isWinter(t)) add('winter', 'Зима: короткий день', 0.75);
  if (p.health < 30) add('weak', 'Слабое здоровье', 0.4);
  if (p.problem) add('problem', 'Болезнь или вредители', problemEffect(p).slow);
  const temp = ctx.temp ?? 22, rh = ctx.rh ?? 45;
  add('temp', temp < 16 ? 'Прохладно' : 'Жарко', climateGrowth(temp, 50, false));
  if (s.mist === 'love') add('rh', rh < 35 ? 'Сухой воздух' : 'Влажный воздух', climateGrowth(22, rh, true));
  if (fussyOf(p, ctx)) add('fussy', 'Капризничает', 0.5);
  if (ctx.radio) add('radio', 'Радио', 1.05);
  if (ctx.lampGrow) add('lamp', 'Фитолампа', ctx.lampGrow);
  return out;
}

/** Подкормка и стимулятор сразу продвигают рост — на столько часов роста. */
export const FEED_GROW_H = 12;
export const BOOST_GROW_H = 24;
/** Сразу добавить часы роста, будто растение их уже прожило. Возвращает, сколько добавилось. */
export function growNow(p: Plant, hours: number): number {
  if (p.stage < 2 || p.stage >= 4 || tight(p)) return 0;
  const before = p.growth;
  p.growth += hours;
  // из маленького горшка S растение не перерастает сразу во взрослое
  if (potSizeOf(p) <= 1) p.growth = Math.min(p.growth, stageMarks(p.sp)[1] - 0.01);
  return p.growth - before;
}

export function growthRate(p: Plant, t: number, ctx: Ctx, steady = false) {
  if (p.stage < 2) return 0;
  if (tight(p)) return 0; // в тесном горшке не растёт
  let r = growthFactors(p, t, ctx, steady).reduce((r, f) => r * f.mul, 1);
  r = Math.min(r, MAX_GROWTH_MULT);
  if (ctx.live && ctx.live > 1) r *= ctx.live; // ивент «быстрый рост» — поверх обычных ускорений
  if (ctx.newbie) r *= NEWBIE_MULT; // бонус новичка — поверх всех ускорений
  return r;
}

/** Через сколько часов земля пересохнет при нынешнем климате (0 — уже сухая). */
export function dryInHours(p: Plant, t: number, ctx: Ctx) {
  const s = sp(p.sp);
  const perH = climateDrying(ctx.temp ?? 22, ctx.rh ?? 45) / (s.waterDays * 24 * (isWinter(t) ? 1.3 : 1));
  const over = p.moisture > 1 ? (p.moisture - 1) * (p.drain ? 6 : 24) : 0;
  return over + Math.max(0, Math.min(1, p.moisture)) / perH;
}

/** Почему не цветёт (пусто — цветёт или вот-вот зацветёт; null — вид не цветёт). */
export function bloomBlockers(p: Plant, t: number, ctx: Ctx): string[] | null {
  const b = sp(p.sp).bloom;
  if (!b) return null;
  const out: string[] = [];
  if (p.stage !== 4) out.push('ещё не взрослое');
  if (p.health < 70) out.push('здоровье ниже 70%');
  if (p.dryFor > 0) out.push('земля пересохла');
  if (p.problem && (p.problem.kind === 'rot' || p.problem.kind === 'leggy' || p.problem.sev > 0.6)) out.push('мешает болезнь');
  if (badLight(p, t, ctx)) out.push('не тот свет');
  if (fussyOf(p, ctx)) out.push('капризничает — сбрасывает бутоны');
  if (b.months && !b.months.includes(month(t))) out.push('не сезон');
  if (b.needsRest && p.rest < 7 * 24) out.push('нужен зимний покой');
  return out;
}

/** Когда наступит следующая стадия при текущем темпе (мс), или null. */
export function nextStageAt(p: Plant, t: number, ctx: Ctx): number | null {
  if (p.stage === 0) return rootsAt(p);
  if (p.stage === 1 || p.stage === 4) return null;
  const [a, b] = stageMarks(p.sp);
  const left = (p.stage === 2 ? a : b) - p.growth;
  // по обычной скорости: когда растение временно ускорено, таймер просто идёт быстрее, а не прыгает потом назад
  const r = growthRate(p, t, ctx, true);
  return r > 0 ? t + (Math.max(0, left) / r) * H : null;
}

/** Во сколько раз таймер сейчас идёт быстрее обычного (опрыскивание). */
export function timerSpeed(p: Plant, t: number, ctx: Ctx) {
  const base = growthRate(p, t, ctx, true);
  return base > 0 ? growthRate(p, t, ctx) / base : 1;
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
  // соседка наливает воду и в стаканы с черенками
  if (p.stage === 0 && !p.rootStart && ctx.neighbor) {
    p.rootStart = t;
    ev.push({ kind: 'neighbor', plant: p.id });
  }
  if (p.stage === 0) {
    const r = rootsAt(p);
    if (r && t >= r) {
      p.stage = 1;
      ev.push({ kind: 'roots', plant: p.id });
    }
    return;
  }
  if (p.stage === 1) return;
  if (p.potSize == null) p.potSize = p.bigPot ? 4 : needSize(p.stage); // старые сохранения
  // мокрые листья у тех, кого мочить нельзя: пока не высохнут — пятна и риск болезней
  let wetDmg = 0;
  if (p.wetLeaves) {
    if (t - p.wetLeaves >= wetLeavesH(ctx.fan) * H) p.wetLeaves = undefined;
    else { wetDmg = 3 * dtH; p.splashedAt = t; }
  }

  const s = sp(p.sp);
  const winter = isWinter(t);

  // соседка поливает, как только растение захочет пить (как подсвечивается у игрока)
  if (ctx.neighbor && p.moisture < 0.5) {
    p.moisture = 1;
    ev.push({ kind: 'neighbor', plant: p.id });
  }

  const drain = (dtH / (s.waterDays * 24 * (winter ? 1.3 : 1))) * climateDrying(ctx.temp ?? 22, ctx.rh ?? 45);
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
  // капризный вид в неуютных условиях понемногу грустит, но не ниже 60
  if (fussyOf(p, ctx) && p.health > 60) lightDmg += Math.min(0.5 * dtH, p.health - 60);
  dmg += problemEffect(p).dmg * dtH;
  dmg += wetDmg;
  // холод: тропическим ниже 14°, остальным ниже 8° — листья подмерзают
  const cold = coldLimit(p.sp) - (ctx.temp ?? 22);
  if (cold > 0) dmg += Math.min(3, cold * 0.25) * dtH;
  if (dmg + lightDmg > 0) p.health = Math.max(0, p.health - dmg - lightDmg);
  else p.health = Math.min(100, p.health + 3 * dtH);
  p.lowestHealth = Math.min(p.lowestHealth, p.health);

  p.growth += growthRate(p, t, ctx) * dtH;
  // из маленького горшка S растение не перерастает сразу во взрослое
  if (potSizeOf(p) <= 1) p.growth = Math.min(p.growth, stageMarks(p.sp)[1] - 0.01);

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
    if (potSizeOf(p) < needSize(st)) ev.push({ kind: 'tight', plant: p.id });
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
  if (fussyOf(p, ctx)) return false; // капризные сбрасывают бутоны
  if (b.months && !b.months.includes(month(t))) return false;
  if (b.needsRest && p.rest < 7 * 24) return false;
  return true;
}

export const hasLamp = (state: GameState, sill: Sill) => hasDecorOn(state, sill, 'lamp');
/** Бонус фитоламп к росту: оконная светит на верхний ряд (+15%) и немного на столик (+5%),
 *  настольная — на столик (+15%). */
export const LAMP_GROW = 1.15;
export function lampFor(state: GameState, sill: Sill, zone: Plant['zone']): { light: boolean; grow: number } {
  const win = hasLamp(state, sill);
  const table = hasDecorOn(state, sill, 'lamp_table');
  if (zone === 'glass') return { light: win, grow: win ? LAMP_GROW : 1 };
  return { light: win || table, grow: table ? LAMP_GROW : win ? 1.05 : 1 };
}

/** Сколько сохнут листья после опрыскивания (ч): с вентилятором — быстро. */
export const wetLeavesH = (fan?: boolean) => (fan ? 0.5 : 3);

/** Соседи по ряду: слева и справа. */
export function neighborsOf(state: Pick<GameState, 'plants'>, p: Plant): Plant[] {
  const row = rowSlots(zoneOfSlot(p.slot));
  const i = row.indexOf(p.slot);
  if (i < 0) return [];
  const near = [row[i - 1], row[i + 1]].filter((x) => x !== undefined);
  return state.plants.filter((x) => x.sill === p.sill && x.id !== p.id && near.includes(x.slot));
}

/** Предмет стоит на подоконнике, куплен и не выключен. */
export const hasDecorOn = (state: GameState, sill: Sill, id: string) => sill.decor.includes(id) && (state.owned[id] ?? 0) > 0 && !sill.off?.includes(id);

export function ctxFor(state: GameState, p: Plant, t: number): Ctx {
  const sill = state.sills.find((s) => s.id === p.sill) ?? state.sills[0];
  const w = weatherAt(state, t);
  const near = neighborsOf(state, p);
  return {
    sill, lamp: lampFor(state, sill, p.zone).light, lampGrow: lampFor(state, sill, p.zone).grow, neighbor: !!state.neighbor && t < state.neighbor.until, dim: isDim(w), sunny: isSunny(w),
    shade: !SHADY.includes(p.sp) && near.some((n) => SHADY.includes(n.sp) && n.stage === 4),
    humid: hasDecorOn(state, sill, 'humidifier'),
    ...(() => {
      const c = climateOf(state, sill, t);
      return { temp: zoneTemp(c, p.zone), rh: c.rh, draft: c.draft && p.zone === 'glass', bugs: c.bugs, fan: hasDecorOn(state, sill, 'fan') };
    })(),
    repel: near.some((n) => n.sp === 'geranium' && n.stage === 4),
    tulle: hasDecorOn(state, sill, 'tulle'),
    newbie: newbieLeft(state, t) > 0,
    radio: hasDecorOn(state, sill, 'radio'),
    live: growthMul(t),
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
      const k = stepProblem(p, dt / H, at, { month: m, hot: bad === 'hot', dark: bad === 'dark', rh: ctx.rh ?? 45, temp: ctx.temp ?? 22, bugs: !!ctx.bugs, fan: !!ctx.fan, repel: !!ctx.repel, step });
      if (k) ev.push({ kind: 'problem', plant: p.id, problem: k });
    }
    // проделки кота
    for (const sill of state.sills ?? []) {
      if (!CAT_IDS.some((c) => hasDecorOn(state, sill, c))) continue;
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
