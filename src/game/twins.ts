// Двойники настоящих растений: стадия по числу поливов и снимки «было/стало».

import { D } from './constants';
import type { Twin } from './types';

export const twinStage = (t: Twin) => (t.waters < 3 ? 2 : t.waters < 10 ? 3 : 4);

export const MAX_PHOTOS = 12;
export const PHOTO_AGAIN = 30 * D; // через месяц — снова сфотографировать

/** Награда за снимок: первый +10, раз в месяц (25+ дней с прошлого) +20. */
export function photoReward(tw: Twin, t: number): number {
  const list = tw.photos ?? [];
  if (!list.length) return 10;
  return t - list[list.length - 1].at >= 25 * D ? 20 : 0;
}

/** Добавить снимок; первый (точка «было») храним всегда. Возвращает id вытесненного. */
export function pushPhoto(tw: Twin, id: string, at: number): string | null {
  const list = [...(tw.photos ?? []), { id, at }];
  let dropped: string | null = null;
  if (list.length > MAX_PHOTOS) dropped = list.splice(1, 1)[0].id;
  tw.photos = list;
  return dropped;
}

/** Пора ли сделать новый снимок, чтобы было что сравнить. */
export const photoDue = (tw: Twin, t: number) => !!tw.photos?.length && t - tw.photos[tw.photos.length - 1].at >= PHOTO_AGAIN;
