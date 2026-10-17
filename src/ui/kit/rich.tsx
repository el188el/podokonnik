// Эмодзи в текстах игры → линейные иконки Lucide в цвете.
// Тексты (тосты, задания, фразы растений, награды) пишем как раньше, с эмодзи —
// а на экране вместо них рисуется иконка того же смысла. Так все устройства видят
// одинаковый аккуратный набор, а не разные эмодзи разных телефонов.

import {
  AlarmClock, Ambulance, Amphora, Anchor, Annoyed, Apple, AppWindow, ArrowDown, ArrowLeft, ArrowLeftRight, ArrowRight, ArrowUp, Armchair, Award,
  Ban, Bandage, Banknote, Bed, Bell, Biohazard, Bird, Bone, Book, BookOpen, Brush, BrickWall, Bug, Building2, Cake, Calendar,
  CalendarDays, Camera, Carrot, Cat, ChartBar, Check, Cherry, Circle, CircleCheck, CircleHelp, Citrus, Clapperboard, ClipboardList,
  Clock, Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, CloudSunRain, Coffee, Coins, Compass, Cookie, Crown, Diamond,
  DoorOpen, Droplet, Droplets, EggFried, Eye, Fan, Flame, FlaskConical, Flashlight, Flower, Flower2, Frown, Gauge, Gem, Gift, GlassWater,
  Glasses, Globe, Hand, Handshake, HeartCrack, HeartHandshake, HeartPulse, Heart, Heater, Hexagon, Hourglass, House, Image, Lamp,
  Lasso, Laugh, Leaf, LeafyGreen, Library, Lightbulb, Lock, Logs, Luggage, Mail, Medal, Megaphone, Meh, Microscope, Moon, Mountain,
  Music, Newspaper, Notebook, Package, Palette, PartyPopper, PawPrint, Pencil, PersonStanding, PhoneOff, PiggyBank, Pill, PillBottle,
  Plane, Plug, Plus, Pointer, Rabbit, Radio, Rainbow, RefreshCw, Ruler, Scissors, Scroll, Search, Settings, Shield, Shirt, ShoppingCart,
  Shrub, Smartphone, Smile, SmilePlus, Snowflake, Sofa, Soup, Sparkles, Sprout, Square, Star, Stethoscope, Sun, Sunrise, Sunset, Sword,
  Target, Thermometer, ThermometerSnowflake, ThermometerSun, Ticket, Timer, TreeDeciduous, TreePalm, TreePine, TriangleAlert, Trophy, Tv,
  Upload, User, UserRound, Users, Wand, Waves, Wheat, Wind, X, Zap, type LucideIcon,
} from 'lucide-react';
import { Fragment, type ReactNode } from 'react';

type Glyph = [LucideIcon, string, (boolean | 'soft')?]; // иконка, цвет, заливка (soft — полупрозрачная, видно прожилки)

const G = '#3fa35f', GD = '#3d8b56', B = '#3b8fd6', P = '#d0578f', Y = '#e8a325', R = '#e0574f', V = '#8b5cc7', W = '#a8703f', S = '#4a6b60', C = '#7a9aa8', T = '#2fa3a0', O = '#e8702a', K = '#8a948f';

