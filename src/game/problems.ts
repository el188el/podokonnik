// Проблемы растений — как в жизни: от перелива гниют корни и заводятся мошки,
// в отопительный сезон нападает паутинный клещ, весной и летом — тля,
// на ярком солнце бывают ожоги, а в темноте растение вытягивается.
// Вредители переползают на соседей; герань их отпугивает. Лечатся средствами из магазина.
// Файл общий для игры и сервера: решения принимаются детерминированно (по id и времени).

import { H } from './constants';
import { sp } from './species';
import { coldLimit } from './climate';
import type { Plant, ProblemKind } from './types';

export type { ProblemKind };

export interface ProblemInfo {
  kind: ProblemKind;
  icon: string;
  name: string;
  short: string;     // для пузыря над горшком
  sign: string;      // как выглядит
  cause: string;     // откуда взялось
  cure?: string;     // чем лечить (id товара)
  heal: string;      // что делать
  pest?: boolean;    // переползает на соседей
  dmg: number;       // урон здоровью в час (при полной силе)
  slow: number;      // множитель роста
}

export const PROBLEMS: Record<ProblemKind, ProblemInfo> = {
  rot: {
    kind: 'rot', icon: '🦠', name: 'Корневая гниль', short: 'Гниют корни!',
    sign: 'Листья вянут при мокрой земле, у основания стебель темнеет.', cause: 'Земля слишком долго была мокрой — корни задыхаются.',
    cure: 'fungicide', heal: 'Пролей Фитоспорином и не поливай, пока земля не просохнет.', dmg: 1.2, slow: 0.3,
  },
  gnats: {
    kind: 'gnats', icon: '🦟', name: 'Грибные мошки', short: 'Мошки!',
    sign: 'Над землёй вьются мелкие чёрные мушки.', cause: 'Земля постоянно сырая — мошкам раздолье.',
    cure: 'traps', heal: 'Повесь жёлтые ловушки и дай земле хорошо просохнуть — мошки уйдут сами.', pest: true, dmg: 0.15, slow: 0.9,
  },
  mite: {
    kind: 'mite', icon: '🕷', name: 'Паутинный клещ', short: 'Клещ!',
    sign: 'Мелкие светлые точки на листьях и тонкая паутинка.', cause: 'Сухой воздух от батарей — любимые условия клеща.',
    cure: 'acaricide', heal: 'Обработай Фитовермом и чаще опрыскивай — клещ не любит влажность.', pest: true, dmg: 0.5, slow: 0.6,
  },
  aphid: {
    kind: 'aphid', icon: '🐛', name: 'Тля', short: 'Тля!',
    sign: 'Зелёные колонии на молодых побегах и бутонах, листья липкие.', cause: 'Весной и летом тля прилетает с улицы через форточку.',
    cure: 'soap', heal: 'Протри мыльным раствором или обработай Фитовермом.', pest: true, dmg: 0.4, slow: 0.7,
  },
  mealybug: {
    kind: 'mealybug', icon: '🐑', name: 'Мучнистый червец', short: 'Червец!',
    sign: 'Белые комочки, похожие на вату, в пазухах листьев.', cause: 'Чаще всего приезжает с новым растением из магазина.',
    cure: 'acaricide', heal: 'Сними комочки и обработай Фитовермом.', pest: true, dmg: 0.3, slow: 0.7,
  },
  mildew: {
    kind: 'mildew', icon: '🌫', name: 'Мучнистая роса', short: 'Белый налёт',
    sign: 'Белый мучнистый налёт на листьях.', cause: 'Прохлада, сырость и вода на листьях.',
    cure: 'fungicide', heal: 'Обработай Фитоспорином, не мочи листья.', dmg: 0.3, slow: 0.7,
  },
  cold: {
    kind: 'cold', icon: '🥶', name: 'Переохлаждение', short: 'Холодно!',
    sign: 'Листья темнеют и обвисают, будто ошпаренные.', cause: 'Сквозняк из форточки или холодное стекло зимой. Тропические растения мёрзнут уже ниже 14°.',
    heal: 'Закрой форточку, отодвинь от стекла или включи обогреватель — в тепле за сутки отойдёт.', dmg: 0.5, slow: 0.5,
  },
  burn: {
    kind: 'burn', icon: '🔥', name: 'Солнечный ожог', short: 'Ожог',
    sign: 'Бурые сухие пятна на листьях со стороны окна.', cause: 'Прямое солнце для растения, которое его не любит.',
    heal: 'Отодвинь от стекла. Через пару дней в тени ожог перестанет расти.', dmg: 0, slow: 0.7,
  },
  leggy: {
    kind: 'leggy', icon: '📏', name: 'Вытягивается', short: 'Тянется к свету',
    sign: 'Длинные тонкие стебли, мелкие бледные листья.', cause: 'Несколько дней без нужного света.',
    heal: 'Поставь ближе к свету или включи фитолампу — за 3 дня придёт в норму.', dmg: 0, slow: 0.6,
  },
};

