// Иконки интерфейса — единый линейный набор (Lucide, лицензия ISC) вместо эмодзи:
// эмодзи на каждом телефоне рисуются по-своему и не перекрашиваются под тему.
// Эмодзи остаются там, где они — часть мира игры: реплики растений, декор, товары.

import {
  ArrowDown, ArrowUp, BookOpen, ChevronDown, Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun,
  Droplet, Eye, Heart, FlaskConical, Leaf, Palette, Scissors, Share, ShoppingBag, ShowerHead, Shovel, SprayCan, Sprout,
  Sun, Target, Thermometer, User, Users, Zap, type LucideIcon,
} from 'lucide-react';

export const ICONS = {
  sill: Sprout, shop: ShoppingBag, friends: Users, quests: Target, herbarium: BookOpen,
  look: Eye, water: Droplet, mist: SprayCan, feed: FlaskConical, cut: Scissors, waterAll: ShowerHead,
  boost: Zap, repot: Shovel, down: ArrowDown, up: ArrowUp, design: Palette, share: Share,
  user: User, leaf: Leaf, heart: Heart, chevron: ChevronDown, thermo: Thermometer,
  clear: Sun, partly: CloudSun, cloudy: Cloud, fog: CloudFog, rain: CloudRain, snow: CloudSnow, storm: CloudLightning,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

/** Иконка интерфейса. Цвет — от текста (currentColor) или явно через tone. */
export function Icon({ name, size = 22, tone, className, stroke = 2.2 }: { name: IconName; size?: number; tone?: string; className?: string; stroke?: number }) {
  const C = ICONS[name];
  return <C size={size} strokeWidth={stroke} color={tone ?? 'currentColor'} className={'ico' + (className ? ' ' + className : '')} aria-hidden focusable={false} />;
}

/** Цвета действий — одинаковые везде: в инструментах, карточке и подсказках. */
export const TONE = {
  water: '#3b8fd6', mist: '#2fa3a0', feed: '#8b5cc7', cut: '#e0685a', boost: '#e8a325',
  repot: '#a8703f', design: '#d0578f', share: '#3d8b56', look: '#4a6b60', leaf: '#3fa35f',
};
