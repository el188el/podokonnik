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

  it('пересадка в горшок побольше, подкормка и лечение из своего инвентаря', () => {
    const c = newCoop('Наш', 'E', T0);
    coopAct(c, { kind: 'plant', slot: 0, cutting: { sp: 'tradescantia' } }, 'Аня', T0, 'p1');
    coopAct(c, { kind: 'water', plant: 'p1' }, 'Аня', T0);
    coopAct(c, { kind: 'pot', plant: 'p1' }, 'Аня', T0 + 3 * MIN);
    const p = c.plants[0];
    p.stage = 3; p.potSize = 1;
    expect(coopAct(c, { kind: 'repot', plant: 'p1' }, 'Миша', T0 + 4 * MIN)).toMatchObject({ ok: true, effect: 'repotted', size: 2 });
    expect(c.plants[0].potSize).toBe(2);
    expect(coopAct(c, { kind: 'use', plant: 'p1', item: 'feed' }, 'Аня', T0 + 5 * MIN)).toMatchObject({ ok: true, item: 'feed' });
    expect(coopAct(c, { kind: 'use', plant: 'p1', item: 'feed' }, 'Аня', T0 + 6 * MIN)).toEqual({ ok: false, reason: 'no_need' });
    c.plants[0].problem = { kind: 'mite', at: T0, sev: 0.5 };
    expect(coopAct(c, { kind: 'use', plant: 'p1', item: 'traps' }, 'Аня', T0 + 7 * MIN)).toEqual({ ok: false, reason: 'no_need' });
    expect(coopAct(c, { kind: 'use', plant: 'p1', item: 'acaricide' }, 'Аня', T0 + 8 * MIN)).toMatchObject({ ok: true });
    expect(c.plants[0].problem).toBeUndefined();
    expect(cleanAction({ kind: 'use', plant: 'p1', item: 'gold' })).toBeNull();
    expect(cleanAction({ kind: 'repot', plant: 'p1' })).toEqual({ kind: 'repot', plant: 'p1' });
  });
});

describe('общий подоконник — те же правила, что и дома', () => {
  const potted = (c: ReturnType<typeof newCoop>, id: string, sp: string, slot: number) => {
    // сразу в горшке: укоренение проверено выше, тут важны правила ухода
    coopAct(c, { kind: 'plant', slot, cutting: { sp } }, 'Аня', T0, id);
    Object.assign(c.plants.find((p) => p.id === id)!, { stage: 2, potSize: 1, moisture: 0.8 });
  };

  it('пол: большие — только на пол, на пол — только большие', () => {
    const c = newCoop('Наш', 'E', T0);
    expect(coopAct(c, { kind: 'plant', slot: 0, cutting: { sp: 'palm' } }, 'Аня', T0, 'b1')).toEqual({ ok: false, reason: 'bad' });
    expect(coopAct(c, { kind: 'plant', slot: 11, cutting: { sp: 'aloe' } }, 'Аня', T0, 'a1')).toEqual({ ok: false, reason: 'bad' });
    expect(coopAct(c, { kind: 'plant', slot: 11, cutting: { sp: 'palm' } }, 'Аня', T0, 'b1').ok).toBe(true);
    expect(coopAct(c, { kind: 'move', plant: 'b1', slot: 0 }, 'Аня', T0)).toEqual({ ok: false, reason: 'bad' });
  });

  it('опрыскать «нелюбителя» можно только настояв — и листья мокрые, их протирают', () => {
    const c = newCoop('Наш', 'E', T0);
    potted(c, 's1', 'sansevieria', 1);
    const t = T0 + MIN;
    expect(coopAct(c, { kind: 'mist', plant: 's1' }, 'Миша', t)).toEqual({ ok: false, reason: 'no_mist' });
    expect(coopAct(c, { kind: 'mist', plant: 's1', insist: true }, 'Миша', t)).toMatchObject({ ok: true, effect: 'wetted' });
    expect(c.plants[0].wetLeaves).toBe(t);
    expect(coopAct(c, { kind: 'wipe', plant: 's1' }, 'Аня', t + MIN)).toMatchObject({ ok: true, effect: 'wiped' });
    expect(c.plants[0].wetLeaves).toBeUndefined();
  });

  it('брызги попадают на соседа, которого нельзя мочить', () => {
    const c = newCoop('Наш', 'E', T0);
    potted(c, 'h1', 'chlorophytum', 0);
    potted(c, 's1', 'sansevieria', 1);
    const r = coopAct(c, { kind: 'mist', plant: 'h1' }, 'Аня', T0 + MIN);
    expect(r).toMatchObject({ ok: true, effect: 'misted', splashed: ['s1'] });
    expect(c.plants.find((p) => p.id === 's1')!.wetLeaves).toBeDefined();
  });

  it('Корневин — черенку в стакане, дизайн горшка и имя — как дома', () => {
    const c = newCoop('Наш', 'E', T0);
    coopAct(c, { kind: 'plant', slot: 0, cutting: { sp: 'tradescantia' } }, 'Аня', T0, 'p1');
    expect(coopAct(c, { kind: 'use', plant: 'p1', item: 'kornevin' }, 'Аня', T0)).toMatchObject({ ok: true, item: 'kornevin' });
    expect(c.plants[0].rootBoost).toBe(true);
    expect(coopAct(c, { kind: 'use', plant: 'p1', item: 'kornevin' }, 'Аня', T0)).toEqual({ ok: false, reason: 'no_need' });
    coopAct(c, { kind: 'design', plant: 'p1', pot: 'pink', shape: 'nope' }, 'Аня', T0);
    expect(c.plants[0].pot).toBe('pink');
    coopAct(c, { kind: 'nick', plant: 'p1', nick: '  Зебра ' }, 'Аня', T0);
    expect(c.plants[0].nick).toBe('Зебра');
  });

  it('сервер принимает новые действия и отбрасывает мусор', () => {
    expect(cleanAction({ kind: 'mist', plant: 'x', insist: true })).toEqual({ kind: 'mist', plant: 'x', insist: true });
    expect(cleanAction({ kind: 'wipe', plant: 'x' })).toEqual({ kind: 'wipe', plant: 'x' });
    expect(cleanAction({ kind: 'tray', plant: 'x' })).toEqual({ kind: 'tray', plant: 'x' });
    expect(cleanAction({ kind: 'repot', plant: 'x', size: 3 })).toEqual({ kind: 'repot', plant: 'x', size: 3 });
    expect(cleanAction({ kind: 'repot', plant: 'x', size: 9 })).toEqual({ kind: 'repot', plant: 'x' });
    expect(cleanAction({ kind: 'use', plant: 'x', item: 'bloomfeed' })).toMatchObject({ item: 'bloomfeed' });
    expect(cleanAction({ kind: 'use', plant: 'x', item: 'leaves' })).toBeNull();
    expect(cleanAction({ kind: 'nick', plant: 'x', nick: 'а'.repeat(50) })).toEqual({ kind: 'nick', plant: 'x', nick: 'а'.repeat(20) });
  });
});
