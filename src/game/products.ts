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
  tier?: 2 | 3;   // 2 — очень редкая, 3 — легендарная (без пометки — просто редкая)
}

export const FORMS: Form[] = [
  { id: 'albo', sp: 'monstera', name: 'Монстера Альбо', art: { variegate: '#f3f2e8' }, desc: 'Белые мазки на каждом листе. Мечта любого цветовода.', tier: 2 },
  { id: 'neon', sp: 'scindapsus', name: 'Сциндапсус Неон', art: { leaf: '#9cc93a', leaf2: '#d4ec7a' }, desc: 'Яркий лаймовый цвет, будто светится.' },
  { id: 'tineke', sp: 'ficus', name: 'Фикус Тинеке', art: { leaf: '#4b7d3e', leaf2: '#e79aa8', variegate: '#eee5b0' }, desc: 'Кремовая кайма и розовые молодые листья.' },
  { id: 'nanouk', sp: 'tradescantia', name: 'Традесканция Нанук', art: { leaf: '#b45d9c', leaf2: '#f5cde6' }, desc: 'Розово-зелёные полоски, как зефир.' },
  { id: 'moonshine', sp: 'sansevieria', name: 'Сансевиерия Мунлайт', art: { leaf: '#a8c4b6', leaf2: '#7f9e8e' }, desc: 'Серебристо-мятная, почти лунная.' },
  { id: 'domino', sp: 'spathiphyllum', name: 'Спатифиллум Домино', art: { variegate: '#eef2e6' }, desc: 'Листья в белую крапинку.' },
  { id: 'chimera', sp: 'violet', name: 'Фиалка Химера', art: { flower: '#f07ab5' }, desc: 'Розовые цветы с белой полосой — каждая уникальна.' },
  { id: 'snow', sp: 'geranium', name: 'Герань Снежная', art: { flower: '#fbfbf4' }, desc: 'Белоснежные шапки соцветий.' },
  { id: 'pinkblush', sp: 'aloe', name: 'Алоэ Розовый румянец', art: { leaf: '#86ad7c', variegate: '#f5a9bc' }, desc: 'Листья с розовой каймой, будто смутились.' },
  { id: 'marblequeen', sp: 'scindapsus', name: 'Сциндапсус Марбл Квин', art: { variegate: '#f4f1e0' }, desc: 'Мраморные бело-зелёные листья.' },
  { id: 'krimson', sp: 'hoya', name: 'Хойя Криимсон Квин', art: { leaf2: '#f3c6d3', variegate: '#f6e7ee' }, desc: 'Молодые листья розовые, потом кремовые с зелёной серединкой.' },
  { id: 'raven', sp: 'zamioculcas', name: 'Замиокулькас Рэйвен', art: { leaf: '#2c3a2c' }, desc: 'Почти чёрные глянцевые листья — как вороново крыло.', tier: 2 },
  { id: 'blackprince', sp: 'rose', name: 'Роза Чёрный принц', art: { flower: '#6b1024' }, desc: 'Бархатные цветы цвета тёмной вишни.', tier: 2 },
  { id: 'whitefusion', sp: 'calathea', name: 'Калатея Уайт Фьюжн', art: { variegate: '#f3f3ea', leaf2: '#d9b8e8' }, desc: 'Белые и сиреневые мазки — каждый лист как акварель.', tier: 2 },
  { id: 'queen', sp: 'anthurium', name: 'Антуриум Чёрная королева', art: { flower: '#3a1626' }, desc: 'Почти чёрные глянцевые «сердечки».', tier: 2 },
  { id: 'thai', sp: 'monstera', name: 'Монстера Тай Констелейшн', art: { variegate: '#efe2a8' }, desc: 'Кремовые звёздные брызги на листьях. Легенда среди коллекционеров.', tier: 3 },
  { id: 'bluemoon', sp: 'orchid', name: 'Орхидея Голубая луна', art: { flower: '#7b97ea' }, desc: 'Небесно-голубые цветы. Встречается раз в сто лет — ну, почти.', tier: 3 },
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
/** Как часто выпадает форма каждого уровня редкости (относительные веса). */
export const TIER_WEIGHT = { 1: 6, 2: 3, 3: 1 } as const;
export const TIER_NAME = { 1: 'Редкая', 2: 'Очень редкая', 3: 'Легендарная' } as const;
export const tierOfForm = (f: Pick<Form, 'tier'>) => f.tier ?? 1;
/** Выбрать форму с учётом редкости: легендарные выпадают вшестеро реже обычных редких. */
export function pickForm(list: Form[], rnd: () => number): Form | undefined {
  const total = list.reduce((n, f) => n + TIER_WEIGHT[tierOfForm(f)], 0);
  let x = rnd() * total;
  for (const f of list) { x -= TIER_WEIGHT[tierOfForm(f)]; if (x < 0) return f; }
  return list[list.length - 1];
}

export type ProductKind = 'plus' | 'leaves' | 'form' | 'pass' | 'starter' | 'plus_gift' | 'place' | 'boost';

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
  count?: number; // сколько стимуляторов (для kind: 'boost')
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
    desc: 'Платная ветка наград текущего ивента: эксклюзивный горшок, декор, листики, подкормки, стимуляторы роста и редкая форма.',
  },
  {
    id: 'starter', kind: 'starter', stars: 49, once: true, leaves: 300, form: 'albo', item: 'pot_khokhloma', title: 'Стартовый пакет',
    desc: 'Один раз и с большой скидкой: редкий черенок «Монстера Альбо», горшок «Хохлома» и 300 листиков.',
  },
  { id: 'boost_s', kind: 'boost', stars: 25, count: 5, title: '5 стимуляторов', desc: 'Минус сутки до следующей стадии — для пяти растений.' },
  { id: 'boost_m', kind: 'boost', stars: 59, count: 15, title: '15 стимуляторов', desc: 'Выгоднее на 20% — хватит на весь подоконник на неделю.' },
  { id: 'boost_l', kind: 'boost', stars: 99, count: 30, title: '30 стимуляторов', desc: 'Выгоднее на 35% — для большой оранжереи.' },
  { id: 'place_9', kind: 'place', stars: 25, slot: 9, once: true, title: 'Место у стекла', desc: 'Четвёртое место у стекла на всех подоконниках.' },
  { id: 'place_10', kind: 'place', stars: 35, slot: 10, once: true, title: 'Место на столике', desc: 'Четвёртое место на столике на всех подоконниках.' },
  {
    id: 'plus_gift', kind: 'plus_gift', stars: 99, title: 'Садовник+ в подарок',
    desc: 'Месяц «Садовник+» для друга. Пришлём ссылку-подарок — отправь её кому захочешь.',
  },
  // легендарные формы не продаются: их можно только найти
  ...FORMS.filter((f) => !f.event && f.tier !== 3).map((f): Product => ({
    id: `form_${f.id}`, kind: 'form', form: f.id, stars: f.tier === 2 || f.sp === 'monstera' || f.sp === 'ficus' ? 75 : 50,
    title: `Черенок: ${f.name}`, desc: f.desc,
  })),
];

export const PRODUCT_BY_ID: Record<string, Product> = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));