/** Ключи — без «вариационного селектора» U+FE0F. */
export const EMOJI: Record<string, Glyph> = {
  '🍃': [Leaf, G], '🌿': [LeafyGreen, GD], '🌱': [Sprout, G], '🪴': [Shrub, GD], '🍂': [Leaf, '#c9762b', 'soft'], '🍁': [Leaf, '#d9622b', 'soft'],
  '🌳': [TreeDeciduous, GD], '🌴': [TreePalm, GD], '🎄': [TreePine, GD], '🌵': [Sprout, GD], '🌾': [Wheat, Y], '🪵': [Logs, W],
  '🌸': [Flower, '#e86fa0'], '🌷': [Flower, '#e0607e'], '🌼': [Flower, Y], '🌺': [Flower, R], '💐': [Flower2, P], '🥀': [Flower, '#8a6a5a'],
  '💧': [Droplet, B], '💦': [Droplets, B], '🌊': [Waves, B], '🫗': [GlassWater, B], '🫙': [GlassWater, '#5f9fc9'],
  '🧪': [FlaskConical, V], '💊': [Pill, '#e0685a'], '🧴': [PillBottle, T], '🩹': [Bandage, '#e0685a'], '🩺': [Stethoscope, T],
  '🛡': [Shield, T, 'soft'], '🚑': [Ambulance, R], '🔬': [Microscope, S], '🦠': [Biohazard, '#5f9a3a'],
  '✨': [Sparkles, Y], '🌟': [Star, Y, true], '⭐': [Star, Y, true], '💫': [Sparkles, Y], '🎉': [PartyPopper, P], '🧙': [Wand, V],
  '✂': [Scissors, '#e0685a'], '✓': [Check, GD], '✔': [Check, GD], '✅': [CircleCheck, G], '✕': [X, K], '❌': [X, R], '➕': [Plus, GD],
  '☀': [Sun, Y], '🌤': [CloudSun, Y], '⛅': [CloudSun, C], '🌥': [CloudSun, C], '☁': [Cloud, C], '🌦': [CloudSunRain, C], '🌧': [CloudRain, '#5f7f9a'],
  '⛈': [CloudLightning, '#5f7f9a'], '🌨': [CloudSnow, '#5aa8d8'], '❄': [Snowflake, '#5aa8d8'], '⛄': [Snowflake, '#5aa8d8'], '🌫': [CloudFog, C],
  '🌈': [Rainbow, P], '💨': [Wind, C], '😮‍💨': [Wind, C], '🌀': [Fan, '#5f9fc9'], '🎐': [Wind, T], '🌙': [Moon, '#6b6fc9'], '🌑': [Moon, '#4a4f6a'],
  '🌅': [Sunrise, O], '🌇': [Sunset, O], '🏜': [Sun, O], '🪨': [Mountain, K], '🌡': [Thermometer, '#e0685a'],
  '🥵': [ThermometerSun, R], '🥶': [ThermometerSnowflake, '#5aa8d8'], '♨': [Heater, O], '🔥': [Flame, O], '🕯': [Flame, Y],
  '⚡': [Zap, Y], '💡': [Lightbulb, Y], '🔦': [Flashlight, S], '🏮': [Lamp, R], '🔌': [Plug, S],
  '🎁': [Gift, P], '📦': [Package, W], '🎟': [Ticket, P], '🎂': [Cake, P], '🛒': [ShoppingCart, GD],
  '❤': [Heart, R, true], '💚': [Heart, G, true], '💜': [Heart, V, true], '💙': [Heart, B, true], '🤍': [Heart, '#c9d1cd', true],
  '🩶': [Heart, '#9aa5a0', true], '🩷': [Heart, '#e86fa0', true], '💛': [Heart, Y, true], '🖤': [Heart, '#3b3f3d', true], '🤎': [Heart, W, true],
  '💕': [Heart, P, true], '💞': [HeartHandshake, P], '💌': [Mail, P], '💔': [HeartCrack, R], '❤‍🩹': [HeartPulse, R],
  '🪟': [AppWindow, '#5f9fc9'], '🏡': [House, GD], '🏠': [House, GD], '🛋': [Sofa, W], '🪑': [Armchair, W], '🛏': [Bed, '#6b6fc9'],
  '🚪': [DoorOpen, W], '🧱': [BrickWall, '#c4553d'], '🏙': [Building2, S], '🖼': [Image, S],
  '🎨': [Palette, P], '🧶': [Circle, P, true], '🧣': [Shirt, '#c4553d'], '🧤': [Hand, '#c4553d'], '🧽': [Brush, Y], '🧼': [Droplets, T], '🧻': [Scroll, K],
  '📋': [ClipboardList, W], '📒': [Notebook, Y], '📗': [Book, G], '📖': [BookOpen, S], '📚': [Library, W], '📰': [Newspaper, S],
  '✏': [Pencil, Y], '✉': [Mail, S], '📬': [Mail, B], '📤': [Upload, S], '📢': [Megaphone, O], '🔔': [Bell, Y], '📲': [Smartphone, S], '📵': [PhoneOff, K],
  '📸': [Camera, S], '📷': [Camera, S], '🎬': [Clapperboard, S], '📺': [Tv, S], '📻': [Radio, W], '📊': [ChartBar, T],
  '🏆': [Trophy, Y], '🥇': [Medal, Y], '🥈': [Medal, '#9aa5a0'], '🥉': [Medal, '#b07a4a'], '🏅': [Award, Y], '👑': [Crown, Y], '💎': [Gem, B], '🔷': [Diamond, B, true],
  '🎯': [Target, R], '📏': [Ruler, W], '🧭': [Compass, S], '📟': [Gauge, S], '⚙': [Settings, S], '🌐': [Globe, S],
  '🔒': [Lock, K], '🔐': [Lock, K], '🔍': [Search, S], '👀': [Eye, S], '🔄': [RefreshCw, S], '⬆': [ArrowUp, S], '⬇': [ArrowDown, S], '⬅': [ArrowLeft, S], '➡': [ArrowRight, S], '↔': [ArrowLeftRight, S],
  '⏱': [Timer, S], '⏳': [Hourglass, W], '⏰': [AlarmClock, O], '🕰': [Clock, W], '📅': [CalendarDays, S], '🗓': [Calendar, S],
  '✈': [Plane, B], '🧳': [Luggage, W], '⚓': [Anchor, B], '⚠': [TriangleAlert, Y],
  '🐈': [Cat, W], '🐈‍⬛': [Cat, '#3b3f3d'], '😺': [Cat, W], '🐾': [PawPrint, W], '🐦': [Bird, B], '🦉': [Bird, W], '🐑': [Rabbit, K], '🐷': [PiggyBank, '#e86fa0'], '🦕': [Bone, K],
  '🐝': [Bug, Y], '🐛': [Bug, G], '🦟': [Bug, '#7a5a4a'], '🕷': [Bug, '#4a4a4a'], '🕸': [Bug, K], '🦋': [Bug, P],
  '☕': [Coffee, W], '🫖': [Coffee, P], '🍳': [EggFried, Y], '🥣': [Soup, W], '🥫': [Package, R], '🧂': [Hexagon, K], '🍯': [Hexagon, Y, true], '🧊': [Square, '#5aa8d8'],
  '🍎': [Apple, R], '🍏': [Apple, G], '🍓': [Cherry, R], '🍋': [Citrus, '#e8c325'], '🍉': [Citrus, '#e8445a'], '🍊': [Citrus, O], '🥒': [Carrot, G], '🍪': [Cookie, W], '🎃': [Circle, O, true],
  '🏺': [Amphora, W], '☂': [Cloud, C], '🪢': [Lasso, W], '🗡': [Sword, K], '🪆': [PersonStanding, R],
  '🟫': [Square, '#8b5a2b', true], '🟥': [Square, R, true], '🟩': [Square, G, true], '🟦': [Square, B, true], '🟨': [Square, Y, true],
  '🔴': [Circle, R, true], '🟡': [Circle, Y, true], '🟤': [Circle, W, true],
  '💰': [Coins, Y], '💵': [Banknote, G], '💸': [Banknote, G],
  '♪': [Music, V], '♫': [Music, V], '🎵': [Music, V], '🎶': [Music, V],
  '👵': [UserRound, W], '👴': [UserRound, W], '👩': [UserRound, P], '👩‍🦳': [UserRound, W], '👦': [UserRound, B], '🧔': [UserRound, W], '👤': [User, S], '👯': [Users, P],
  '👋': [Hand, Y], '✋': [Hand, Y], '👊': [Hand, O], '👆': [Pointer, Y], '🤝': [Handshake, GD], '🙅': [Ban, R], '🤷': [CircleHelp, S],
  '🙂': [Smile, GD], '😊': [Smile, GD], '😉': [Smile, GD], '😌': [Smile, T], '😄': [Laugh, GD], '🤗': [SmilePlus, P], '😍': [SmilePlus, P], '😎': [Glasses, S],
  '😴': [Bed, '#6b6fc9'], '😕': [Meh, '#c98a2b'], '🫠': [Meh, O], '😬': [Annoyed, O], '😢': [Frown, B], '😣': [Frown, '#c0504a'], '😖': [Frown, '#c0504a'],
  '😵': [Frown, '#c0504a'], '😷': [Frown, T],
};

