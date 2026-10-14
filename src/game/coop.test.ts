import { describe, expect, it } from 'vitest';
import { D, MIN } from './constants';
import { cleanAction, coopAct, coopThirsty, newCoop } from './coop';

const T0 = new Date(2026, 5, 1, 12).getTime();

describe('совместный подоконник', () => {
  it('черенок → корни → горшок → полив, и видно, кто полил', () => {
    const c = newCoop('Наш', 'E', T0);
    expect(coopAct(c, { kind: 'plant', slot: 0, cutting: { sp: 'tradescantia' } }, 'Аня', T0, 'p1').ok).toBe(true);
    expect(coopAct(c, { kind: 'plant', slot: 0, cutting: { sp: 'violet' } }, 'Миша', T0, 'p2')).toEqual({ ok: false, reason: 'busy' });
    expect(coopAct(c, { kind: 'water', plant: 'p1' }, 'Миша', T0)).toMatchObject({ effect: 'rooting' });
    coopAct(c, { kind: 'pot', plant: 'p1' }, 'Аня', T0 + 3 * MIN);
    expect(c.plants[0].stage).toBe(2);
    expect(coopAct(c, { kind: 'water', plant: 'p1' }, 'Миша', T0 + 4 * MIN)).toEqual({ ok: false, reason: 'enough' });
    coopAct(c, { kind: 'move', plant: 'p1', slot: 4 }, 'Аня', T0 + 5 * MIN);
    expect(c.plants[0].zone).toBe('deep');
    expect(coopThirsty(c)).toBe(0);
    const later = T0 + 3 * D;
    expect(coopAct(c, { kind: 'water', plant: 'p1' }, 'Миша', later)).toMatchObject({ ok: true, effect: 'watered' });
    expect(c.plants[0].waterBy).toEqual({ name: 'Миша', at: later });
    expect(c.log[0]).toMatchObject({ who: 'Миша', text: 'полил(а) традесканцию' });
  });

  it('растения растут и без игроков', () => {
    const c = newCoop('Наш', 'E', T0);
    coopAct(c, { kind: 'plant', slot: 0, cutting: { sp: 'tradescantia' } }, 'Аня', T0, 'p1');
    coopAct(c, { kind: 'water', plant: 'p1' }, 'Аня', T0);
    coopAct(c, { kind: 'pot', plant: 'p1' }, 'Аня', T0 + 3 * MIN);
    coopAct(c, { kind: 'window', side: 'E' }, 'Аня', T0 + 2 * D);
    expect(c.plants[0].stage).toBeGreaterThanOrEqual(3);
  });

  it('проверяет действия из запроса', () => {
    expect(cleanAction({ kind: 'water', plant: 'abc', insist: true })).toEqual({ kind: 'water', plant: 'abc', insist: true });
    expect(cleanAction({ kind: 'plant', slot: 1, cutting: { sp: 'nope' } })).toBeNull();
    expect(cleanAction({ kind: 'plant', slot: 1, cutting: { sp: 'violet', hue: 'pink', form: 'bad' } })).toEqual({ kind: 'plant', slot: 1, cutting: { sp: 'violet', hue: 'pink' } });
    expect(cleanAction({ kind: 'window', side: 'X' })).toBeNull();
    expect(cleanAction({ kind: 'hack' })).toBeNull();
  });
});
