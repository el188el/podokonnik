// Магазин за листики. Позже сюда же добавятся товары за Telegram Stars.

export type ShopCat = 'pots' | 'decor' | 'care' | 'packs';
/** Куда ставится декор: на стекло, на подоконник, на столик или на стену. */
export type DecorPlace = 'window' | 'sill' | 'table' | 'wall' | 'wallpaper' | 'spot';

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
  album?: boolean;     // награда за полную полку альбома
  place?: DecorPlace;  // где стоит декор
  pack?: string[];    // набор: что входит
  gives?: string;     // покупка добавляет count штук этого предмета
  count?: number;
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
  cozy: { name: 'Вязаный', body: '#c8d8e8', rim: '#8aa6c1', pattern: 'snow' },
  berry: { name: 'Земляничный', body: '#e8616f', rim: '#3f8f4e', pattern: 'pastel' },
  sun: { name: 'Солнечный', body: '#f7c844', rim: '#e08a2c' },
  apple: { name: 'Яблочный', body: '#a8cf6a', rim: '#d9483b', pattern: 'autumn' },
};

export const ITEMS: ShopItem[] = [
  // горшки: под каждое растение нужен свой
  { id: 'pot', cat: 'pots', name: 'Глиняный горшок', icon: '🪴', price: 10, desc: 'Под каждое растение — свой горшок. Цвет и узор задаёт дизайн.', consumable: true },
  { id: 'pot5', cat: 'pots', name: 'Пять горшков', icon: '🪴', price: 40, desc: 'Запас на целый подоконник — выгоднее на 20%.', consumable: true, gives: 'pot', count: 5 },
  { id: 'pot12', cat: 'pots', name: 'Двенадцать горшков', icon: '🪴', price: 90, desc: 'Для большой оранжереи — выгоднее на 25%.', consumable: true, gives: 'pot', count: 12, level: 5 },
  // дизайны горшков (покупаются один раз — навсегда)
  { id: 'pot_white', cat: 'pots', name: 'Белая керамика', icon: '🤍', price: 30, desc: 'Чистый скандинавский стиль.' },
  { id: 'pot_concrete', cat: 'pots', name: 'Бетонный', icon: '🩶', price: 50, desc: 'Лофт на подоконнике.' },
  { id: 'pot_glass', cat: 'pots', name: 'Прозрачный', icon: '🫙', price: 45, desc: 'Видно корни. Орхидеи такой обожают.' },
  { id: 'pot_gzhel', cat: 'pots', name: 'Гжель', icon: '💙', price: 80, desc: 'Синие узоры по белому фарфору.', level: 3 },
  { id: 'pot_khokhloma', cat: 'pots', name: 'Хохлома', icon: '❤️', price: 90, desc: 'Золото и киноварь на чёрном.', level: 4 },
  { id: 'pot_enamel', cat: 'pots', name: 'Эмалированная кружка', icon: '☕', price: 60, desc: 'Та самая, с синим ободком.' },

  // декор (ставится на подоконник)
  { id: 'tulle', cat: 'decor', place: 'window', name: 'Тюль', icon: '🪟', price: 60, desc: 'Белая занавеска в цветочек. Эффект: рассеивает прямое солнце у стекла — нет ожогов, но светолюбивым становится темновато.' },
  { id: 'cat', cat: 'decor', place: 'sill', name: 'Кот Барсик', icon: '🐈', price: 120, desc: 'Нажми — погладь (раз в день +5 🍃). Но иногда жуёт хлорофитум и папоротник и сидит в горшках. Ядовитые растения обходит стороной.' },
  { id: 'radio', cat: 'decor', place: 'sill', name: 'Советское радио', icon: '📻', price: 90, desc: '«Маяк» тихонько играет. Пока радио включено, растения на этом подоконнике растут на 5% быстрее. Нажми — включить или выключить.' },
  { id: 'vase', cat: 'decor', place: 'table', name: 'Хрустальная вазочка', icon: '🏺', price: 70, desc: 'Из серванта, для красоты.' },
  { id: 'books', cat: 'decor', place: 'table', name: 'Стопка книг', icon: '📚', price: 40, desc: 'Справочник цветовода сверху.' },
  { id: 'lamp', cat: 'decor', place: 'window', name: 'Фитолампа', icon: '💡', price: 150, desc: 'Висит над растениями и светит фиолетовым: +1 к свету на этом подоконнике. Спасение для северных окон и зимы. Нажми на неё — включить или выключить.', level: 3 },
  { id: 'garland', cat: 'decor', place: 'window', name: 'Гирлянда', icon: '✨', price: 80, desc: 'Новогодний огонёк на окне. Только в декабре и январе.', months: [12, 1] },

  // ещё декор: окно
  { id: 'paper_snow', cat: 'decor', place: 'window', name: 'Бумажные снежинки', icon: '❄️', price: 40, desc: 'Вырезанные из салфеток и приклеенные на стекло.', months: [12, 1, 2] },
  { id: 'feeder', cat: 'decor', place: 'window', name: 'Кормушка за окном', icon: '🐦', price: 90, desc: 'Синички прилетают в гости.' },
  { id: 'suncatcher', cat: 'decor', place: 'window', name: 'Ловец солнца', icon: '🌈', price: 110, desc: 'Пускает радуги по комнате.', level: 4 },
  // подоконник
  { id: 'matryoshka', cat: 'decor', place: 'sill', name: 'Матрёшка', icon: '🪆', price: 70, desc: 'Внутри ещё шесть.' },
  { id: 'pickles', cat: 'decor', place: 'sill', name: 'Банка огурцов', icon: '🥒', price: 50, desc: 'Бабушкины закатки зреют на окне.' },
  { id: 'candle', cat: 'decor', place: 'sill', name: 'Свеча', icon: '🕯️', price: 40, desc: 'Для уютных вечеров. Нажми — зажечь или задуть.' },
  { id: 'alarm', cat: 'decor', place: 'sill', name: 'Будильник', icon: '⏰', price: 60, desc: 'Звенит, когда пора поливать. Шутка.' },
  { id: 'cactus_mini', cat: 'decor', place: 'sill', name: 'Кактусёнок', icon: '🌵', price: 30, desc: 'Пластиковый, поливать не надо.' },
  // столик
  { id: 'tea', cat: 'decor', place: 'table', name: 'Чашка чая', icon: '☕', price: 30, desc: 'С бергамотом.' },
  { id: 'piggy', cat: 'decor', place: 'table', name: 'Копилка-свинка', icon: '🐷', price: 80, desc: 'Копит листики.' },
  { id: 'yarn', cat: 'decor', place: 'table', name: 'Клубок и спицы', icon: '🧶', price: 50, desc: 'Шарф для монстеры почти готов.' },
  { id: 'magazines', cat: 'decor', place: 'table', name: 'Журналы «Цветоводство»', icon: '📰', price: 40, desc: 'Подшивка за 1987 год.' },
  { id: 'teapot', cat: 'decor', place: 'table', name: 'Заварочный чайник', icon: '🫖', price: 60, desc: 'В горошек.' },
  // стена
  { id: 'carpet', cat: 'decor', place: 'wall', name: 'Ковёр на стене', icon: '🟥', price: 160, desc: 'Тот самый, с узорами. Классика.', level: 3 },
  { id: 'clock', cat: 'decor', place: 'wall', name: 'Часы с маятником', icon: '🕰️', price: 120, desc: 'Тик-так. Показывают настоящее время.' },
  { id: 'painting', cat: 'decor', place: 'wall', name: 'Картина «Утро в лесу»', icon: '🖼️', price: 140, desc: 'Мишки на поваленном дереве.', level: 5 },
  { id: 'calendar', cat: 'decor', place: 'wall', name: 'Отрывной календарь', icon: '📅', price: 50, desc: 'С советами садоводу на каждый день.' },
  { id: 'shelf', cat: 'decor', place: 'wall', name: 'Полочка с безделушками', icon: '🏺', price: 100, desc: 'Слоники, ракушка и фото с моря.', level: 4 },

  // эксклюзивы ивентов (выдаются сезонным пропуском)
  { id: 'pot_autumn', cat: 'pots', name: 'Горшок «Осенний»', icon: '🍁', price: 0, desc: 'Ржаво-рыжий горшок с кленовым листом.', eventOnly: true },
  { id: 'pot_snow', cat: 'pots', name: 'Горшок «Снежный»', icon: '⛄', price: 0, desc: 'Голубой, в снежинках.', eventOnly: true },
  { id: 'pot_pastel', cat: 'pots', name: 'Горшок «Пастельный»', icon: '🌸', price: 0, desc: 'Нежно-розовый с мятным ободком.', eventOnly: true },
  { id: 'pot_cozy', cat: 'pots', name: 'Горшок «Вязаный»', icon: '🧣', price: 0, desc: 'Голубой, будто в тёплом свитере.', eventOnly: true },
  { id: 'pot_berry', cat: 'pots', name: 'Горшок «Земляничный»', icon: '🍓', price: 0, desc: 'Алый с зелёным ободком, как ягода.', eventOnly: true },
  { id: 'pot_sun', cat: 'pots', name: 'Горшок «Солнечный»', icon: '☀️', price: 0, desc: 'Жёлтый, как июльский полдень.', eventOnly: true },
  { id: 'pot_apple', cat: 'pots', name: 'Горшок «Яблочный»', icon: '🍏', price: 0, desc: 'Зелёный с красной каймой.', eventOnly: true },
  { id: 'mittens', cat: 'decor', place: 'sill', name: 'Варежки', icon: '🧤', price: 0, desc: 'Сохнут на батарее под окном.', eventOnly: true },
  { id: 'cocoa', cat: 'decor', place: 'table', name: 'Какао с зефирками', icon: '☕', price: 0, desc: 'Для самых холодных вечеров.', eventOnly: true },
  { id: 'seedlings', cat: 'decor', place: 'sill', name: 'Рассада в стаканчиках', icon: '🌱', price: 0, desc: 'Помидоры для дачи — как у всех в мае.', eventOnly: true },
  { id: 'strawberry', cat: 'decor', place: 'table', name: 'Лукошко земляники', icon: '🍓', price: 0, desc: 'Первая ягода с грядки.', eventOnly: true },
  { id: 'lemonade', cat: 'decor', place: 'table', name: 'Домашний лимонад', icon: '🍋', price: 0, desc: 'С мятой и льдом.', eventOnly: true },
  { id: 'fan', cat: 'decor', place: 'sill', name: 'Вентилятор', icon: '🌀', price: 0, desc: 'Тот самый, советский. Гудит, но спасает.', eventOnly: true },
  { id: 'apples', cat: 'decor', place: 'table', name: 'Корзина яблок', icon: '🍎', price: 0, desc: 'Антоновка с дачи.', eventOnly: true },
  { id: 'jam', cat: 'decor', place: 'sill', name: 'Банка варенья', icon: '🍯', price: 0, desc: 'Яблочное, с корицей.', eventOnly: true },
  { id: 'plaid', cat: 'decor', place: 'table', name: 'Клетчатый плед', icon: '🧣', price: 0, desc: 'Для осенних вечеров у окна.', eventOnly: true },
  { id: 'pumpkin', cat: 'decor', place: 'sill', name: 'Тыква', icon: '🎃', price: 0, desc: 'Урожай с дачи.', eventOnly: true },
  { id: 'lantern', cat: 'decor', place: 'sill', name: 'Фонарик', icon: '🏮', price: 0, desc: 'Тёплый свет в сумерках.', eventOnly: true },
  { id: 'tangerines', cat: 'decor', place: 'table', name: 'Мандарины', icon: '🍊', price: 0, desc: 'Запах Нового года.', eventOnly: true },
  { id: 'tree', cat: 'decor', place: 'sill', name: 'Ёлочка', icon: '🎄', price: 0, desc: 'Маленькая, но настоящая.', eventOnly: true },
  { id: 'tulips', cat: 'decor', place: 'sill', name: 'Тюльпаны', icon: '🌷', price: 0, desc: 'Букет в банке.', eventOnly: true },
  { id: 'birdhouse', cat: 'decor', place: 'window', name: 'Скворечник', icon: '🐦', price: 0, desc: 'Скворцы вернулись!', eventOnly: true },
  { id: 'watering_can', cat: 'decor', place: 'table', name: 'Лейка-чайник', icon: '🫖', price: 0, desc: 'Бабушкин чайник, теперь лейка.', eventOnly: true },

  // интерьер: обои (одни на подоконник) и новые места для растений
  { id: 'wp_flowers', cat: 'decor', place: 'wallpaper', name: 'Обои в цветочек', icon: '🌼', price: 120, desc: 'Мелкий ситцевый цветок, как на даче.' },
  { id: 'wp_soviet', cat: 'decor', place: 'wallpaper', name: 'Обои «Хрущёвка»', icon: '🟫', price: 100, desc: 'Коричневые ромбы. Ностальгия гарантирована.' },
  { id: 'wp_mint', cat: 'decor', place: 'wallpaper', name: 'Мятная краска', icon: '🟩', price: 80, desc: 'Свежий спокойный цвет.' },
  { id: 'wp_stripes', cat: 'decor', place: 'wallpaper', name: 'Голубая полоска', icon: '🟦', price: 90, desc: 'Как в детской.' },
  { id: 'wp_wood', cat: 'decor', place: 'wallpaper', name: 'Деревянная вагонка', icon: '🪵', price: 150, desc: 'Тёплое дерево, будто на веранде.', level: 4 },
  { id: 'wp_brick', cat: 'decor', place: 'wallpaper', name: 'Кирпич', icon: '🧱', price: 140, desc: 'Лофт: кирпичная стена и зелень.', level: 5 },
  { id: 'hangers', cat: 'decor', place: 'spot', name: 'Подвесные кашпо', icon: '🪢', price: 300, desc: 'Три новых места над окном — для ампельных и маленьких растений. Света там много.', level: 6 },

  { id: 'gnome', cat: 'decor', place: 'sill', name: 'Садовый гном', icon: '🧙', price: 0, desc: 'Награда за пятерых приглашённых друзей. Охраняет подоконник.', eventOnly: true },
  // награды альбома редкостей
  { id: 'glass_dome', cat: 'decor', place: 'sill', name: 'Стеклянный купол', icon: '🔔', price: 0, desc: 'Под ним — самый ценный черенок коллекции.', eventOnly: true, album: true },
  { id: 'golden_can', cat: 'decor', place: 'table', name: 'Золотая лейка', icon: '🏆', price: 0, desc: 'Для тех, кто вывел небывалые цветы.', eventOnly: true, album: true },
  { id: 'herb_frame', cat: 'decor', place: 'wall', name: 'Гербарий в рамке', icon: '🖼️', price: 0, desc: 'Засушенные листья всех сезонов.', eventOnly: true, album: true },
  { id: 'bouquet', cat: 'decor', place: 'table', name: 'Букет-победитель', icon: '💐', price: 0, desc: 'Всё, что цвело на твоём подоконнике.', eventOnly: true, album: true },

  // уход: средства от вредителей и болезней
  { id: 'soap', cat: 'care', name: 'Мыльный раствор', icon: '🧼', price: 8, desc: 'От тли. Хозяйственное мыло и тёплая вода — бабушкин рецепт.', consumable: true },
  { id: 'traps', cat: 'care', name: 'Жёлтые ловушки', icon: '🟨', price: 12, desc: 'Клейкие ловушки от грибных мошек.', consumable: true },
  { id: 'fungicide', cat: 'care', name: 'Фитоспорин', icon: '💊', price: 20, desc: 'От корневой гнили и мучнистой росы.', consumable: true },
  { id: 'acaricide', cat: 'care', name: 'Фитоверм', icon: '🧴', price: 25, desc: 'От паутинного клеща, тли и мучнистого червеца.', consumable: true },
  { id: 'catgrass', cat: 'decor', place: 'table', name: 'Кошачья трава', icon: '🌾', price: 40, desc: 'Эффект: Барсик жуёт её, а не твои растения.' },
  { id: 'humidifier', cat: 'decor', place: 'sill', name: 'Увлажнитель', icon: '💨', price: 180, desc: 'Эффект: клещ заводится в 2,5 раза реже, любители влажности растут на 10% быстрее.', level: 5 },
  // уход
  { id: 'soil', cat: 'care', name: 'Свежий грунт', icon: '🟫', price: 30, desc: 'Пересадка в сухую землю: спасает от перелива, корневой гнили и мошек.', consumable: true },
  { id: 'drain', cat: 'care', name: 'Керамзит для дренажа', icon: '🪨', price: 20, desc: 'Насыпается в горшок навсегда: лишняя вода уходит вчетверо быстрее, гниль и мошки — реже.', consumable: true },
  { id: 'meter', cat: 'care', name: 'Влагомер', icon: '📟', price: 70, desc: 'Показывает влажность каждого горшка и не даёт залить мокрую землю. Покупается навсегда.' },
  { id: 'boost', cat: 'care', name: 'Стимулятор роста', icon: '⚡', price: 40, desc: 'Сутки растение растёт вдвое быстрее. Не чаще раза в неделю на растение и 3 в день — иначе истощится.', consumable: true, level: 3 },
  { id: 'boost5', cat: 'care', name: 'Пять стимуляторов', icon: '⚡', price: 160, desc: 'Запас стимуляторов роста — выгоднее на 20%.', consumable: true, gives: 'boost', count: 5, level: 3 },
  { id: 'feed', cat: 'care', name: 'Подкормка', icon: '🧪', price: 15, desc: 'Сутки растение растёт в 1,5 раза быстрее.', consumable: true },
  { id: 'potL', cat: 'care', name: 'Большой горшок (L)', icon: '🪴', price: 25, desc: 'Для пересадки взрослого растения, когда ему тесно.', consumable: true },
  { id: 'neighbor7', cat: 'care', name: 'Соседка на неделю', icon: '👵', price: 60, desc: 'Соседка поливает 7 дней, даже если бесплатный отпуск уже был.', consumable: true },

  // наборы
  {
    id: 'pack_babushka', cat: 'packs', name: '«Бабушкин подоконник»', icon: '🧶', price: 280,
    desc: 'Тюль, кот, советское радио, хрустальная вазочка и горшок-кружка. Выгоднее на 120 листиков.',
    pack: ['tulle', 'cat', 'radio', 'vase', 'pot_enamel'],
  },
  {
    id: 'pack_ussr', cat: 'packs', name: '«Квартира 80-х»', icon: '📺', price: 420, level: 5,
    desc: 'Ковёр на стене, часы с маятником, картина «Утро в лесу», матрёшка и журналы. Выгоднее на 100 листиков.',
    pack: ['carpet', 'clock', 'painting', 'matryoshka', 'magazines'],
  },
  {
    id: 'pack_cozy', cat: 'packs', name: '«Уютный вечер»', icon: '🕯️', price: 190,
    desc: 'Свеча, чашка чая, клубок со спицами и кормушка за окном.',
    pack: ['candle', 'tea', 'yarn', 'feeder'],
  },
];

export const ITEM_BY_ID: Record<string, ShopItem> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
export const DECOR_IDS = ITEMS.filter((i) => i.cat === 'decor').map((i) => i.id);
export const potIdOf = (itemId: string) => itemId.replace(/^pot_/, '');

export const placeOf = (id: string): DecorPlace => ITEM_BY_ID[id]?.place ?? 'sill';
