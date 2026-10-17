import { describe, expect, it } from 'vitest';
import { newState, upgrade } from './storage';

describe('предметы по комнатам', () => {
  it('старое сохранение: предмет стоит в двух комнатах — засчитываем два экземпляра', () => {
    const s = newState(0);
    s.sills.push({ id: 'bedroom', name: 'Спальня', window: 'S', decor: ['fan'] });
    s.sills[0].decor = ['fan', 'radio'];
    s.owned.fan = 1; s.owned.radio = 1;
    const u = upgrade(s, 0);
    expect(u.owned.fan).toBe(2);
    expect(u.owned.radio).toBe(1);
  });
  it('не покупал — не выдаём', () => {
    const s = newState(0);
    s.sills[0].decor = ['fan'];
    expect(upgrade(s, 0).owned.fan ?? 0).toBe(0);
  });
});
