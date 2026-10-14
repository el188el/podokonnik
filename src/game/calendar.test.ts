import { describe, expect, it } from 'vitest';
import { careTasks, monthHeadline } from './calendar';

describe('календарь ухода', () => {
  it('в каждом месяце есть общие дела', () => {
    for (let m = 1; m <= 12; m++) expect(careTasks(m, []).length).toBeGreaterThanOrEqual(2);
  });
  it('особые дела для своих видов, без повторов', () => {
    const t = careTasks(9, ['decembrist', 'decembrist', 'violet']);
    expect(t.filter((x) => x.sp === 'decembrist')).toHaveLength(1);
    expect(monthHeadline(9, ['decembrist'])).toContain('Декабрист');
  });
});
