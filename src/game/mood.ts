// Настроение и реплики растений: растения «говорят» о погоде, времени суток,
// уходе и своих маленьких радостях. Реплика зависит от состояния — так
// подоконник ощущается живым, а подсказки звучат по-человечески.

import { ageDays } from './age';
import { badLight, canCut, cramped, type Ctx } from './sim';
import { sp } from './species';
import type { Plant } from './types';
import type { Weather } from './weather';

export interface Mood {
  icon: string;
  label: string;
  score: number; // 0…100
}

export function moodOf(p: Plant, t: number, ctx: Ctx): Mood {
  if (p.stage < 2) return { icon: '🌱', label: 'ждёт корней', score: 70 };
  let s = p.health;
  if (p.moisture < 0.25) s -= 25;
  if (p.moisture > 1) s -= 20;
  if (badLight(p, t, ctx)) s -= 20;
  if (cramped(p, t)) s -= 10;
  if (p.mistUntil && t < p.mistUntil) s += 10;
  if (p.feedUntil && t < p.feedUntil) s += 5;
  if (p.blooming) s += 10;
  if (p.problem) s -= 15 + 25 * p.problem.sev;
  s = Math.max(0, Math.min(100, s));
  if (s >= 95) return { icon: '😍', label: 'счастливо', score: s };
  if (s >= 75) return { icon: '😊', label: 'довольно', score: s };
  if (s >= 50) return { icon: '🙂', label: 'нормально', score: s };
  if (s >= 30) return { icon: '😕', label: 'грустит', score: s };
  return { icon: '😢', label: 'очень плохо', score: s };
}

const pick = <T,>(list: T[], r: number) => list[Math.floor(r * list.length) % list.length];

/** Реплика растения сейчас. r — случайное число 0…1 (для разнообразия). */
export function chatter(p: Plant, t: number, ctx: Ctx, w: Weather | null, r: number): string {
  const s = sp(p.sp);
  const h = new Date(t).getHours();
  const lines: string[] = [];
  if (p.stage < 2) return pick(['Пускаю корешки… 🌱', 'Тут уютно, в стакане', 'Скоро в горшок!'], r);
  if (p.moisture < 0.25) lines.push('Пить хочется… 💧', 'Водички бы', 'Земля совсем сухая 🏜');
  if (p.moisture > 1) lines.push('Буль-буль… многовато воды', 'Ножки мокрые 😵');
  const bad = badLight(p, t, ctx);
  if (bad === 'dark') lines.push('Скучаю по солнышку 🌥', 'Темновато тут…');
  if (bad === 'hot') lines.push('Жарко! Отодвинь от стекла 🥵', 'Я сейчас сгорю ☀️');
  if (p.problem) lines.push({ rot: 'Корни болят… 😣', gnats: 'Тут мошки летают 🦟', mite: 'Кто-то кусает листья 🕷', aphid: 'Меня облепила тля! 🐛', mealybug: 'Что это за вата на мне? 😖', mildew: 'Я вся в налёте 😷', burn: 'Обгорела на солнце 🥵', leggy: 'Мне бы света побольше… 🌥' }[p.problem.kind]);
  if (lines.length) return pick(lines, r);

  if (w && w.sky === 'rain') lines.push('Дождик за окном 🌧 А мне и тут хорошо', 'Слышишь, как стучит дождь?');
  if (w && w.sky === 'snow') lines.push('Снег идёт! ❄️ Хорошо, что я дома', 'Какие красивые снежинки');
  if (w && w.sky === 'clear' && w.day) lines.push(s.light[1] === 4 ? 'Солнышко! Обожаю ☀️' : 'Ярко сегодня ☀️');
  if (w && (w.sky === 'cloudy' || w.sky === 'fog')) lines.push('Пасмурненько… но я держусь');
  if (w && w.temp <= -15) lines.push('Брр, на улице мороз! Не открывай форточку');

  if (h >= 5 && h < 10) lines.push('Доброе утро! 🌅', 'Новый день — новый листик');
  else if (h >= 22 || h < 5) lines.push('Сплю… 😴', 'Тсс, ночь уже 🌙');
  else if (h >= 17 && h < 22) lines.push('Хороший был день 🌇');

  if (p.mistUntil && t < p.mistUntil) lines.push('Спасибо за душ! 💦');
  if (p.feedUntil && t < p.feedUntil) lines.push('Вкусная подкормка! 🧪', 'Чувствую силы расти!');
  if (p.blooming) lines.push('Я цвету — посмотри! 🌸', 'Нравятся мои цветы?');
  if (canCut(p, t)) lines.push('Можно взять от меня черенок ✂️', 'Поделись мной с другом 🎁');
  if (cramped(p, t)) lines.push('Тесновато в горшке…');
  if (p.from) lines.push(`Передай привет ${p.from.name} 👋`);
  if (p.nick) lines.push(`Меня зовут ${p.nick}! 😊`);
  const age = ageDays(p, t);
  if (age >= 30) lines.push(`Мы вместе уже ${age} дн. 💚`);
  if (p.stage === 4 && p.health >= 90) lines.push('Мне хорошо у тебя 💚', 'Спасибо за заботу!', 'Красивое у нас окно');
  if (p.moisture > 0.8 && p.moisture <= 1) lines.push('Спасибо за водичку! 💧');
  if (!bad && p.stage >= 3) lines.push(p.zone === 'glass' ? 'Тут столько света!' : 'В глубине уютно 🛋');
  if (s.id === 'decembrist') lines.push('Жду зимы, чтобы зацвести 🎄');
  if (s.id === 'cactus' || s.id === 'aloe') lines.push('Поливать меня часто не надо 😉');
  if (s.id === 'monstera') lines.push('Скоро появятся дырочки на листьях!');
  if (s.id === 'spathiphyllum') lines.push('Если поникну — значит, пить хочу');
  return lines.length ? pick(lines, r) : 'Мне хорошо 🌿';
}
