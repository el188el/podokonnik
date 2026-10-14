import { describe, expect, it } from 'vitest';
import { chatCard, chatNudge, chatStage, newChatPlant, stepChat, waterChat, WILT_DAYS } from './chatplant';
import { D, H } from './constants';
import { sp } from './species';

const T = new Date(2026, 9, 14, 12).getTime();
const mk = () => newChatPlant('Фикус Офисный', T, () => 0); // хлорофитум: поливать раз в 3 дня

describe('растение в чате', () => {
  it('растёт, пока поливают, и становится взрослым', () => {
    const p = mk();
    for (let d = 1; d <= 14; d++) { stepChat(p, T + d * D); if (p.moisture < 0.5) waterChat(p, { id: d % 3, name: 'Аня' }, T + d * D); }
    expect(chatStage(p)).toBe(4);
    expect(p.health).toBe(100);
  });

  it('мокрую землю не заливают', () => {
    const p = mk();
    expect(waterChat(p, { id: 1, name: 'Аня' }, T + H)).toBe('wet');
  });

  it('без воды хочет пить, вянет, а через неделю засыхает', () => {
    const p = mk();
    stepChat(p, T + sp(p.sp).waterDays * D * 0.9);
    expect(chatNudge(p)).toContain('хочет пить');
    stepChat(p, T + (sp(p.sp).waterDays + sp(p.sp).drought + 0.5) * D);
    expect(chatNudge(p)).toContain('вянет');
    expect(p.health).toBeLessThan(100);
    stepChat(p, T + (sp(p.sp).waterDays + WILT_DAYS + 1) * D);
    expect(p.wilted).toBe(true);
    expect(chatCard(p, T + 20 * D)).toContain('засохло');
  });

  it('засохшее оживает, только если польют трое разных', () => {
    const p = mk();
    stepChat(p, T + 20 * D);
    const t = T + 20 * D;
    expect(waterChat(p, { id: 1, name: 'А' }, t)).toBe('revive');
    expect(waterChat(p, { id: 1, name: 'А' }, t)).toBe('already');
    expect(waterChat(p, { id: 2, name: 'Б' }, t)).toBe('revive');
    expect(waterChat(p, { id: 3, name: 'В' }, t)).toBe('revived');
    expect(p.wilted).toBe(false);
    expect(p.health).toBe(40);
  });
});