/** Средства ухода в магазине. */
export const CURES: Record<string, ProblemKind[]> = {
  soap: ['aphid'],
  acaricide: ['mite', 'aphid', 'mealybug'],
  traps: ['gnats'],
  fungicide: ['rot', 'mildew'],
  soil: ['rot', 'gnats'], // пересадка в свежий сухой грунт: гнилые корни обрезаны, личинки мошек выброшены с землёй
};

export const cureFor = (k: ProblemKind) => Object.entries(CURES).filter(([, ks]) => ks.includes(k)).map(([id]) => id);

/** После лечения — неделя защиты от новых вредителей. */
export const GUARD_MS = 7 * 24 * H;

const APHID_PRONE = ['hibiscus', 'geranium', 'coleus', 'begonia', 'citrus', 'violet', 'kalanchoe', 'cyclamen', 'poinsettia', 'fern'];
const MEALY_PRONE = ['crassula', 'aloe', 'cactus', 'orchid', 'citrus', 'hoya', 'peperomia'];
const MILDEW_PRONE = ['begonia', 'violet', 'kalanchoe', 'cyclamen', 'geranium'];

/** Детерминированное «случайное» число 0…1 для растения, вида проблемы и шага времени. */
export function roll(id: string, salt: string, step: number): number {
  let h = 2166136261;
  for (const c of `${id}|${salt}|${step}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export interface ProblemCtx {
  month: number;          // 1–12
  hot: boolean;           // сейчас слишком много света
  dark: boolean;          // слишком мало света
  rh: number;             // влажность воздуха, %
  temp: number;           // температура у растения, °C
  bugs: boolean;          // открыта форточка без москитной сетки
  fan: boolean;           // вентилятор проветривает
  repel: boolean;         // рядом взрослая герань
  step: number;           // номер шага симуляции
}

/** Шансы заболеть в сутки при нынешних условиях. */
function dailyChances(p: Plant, c: ProblemCtx, t: number): Partial<Record<ProblemKind, number>> {
  const s = sp(p.sp);
  const out: Partial<Record<ProblemKind, number>> = {};
  const wetLimit = (s.overwater === 'sensitive' ? 12 : s.overwater === 'normal' ? 36 : 72) * (p.drain ? 1.5 : 1) / (c.rh > 70 ? 1.3 : 1);
  if ((p.wetFor ?? 0) > wetLimit) out.rot = 0.3;
  if (p.moisture > 0.85) out.gnats = (p.moisture > 1 ? 0.12 : 0.05) * (p.drain ? 0.5 : 1) * (c.fan ? 0.6 : 1);
  // паутинный клещ любит сухой воздух (зимой батареи сушат его до 25–30%)
  if (c.rh < 40) {
    let m = c.rh < 30 ? 0.03 : 0.02;
    if (s.mist === 'love' && !(p.mistUntil && p.mistUntil > t - 48 * H)) m *= 2; // не опрыскивали 2–3 дня
    out.mite = m;
  }
  if (c.month >= 4 && c.month <= 9 && APHID_PRONE.includes(p.sp)) out.aphid = 0.03;
  if (c.bugs) out.aphid = (out.aphid ?? 0.01) * 2.5; // тля и прочие летят в открытую форточку
  if (MEALY_PRONE.includes(p.sp)) out.mealybug = 0.005;
  const coolDamp = c.rh > 65 && c.temp < 18;
  if (((c.month >= 11 || c.month <= 3) || coolDamp) && MILDEW_PRONE.includes(p.sp)) out.mildew = (p.splashedAt && t - p.splashedAt < 72 * H ? 0.05 : 0.012) * (coolDamp ? 2 : 1) * (c.fan ? 0.7 : 1);
  if (c.repel) for (const k of ['mite', 'aphid', 'mealybug', 'gnats'] as ProblemKind[]) if (out[k]) out[k]! *= 0.5;
  return out;
}

/**
 * Один шаг для проблем растения. Возвращает новую проблему, если она появилась.
 * Ожоги и вытягивание — от условий, вредители и болезни — с шансом.
 */
export function stepProblem(p: Plant, dtH: number, t: number, c: ProblemCtx): ProblemKind | null {
  if (p.stage < 2) return null;
  p.wetFor = p.moisture > 1 ? (p.wetFor ?? 0) + dtH : 0;
  p.hotFor = c.hot ? (p.hotFor ?? 0) + dtH : 0;
  p.darkFor = c.dark ? (p.darkFor ?? 0) + dtH : 0;
  p.goodFor = !c.hot && !c.dark ? (p.goodFor ?? 0) + dtH : 0;
  const cold = c.temp < coldLimit(p.sp);
  p.coldFor = cold ? (p.coldFor ?? 0) + dtH : 0;
  p.warmFor = c.temp >= coldLimit(p.sp) + 2 ? (p.warmFor ?? 0) + dtH : 0;

  const cur = p.problem;
  if (cur) {
    cur.sev = Math.min(1, cur.sev + dtH / 72); // за 3 дня без лечения — в полную силу
    // сами проходят: ожог и вытягивание — в хороших условиях, мошки — в сухой земле
    if ((cur.kind === 'burn' || cur.kind === 'leggy') && (p.goodFor ?? 0) >= 48) p.problem = undefined;
    if (cur.kind === 'gnats' && p.moisture < 0.25 && t - cur.at > 48 * H) p.problem = undefined;
    if (cur.kind === 'cold' && (p.warmFor ?? 0) >= 24) p.problem = undefined;
    return null;
  }
  if ((p.coldFor ?? 0) > 6) return start(p, 'cold', t);
  if ((p.hotFor ?? 0) > 8) return start(p, 'burn', t);
  if ((p.darkFor ?? 0) > 72) return start(p, 'leggy', t);
  if (p.guardUntil && t < p.guardUntil) return null;
  for (const [k, perDay] of Object.entries(dailyChances(p, c, t)) as [ProblemKind, number][]) {
    if (roll(p.id, k, c.step) < perDay * (dtH / 24)) return start(p, k, t);
  }
  return null;
}

function start(p: Plant, kind: ProblemKind, t: number): ProblemKind {
  p.problem = { kind, at: t, sev: 0.2 };
  return kind;
}

/** Вредитель переползает на соседа: шанс в сутки. */
export const SPREAD_PER_DAY = 0.15;

export function trySpread(from: Plant, to: Plant, dtH: number, t: number, step: number): boolean {
  const k = from.problem?.kind;
  if (!k || !PROBLEMS[k].pest || to.problem || to.stage < 2 || (to.guardUntil && t < to.guardUntil)) return false;
  if (roll(to.id, 'spread-' + k, step) >= SPREAD_PER_DAY * (from.problem!.sev) * (dtH / 24)) return false;
  start(to, k, t);
  return true;
}

/** Урон и замедление от текущей проблемы. */
export function problemEffect(p: Plant): { dmg: number; slow: number } {
  if (!p.problem) return { dmg: 0, slow: 1 };
  const info = PROBLEMS[p.problem.kind];
  return { dmg: info.dmg * (0.4 + 0.6 * p.problem.sev), slow: info.slow };
}

/** Большие взрослые растения затеняют соседей по ряду. */
export const SHADY = ['monstera', 'ficus', 'citrus', 'dracaena', 'hibiscus', 'poinsettia'];