// Эмодзи: пиктограмма + модификаторы, склейки через ZWJ; плюс пара текстовых значков.
const RE = /(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}️?|[\u{1F3FB}-\u{1F3FF}])*|[✓✕♪♫↔])/gu;
const key = (e: string) => e.replace(/️/g, '');

/** Одна иконка вместо эмодзи (размер — по тексту вокруг). */
export function Emo({ e, size = '1.15em' }: { e: string; size?: string | number }) {
  const g = EMOJI[key(e)];
  if (!g) return <>{e}</>;
  const [C, color, fill] = g;
  // размер — в style: общие правила вида «.карточка svg { width: 76px }» не раздуют значок
  return <C className="emo" size={size} style={{ width: size, height: size }} color={color} strokeWidth={2.3} fill={fill === 'soft' ? color + '59' : fill ? color : 'none'} aria-hidden focusable={false} />;
}

/** Строка с эмодзи → текст с иконками. Не строку (число, элемент) возвращает как есть. */
export function rich(v: ReactNode): ReactNode {
  if (typeof v !== 'string' || !RE.test(v)) { RE.lastIndex = 0; return v; }
  RE.lastIndex = 0;
  const parts = v.split(RE);
  return parts.map((p, i) => (i % 2 ? <Emo key={i} e={p} /> : p ? <Fragment key={i}>{p}</Fragment> : null));
}

/** Убрать эмодзи из строки (для мест, где иконку не нарисовать: подсказки, заголовок окна). */
export const plain = (s: string) => s.replace(RE, '').replace(/\s{2,}/g, ' ').trim();

export const hasEmojiIcon = (e: string) => key(e) in EMOJI;
export const EMOJI_RE = RE;
