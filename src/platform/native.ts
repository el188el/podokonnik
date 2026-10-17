// Нативное приложение (Capacitor: RuStore, Google Play, App Store).
// Вибрация, системное «Поделиться» и локальные напоминания без сервера.

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Share } from '@capacitor/share';
import { D } from '../game/constants';
import { isWinter } from '../game/sim';
import { sp } from '../game/species';
import type { GameState } from '../game/types';
import { setPlatform, web, type Platform } from './index';

export function initNative(): Platform {
  const base = web('native');
  const pf: Platform = {
    ...base,
    haptic(k) {
      if (k === 'success' || k === 'warning' || k === 'error') {
        Haptics.notification({ type: k === 'success' ? NotificationType.Success : k === 'warning' ? NotificationType.Warning : NotificationType.Error }).catch(() => {});
      } else if (k === 'select') Haptics.selectionChanged().catch(() => {});
      else Haptics.impact({ style: k === 'heavy' ? ImpactStyle.Heavy : k === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light }).catch(() => {});
    },
    async share({ text, url }) {
      try {
        await Share.share({ text: `${text}\n${url}`, dialogTitle: 'Подоконник' });
        return 'shared';
      } catch {
        return 'cancel';
      }
    },
  };
  setPlatform(pf);
  LocalNotifications.requestPermissions().catch(() => {});
  return pf;
}

/** Сдвинуть время из тихих часов на утро. */
function outOfQuiet(t: number, from: number, to: number) {
  const d = new Date(t);
  const h = d.getHours();
  const quiet = from > to ? h >= from || h < to : h >= from && h < to;
  if (!quiet) return t;
  const m = new Date(t);
  if (h >= from) m.setDate(m.getDate() + 1);
  m.setHours(to, 0, 0, 0);
  return m.getTime();
}

/** Запланировать ближайшее напоминание: кто захочет пить первым и когда полить настоящие растения. */
export async function scheduleReminders(g: GameState, now: number) {
  const items: { at: number; text: string }[] = [];
  for (const p of g.plants) {
    if (p.stage < 2) continue;
    const s = sp(p.sp);
    const ms = (p.moisture - 0.2) * s.waterDays * D * (isWinter(now) ? 1.3 : 1);
    if (ms > 0) items.push({ at: now + ms, text: `💧 ${p.nick || s.name} хочет пить` });
  }
  for (const t of g.twins ?? []) {
    if (!t.notify) continue;
    const at = t.lastWater ? t.lastWater + t.every * D : now + 3600e3;
    items.push({ at: Math.max(at, now + 60e3), text: `🏠 Пора полить настоящее растение «${t.nick}»` });
  }
  items.push({ at: now + 3 * D, text: '🌿 Растения скучают. Загляни на подоконник!' });
  const next = items.filter((x) => x.at > now + 60e3).sort((a, b) => a.at - b.at)[0];
  try {
    await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
    if (!next) return;
    const at = outOfQuiet(next.at, g.settings.quietFrom, g.settings.quietTo);
    await LocalNotifications.schedule({ notifications: [{ id: 1, title: 'Подоконник', body: next.text, schedule: { at: new Date(at) } }] });
  } catch { /* нет разрешения на уведомления */ }
}
