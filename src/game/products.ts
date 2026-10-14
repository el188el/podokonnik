// Товары за Telegram Stars и редкие формы растений.
// Файл общий для игры и сервера (sync:shared): цены проверяет сервер.

import type { ArtSpec } from './types';

/** Редкая (пёстрая, цветная) форма вида: меняет только внешний вид. */
export interface Form {
  id: string;
  sp: string;
  name: string;
  art: Partial<ArtSpec> & { variegate?: string };
  desc: string;
  event?: string; // эксклюзив ивента: только из сезонного пропуска
}

export const FORMS: Form[] = [
  { id: 'albo', sp: 'monstera', name: 'Монстера Альбо', art: { variegate: '#f3f2e8' }, desc: 'Белые мазки на каждом листе. Мечта любого цветовода.' },
  { id: 'neon', sp: 'scindapsus', name: 'Сциндапсус Неон', art: { leaf: '#9cc93a', leaf2: '#d4ec7a' }, desc: 'Яркий лаймовый цвет, будто светится.' },
  { id: 'tineke', sp: 'ficus', name: 'Фикус Тинеке', art: { leaf: '#4b7d3e', leaf2: '#e79aa8', variegate: '#eee5b0' }, desc: 'Кремовая кайма и розовые молодые листья.' },
  { id: 'nanouk', sp: 'tradescantia', name: 'Традесканция Нанук', art: { leaf: '#b45d9c', leaf2: '#f5cde6' }, desc: 'Розово-зелёные полоски, как зефир.' },
  { id: 'moonshine', sp: 'sansevieria', name: 'Сансевиерия Мунлайт', art: { leaf: '#a8c4b6', leaf2: '#7f9e8e' }, desc: 'Серебристо-мятная, почти лунная.' },
  { id: 'domino', sp: 'spathiphyllum', name: 'Спатифиллум Домино', art: { variegate: '#eef2e6' }, desc: 'Листья в белую крапинку.' },
  { id: 'chimera', sp: 'violet', name: 'Фиалка Химера', art: { flower: '#f07ab5' }, desc: 'Розовые цветы с белой полосой — каждая уникальна.' },
  { id: 'snow', sp: 'geranium', name: 'Герань Снежная', art: { flower: '#fbfbf4' }, desc: 'Белоснежные шапки соцветий.' },
  // эксклюзивы ивентов
  { id: 'sunset', sp: 'crassula', name: 'Толстянка Закат', art: { leaf: '#8f9a3e', leaf2: '#e0512f' }, desc: 'Листья с огненной каймой, как осенний закат.', event: 'autumn' },
  { id: 'snowwhite', sp: 'decembrist', name: 'Декабрист Белоснежка', art: { flower: '#fbf7f2' }, desc: 'Белые цветы под Новый год.', event: 'newyear' },
  { id: 'lemon', sp: 'violet', name: 'Фиалка Лимонная', art: { flower: '#f4e04d' }, desc: 'Редчайшие жёлтые цветы.', event: 'spring' },
];

export const FORM_BY_ID: Record<string, Form> = Object.fromEntries(FORMS.map((f) => [f.id, f]));
export const formsOf = (spId: string) => FORMS.filter((f) => f.sp === spId);
/** Шанс, что обычный черенок окажется редкой формой. */
export const RARE_DROP = 0.03;

export type ProductKind = 'plus' | 'leaves' | 'form' | 'pass';

export interface Product {
  id: string;
  kind: ProductKind;
  stars: number;
  title: string;
  desc: string;
  leaves?: number;
  form?: string;
}

export const PLUS_DAYS = 30;

export const PRODUCTS: Product[] = [
  {
    id: 'plus', kind: 'plus', stars: 99, title: 'Садовник+ на месяц',
    desc: 'x2 листиков за задания и серию, соседка без ограничений, серия не сгорает за один пропуск, золотой горшок и 🌟 у имени.',
  },
  { id: 'leaves_s', kind: 'leaves', stars: 25, leaves: 120, title: '120 листиков', desc: 'Горсть листиков на черенки и горшки.' },
  { id: 'leaves_m', kind: 'leaves', stars: 75, leaves: 400, title: '400 листиков', desc: 'Самый популярный набор.' },
  { id: 'leaves_l', kind: 'leaves', stars: 150, leaves: 900, title: '900 листиков', desc: 'Хватит на целую оранжерею.' },
  {
    id: 'pass', kind: 'pass', stars: 149, title: 'Сезонный пропуск',
    desc: 'Платная ветка наград текущего ивента: эксклюзивный горшок, декор, листики, подкормки и редкая форма.',
  },
  ...FORMS.filter((f) => !f.event).map((f): Product => ({
    id: `form_${f.id}`, kind: 'form', form: f.id, stars: f.sp === 'monstera' || f.sp === 'ficus' ? 75 : 50,
    title: `Черенок: ${f.name}`, desc: f.desc,
  })),
];

export const PRODUCT_BY_ID: Record<string, Product> = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));
