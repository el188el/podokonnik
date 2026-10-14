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

describe('совет дня', () => {
  it('каждый день новый и не пустой', async () => {
    const { dailyTip } = await import('./tips');
    const seen = new Set<string>();
    for (let d = 0; d < 21; d++) {
      const tip = dailyTip(Date.UTC(2026, 9, 1 + d, 7));
      expect(tip.text.length).toBeGreaterThan(20);
      seen.add(tip.title + tip.text);
    }
    expect(seen.size).toBe(21);
  });
});
