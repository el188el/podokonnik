// Гибридизация: опыли два цветущих растения одного вида — получишь семечко.
// Из него вырастет растение с цветами одного из родителей, соседнего оттенка
// или (редко) совсем нового, редкого цвета. Цвет передаётся черенкам и подаркам.

export interface Hue {
  id: string;
  name: string;
  color: string;
  rare?: boolean;
}

/** Палитры цветов. Первый цвет — исходный цвет вида. */
export const PALETTES: Record<string, Hue[]> = {
  violet: [
    { id: 'purple', name: 'фиолетовая', color: '#8a4fd1' },
    { id: 'blue', name: 'синяя', color: '#3f5fd1' },
    { id: 'sky', name: 'голубая', color: '#7fb2f0' },
    { id: 'pink', name: 'розовая', color: '#f07ab5' },
    { id: 'white', name: 'белая', color: '#fbfbf4' },
    { id: 'wine', name: 'бордовая', color: '#8e1f3c' },
    { id: 'coral', name: 'коралловая', color: '#ff7f6a' },
    { id: 'green', name: 'зелёная', color: '#b5e48c', rare: true },
  ],
  geranium: [
    { id: 'red', name: 'алая', color: '#e8453c' },
    { id: 'pink', name: 'розовая', color: '#f48fb1' },
    { id: 'salmon', name: 'лососевая', color: '#ff8a65' },
    { id: 'white', name: 'белая', color: '#fbfbf4' },
    { id: 'purple', name: 'лиловая', color: '#b05cc8' },
    { id: 'wine', name: 'вишнёвая', color: '#9c1c3c' },
    { id: 'peach', name: 'персиковая', color: '#ffc49b', rare: true },
  ],
  kalanchoe: [
    { id: 'orange', name: 'оранжевое', color: '#f36b3b' },
    { id: 'red', name: 'красное', color: '#d8323a' },
    { id: 'yellow', name: 'жёлтое', color: '#f6c445' },
    { id: 'pink', name: 'розовое', color: '#f27aa8' },
    { id: 'white', name: 'белое', color: '#fbf6ea' },
    { id: 'lilac', name: 'сиреневое', color: '#c39be0', rare: true },
  ],
  begonia: [
    { id: 'coral', name: 'коралловая', color: '#ff6f61' },
    { id: 'red', name: 'красная', color: '#d9283b' },
    { id: 'pink', name: 'розовая', color: '#f59ab5' },
    { id: 'white', name: 'белая', color: '#fbfbf4' },
    { id: 'orange', name: 'оранжевая', color: '#f7934c' },
    { id: 'yellow', name: 'лимонная', color: '#f7dd5a', rare: true },
  ],
  cyclamen: [
    { id: 'fuchsia', name: 'фуксия', color: '#e04f8f' },
    { id: 'white', name: 'белый', color: '#fbfbf4' },
    { id: 'red', name: 'красный', color: '#c8203e' },
    { id: 'pink', name: 'нежно-розовый', color: '#f6a9c6' },
    { id: 'violet', name: 'фиолетовый', color: '#9a4fb8', rare: true },
  ],
  hibiscus: [
    { id: 'red', name: 'алый', color: '#e02b3d' },
    { id: 'pink', name: 'розовый', color: '#f58bb0' },
    { id: 'orange', name: 'оранжевый', color: '#f7873d' },
    { id: 'yellow', name: 'жёлтый', color: '#f6cf3e' },
    { id: 'white', name: 'белый', color: '#fbfbf4' },
    { id: 'blue', name: 'голубой', color: '#8fb5e8', rare: true },
  ],
  cactus: [
    { id: 'pink', name: 'розовый', color: '#f48fb1' },
    { id: 'white', name: 'белый', color: '#fbfbf4' },
    { id: 'red', name: 'красный', color: '#e2384a' },
    { id: 'yellow', name: 'жёлтый', color: '#f6d046' },
    { id: 'orange', name: 'оранжевый', color: '#f58a3e', rare: true },
  ],
  rose: [
    { id: 'red', name: 'алая', color: '#e2465b' },
    { id: 'pink', name: 'розовая', color: '#f39ab8' },
    { id: 'white', name: 'белая', color: '#fbfbf4' },
    { id: 'yellow', name: 'жёлтая', color: '#f6d046' },
    { id: 'peach', name: 'чайная', color: '#f7b98e' },
    { id: 'blue', name: 'голубая', color: '#8fa8e8', rare: true },
  ],
  azalea: [
    { id: 'pink', name: 'розовая', color: '#ee6a9a' },
    { id: 'white', name: 'белая', color: '#fbfbf4' },
    { id: 'red', name: 'красная', color: '#d93a4a' },
    { id: 'lilac', name: 'сиреневая', color: '#b58ad8' },
    { id: 'salmon', name: 'лососевая', color: '#f7906e', rare: true },
  ],
};

export const canBreed = (spId: string) => !!PALETTES[spId];
export const hueOf = (spId: string, id?: string): Hue | undefined => (id ? PALETTES[spId]?.find((h) => h.id === id) : PALETTES[spId]?.[0]);
export const BREED_COOLDOWN = 24 * 3600e3;

/**
 * Цвет семечка: 65% — цвет одного из родителей, 28% — соседний по палитре
 * (обычный), 7% — редкий цвет (если его ещё не было в коллекции — шанс выше).
 */
export function crossHue(spId: string, a: string, b: string, rnd: () => number, known: string[] = []): string {
  const pal = PALETTES[spId];
  if (!pal) return a;
  const common = pal.filter((h) => !h.rare);
  const rare = pal.filter((h) => h.rare);
  const roll = rnd();
  const rareChance = known.some((k) => rare.some((r) => r.id === k)) ? 0.04 : 0.07;
  if (rare.length && roll < rareChance) return rare[Math.floor(rnd() * rare.length)].id;
  if (roll < rareChance + 0.28) {
    const idx = Math.max(0, common.findIndex((h) => h.id === (rnd() < 0.5 ? a : b)));
    const shift = rnd() < 0.5 ? -1 : 1;
    return common[(idx + shift + common.length) % common.length].id;
  }
  return rnd() < 0.5 ? a : b;
}
