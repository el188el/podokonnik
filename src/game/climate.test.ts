import { describe, expect, it } from 'vitest';
import { climateOf, zoneTemp } from './climate';
import { H } from './constants';
import { advance } from './sim';
import { newPlant, newState } from './storage';

const JAN = new Date(2026, 0, 15, 12).getTime();
const JUL = new Date(2026, 6, 15, 12).getTime();

function room(t: number) {
  const g = newState(t);
  g.sills[0].window = 'E';
  return g;
}

describe('климат комнаты', () => {
  it('зимой батареи греют и сушат воздух', () => {
    const g = room(JAN);
    const c = climateOf(g, g.sills[0], JAN);
    expect(c.heating).toBe(true);
    expect(c.temp).toBeGreaterThan(22);
    expect(c.rh).toBeLessThan(35);
  });

  it('форточка зимой — холодно у стекла и сквозняк', () => {
    const g = room(JAN);
    g.sills[0].vent = true;
    const c = climateOf(g, g.sills[0], JAN);
    expect(c.draft).toBe(true);
    expect(zoneTemp(c, 'glass')).toBeLessThan(12);
    expect(zoneTemp(c, 'deep')).toBeGreaterThan(zoneTemp(c, 'glass'));
  });

  it('обогреватель греет, увлажнитель увлажняет', () => {
    const g = room(JAN);
    const base = climateOf(g, g.sills[0], JAN);
    g.owned.heater = 1; g.owned.humidifier = 1;
    g.sills[0].decor.push('heater', 'humidifier');
    const c = climateOf(g, g.sills[0], JAN);
    expect(c.temp).toBeCloseTo(base.temp + 4, 0);
    expect(c.rh).toBeGreaterThan(base.rh + 10);
  });

  it('летом в открытую форточку летят насекомые, с сеткой — нет', () => {
    const g = room(JUL);
    g.sills[0].vent = true;
    expect(climateOf(g, g.sills[0], JUL).bugs).toBe(true);
    g.owned.net = 1; g.sills[0].decor.push('net');
    expect(climateOf(g, g.sills[0], JUL).bugs).toBe(false);
  });

  it('тропическое у открытой зимой форточки переохлаждается, в тепле отходит', () => {
    const g = room(JAN);
    const p = newPlant({ sp: 'monstera', sill: 'room', slot: 0, zone: 'glass', stage: 4, growth: 9999, moisture: 1, plantedAt: JAN, rootStart: JAN, guardUntil: JAN + 1e12 }, JAN);
    g.plants.push(p);
    g.simAt = JAN;
    g.sills[0].vent = true;
    advance(g, JAN + 12 * H);
    expect(p.problem?.kind).toBe('cold');
    expect(p.health).toBeLessThan(100);
    g.sills[0].vent = false;
    for (let h = 12; h <= 12 + 30; h += 6) { advance(g, JAN + h * H); p.moisture = 1; }
    expect(p.problem).toBeUndefined();
  });

  it('шторы убирают свет у стекла', () => {
    const g = room(JUL);
    g.sills[0].window = 'S';
    const p = newPlant({ sp: 'violet', sill: 'room', slot: 0, zone: 'glass', stage: 4, growth: 9999, moisture: 1, guardUntil: JUL + 1e12 }, JUL);
    g.plants.push(p);
    g.simAt = JUL;
    g.owned.curtains = 1; g.sills[0].decor.push('curtains'); g.sills[0].curtains = true;
    advance(g, JUL + 12 * H);
    expect(p.problem?.kind).not.toBe('burn');
  });
});
