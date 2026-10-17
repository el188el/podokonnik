// Черенки в стаканах на кухне: сколько ещё простоят, за сколько их купит цветочная лавка
// и что можно пустить в компост. Так лишние черенки не копятся без пользы.

import { hueOf } from './breeding';
import { D } from './constants';
import { FORM_BY_ID, tierOfForm } from './products';
import { sp } from './species';
import type { Cutting } from './types';

/** Обычный черенок стоит в воде неделю, редкий — две. Потом засыхает. */
export const CUTTING_LIFE_D = 7;
export const CUTTING_LIFE_RARE_D = 14;

const special = (c: Cutting) => {
  const h = c.hue ? hueOf(c.sp, c.hue) : undefined;
  return !!c.form || !!c.seed || !!h?.rare || !!h?.event;
};
export const cuttingLife = (c: Cutting) => (special(c) ? CUTTING_LIFE_RARE_D : CUTTING_LIFE_D) * D;
/** Сколько ещё простоит в воде, мс (≤ 0 — засох). */
export const cuttingLeft = (c: Cutting, t: number) => c.at + cuttingLife(c) - t;

/** Цена в цветочной лавке: чем капризнее вид и реже форма — тем дороже. */
export function cuttingPrice(c: Cutting): number {
  let n = 3 + 3 * sp(c.sp).difficulty;
  const f = c.form ? FORM_BY_ID[c.form] : undefined;
  if (f) n += [0, 20, 40, 100][tierOfForm(f)];
  const h = c.hue ? hueOf(c.sp, c.hue) : undefined;
  if (h?.rare) n += 10;
  if (h?.event) n += 15;
  if (c.seed) n += 5;
  return n;
}

/** Компост: три обычных черенка → одна подкормка. Редкие в компост не идут. */
export const COMPOST_N = 3;
export const compostable = (list: Cutting[]) => list.filter((c) => !special(c)).sort((a, b) => a.at - b.at);
