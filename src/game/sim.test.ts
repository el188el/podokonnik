import { describe, expect, it } from 'vitest';
import { D, H, MIN } from './constants';
import { decodeGift, encodeGift } from './gifts';
import { bumpQuest, rollDay } from './quests';
import { advance, canCut, cramped, isSad, lightBad, stageMarks } from './sim';
import { SPECIES, sp } from './species';
import { fromLegacy, newPlant, newState } from './storage';
import type { GameState, Plant } from './types';

const T0 = new Date(2026, 5, 1, 12).getTime(); // июнь: без зимних поправок

function world(spId = 'chlorophytum', extra: Partial<Plant> = {}): { g: GameState; p: Plant } {
  const g = newState(T0);
  g.sills[0].window = 'E';
  const p = newPlant({ sp: spId, sill: 'room', slot: 0, zone: sp(spId).zone, ...extra }, T0);
  g.plants.push(p);
  return { g, p };
}

const potted = (spId: string) => world(spId, { stage: 2, rootStart: T0, plantedAt: T0, moisture: 1 });

describe('укоренение', () => {
  it('первый черенок пускает корни ровно через 2 минуты после воды', () => {
    const { g, p } = world('monstera', { quick: true, rootStart: T0 });
    advance(g, T0 + 1.9 * MIN);
    expect(p.stage).toBe(0);
    advance(g, T0 + 2.1 * MIN);
    expect(p.stage).toBe(1);
  });

  it('без воды в стакане корней нет', () => {
    const { g, p } = world('tradescantia');
    advance(g, T0 + D);
    expect(p.stage).toBe(0);
  });

  it('обычный черенок укореняется по своему времени', () => {
    const { g, p } = world('monstera', { rootStart: T0 });
    advance(g, T0 + 10 * MIN);
    expect(p.stage).toBe(0);
    advance(g, T0 + (sp('monstera').rootMin + 1) * MIN);
    expect(p.stage).toBe(1);
  });
});

describe('рост', () => {
  it('при хорошем уходе доходит до взрослого за сумму часов стадий', () => {
    const { g, p } = potted('tradescantia');
    const [, adult] = stageMarks('tradescantia');
    // поливаем каждый день
    for (let t = T0; t < T0 + (adult + 1) * H; t += 12 * H) {
      advance(g, t);
      p.moisture = 1;
    }
    advance(g, T0 + (adult + 1) * H);
    expect(p.stage).toBe(4);
    expect(p.adultAt).toBeTruthy();
  });

  it('при неподходящем свете растёт вдвое медленнее', () => {
    const good = potted('chlorophytum');
    const bad = potted('chlorophytum');
    bad.p.zone = 'deep';
    bad.g.sills[0].window = 'N'; // в глубине у северного окна свет 1 — хлорофитуму мало
    expect(lightBad(bad.p, bad.g.sills[0], T0, false)).toBe('dark');
    advance(good.g, T0 + 10 * H);
    advance(bad.g, T0 + 10 * H);
    expect(bad.p.growth).toBeCloseTo(good.p.growth / 2, 1);
  });

  it('опрыскивание любителя влаги ускоряет рост', () => {
    const a = potted('scindapsus');
    const b = potted('scindapsus');
    b.p.mistUntil = T0 + 12 * H;
    advance(a.g, T0 + 10 * H);
    advance(b.g, T0 + 10 * H);
    expect(b.p.growth).toBeGreaterThan(a.p.growth * 1.4);
  });
});

describe('жажда и здоровье', () => {
  it('без полива грустит, а потом засыхает и теряет стадию, но не погибает', () => {
    const { g, p } = potted('tradescantia');
    p.stage = 4; p.growth = 100; p.adultAt = T0;
    advance(g, T0 + 3 * D);
    expect(isSad(p)).toBe(false); // земля высохла за 2 дня, ещё полтора дня терпит
    advance(g, T0 + 4.5 * D);
    expect(isSad(p)).toBe(true);
    advance(g, T0 + 10 * D);
    expect(p.stage).toBeLessThan(4);
    expect(p.health).toBeGreaterThan(0);
  });

  it('суккулент спокойно переживает неделю без полива', () => {
    const { g, p } = potted('sansevieria');
    advance(g, T0 + 7 * D);
    expect(p.health).toBe(100);
    expect(isSad(p)).toBe(false);
  });

  it('перелив вредит чувствительным видам', () => {
    const { g, p } = potted('aloe');
    p.moisture = 1.4;
    advance(g, T0 + 6 * H);
    expect(p.health).toBeLessThan(100);
  });

  it('соседка поливает и не даёт засохнуть', () => {
    const { g, p } = potted('tradescantia');
    g.neighbor = { until: T0 + 7 * D, cooldownUntil: T0 + 14 * D };
    advance(g, T0 + 6 * D);
    expect(p.health).toBe(100);
    expect(p.moisture).toBeGreaterThan(0);
  });
});

