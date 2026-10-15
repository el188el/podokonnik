// Иконки интерфейса — единый линейный набор (Lucide, лицензия ISC) вместо эмодзи:
// эмодзи на каждом телефоне рисуются по-своему и не перекрашиваются под тему.
// Эмодзи остаются там, где они — часть мира игры: реплики растений, декор, товары.

import {
  AppWindow, Armchair, CalendarDays, Check, Crown, Flame, Flower2, Gift, Handshake, Lock, Luggage, MessageCircle,
  Package, Plus, Repeat2, Sparkles, Star, Trophy,
  ArrowDown, MapPin, RefreshCw, X, HelpCircle, ArrowUp, BookOpen, ChevronDown, Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun,
  Droplet, Eye, Heart, FlaskConical, Leaf, Palette, Scissors, Share, ShoppingBag, ShowerHead, Shovel, SprayCan, Sprout,
  Sun, Target, Thermometer, User, Users, Zap, type LucideIcon,
} from 'lucide-react';

export const ICONS = {
  sill: Sprout, pin: MapPin, refresh: RefreshCw, close: X, help: HelpCircle, shop: ShoppingBag, friends: Users, quests: Target, herbarium: BookOpen,
  look: Eye, water: Droplet, mist: SprayCan, feed: FlaskConical, cut: Scissors, waterAll: ShowerHead,
  boost: Zap, repot: Shovel, down: ArrowDown, up: ArrowUp, design: Palette, share: Share,
  user: User, leaf: Leaf, heart: Heart, chevron: ChevronDown, thermo: Thermometer,
  star: Star, gift: Gift, sparkles: Sparkles, pots: Flower2, decor: Armchair, packs: Package, sills: AppWindow,
  lock: Lock, flame: Flame, trophy: Trophy, check: Check, plus: Plus, market: Repeat2, luggage: Luggage,
  calendar: CalendarDays, handshake: Handshake, crown: Crown, chat: MessageCircle, flower: Flower2,
  clear: Sun, partly: CloudSun, cloudy: Cloud, fog: CloudFog, rain: CloudRain, snow: CloudSnow, storm: CloudLightning,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

/** Замкнутые фигуры — их рисуем как стикер: заливка цветом и тёмный контур. */
const FILLED = new Set<IconName>(['water', 'leaf', 'heart', 'star', 'flame', 'crown', 'feed', 'shop', 'gift', 'herbarium', 'boost', 'trophy', 'packs', 'lock', 'design', 'clear', 'partly', 'cloudy', 'rain', 'snow', 'storm', 'fog', 'mist', 'thermo', 'chat', 'luggage', 'calendar', 'sills', 'decor', 'user', 'friends', 'pots', 'flower', 'pin']);
const OUTLINE = '#3b2a22';

/** Иконка интерфейса. Цвет — от текста (currentColor) или явно через tone.
 *  С цветом у замкнутых фигур — «стикер»: заливка этим цветом и коричневый контур, как у рисунков игры. */
export function Icon({ name, size = 22, tone, className, stroke = 2.2 }: { name: IconName; size?: number; tone?: string; className?: string; stroke?: number }) {
  const C = ICONS[name];
  const sticker = !!tone && FILLED.has(name);
  return (
    <C size={size} strokeWidth={sticker ? Math.min(stroke, 2) : stroke} color={sticker ? OUTLINE : tone ?? 'currentColor'} fill={sticker ? tone : 'none'}
      className={'ico' + (sticker ? ' ico-st' : '') + (className ? ' ' + className : '')} style={{ width: size, height: size, flex: 'none' }} aria-hidden focusable={false} />
  );
}

/** Цвета действий — одинаковые везде: в инструментах, карточке и подсказках. */
export const TONE = {
  water: '#3b8fd6', mist: '#2fa3a0', feed: '#8b5cc7', cut: '#e0685a', boost: '#e8a325',
  repot: '#a8703f', design: '#d0578f', share: '#3d8b56', look: '#4a6b60', leaf: '#3fa35f',
};

/** Сумма в листиках: число и иконка листика (вместо 🍃). */
export function Money({ n, size = 16, plus }: { n: number | string; size?: number; plus?: boolean }) {
  return <span className="money-v">{plus ? '+' : ''}{n}<Icon name="leaf" size={size} tone={TONE.leaf} /></span>;
}

/** Цена в звёздах Telegram. */
export function StarsPrice({ n, size = 16 }: { n: number | string; size?: number }) {
  return <span className="money-v">{n}<Icon name="star" size={size} tone="#e8a325" /></span>;
}
