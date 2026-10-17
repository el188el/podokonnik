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
  needs?: string;      // сначала нужно купить этот товар
  pack?: string[];    // набор: что входит
  gives?: string;     // покупка добавляет count штук этого предмета
  count?: number;
  level?: number;
  group?: string;     // подзаголовок внутри раздела
  size?: number;      // горшок размера 1 S … 4 XL
  shape?: string;     // форма горшка
}

/** Формы горшков: покупаются один раз, выбираются в карточке растения. */
export const POT_SHAPES: Record<string, { name: string }> = {
  classic: { name: 'Классика' },
  cylinder: { name: 'Цилиндр' },
  belly: { name: 'Пузатый' },
  cube: { name: 'Куб' },
  bowl: { name: 'Пиала' },
  legs: { name: 'На ножках' },
};

export const POTS: Record<string, { name: string; body: string; rim: string; pattern?: 'gzhel' | 'khokhloma' | 'enamel' | 'glass' | 'concrete' | 'gold' | 'autumn' | 'snow' | 'pastel' | 'marble' | 'terrazzo' | 'stripes' }> = {
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
  mint: { name: 'Мятный', body: '#bfe6d3', rim: '#93cdb1' },
  pink: { name: 'Пудровый', body: '#f3cfc9', rim: '#e0aea6' },
  black: { name: 'Матовый чёрный', body: '#34343a', rim: '#24242a' },
  marble: { name: 'Мрамор', body: '#f2f0ec', rim: '#d8d4cc', pattern: 'marble' },
  terrazzo: { name: 'Терраццо', body: '#ece6dc', rim: '#d3cabb', pattern: 'terrazzo' },
  stripes: { name: 'Полоска', body: '#f4f1ea', rim: '#2f4f8a', pattern: 'stripes' },
  ochre: { name: 'Охра', body: '#d9a441', rim: '#b9852a' },
};

