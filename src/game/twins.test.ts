import { describe, expect, it } from 'vitest';
import { D } from './constants';
import { MAX_PHOTOS, photoDue, photoReward, pushPhoto } from './twins';
import type { Twin } from './types';

const T0 = new Date(2026, 5, 1, 12).getTime();
const twin = (): Twin => ({ id: 't1', sp: 'monstera', nick: 'Моня', every: 7, createdAt: T0, waters: 0, streak: 0, notify: true });

describe('фото двойника', () => {
  it('награда: первое фото и раз в месяц', () => {
    const tw = twin();
    expect(photoReward(tw, T0)).toBe(10);
    pushPhoto(tw, 'a', T0);
    expect(photoReward(tw, T0 + D)).toBe(0);
    expect(photoReward(tw, T0 + 26 * D)).toBe(20);
  });

  it('напоминает сфотографировать через месяц', () => {
    const tw = twin();
    expect(photoDue(tw, T0)).toBe(false);
    pushPhoto(tw, 'a', T0);
    expect(photoDue(tw, T0 + 29 * D)).toBe(false);
    expect(photoDue(tw, T0 + 30 * D)).toBe(true);
  });

  it('первое фото («было») не вытесняется', () => {
    const tw = twin();
    for (let i = 0; i < MAX_PHOTOS; i++) expect(pushPhoto(tw, 'p' + i, T0 + i * D)).toBeNull();
    expect(pushPhoto(tw, 'new', T0 + 99 * D)).toBe('p1');
    expect(tw.photos!.length).toBe(MAX_PHOTOS);
    expect(tw.photos![0].id).toBe('p0');
    expect(tw.photos!.at(-1)!.id).toBe('new');
  });
});
