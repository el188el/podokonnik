// Магазин за листики. Позже сюда же добавятся товары за Telegram Stars.

export type ShopCat = 'pots' | 'decor' | 'care' | 'packs';

export interface ShopItem {
  id: string;
  cat: ShopCat;
  name: string;
  icon: string;
  price: number;
  desc: string;
  consumable?: boolean;
  months?: number[];  // сезонный товар
  eventOnly?: boolean; // только из сезонного пропуска, в магазине не продаётся
  pack?: string[];    // набор: что входит
  level?: number;
}

export const POTS: Record<string, { name: string; body: string; rim: string; pattern?: 'gzhel' | 'khokhloma' | 'enamel' | 'glass' | 'concrete' | 'gold' | 'autumn' | 'snow' | 'pastel' }> = {
  terracotta: { name: 'Глиняный', body: '#E07A55', rim: '#c9603d' },
  white: { name: 'Белая керамика', body: '#f4f1ea', rim: '#dcd6ca' },
  gzhel: { name: 'Гжель', body: '#f7f8fc', rim: '#2d4fa8', pattern: 'gzhel' },
  khokhloma: { name: 'Хохлома', body: '#1d1a19', rim: '#c8352b', pattern: 'khokhloma' },
  enamel: { name: 'Эмалированная кружка', body: '#f2efe6', rim: '#2f4f8a', pattern: 'enamel' },
  glass: { name: 'Прозрачный', body: '#cfe9ef', rim: '#9fcbd6', pattern: 'glass' },
  concrete: { name: 'Бетон', body: '#a9a9a4', rim: '#8e8e89', pattern: 'concrete' },
  gold: { name: 'Золотой (Садовник+)', body: '#e9b949', rim: '#c8952a', pattern: 'gold' },
  autumn: { name: 'Осенний', body: '#c4622d', rim: '#8a3f1c', pattern: 'autumn' },
  snow: { name: 'Снежный', body: '#e9f3fb', rim: '#9cc3e6', pattern: 'snow' },
  pastel: { name: 'Пастельный', body: '#f6d6e2', rim: '#b9e3d0', pattern: 'pastel' },
};

