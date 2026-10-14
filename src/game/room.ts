// Цвета комнаты: стены, столик и подоконник. Бесплатно, у каждого подоконника — свои.

export interface Swatch { id: string; name: string; main: string; shade: string }

export const WALLS: Swatch[] = [
  { id: 'cream', name: 'Сливочные', main: '#f6ead8', shade: '#f2e3cd' },
  { id: 'mint', name: 'Мятные', main: '#d7efe3', shade: '#cbe8d9' },
  { id: 'sky', name: 'Голубые', main: '#dcebf7', shade: '#cfe2f2' },
  { id: 'rose', name: 'Пудровые', main: '#f6dfe1', shade: '#f1d3d6' },
  { id: 'lavender', name: 'Лавандовые', main: '#e6e0f3', shade: '#dcd4ee' },
  { id: 'sand', name: 'Песочные', main: '#eedfc2', shade: '#e7d4b1' },
  { id: 'grey', name: 'Серые', main: '#e3e4e1', shade: '#d8dad6' },
  { id: 'sage', name: 'Шалфей', main: '#c9d8c2', shade: '#bccdb4' },
  { id: 'terracotta', name: 'Терракота', main: '#e7b9a0', shade: '#e0ab8f' },
  { id: 'forest', name: 'Тёмно-зелёные', main: '#4f6b5c', shade: '#486353' },
  { id: 'navy', name: 'Синие', main: '#3f5170', shade: '#394a67' },
];

export const TABLES: Swatch[] = [
  { id: 'oak', name: 'Светлый дуб', main: '#c99a6b', shade: '#a87d52' },
  { id: 'walnut', name: 'Орех', main: '#8a5a3a', shade: '#6b4429' },
  { id: 'dark', name: 'Венге', main: '#4a3426', shade: '#36261b' },
  { id: 'white', name: 'Белый', main: '#f4f1ea', shade: '#d9d4c8' },
  { id: 'grey', name: 'Серый', main: '#a9adaa', shade: '#8b8f8c' },
  { id: 'mint', name: 'Мятный', main: '#9ccfb6', shade: '#7fb59b' },
  { id: 'blue', name: 'Голубой', main: '#9dbfe0', shade: '#7fa3c7' },
  { id: 'pink', name: 'Розовый', main: '#e9b2bd', shade: '#d295a2' },
];

export const SILLS: Swatch[] = [
  { id: 'wood', name: 'Дерево', main: '#e9c9a0', shade: '#d3ad80' },
  { id: 'white', name: 'Белый пластик', main: '#f7f6f1', shade: '#dedcd4' },
  { id: 'stone', name: 'Камень', main: '#cfcac2', shade: '#b4aea4' },
  { id: 'dark', name: 'Тёмное дерево', main: '#8a5a3a', shade: '#6b4429' },
];

const find = (list: Swatch[], id?: string) => list.find((s) => s.id === id);

/** CSS-переменные сцены по выбранным цветам. */
export function roomVars(c?: { wall?: string; table?: string; sill?: string }): Record<string, string> {
  const out: Record<string, string> = {};
  const w = find(WALLS, c?.wall);
  if (w) out['--wp'] = `repeating-linear-gradient(90deg, ${w.main} 0 22px, ${w.shade} 22px 44px)`;
  const t = find(TABLES, c?.table);
  if (t) { out['--table'] = t.main; out['--table2'] = t.shade; }
  const s = find(SILLS, c?.sill);
  if (s) { out['--wood'] = s.main; out['--wood2'] = s.shade; }
  return out;
}

export const darkWall = (id?: string) => id === 'forest' || id === 'navy';