describe('черенки и пересадка', () => {
  it('взрослое растение даёт черенок, потом отдыхает', () => {
    const { g, p } = potted('chlorophytum');
    const [, adult] = stageMarks('chlorophytum');
    p.growth = adult + 1; p.stage = 4; p.adultAt = T0;
    advance(g, T0 + H);
    expect(canCut(p, T0 + H)).toBe(true);
    p.lastCut = T0 + H;
    expect(canCut(p, T0 + 2 * H)).toBe(false);
  });

  it('со временем взрослому становится тесно', () => {
    const { p } = potted('chlorophytum');
    p.stage = 4; p.adultAt = T0;
    expect(cramped(p, T0 + D)).toBe(false);
    expect(cramped(p, T0 + (sp('chlorophytum').repotDays + 1) * D)).toBe(true);
  });
});

describe('цветение', () => {
  it('декабрист без зимнего покоя не цветёт, с покоем — цветёт в декабре', () => {
    const dec = new Date(2026, 11, 10, 12).getTime();
    const mk = (rest: number) => {
      const g = newState(dec);
      g.sills[0].window = 'E';
      const p = newPlant({ sp: 'decembrist', sill: 'room', slot: 0, zone: 'glass', stage: 4, growth: 999, moisture: 1, rest }, dec);
      g.plants.push(p);
      g.simAt = dec;
      return { g, p };
    };
    const a = mk(0);
    const b = mk(8 * 24);
    advance(a.g, dec + H);
    advance(b.g, dec + H);
    expect(a.p.blooming).toBe(false);
    expect(b.p.blooming).toBe(true);
  });
});

describe('подарки', () => {
  it('ссылка кодируется и декодируется, включая кириллицу', () => {
    const g = { sp: 'monstera', from: 'Аня 🌱', note: 2, code: 'abcDEF2345' };
    const enc = encodeGift(g);
    expect(enc).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(enc.length).toBeLessThan(512);
    expect(decodeGift(enc)).toEqual({ ...g, ok: true });
  });

  it('битая ссылка не ломает игру', () => {
    expect(decodeGift('g$$$')?.ok).toBe(false);
  });
});

describe('задания и серия', () => {
  it('новый день даёт три задания и продолжает серию', () => {
    const { g } = potted('chlorophytum');
    rollDay(g, T0);
    expect(g.quests.list.length).toBe(3);
    expect(g.streak.count).toBe(1);
    rollDay(g, T0 + D);
    expect(g.streak.count).toBe(2);
    rollDay(g, T0 + 3 * D);
    expect(g.streak.count).toBe(1);
    expect(g.streak.best).toBe(2);
  });

  it('задание засчитывается действием', () => {
    const { g } = potted('chlorophytum');
    rollDay(g, T0);
    const q = g.quests.list[0];
    for (let i = 0; i < q.target; i++) bumpQuest(g, q.kind);
    expect(q.progress).toBe(q.target);
  });
});

describe('каталог и перенос', () => {
  it('у всех видов корректные параметры', () => {
    for (const s of SPECIES) {
      expect(s.light[0]).toBeLessThanOrEqual(s.light[1]);
      expect(s.waterDays).toBeGreaterThan(0);
      expect(s.stageHours.every((h) => h > 0)).toBe(true);
    }
    expect(new Set(SPECIES.map((s) => s.id)).size).toBe(SPECIES.length);
  });

  it('сохранение первой версии переносится без потерь', () => {
    const old = {
      window: 'S' as const, name: 'Аня', received: ['abcdefgh12'],
      plants: [{ slot: 2, sp: 'geranium', zone: 'glass' as const, firstWater: T0 - 5 * D, lastWater: T0 - D, repotted: T0 - D, from: 'Оля' }],
    };
    const s = fromLegacy(old, T0);
    expect(s.sills[0].window).toBe('S');
    expect(s.plants[0].slot).toBe(2);
    expect(s.plants[0].stage).toBeGreaterThanOrEqual(3);
    expect(s.plants[0].bigPot).toBe(true);
    expect(s.plants[0].from?.name).toBe('Оля');
    expect(s.received).toEqual(['abcdefgh12']);
  });
});

describe('звёзды и редкие формы', () => {
  it('редкая форма передаётся в подарке, чужая форма отбрасывается', () => {
    const g = { sp: 'monstera', from: 'Аня', note: 1, code: 'abcDEF2345', form: 'albo' };
    expect(decodeGift(encodeGift(g))).toEqual({ ...g, ok: true });
    const bad = decodeGift(encodeGift({ ...g, form: 'neon' }));
    expect(bad?.ok).toBe(true);
    expect(bad?.form).toBeUndefined();
  });

  it('с «Садовник+» один пропущенный день не сжигает серию', () => {
    const { g } = potted('chlorophytum');
    rollDay(g, T0, true);
    rollDay(g, T0 + 2 * D, true);
    expect(g.streak.count).toBe(2);
    const { g: g2 } = potted('chlorophytum');
    rollDay(g2, T0, false);
    rollDay(g2, T0 + 2 * D, false);
    expect(g2.streak.count).toBe(1);
  });
});
