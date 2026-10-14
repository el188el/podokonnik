import { describe, expect, it } from 'vitest';
import { CAUSES, SYMPTOMS, diagnose } from './doctor';

describe('цветочный доктор', () => {
  it('у каждого симптома есть известные причины', () => {
    for (const s of SYMPTOMS) for (const c of Object.keys(s.causes)) expect(CAUSES[c], `${s.id} → ${c}`).toBeTruthy();
  });

  it('суккулент желтеет — скорее всего перелив', () => {
    expect(diagnose('yellow_lower', 'sansevieria', 6).list[0].cause.id).toBe('overwater');
  });

  it('сухие кончики зимой у тропических — сухой воздух', () => {
    const d = diagnose('brown_tips', 'spathiphyllum', 12);
    expect(d.list[0].cause.id).toBe('dry_air');
    expect(d.special).toContain('сухого воздуха');
  });

  it('декабрист не цветёт — нужен покой', () => {
    expect(diagnose('no_bloom', 'decembrist', 11).list[0].cause.id).toBe('rest');
  });

  it('без вида — общие веса, первая причина помечена «чаще всего»', () => {
    const d = diagnose('wilting', null, 6);
    expect(d.list[0].label).toBe('чаще всего');
    expect(d.list[0].cause.id).toBe('underwater');
  });
});
