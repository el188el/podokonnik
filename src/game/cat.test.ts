import { describe, expect, it } from 'vitest';
import { CAT_CHEWS, CAT_TOXIC, catStep } from './cat';
import { D, H } from './constants';
import { advance } from './sim';
import { newPlant, newState } from './storage';

const T0 = new Date(2026, 5, 1, 12).getTime();

const pot = (sp: string, i = 0) => newPlant({ sp, sill: 'room', slot: i, zone: 'glass', stage: 3, growth: 50, moisture: 1, health: 100 }, T0);

/** Прогоняем много шагов и собираем, что делал кот. */
function run(plants: ReturnType<typeof pot>[], grass: boolean) {
  const acts: string[] = [];
  for (let step = 0; step < 2000; step++) {
    const e = catStep(plants, 'key', 1, step, grass);
    if (e) acts.push(e.action);
    for (const p of plants) { p.health = 100; p.moisture = 1; }
  }
  return acts;
}

describe('кот Барсик', () => {
  it('ядовитые растения только нюхает', () => {
    const acts = run([pot(CAT_TOXIC[0])], false);
    expect(acts.length).toBeGreaterThan(20);
    expect(new Set(acts)).toEqual(new Set(['sniff']));
  });

  it('хлорофитум чаще всего жуёт', () => {
    const acts = run([pot(CAT_CHEWS[0])], false);
    expect(acts.filter((a) => a === 'chew').length).toBeGreaterThan(acts.length / 2);
  });

  it('кошачья трава почти всегда отвлекает', () => {
    const acts = run([pot(CAT_CHEWS[0])], true);
    expect(acts.filter((a) => a === 'grass').length).toBeGreaterThan(acts.length * 0.7);
  });

  it('проделки примерно раз в полтора дня и не губят растение', () => {
    const acts = run([pot('chlorophytum')], false);
    const perDay = acts.length / (2000 / 24);
    expect(perDay).toBeGreaterThan(0.4);
    expect(perDay).toBeLessThan(1.1);
    const p = pot('chlorophytum');
    for (let step = 0; step < 500; step++) catStep([p], 'k', 1, step, false);
    expect(p.health).toBeGreaterThanOrEqual(10);
  });

  it('без кота на подоконнике никто ничего не жуёт', () => {
    const g = newState(T0);
    const p = pot('chlorophytum');
    p.guardUntil = T0 + 1e12;
    g.plants.push(p);
    const ev: string[] = [];
    for (let t = T0; t <= T0 + 10 * D; t += 12 * H) { for (const e of advance(g, t)) ev.push(e.kind); p.moisture = 1; }
    expect(ev).not.toContain('cat');
  });

  it('кот на подоконнике в симуляции что-нибудь да вытворит за 10 дней', () => {
    const g = newState(T0);
    g.sills[0].decor.push('cat');
    g.owned.cat = 1;
    const p = pot('chlorophytum');
    p.guardUntil = T0 + 1e12;
    g.plants.push(p);
    const ev: string[] = [];
    for (let t = T0; t <= T0 + 10 * D; t += 12 * H) { for (const e of advance(g, t)) ev.push(e.kind); p.moisture = 1; }
    expect(ev).toContain('cat');
  });
});