export const ITEMS: ShopItem[] = [
  // горшки (скины)
  { id: 'pot_white', cat: 'pots', name: 'Белая керамика', icon: '🤍', price: 30, desc: 'Чистый скандинавский стиль.' },
  { id: 'pot_concrete', cat: 'pots', name: 'Бетонный', icon: '🩶', price: 50, desc: 'Лофт на подоконнике.' },
  { id: 'pot_glass', cat: 'pots', name: 'Прозрачный', icon: '🫙', price: 45, desc: 'Видно корни. Орхидеи такой обожают.' },
  { id: 'pot_gzhel', cat: 'pots', name: 'Гжель', icon: '💙', price: 80, desc: 'Синие узоры по белому фарфору.', level: 3 },
  { id: 'pot_khokhloma', cat: 'pots', name: 'Хохлома', icon: '❤️', price: 90, desc: 'Золото и киноварь на чёрном.', level: 4 },
  { id: 'pot_enamel', cat: 'pots', name: 'Эмалированная кружка', icon: '☕', price: 60, desc: 'Та самая, с синим ободком.' },

  // декор (ставится на подоконник)
  { id: 'tulle', cat: 'decor', name: 'Тюль', icon: '🪟', price: 60, desc: 'Белая занавеска в цветочек.' },
  { id: 'cat', cat: 'decor', name: 'Кот Барсик', icon: '🐈', price: 120, desc: 'Спит на подоконнике. Растения не трогает. Почти.' },
  { id: 'radio', cat: 'decor', name: 'Советское радио', icon: '📻', price: 90, desc: '«Маяк» тихонько играет по утрам.' },
  { id: 'vase', cat: 'decor', name: 'Хрустальная вазочка', icon: '🏺', price: 70, desc: 'Из серванта, для красоты.' },
  { id: 'books', cat: 'decor', name: 'Стопка книг', icon: '📚', price: 40, desc: 'Справочник цветовода сверху.' },
  { id: 'lamp', cat: 'decor', name: 'Фитолампа', icon: '💡', price: 150, desc: '+1 к свету на этом подоконнике. Спасение для северных окон и зимы.', level: 3 },
  { id: 'garland', cat: 'decor', name: 'Гирлянда', icon: '✨', price: 80, desc: 'Новогодний огонёк на окне. Только в декабре и январе.', months: [12, 1] },

  // эксклюзивы ивентов (выдаются сезонным пропуском)
  { id: 'pot_autumn', cat: 'pots', name: 'Горшок «Осенний»', icon: '🍁', price: 0, desc: 'Ржаво-рыжий горшок с кленовым листом.', eventOnly: true },
  { id: 'pot_snow', cat: 'pots', name: 'Горшок «Снежный»', icon: '⛄', price: 0, desc: 'Голубой, в снежинках.', eventOnly: true },
  { id: 'pot_pastel', cat: 'pots', name: 'Горшок «Пастельный»', icon: '🌸', price: 0, desc: 'Нежно-розовый с мятным ободком.', eventOnly: true },
  { id: 'plaid', cat: 'decor', name: 'Клетчатый плед', icon: '🧣', price: 0, desc: 'Для осенних вечеров у окна.', eventOnly: true },
  { id: 'pumpkin', cat: 'decor', name: 'Тыква', icon: '🎃', price: 0, desc: 'Урожай с дачи.', eventOnly: true },
  { id: 'lantern', cat: 'decor', name: 'Фонарик', icon: '🏮', price: 0, desc: 'Тёплый свет в сумерках.', eventOnly: true },
  { id: 'tangerines', cat: 'decor', name: 'Мандарины', icon: '🍊', price: 0, desc: 'Запах Нового года.', eventOnly: true },
  { id: 'tree', cat: 'decor', name: 'Ёлочка', icon: '🎄', price: 0, desc: 'Маленькая, но настоящая.', eventOnly: true },
  { id: 'tulips', cat: 'decor', name: 'Тюльпаны', icon: '🌷', price: 0, desc: 'Букет в банке.', eventOnly: true },
  { id: 'birdhouse', cat: 'decor', name: 'Скворечник', icon: '🐦', price: 0, desc: 'Скворцы вернулись!', eventOnly: true },
  { id: 'watering_can', cat: 'decor', name: 'Лейка-чайник', icon: '🫖', price: 0, desc: 'Бабушкин чайник, теперь лейка.', eventOnly: true },

  // уход
  { id: 'feed', cat: 'care', name: 'Подкормка', icon: '🧪', price: 15, desc: 'Сутки растение растёт в 1,5 раза быстрее.', consumable: true },
  { id: 'potL', cat: 'care', name: 'Большой горшок (L)', icon: '🪴', price: 25, desc: 'Для пересадки взрослого растения, когда ему тесно.', consumable: true },
  { id: 'neighbor7', cat: 'care', name: 'Соседка на неделю', icon: '👵', price: 60, desc: 'Соседка поливает 7 дней, даже если бесплатный отпуск уже был.', consumable: true },

  // наборы
  {
    id: 'pack_babushka', cat: 'packs', name: '«Бабушкин подоконник»', icon: '🧶', price: 280,
    desc: 'Тюль, кот, советское радио, хрустальная вазочка и горшок-кружка. Выгоднее на 120 листиков.',
    pack: ['tulle', 'cat', 'radio', 'vase', 'pot_enamel'],
  },
];

export const ITEM_BY_ID: Record<string, ShopItem> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
export const DECOR_IDS = ITEMS.filter((i) => i.cat === 'decor').map((i) => i.id);
export const potIdOf = (itemId: string) => itemId.replace(/^pot_/, '');
