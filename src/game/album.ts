// Альбом редкостей: тематические «полки» коллекции. Собрал полку целиком —
// значок, листики и уникальный декор, который нельзя купить.

import { FORMS } from './products';
import { PALETTES } from './breeding';
import { SPECIES } from './species';
import type { GameState } from './types';

export interface AlbumItem {
  key: string;
  sp: string;
  form?: string;
  hue?: string;
  label: string;
}

export interface Shelf {
  id: string;
  icon: string;
  title: string;
  desc: string;
  items: AlbumItem[];
  reward: { leaves: number; item: string };
}

const formItem = (id: string): AlbumItem => {
  const f = FORMS.find((x) => x.id === id)!;
  return { key: 'form:' + id, sp: f.sp, form: id, label: f.name };
};

const rareHues: AlbumItem[] = Object.entries(PALETTES).flatMap(([sp, pal]) =>
  pal.filter((h) => h.rare).map((h) => ({ key: `hue:${sp}:${h.id}`, sp, hue: h.id, label: `${SPECIES.find((s) => s.id === sp)!.name} ${h.name}` })),
);

export const SHELVES: Shelf[] = [
  {
    id: 'leaves', icon: '🍃', title: 'Пёстрые листья', desc: 'Редкие формы с необычной окраской листьев.',
    items: ['albo', 'neon', 'tineke', 'nanouk', 'moonshine', 'domino'].map(formItem),
    reward: { leaves: 200, item: 'glass_dome' },
  },
  {
    id: 'flowers', icon: '🌈', title: 'Небывалые цветы', desc: 'Редкие формы и редчайшие цвета, выведенные опылением.',
    items: [formItem('chimera'), formItem('snow'), ...rareHues.slice(0, 4)],
    reward: { leaves: 250, item: 'golden_can' },
  },
  {
    id: 'seasons', icon: '🍂', title: 'Сезонные', desc: 'Эксклюзивы ивентов: осень, Новый год и весна.',
    items: FORMS.filter((f) => f.event).map((f) => formItem(f.id)),
    reward: { leaves: 300, item: 'herb_frame' },
  },
  {
    id: 'bloom', icon: '🌸', title: 'Цветущие', desc: 'Добейся цветения у каждого цветущего вида.',
    items: SPECIES.filter((s) => s.bloom && s.art.flower).map((s) => ({ key: 'bloom:' + s.id, sp: s.id, label: s.name })),
    reward: { leaves: 300, item: 'bouquet' },
  },
];

export function hasItem(g: GameState, key: string): boolean {
  const [kind, a, b] = key.split(':');
  if (kind === 'form') return (g.forms ?? []).includes(a);
  if (kind === 'hue') return (g.hues?.[a] ?? []).includes(b);
  if (kind === 'bloom') return (g.bloomed ?? []).includes(a);
  return false;
}

export const shelfProgress = (g: GameState, s: Shelf): [number, number] => [s.items.filter((i) => hasItem(g, i.key)).length, s.items.length];
export const shelfDone = (g: GameState, s: Shelf) => s.items.every((i) => hasItem(g, i.key));
export const shelvesReady = (g: GameState) => SHELVES.filter((s) => shelfDone(g, s) && !(g.shelves ?? []).includes(s.id));