export const ITEMS: ShopItem[] = [
  // горшки: под каждое растение нужен свой, и растёт он вместе с растением
  { id: 'pot', cat: 'pots', group: '📏 Размеры', size: 1, name: 'Горшок S', icon: '🪴', price: 10, desc: 'Маленький — для только что укоренённого черенка.', consumable: true },
  { id: 'pot5', cat: 'pots', group: '📏 Размеры', size: 1, name: 'Пять горшков S', icon: '🪴', price: 40, desc: 'Запас на целый подоконник — выгоднее на 20%.', consumable: true, gives: 'pot', count: 5 },
  { id: 'pot12', cat: 'pots', group: '📏 Размеры', size: 1, name: 'Двенадцать горшков S', icon: '🪴', price: 90, desc: 'Для большой оранжереи — выгоднее на 25%.', consumable: true, gives: 'pot', count: 12, level: 5 },
  { id: 'potM', cat: 'pots', group: '📏 Размеры', size: 2, name: 'Горшок M', icon: '🪴', price: 15, desc: 'Подростку уже тесно в S: без пересадки он грустит и не растёт.', consumable: true },
  { id: 'potL', cat: 'pots', group: '📏 Размеры', size: 3, name: 'Горшок L', icon: '🪴', price: 25, desc: 'Для взрослого растения.', consumable: true },
  { id: 'potXL', cat: 'pots', group: '📏 Размеры', size: 4, name: 'Горшок XL', icon: '🪴', price: 45, desc: 'Простор для взрослого: черенки отрастают на 25% быстрее.', consumable: true, level: 3 },
  { id: 'pots_grow', cat: 'pots', group: '📏 Размеры', size: 2, name: 'Набор «На вырост»', icon: '📦', price: 100, desc: '2 горшка M, 2 L и XL — пересадок хватит надолго. Выгоднее на 25 листиков.', consumable: true, pack: ['potM', 'potM', 'potL', 'potL', 'potXL'] },
  // формы (один раз — навсегда)
  { id: 'shape_cylinder', cat: 'pots', group: '🔷 Формы', shape: 'cylinder', name: 'Цилиндр', icon: '🥫', price: 40, desc: 'Ровные стенки — строго и современно.' },
  { id: 'shape_belly', cat: 'pots', group: '🔷 Формы', shape: 'belly', name: 'Пузатый', icon: '🏺', price: 55, desc: 'Круглый, как бабушкин горшок для герани.' },
  { id: 'shape_bowl', cat: 'pots', group: '🔷 Формы', shape: 'bowl', name: 'Пиала', icon: '🥣', price: 50, desc: 'Низкая и широкая — суккуленты и кактусы в восторге.' },
  { id: 'shape_cube', cat: 'pots', group: '🔷 Формы', shape: 'cube', name: 'Куб', icon: '🧊', price: 60, desc: 'Квадратный кашпо в стиле лофт.', level: 3 },
  { id: 'shape_legs', cat: 'pots', group: '🔷 Формы', shape: 'legs', name: 'На ножках', icon: '🪑', price: 90, desc: 'Мид-сенчури: горшок на деревянных ножках.', level: 5 },
  // дизайны горшков (покупаются один раз — навсегда)
  { id: 'pot_mint', cat: 'pots', group: '🎨 Цвета и узоры', name: 'Мятный', icon: '💚', price: 30, desc: 'Свежий и нежный.' },
  { id: 'pot_pink', cat: 'pots', group: '🎨 Цвета и узоры', name: 'Пудровый', icon: '🩷', price: 30, desc: 'Пыльная роза — модно и уютно.' },
  { id: 'pot_ochre', cat: 'pots', group: '🎨 Цвета и узоры', name: 'Охра', icon: '💛', price: 35, desc: 'Тёплый горчичный — как осеннее солнце.' },
  { id: 'pot_white', cat: 'pots', group: '🎨 Цвета и узоры', name: 'Белая керамика', icon: '🤍', price: 30, desc: 'Чистый скандинавский стиль.' },
  { id: 'pot_black', cat: 'pots', name: 'Матовый чёрный', icon: '🖤', price: 50, desc: 'Зелень на чёрном смотрится ярче.' },
  { id: 'pot_stripes', cat: 'pots', name: 'Полоска', icon: '⚓', price: 55, desc: 'Морская тельняшка.' },
  { id: 'pot_terrazzo', cat: 'pots', name: 'Терраццо', icon: '🍪', price: 70, desc: 'Разноцветная крошка, как в итальянском кафе.', level: 3 },
  { id: 'pot_marble', cat: 'pots', name: 'Мрамор', icon: '🤍', price: 95, desc: 'Белый с серыми прожилками — роскошь.', level: 6 },
  { id: 'pot_concrete', cat: 'pots', name: 'Бетонный', icon: '🩶', price: 50, desc: 'Лофт на подоконнике.' },
  { id: 'pot_glass', cat: 'pots', name: 'Прозрачный', icon: '🫙', price: 45, desc: 'Видно корни. Орхидеи такой обожают.' },
  { id: 'pot_gzhel', cat: 'pots', name: 'Гжель', icon: '💙', price: 80, desc: 'Синие узоры по белому фарфору.', level: 3 },
  { id: 'pot_khokhloma', cat: 'pots', name: 'Хохлома', icon: '❤️', price: 90, desc: 'Золото и киноварь на чёрном.', level: 4 },
  { id: 'pot_enamel', cat: 'pots', name: 'Эмалированная кружка', icon: '☕', price: 60, desc: 'Та самая, с синим ободком.' },

  // декор (ставится на подоконник)
  { id: 'tulle', cat: 'decor', place: 'window', name: 'Тюль', icon: '🪟', price: 60, desc: 'Белая занавеска в цветочек. Эффект: рассеивает прямое солнце у стекла — нет ожогов, но светолюбивым становится темновато.' },
  { id: 'cat2', cat: 'decor', place: 'sill', name: 'Кошка Мурка', icon: '🐈', price: 180, needs: 'cat', desc: 'Второй котик — вдвоём веселее. Окрас можно выбрать в «Цветах комнаты».' },
  { id: 'cat3', cat: 'decor', place: 'sill', name: 'Кот Пушок', icon: '🐈‍⬛', price: 240, needs: 'cat2', desc: 'Третий котик — настоящая кошачья семья. Больше котиков на подоконнике не поместится.' },
  { id: 'cat', cat: 'decor', place: 'sill', name: 'Кот Барсик', icon: '🐈', price: 120, desc: 'Нажми — погладь (раз в день +5 🍃). Но иногда жуёт хлорофитум и папоротник и сидит в горшках. Ядовитые растения обходит стороной.' },
  { id: 'radio', cat: 'decor', place: 'sill', name: 'Советское радио', icon: '📻', price: 90, desc: '«Маяк» тихонько играет. Пока радио включено, растения на этом подоконнике растут на 5% быстрее. Нажми — включить или выключить.' },
  { id: 'vase', cat: 'decor', place: 'table', name: 'Хрустальная вазочка', icon: '🏺', price: 70, desc: 'Из серванта, для красоты.' },
  { id: 'books', cat: 'decor', place: 'table', name: 'Стопка книг', icon: '📚', price: 40, desc: 'Справочник цветовода сверху.' },
  { id: 'lamp', cat: 'decor', place: 'window', name: 'Фитолампа', icon: '💡', price: 150, desc: 'Висит над растениями у окна и светит фиолетовым: +1 к свету и +15% к росту верхнего ряда (столику достаётся +5%). Спасение для северных окон и зимы. Нажми — включить или выключить.', level: 3 },
  { id: 'lamp_table', cat: 'decor', place: 'table', name: 'Настольная фитолампа', icon: '🔦', price: 260, desc: 'Светит на столик: +1 к свету и +15% к росту нижнего ряда. Вместе с оконной — весь подоконник под лампами. Нажми — включить или выключить.', level: 4 },
  { id: 'garland', cat: 'decor', place: 'window', name: 'Гирлянда', icon: '✨', price: 80, desc: 'Новогодний огонёк на окне. Только в декабре и январе.', months: [12, 1] },

  // ещё декор: окно
  { id: 'paper_snow', cat: 'decor', place: 'window', name: 'Бумажные снежинки', icon: '❄️', price: 40, desc: 'Вырезанные из салфеток и приклеенные на стекло.', months: [12, 1, 2] },
  { id: 'feeder', cat: 'decor', place: 'window', name: 'Кормушка за окном', icon: '🐦', price: 90, desc: 'Синички прилетают в гости.' },
  { id: 'cat_bed', cat: 'decor', place: 'window', name: 'Лежанка на окно', icon: '🐈', price: 120, desc: 'Гамак на присосках прямо на стекле. Котик будет спать в нём чаще всего — и не мешать цветам.' },
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
  { id: 'fan', cat: 'decor', place: 'sill', name: 'Вентилятор', icon: '🌀', price: 140, desc: 'Тот самый, советский. В жару −2° в комнате, проветривает: мошек и плесени меньше. Включается в «Климате».' },
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
  { id: 'humidifier', cat: 'decor', place: 'sill', name: 'Увлажнитель', icon: '💨', price: 180, desc: '+22% к влажности воздуха. Зимой батареи сушат воздух до 25–30% — клещ этому рад, а любители влажности чахнут. Включается в «Климате».', level: 5 },
  { id: 'heater', cat: 'decor', place: 'table', name: 'Обогреватель', icon: '♨️', price: 220, desc: '+4° в комнате, но сушит воздух. Спасает теплолюбивых от холода у стекла и сквозняков.', level: 3 },
  { id: 'hygrometer', cat: 'decor', place: 'sill', name: 'Термогигрометр', icon: '🌡️', price: 50, desc: 'Показывает точную температуру и влажность воздуха и предупреждает, если растениям неуютно.' },
  { id: 'curtains', cat: 'decor', place: 'window', name: 'Плотные шторы', icon: '🎐', price: 70, desc: 'Задёрни — и свет у стекла станет мягче (−2), в глубине (−1). Спасают от летнего пекла на южном окне.' },
  { id: 'net', cat: 'decor', place: 'window', name: 'Москитная сетка', icon: '🕸️', price: 60, desc: 'Открытая форточка без сетки — и в комнату летят тля и мошки. С сеткой проветривать можно спокойно.' },
  // уход
  { id: 'soil', cat: 'care', name: 'Свежий грунт', icon: '🟫', price: 30, desc: 'Пересадка в сухую землю: спасает от перелива, корневой гнили и мошек.', consumable: true },
  { id: 'drain', cat: 'care', name: 'Керамзит для дренажа', icon: '🪨', price: 20, desc: 'Насыпается в горшок навсегда: лишняя вода уходит вчетверо быстрее, гниль и мошки — реже.', consumable: true },
  { id: 'meter', cat: 'care', name: 'Влагомер', icon: '📟', price: 70, desc: 'Показывает влажность каждого горшка и не даёт залить мокрую землю. Покупается навсегда.' },
  { id: 'boost', cat: 'care', name: 'Стимулятор роста', icon: '⚡', price: 40, desc: 'Сутки растение растёт вдвое быстрее. Не чаще раза в неделю на растение и 3 в день — иначе истощится.', consumable: true, level: 3 },
  { id: 'boost5', cat: 'care', name: 'Пять стимуляторов', icon: '⚡', price: 160, desc: 'Запас стимуляторов роста — выгоднее на 20%.', consumable: true, gives: 'boost', count: 5, level: 3 },
  { id: 'feed', cat: 'care', name: 'Подкормка', icon: '🧪', price: 15, desc: 'Сутки растение растёт в 1,5 раза быстрее.', consumable: true },
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
    id: 'pack_starter', cat: 'packs', name: '«Старт садовода»', icon: '🌱', price: 110,
    desc: 'Влагомер, 2 горшка M, подкормка ×2 и керамзит. Выгоднее на 40 листиков.',
    pack: ['meter', 'potM', 'potM', 'feed', 'feed', 'drain'],
  },
  {
    id: 'pack_aid', cat: 'packs', name: '«Аптечка цветовода»', icon: '🩺', price: 70,
    desc: 'Мыльный раствор, ловушки, Фитоспорин, Фитоверм и свежий грунт — на любой случай. Выгоднее на 25 листиков.',
    pack: ['soap', 'traps', 'fungicide', 'acaricide', 'soil'],
  },
  {
    id: 'pack_scandi', cat: 'packs', name: '«Сканди»', icon: '🤍', price: 140,
    desc: 'Белая керамика, горшки-цилиндры, стопка книг и свеча. Выгоднее на 40 листиков.',
    pack: ['pot_white', 'shape_cylinder', 'books', 'candle', 'tea'],
  },
  {
    id: 'pack_loft', cat: 'packs', name: '«Лофт»', icon: '🧱', price: 260, level: 5,
    desc: 'Кирпичная стена, матовые чёрные кубы-кашпо и бетонный горшок. Выгоднее на 70 листиков.',
    pack: ['wp_brick', 'pot_black', 'shape_cube', 'pot_concrete'],
  },
  {
    id: 'pack_cats', cat: 'packs', name: '«Кошачий рай»', icon: '🐾', price: 300,
    desc: 'Кот Барсик, кошка Мурка, кошачья трава и клубок. Выгоднее на 90 листиков.',
    pack: ['cat', 'cat2', 'catgrass', 'yarn'],
  },
  {
    id: 'pack_climate', cat: 'packs', name: '«Климат-контроль»', icon: '🌡️', price: 360, level: 4,
    desc: 'Увлажнитель, термогигрометр, обогреватель и москитная сетка — растения скажут спасибо зимой и летом. Выгоднее на 150 листиков.',
    pack: ['humidifier', 'hygrometer', 'heater', 'net'],
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

/** За сколько листиков можно продать предмет: 40% цены. Только декор за листики — не котики и не награды. */
export const SELL_SHARE = 0.4;
export function sellPrice(id: string) {
  const it = ITEM_BY_ID[id];
  if (!it || it.cat !== 'decor' || it.consumable || it.eventOnly || it.album || it.price <= 0 || /^cat\d?$/.test(id)) return 0;
  return Math.max(1, Math.round(it.price * SELL_SHARE));
}
export const placeOf = (id: string): DecorPlace => ITEM_BY_ID[id]?.place ?? 'sill';
