import { describe, expect, it } from 'vitest';
import { diagnose } from './diagnose';
import { newPlant, newState } from './storage';

const JAN = new Date(2026, 0, 15, 12).getTime();

function setup(extra = {}) {
  const g = newState(JAN);
  g.level = 10;
  g.sills[0].window = 'E';
  const p = newPlant({ sp: 'monstera', sill: 'room', slot: 0, zone: 'glass', stage: 4, moisture: 0.6, health: 70, ...extra }, JAN);
  g.plants.push(p);
  return { g, p };
}

describe('диагноз здоровья', () => {
  it('засуха — полить и купить влагомер', () => {
    const { g, p } = setup({ moisture: 0, dryFor: 100 });
    const c = diagnose(g, p, JAN).find((x) => x.title === 'Засуха')!;
    expect(c.hurts).toBe(true);
    expect(c.fixes.map((f) => f.kind)).toEqual(['water', 'buy']);
  });

  it('холод у открытой форточки — закрыть, отодвинуть, обогреватель', () => {
    const { g, p } = setup();
    g.sills[0].vent = true;
    const c = diagnose(g, p, JAN).find((x) => x.title === 'Холодно')!;
    expect(c.hurts).toBe(true);
    expect(c.fixes.map((f) => f.kind === 'buy' ? f.item : f.kind)).toEqual(['vent', 'move', 'heater']);
  });

  it('сухой воздух зимой — опрыскать или увлажнитель; купленное не предлагаем', () => {
    const { g, p } = setup();
    expect(diagnose(g, p, JAN).find((x) => x.title === 'Сухой воздух')?.fixes.some((f) => f.kind === 'buy')).toBe(true);
    g.owned.humidifier = 1; g.sills[0].decor.push('humidifier');
    expect(diagnose(g, p, JAN).find((x) => x.title === 'Сухой воздух')).toBeUndefined(); // влажность поднялась
  });

  it('болезнь — средство из магазина', () => {
    const { g, p } = setup({ problem: { kind: 'mite', at: JAN, sev: 0.5 } });
    const c = diagnose(g, p, JAN).find((x) => x.title === 'Паутинный клещ')!;
    expect(c.fixes).toEqual([{ kind: 'cure', item: 'acaricide', label: 'acaricide' }]);
  });
});
