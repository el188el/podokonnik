// СГЕНЕРИРОВАНО из src/game/products.ts командой npm run sync:shared — не редактировать.
// Товары за Telegram Stars и редкие формы растений.
// Файл общий для игры и сервера (sync:shared): цены проверяет сервер.

import type { ArtSpec } from './types.ts';

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
  { id: 'frost', sp: 'cyclamen', name: 'Цикламен Иней', art: { flower: '#e6efff', leaf2: '#dfe9f2' }, desc: 'Бело-голубые цветы, будто тронутые морозом.', event: 'cozy' },
  { id: 'berry', sp: 'kalanchoe', name: 'Каланхоэ Земляничное', art: { flower: '#e5354f' }, desc: 'Цветёт ярко-алыми гроздьями, как спелая земляника.', event: 'dacha' },
  { id: 'sunny', sp: 'hibiscus', name: 'Гибискус Солнечный', art: { flower: '#ffd23f' }, desc: 'Огромные жёлтые цветы, как июльское солнце.', event: 'summer' },
  { id: 'applebloom', sp: 'geranium', name: 'Герань Яблоневый цвет', art: { flower: '#f9c6cf' }, desc: 'Нежно-розовые шапки, как цветущий яблоневый сад.', event: 'apples' },
];

export const FORM_BY_ID: Record<string, Form> = Object.fromEntries(FORMS.map((f) => [f.id, f]));
export const formsOf = (spId: string) => FORMS.filter((f) => f.sp === spId);
/** Шанс, что обычный черенок окажется редкой формой. */
export const RARE_DROP = 0.03;

export type ProductKind = 'plus' | 'leaves' | 'form' | 'pass' | 'starter' | 'plus_gift' | 'place';

export interface Product {
  id: string;
  kind: ProductKind;
  stars: number;
  title: string;
  desc: string;
  leaves?: number;
  form?: string;
  item?: string;  // предмет магазина в наборе
  once?: boolean; // купить можно только один раз
  slot?: number;  // место на подоконнике (для kind: 'place')
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
  {
    id: 'starter', kind: 'starter', stars: 49, once: true, leaves: 300, form: 'albo', item: 'pot_khokhloma', title: 'Стартовый пакет',
    desc: 'Один раз и с большой скидкой: редкий черенок «Монстера Альбо», горшок «Хохлома» и 300 листиков.',
  },
  { id: 'place_9', kind: 'place', stars: 25, slot: 9, once: true, title: 'Место у стекла', desc: 'Четвёртое место у стекла на всех подоконниках.' },
  { id: 'place_10', kind: 'place', stars: 35, slot: 10, once: true, title: 'Место на столике', desc: 'Четвёртое место на столике на всех подоконниках.' },
  {
    id: 'plus_gift', kind: 'plus_gift', stars: 99, title: 'Садовник+ в подарок',
    desc: 'Месяц «Садовник+» для друга. Пришлём ссылку-подарок — отправь её кому захочешь.',
  },
  ...FORMS.filter((f) => !f.event).map((f): Product => ({
    id: `form_${f.id}`, kind: 'form', form: f.id, stars: f.sp === 'monstera' || f.sp === 'ficus' ? 75 : 50,
    title: `Черенок: ${f.name}`, desc: f.desc,
  })),
];

export const PRODUCT_BY_ID: Record<string, Product> = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));
