// Декор, нарисованный в том же плоском стиле, что и растения: тёплые цвета,
// мягкие тени, без контуров. Размер viewBox = «натуральный» размер предмета
// в пикселях сцены — так кот крупнее свечки, а книги ниже чайника.

import type { ReactNode } from 'react';

const C = {
  wood: '#c98f5a', wood2: '#a8713f', dark: '#5b3a24', cream: '#f6ead8', paper: '#fbf7ee',
  red: '#d9483b', red2: '#b5352b', gold: '#e9b949', gold2: '#c8952a', green: '#4f9a5c', green2: '#3d7d48',
  blue: '#3f6fb5', blue2: '#2f548c', sky: '#9fd0f0', grey: '#9a9a96', grey2: '#6f6f6b', white: '#fbfbf4',
  orange: '#f08a3c', pink: '#f3a3b6', brown: '#8a5a36', glass: '#cfe9ef', ink: '#2e4a45',
};

const shadow = (cx: number, y: number, rx: number) => <ellipse cx={cx} cy={y} rx={rx} ry={2.2} fill="#0000002a" />;

/** Каждый предмет: размер [ширина, высота] и рисунок. */
/** Состояние предмета для рисунка: включён ли, текущее время (для часов). */
export interface DrawOpts { on: boolean; now: number; tint?: string }

/** Окрасы котиков. */
export const CAT_COLORS: Record<string, { name: string; main: string; shade: string; eye: string; patch?: string; patch2?: string }> = {
  ginger: { name: 'Рыжий', main: '#f3a25c', shade: '#d9793a', eye: '#5b3a24' },
  grey: { name: 'Серый', main: '#a7b0b8', shade: '#7d868e', eye: '#2e3236' },
  black: { name: 'Чёрный', main: '#4a4a52', shade: '#2c2c31', eye: '#f6e27a' },
  white: { name: 'Белый', main: '#f4f1ea', shade: '#d9d4c8', eye: '#4a6a8a' },
  tabby: { name: 'Полосатый', main: '#a07a52', shade: '#6b4f33', eye: '#2e2418' },
  cream: { name: 'Кремовый', main: '#f3d6a8', shade: '#d9b27c', eye: '#5b3a24' },
  calico: { name: 'Трёхцветный', main: '#f4f1ea', shade: '#d9d4c8', eye: '#3a2a1a', patch: '#f08a3c', patch2: '#3a3a40' },
};
const catTint = (id?: string) => CAT_COLORS[id ?? 'ginger'] ?? CAT_COLORS.ginger;

const CL = { stroke: '#3b2a22', strokeWidth: 1.6, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
type CatC = { main: string; shade: string; eye: string; patch?: string; patch2?: string };
const belly = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.round(v + (255 - v) * 0.55);
  return `#${((c(n >> 16) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).padStart(6, '0')}`;
};
const PINK = '#f4a3a8';

/** Спящий котик клубочком. */
function CatSleep({ c, noShadow }: { c: CatC; noShadow?: boolean }) {
  const lt = belly(c.main);
  return (<>
    {!noShadow && <ellipse cx="30" cy="38.5" rx="25" ry="2.4" fill="#0000001f" />}
    <path d="M10 36 C2 36 3 24 12 20 C20 15 34 14 42 19 C50 23 52 33 47 36 Z" fill={c.main} {...CL} />
    {c.patch && <path d="M14 30 C14 23 20 20 26 21 C28 25 24 31 14 30 Z" fill={c.patch} />}
    {c.patch2 && <path d="M28 19 C32 16 38 17 39 20 C36 23 31 23 28 19 Z" fill={c.patch2} />}
    <path d="M16 34 C16 27 24 24 32 26 C36 27 38 31 37 34 Z" fill={lt} />
    <path d="M18 22 q4 -2 8 0 M26 20 q4 -2 8 0" stroke={c.shade} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    <path d="M47 35 C54 35 56 28 52 26" stroke={CL.stroke} strokeWidth="7.2" fill="none" strokeLinecap="round" />
    <path d="M47 35 C54 35 56 28 52 26" stroke={c.main} strokeWidth="4.4" fill="none" strokeLinecap="round" />
    <path d="M6 37 C2 30 8 24 14 30 C16 33 26 36 34 36 L34 37.5 Z" fill={c.main} {...CL} />
    <path d="M30.5 14.5 L32 5.5 L38.5 11.5 Z" fill={c.main} {...CL} />
    <path d="M44 11.5 L50 5 L51.5 14 Z" fill={c.main} {...CL} />
    <path d="M32.6 12.6 L33.3 8.4 L36.2 11.1 Z M46.3 11.4 L49.3 8.2 L49.9 12.4 Z" fill={PINK} />
    <ellipse cx="41" cy="21" rx="12" ry="10" fill={c.main} {...CL} />
    <path d="M33 25.5 C35 30 47 30 49 25.5 C47 28 35 28 33 25.5 Z" fill={lt} />
    <path d="M34.5 20.5 q2.5 2.4 5 0 M43 20.5 q2.5 2.4 5 0" stroke={CL.stroke} strokeWidth="1.4" fill="none" strokeLinecap="round" />
    <ellipse cx="35" cy="24.2" rx="2.2" ry="1.3" fill={PINK} opacity=".8" />
    <ellipse cx="47.6" cy="24.2" rx="2.2" ry="1.3" fill={PINK} opacity=".8" />
    <path d="M40.2 23.2 h2 l-1 1.2 Z" fill="#e57f8a" {...CL} strokeWidth={0.8} />
  </>);
}

/** Котик идёт: лапы и хвост анимируются классами leg l1…l4 и tail. */
function CatWalk({ c }: { c: CatC }) {
  const lt = belly(c.main);
  const leg = (x: number, cls: string, fill: string) => <g className={'leg ' + cls}><rect x={x} y="27" width="6" height="14" rx="3" fill={fill} {...CL} strokeWidth={1.4} /></g>;
  return (<>
    <ellipse cx="36" cy="42.5" rx="26" ry="2.2" fill="#0000001f" />
    {leg(16, 'l1', c.shade)}{leg(43, 'l2', c.shade)}
    <g className="tail">
      <path d="M14 22 C4 18 4 6 11 4" stroke={CL.stroke} strokeWidth="7.4" fill="none" strokeLinecap="round" />
      <path d="M14 22 C4 18 4 6 11 4" stroke={c.main} strokeWidth="4.6" fill="none" strokeLinecap="round" />
    </g>
    <path d="M12 24 C12 15 22 13 34 14 C46 15 56 16 56 26 C56 33 48 34 34 34 C20 34 12 32 12 24 Z" fill={c.main} {...CL} />
    {c.patch && <path d="M18 18 C22 14 30 15 30 20 C28 25 20 25 18 18 Z" fill={c.patch} />}
    {c.patch2 && <path d="M36 15 C40 14 46 16 45 20 C42 22 37 20 36 15 Z" fill={c.patch2} />}
    <path d="M22 32 C28 29 42 29 48 32 C42 34 28 34 22 32 Z" fill={lt} />
    <path d="M24 17 q3 3 0 6 M31 16 q3 3 0 6 M38 16 q3 3 0 6" stroke={c.shade} strokeWidth="2" fill="none" strokeLinecap="round" />
    {leg(21, 'l3', c.main)}{leg(48, 'l4', c.main)}
    <path d="M51.5 10.5 L53 1.5 L59 7.5 Z" fill={c.main} {...CL} />
    <path d="M60.5 7.5 L66 1.5 L67 10.5 Z" fill={c.main} {...CL} />
    <path d="M53.5 8.5 L54.2 4.5 L57 7.2 Z M62 7 L65 3.8 L65.6 8 Z" fill={PINK} />
    <ellipse cx="59.5" cy="16" rx="10" ry="8.8" fill={c.main} {...CL} />
    <path d="M52 19.5 C54 23.5 65 23.5 67 19.5 C65 22 54 22 52 19.5 Z" fill={lt} />
    <circle cx="56" cy="15" r="1.5" fill={CL.stroke} /><circle cx="63.5" cy="15" r="1.5" fill={CL.stroke} />
    <circle cx="56.5" cy="14.4" r=".5" fill="#fff" /><circle cx="64" cy="14.4" r=".5" fill="#fff" />
    <ellipse cx="53.5" cy="18.5" rx="2" ry="1.2" fill={PINK} opacity=".8" />
    <ellipse cx="66" cy="18.5" rx="2" ry="1.2" fill={PINK} opacity=".8" />
    <path d="M58.8 17.6 h1.8 l-.9 1.1 Z" fill="#e57f8a" {...CL} strokeWidth={0.8} />
  </>);
}

const ART: Record<string, { w: number; h: number; draw: (o: DrawOpts) => ReactNode }> = {
  // ─────────── на подоконнике ───────────
  cat: { w: 58, h: 40, draw: (o) => <CatSleep c={catTint(o.tint)} /> },
  radio: { w: 46, h: 32, draw: (o) => (<>
    {shadow(23, 30, 20)}
    <rect x="3" y="8" width="40" height="22" rx="4" fill={C.wood} />
    <rect x="3" y="8" width="40" height="4" rx="2" fill={C.wood2} />
    <rect x="7" y="14" width="20" height="12" rx="2" fill={C.cream} />
    {[0, 1, 2, 3].map((i) => <line key={i} x1="9" x2="25" y1={16.5 + i * 2.6} y2={16.5 + i * 2.6} stroke="#d8c3a2" strokeWidth="1" />)}
    <circle cx="34" cy="17" r="3.4" fill={C.dark} /><circle cx="34" cy="25" r="2.4" fill={C.dark} />
    <circle cx="40" cy="12" r="1.3" fill={o.on ? '#7be07b' : '#8a8a86'} />
    <line x1="30" y1="8" x2="40" y2="0" stroke={C.grey2} strokeWidth="1.4" />
  </>) },
  lamp: { w: 32, h: 54, draw: () => (<>
    {shadow(16, 52, 12)}
    <path d="M6 51 h20 l-3 -4 h-14 Z" fill={C.grey2} />
    <rect x="14.5" y="20" width="3" height="28" fill={C.grey} />
    <path d="M4 22 L10 6 h12 l6 16 Z" fill="#7cc4a4" />
    <path d="M6 22 h20" stroke="#ffe066" strokeWidth="3" strokeLinecap="round" />
    <ellipse cx="16" cy="30" rx="13" ry="7" fill="#ffe0662e" />
  </>) },
  matryoshka: { w: 24, h: 36, draw: () => (<>
    {shadow(12, 34, 9)}
    <path d="M4 34 Q2 20 7 15 Q4 7 12 3 Q20 7 17 15 Q22 20 20 34 Z" fill={C.red} />
    <circle cx="12" cy="11" r="5" fill="#f8dcc4" />
    <circle cx="10.2" cy="11" r=".9" fill={C.dark} /><circle cx="13.8" cy="11" r=".9" fill={C.dark} />
    <circle cx="9.5" cy="13.2" r="1.2" fill={C.pink} /><circle cx="14.5" cy="13.2" r="1.2" fill={C.pink} />
    <path d="M7 22 Q12 19 17 22 Q18 28 12 30 Q6 28 7 22 Z" fill={C.cream} />
    <circle cx="12" cy="25" r="2.6" fill={C.gold} /><circle cx="12" cy="25" r="1.1" fill={C.red} />
  </>) },
  pickles: { w: 28, h: 38, draw: () => (<>
    {shadow(14, 36, 11)}
    <rect x="4" y="8" width="20" height="28" rx="5" fill="#cfe5d0" opacity=".9" />
    <rect x="3" y="3" width="22" height="7" rx="2" fill={C.gold} />
    {[[8, 14, -10], [15, 13, 8], [10, 24, 6], [17, 25, -8]].map(([x, y, a], i) => <ellipse key={i} cx={x} cy={y} rx="3" ry="6" transform={`rotate(${a} ${x} ${y})`} fill={C.green} />)}
    <path d="M6 30 q2 -3 4 0" stroke="#e9d27a" strokeWidth="1.5" fill="none" />
    <rect x="5" y="10" width="3" height="20" rx="1.5" fill="#ffffff66" />
  </>) },
  candle: { w: 18, h: 34, draw: (o) => (<>
    {shadow(9, 32, 7)}
    <ellipse cx="9" cy="30" rx="8" ry="3" fill={C.gold2} />
    <rect x="5" y="12" width="8" height="18" rx="2" fill={C.cream} />
    <path d="M9 12 v-2" stroke={C.dark} strokeWidth="1" />
    {o.on && <g className="flame"><path d="M9 3 Q12.5 7.5 9 11 Q5.5 7.5 9 3 Z" fill="#ffb347" /><path d="M9 6 Q10.5 8.5 9 10.5 Q7.5 8.5 9 6 Z" fill="#fff3b0" /><ellipse cx="9" cy="8" rx="9" ry="9" fill="#ffd86626" /></g>}
  </>) },
  alarm: { w: 28, h: 30, draw: () => (<>
    {shadow(14, 28, 10)}
    <path d="M7 27 l-2 2 M21 27 l2 2" stroke={C.dark} strokeWidth="2" strokeLinecap="round" />
    <circle cx="14" cy="16" r="11" fill={C.red} />
    <circle cx="14" cy="16" r="8" fill={C.white} />
    <path d="M14 16 V11 M14 16 L17 18" stroke={C.dark} strokeWidth="1.4" strokeLinecap="round" />
    <circle cx="6" cy="6" r="3.5" fill={C.gold} /><circle cx="22" cy="6" r="3.5" fill={C.gold} />
  </>) },
  cactus_mini: { w: 22, h: 32, draw: () => (<>
    {shadow(11, 30, 8)}
    <path d="M5 22 h12 l-1.5 8 h-9 Z" fill={C.pink} />
    <rect x="8" y="6" width="6" height="17" rx="3" fill={C.green} />
    <path d="M8 15 h-3 v-5" stroke={C.green} strokeWidth="3.4" fill="none" strokeLinecap="round" />
    <circle cx="11" cy="5.5" r="2" fill="#f07ab5" />
  </>) },
  pumpkin: { w: 38, h: 28, draw: () => (<>
    {shadow(19, 26, 15)}
    <ellipse cx="12" cy="17" rx="9" ry="9" fill="#e8762c" />
    <ellipse cx="26" cy="17" rx="9" ry="9" fill="#e8762c" />
    <ellipse cx="19" cy="17" rx="9" ry="10" fill={C.orange} />
    <path d="M19 7 q1 -4 4 -5" stroke={C.green2} strokeWidth="2.4" fill="none" strokeLinecap="round" />
  </>) },
  lantern: { w: 24, h: 40, draw: (o) => (<>
    {shadow(12, 38, 9)}
    <path d="M12 2 v4" stroke={C.dark} strokeWidth="1.6" />
    <rect x="5" y="6" width="14" height="4" rx="1" fill={C.dark} />
    <rect x="5" y="32" width="14" height="5" rx="1" fill={C.dark} />
    <rect x="6" y="10" width="12" height="22" fill={o.on ? '#ffd78a' : '#e6dcc8'} />
    {o.on && <g className="flame"><ellipse cx="12" cy="21" rx="12" ry="14" fill="#ffd86626" /><path d="M12 16 Q14 20 12 23 Q10 20 12 16 Z" fill={C.orange} /></g>}
    <path d="M6 10 v22 M18 10 v22" stroke={C.dark} strokeWidth="1.4" />
  </>) },
  tree: { w: 36, h: 50, draw: () => (<>
    {shadow(18, 48, 12)}
    <rect x="12" y="38" width="12" height="10" rx="2" fill={C.red} />
    <path d="M18 4 L30 22 H24 L32 36 H4 L12 22 H6 Z" fill={C.green2} />
    {[[14, 20, C.red], [22, 27, C.gold], [12, 31, C.blue], [25, 33, C.red], [19, 14, C.gold]].map(([x, y, c], i) => <circle key={i} cx={x as number} cy={y as number} r="1.9" fill={c as string} />)}
    <path d="M18 0 l1.4 3 l3 .3 l-2.3 2 l.7 3 l-2.8 -1.6 l-2.8 1.6 l.7 -3 l-2.3 -2 l3 -.3 Z" fill={C.gold} />
  </>) },
  tulips: { w: 30, h: 46, draw: () => (<>
    {shadow(15, 44, 10)}
    <path d="M7 30 h16 l-2 14 h-12 Z" fill={C.glass} opacity=".9" />
    {[[9, 8, '#e5486a'], [15, 4, '#f6c445'], [21, 9, '#f07ab5']].map(([x, y, c], i) => (
      <g key={i}>
        <path d={`M${x} ${(y as number) + 6} Q${15} 26 15 40`} stroke={C.green} strokeWidth="1.6" fill="none" />
        <path d={`M${(x as number) - 4} ${y} q4 -5 8 0 v5 q-4 4 -8 0 Z`} fill={c as string} />
      </g>
    ))}
  </>) },
  glass_dome: { w: 32, h: 42, draw: () => (<>
    {shadow(16, 40, 13)}
    <rect x="2" y="35" width="28" height="5" rx="2" fill={C.wood} />
    <path d="M10 35 v-8 h12 v8" fill="#e07a55" />
    <path d="M16 27 q-6 -6 -2 -12 M16 27 q6 -5 3 -11" stroke={C.green} strokeWidth="2" fill="none" />
    <ellipse cx="13" cy="15" rx="3" ry="2" fill={C.green} /><ellipse cx="19.5" cy="16" rx="3" ry="2" fill="#a8d08d" />
    <path d="M4 35 V16 Q4 3 16 3 Q28 3 28 16 V35" fill="#dff4fb55" stroke="#bfe3ee" strokeWidth="1.2" />
    <path d="M8 30 V17 Q8 9 13 7" stroke="#ffffffaa" strokeWidth="2" fill="none" strokeLinecap="round" />
    <circle cx="16" cy="2.5" r="2" fill="#bfe3ee" />
  </>) },

  // ─────────── на столике ───────────
  vase: { w: 24, h: 36, draw: () => (<>
    {shadow(12, 34, 9)}
    <path d="M7 4 h10 l-1 6 q6 6 4 16 q-1 8 -8 8 q-7 0 -8 -8 q-2 -10 4 -16 Z" fill="#cfe9efcc" stroke="#a9d3de" strokeWidth="1" />
    <path d="M8 14 l8 8 M16 14 l-8 8 M8 22 l8 8 M16 22 l-8 8" stroke="#ffffff99" strokeWidth="1" />
  </>) },
  books: { w: 42, h: 28, draw: () => (<>
    {shadow(21, 26, 18)}
    <rect x="4" y="18" width="34" height="8" rx="1.5" fill={C.blue} /><rect x="6" y="20" width="30" height="1.2" fill="#ffffff55" />
    <rect x="7" y="11" width="30" height="7" rx="1.5" fill={C.green} transform="rotate(-3 22 14)" />
    <rect x="3" y="4" width="32" height="7" rx="1.5" fill={C.red} transform="rotate(2 19 8)" />
    <rect x="8" y="6" width="12" height="2" fill={C.gold} transform="rotate(2 19 8)" />
  </>) },
  tea: { w: 32, h: 24, draw: () => (<>
    {shadow(15, 22, 13)}
    <ellipse cx="15" cy="20" rx="13" ry="3" fill={C.white} />
    <path d="M6 8 h18 v6 q0 6 -9 6 q-9 0 -9 -6 Z" fill={C.white} />
    <path d="M24 10 q6 0 5 4 q-1 3 -5 2" stroke={C.white} strokeWidth="2.2" fill="none" />
    <ellipse cx="15" cy="8" rx="9" ry="2" fill="#b0703a" />
    <path d="M7 12 h16" stroke={C.red} strokeWidth="1.5" />
    <path d="M12 5 q-2 -3 0 -5 M17 5 q-2 -3 0 -5" stroke="#ffffffaa" strokeWidth="1.2" fill="none" strokeLinecap="round" />
  </>) },
  piggy: { w: 42, h: 30, draw: () => (<>
    {shadow(21, 28, 16)}
    <ellipse cx="21" cy="17" rx="16" ry="11" fill={C.pink} />
    <ellipse cx="36" cy="17" rx="4" ry="4.5" fill="#f08aa4" />
    <circle cx="35" cy="16" r=".9" fill={C.dark} /><circle cx="37.5" cy="16" r=".9" fill={C.dark} />
    <path d="M25 6 l4 -5 l2 7 Z" fill="#f08aa4" />
    <circle cx="29" cy="13" r="1.2" fill={C.dark} />
    <rect x="16" y="6" width="8" height="1.8" rx="1" fill="#c2687f" />
    <path d="M10 26 v2 M16 27 v2 M26 27 v2 M32 26 v2" stroke="#f08aa4" strokeWidth="3" strokeLinecap="round" />
    <path d="M5 15 q-4 -1 -3 -4" stroke="#f08aa4" strokeWidth="1.5" fill="none" />
  </>) },
  yarn: { w: 36, h: 24, draw: () => (<>
    {shadow(18, 22, 14)}
    <circle cx="14" cy="13" r="10" fill="#e87a9a" />
    <path d="M6 9 q8 6 16 0 M5 14 q9 6 18 0 M8 19 q6 3 12 0" stroke="#c95b7c" strokeWidth="1.3" fill="none" />
    <path d="M22 4 L34 22 M26 2 L32 22" stroke={C.grey} strokeWidth="1.6" strokeLinecap="round" />
    <path d="M23 16 q6 4 10 3" stroke="#e87a9a" strokeWidth="1.3" fill="none" />
  </>) },
  magazines: { w: 42, h: 16, draw: () => (<>
    {shadow(21, 14, 18)}
    <rect x="3" y="9" width="36" height="5" rx="1" fill={C.paper} />
    <rect x="5" y="5" width="34" height="4.5" rx="1" fill="#9fd0a8" transform="rotate(-2 22 7)" />
    <rect x="2" y="1" width="35" height="4.5" rx="1" fill={C.gold} transform="rotate(2 20 3)" />
  </>) },
  teapot: { w: 40, h: 30, draw: () => (<>
    {shadow(20, 28, 15)}
    <ellipse cx="19" cy="18" rx="13" ry="10" fill={C.white} />
    <path d="M31 16 q6 -2 8 -8" stroke={C.white} strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M7 13 q-6 2 -2 9" stroke={C.white} strokeWidth="2.4" fill="none" />
    <rect x="13" y="6" width="12" height="3" rx="1.5" fill={C.red} />
    <circle cx="19" cy="5" r="2" fill={C.red} />
    {[[13, 15], [21, 13], [25, 20], [15, 22], [9, 19]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.6" fill={C.red} />)}
  </>) },
  // сложенный клетчатый плед: три слоя, тартан из полупрозрачных полос, бахрома
  plaid: { w: 46, h: 27, draw: () => (<>
    {shadow(23, 25, 21)}
    <path d="M6.75 17H43V24.5H6.75A3.75 3.75 0 0 1 6.75 17Z" fill="#b2443a" />
    <rect x="11" y="17" width="3.2" height="7.5" fill="#5a1f1a" opacity=".38" />
    <rect x="15.6" y="17" width=".8" height="7.5" fill="#f2cf63" opacity=".8" />
    <rect x="21" y="17" width="3.2" height="7.5" fill="#5a1f1a" opacity=".38" />
    <rect x="25.6" y="17" width=".8" height="7.5" fill="#f2cf63" opacity=".8" />
    <rect x="31" y="17" width="3.2" height="7.5" fill="#5a1f1a" opacity=".38" />
    <rect x="35.6" y="17" width=".8" height="7.5" fill="#f2cf63" opacity=".8" />
    <rect x="4.5" y="19.45" width="38.5" height="2.6" fill="#5a1f1a" opacity=".38" />
    <rect x="4.5" y="23.1" width="38.5" height=".7" fill="#f2cf63" opacity=".7" />
    <path d="M7.75 17.5H42" stroke="#fff" strokeWidth=".7" opacity=".25" />
    <path d="M43 18.0h2.2" stroke="#b2443a" strokeWidth=".9" strokeLinecap="round" />
    <path d="M43 19.8h2.2" stroke="#b2443a" strokeWidth=".9" strokeLinecap="round" />
    <path d="M43 21.6h2.2" stroke="#b2443a" strokeWidth=".9" strokeLinecap="round" />
    <path d="M43 23.4h2.2" stroke="#b2443a" strokeWidth=".9" strokeLinecap="round" />
    <path d="M7.75 9.8H43V17.3H7.75A3.75 3.75 0 0 1 7.75 9.8Z" fill="#bf4c3f" />
    <rect x="11" y="9.8" width="3.2" height="7.5" fill="#5a1f1a" opacity=".38" />
    <rect x="15.6" y="9.8" width=".8" height="7.5" fill="#f2cf63" opacity=".8" />
    <rect x="21" y="9.8" width="3.2" height="7.5" fill="#5a1f1a" opacity=".38" />
    <rect x="25.6" y="9.8" width=".8" height="7.5" fill="#f2cf63" opacity=".8" />
    <rect x="31" y="9.8" width="3.2" height="7.5" fill="#5a1f1a" opacity=".38" />
    <rect x="35.6" y="9.8" width=".8" height="7.5" fill="#f2cf63" opacity=".8" />
    <rect x="5.5" y="12.25" width="37.5" height="2.6" fill="#5a1f1a" opacity=".38" />
    <rect x="5.5" y="15.9" width="37.5" height=".7" fill="#f2cf63" opacity=".7" />
    <path d="M8.75 10.3H42" stroke="#fff" strokeWidth=".7" opacity=".25" />
    <path d="M43 10.8h2.2" stroke="#bf4c3f" strokeWidth=".9" strokeLinecap="round" />
    <path d="M43 12.6h2.2" stroke="#bf4c3f" strokeWidth=".9" strokeLinecap="round" />
    <path d="M43 14.4h2.2" stroke="#bf4c3f" strokeWidth=".9" strokeLinecap="round" />
    <path d="M43 16.2h2.2" stroke="#bf4c3f" strokeWidth=".9" strokeLinecap="round" />
    <path d="M8.75 2.6H42.5V10.1H8.75A3.75 3.75 0 0 1 8.75 2.6Z" fill="#cc5647" />
    <rect x="11" y="2.6" width="3.2" height="7.5" fill="#5a1f1a" opacity=".38" />
    <rect x="15.6" y="2.6" width=".8" height="7.5" fill="#f2cf63" opacity=".8" />
    <rect x="21" y="2.6" width="3.2" height="7.5" fill="#5a1f1a" opacity=".38" />
    <rect x="25.6" y="2.6" width=".8" height="7.5" fill="#f2cf63" opacity=".8" />
    <rect x="31" y="2.6" width="3.2" height="7.5" fill="#5a1f1a" opacity=".38" />
    <rect x="35.6" y="2.6" width=".8" height="7.5" fill="#f2cf63" opacity=".8" />
    <rect x="6.5" y="5.05" width="36.0" height="2.6" fill="#5a1f1a" opacity=".38" />
    <rect x="6.5" y="8.7" width="36.0" height=".7" fill="#f2cf63" opacity=".7" />
    <path d="M9.75 3.1H41.5" stroke="#fff" strokeWidth=".7" opacity=".25" />
    <path d="M42.5 3.6h2.2" stroke="#cc5647" strokeWidth=".9" strokeLinecap="round" />
    <path d="M42.5 5.4h2.2" stroke="#cc5647" strokeWidth=".9" strokeLinecap="round" />
    <path d="M42.5 7.2h2.2" stroke="#cc5647" strokeWidth=".9" strokeLinecap="round" />
    <path d="M42.5 9.0h2.2" stroke="#cc5647" strokeWidth=".9" strokeLinecap="round" />
  </>) },
  tangerines: { w: 42, h: 22, draw: () => (<>
    {shadow(21, 20, 18)}
    <ellipse cx="21" cy="17" rx="19" ry="4" fill={C.white} />
    {[[12, 12], [22, 11], [31, 13], [17, 6]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="5.5" fill={C.orange} />)}
    <ellipse cx="18" cy="2" rx="3" ry="1.4" fill={C.green} transform="rotate(-20 18 2)" />
  </>) },
  watering_can: { w: 46, h: 32, draw: () => (<>
    {shadow(22, 30, 16)}
    <path d="M9 12 h22 v14 q0 4 -4 4 h-14 q-4 0 -4 -4 Z" fill="#4f8fc0" />
    <path d="M31 22 L43 8" stroke="#4f8fc0" strokeWidth="3.4" strokeLinecap="round" />
    <path d="M40 6 l6 2 l-3 4 Z" fill="#3a76a6" />
    <path d="M13 12 q7 -12 14 0" stroke="#3a76a6" strokeWidth="2.4" fill="none" />
    {[[14, 19], [21, 23], [26, 17]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.6" fill={C.white} />)}
  </>) },
  golden_can: { w: 36, h: 40, draw: () => (<>
    {shadow(18, 38, 13)}
    <rect x="8" y="32" width="20" height="6" rx="2" fill={C.wood2} />
    <path d="M6 6 h24 v6 q0 12 -12 12 q-12 0 -12 -12 Z" fill={C.gold} />
    <path d="M6 9 q-5 0 -4 5 q1 4 5 3 M30 9 q5 0 4 5 q-1 4 -5 3" stroke={C.gold} strokeWidth="2.4" fill="none" />
    <rect x="15" y="24" width="6" height="8" fill={C.gold2} />
    <path d="M18 9 l1.6 3.4 l3.6 .4 l-2.7 2.4 l.8 3.6 l-3.3 -1.9 l-3.3 1.9 l.8 -3.6 l-2.7 -2.4 l3.6 -.4 Z" fill="#fff3c4" />
  </>) },
  bouquet: { w: 34, h: 48, draw: () => (<>
    {shadow(17, 46, 11)}
    <path d="M9 30 h16 l-2 16 h-12 Z" fill="#cfe9efcc" stroke="#a9d3de" />
    {[[10, 10, '#f07ab5'], [17, 6, '#f6c445'], [24, 11, '#8a4fd1'], [13, 18, '#e8453c'], [22, 19, C.white]].map(([x, y, c], i) => (
      <g key={i}>
        <path d={`M${x} ${y} L17 32`} stroke={C.green} strokeWidth="1.4" />
        {[0, 72, 144, 216, 288].map((a) => <circle key={a} cx={(x as number) + 3 * Math.cos((a * Math.PI) / 180)} cy={(y as number) + 3 * Math.sin((a * Math.PI) / 180)} r="2.4" fill={c as string} />)}
        <circle cx={x as number} cy={y as number} r="1.4" fill="#fff3c4" />
      </g>
    ))}
  </>) },

  // ─────────── на стене ───────────
  clock: { w: 34, h: 62, draw: (o) => (<>
    <rect x="4" y="2" width="26" height="56" rx="6" fill={C.wood} />
    <rect x="4" y="2" width="26" height="6" rx="3" fill={C.wood2} />
    <circle cx="17" cy="20" r="10" fill={C.cream} />
    {(() => {
      const d = new Date(o.now);
      const m = d.getMinutes() * 6;
      const h = (d.getHours() % 12) * 30 + d.getMinutes() / 2;
      return (<>
        <path d="M17 20 V14.5" stroke={C.dark} strokeWidth="1.8" strokeLinecap="round" transform={`rotate(${h} 17 20)`} />
        <path d="M17 20 V12" stroke={C.dark} strokeWidth="1.1" strokeLinecap="round" transform={`rotate(${m} 17 20)`} />
        <circle cx="17" cy="20" r="1.1" fill={C.dark} />
      </>);
    })()}
    <rect x="10" y="33" width="14" height="21" rx="3" fill="#7a4e2d" />
    <g className="pendulum"><path d="M17 33 V47" stroke={C.gold} strokeWidth="1.4" /><circle cx="17" cy="48" r="3.5" fill={C.gold} /></g>
  </>) },
  painting: { w: 66, h: 50, draw: () => (<>
    <rect x="1" y="1" width="64" height="48" rx="3" fill={C.gold2} />
    <rect x="5" y="5" width="56" height="40" fill="#bfe1f2" />
    <path d="M5 34 Q20 22 34 30 Q46 22 61 30 V45 H5 Z" fill="#7fb36a" />
    <path d="M5 40 Q30 32 61 40 V45 H5 Z" fill="#5f9a4c" />
    {[12, 20, 46, 54].map((x, i) => <path key={i} d={`M${x} 34 l5 -14 l5 14 Z`} fill="#2f6b3c" />)}
    <path d="M24 38 h18" stroke="#7a4e2d" strokeWidth="3" strokeLinecap="round" />
    <circle cx="29" cy="35" r="2.5" fill="#6b4226" /><circle cx="37" cy="35" r="2.5" fill="#6b4226" />
    <circle cx="50" cy="12" r="4" fill="#ffe7a0" />
  </>) },
  calendar: { w: 30, h: 40, draw: () => (<>
    <rect x="2" y="4" width="26" height="34" rx="2" fill={C.paper} />
    <rect x="2" y="4" width="26" height="9" rx="2" fill={C.red} />
    <circle cx="9" cy="4" r="1.6" fill={C.dark} /><circle cx="21" cy="4" r="1.6" fill={C.dark} />
    <text x="15" y="30" textAnchor="middle" fontSize="15" fontWeight="700" fill={C.ink} fontFamily="system-ui, sans-serif">7</text>
    <path d="M6 34 h18" stroke="#e3d6c0" strokeWidth="1" />
  </>) },
  shelf: { w: 72, h: 42, draw: () => (<>
    <rect x="2" y="32" width="68" height="5" rx="1.5" fill={C.wood} />
    <path d="M10 37 v4 M62 37 v4" stroke={C.wood2} strokeWidth="3" />
    <path d="M8 32 q0 -10 7 -10 q5 0 5 5 v5 Z" fill={C.grey} /><circle cx="18" cy="20" r="3" fill={C.grey} />
    <path d="M26 32 q0 -8 6 -8 q4 0 4 4 v4 Z" fill="#b8b8b2" /><circle cx="34" cy="23" r="2.4" fill="#b8b8b2" />
    <path d="M42 32 l6 -12 l6 12 Z" fill="#f2c9a8" /><path d="M44 30 l4 -7 l4 7" stroke="#d99f7a" strokeWidth="1" fill="none" />
    <rect x="57" y="16" width="11" height="16" rx="1" fill={C.gold2} /><rect x="59" y="18" width="7" height="12" fill={C.sky} />
  </>) },
  herb_frame: { w: 50, h: 58, draw: () => (<>
    <rect x="1" y="1" width="48" height="56" rx="2" fill={C.wood2} />
    <rect x="5" y="5" width="40" height="48" fill={C.paper} />
    <path d="M25 46 V14" stroke="#8a6a3a" strokeWidth="1.2" />
    {[16, 22, 28, 34, 40].map((y, i) => (
      <g key={i}>
        <ellipse cx="19" cy={y} rx="6" ry="2.6" fill={['#c4622d', '#6fa85a', '#e9b949', '#9a4f3a', '#4f8f5a'][i]} transform={`rotate(-25 19 ${y})`} />
        <ellipse cx="31" cy={y + 2} rx="6" ry="2.6" fill={['#e9b949', '#c4622d', '#4f8f5a', '#6fa85a', '#9a4f3a'][i]} transform={`rotate(25 31 ${y + 2})`} />
      </g>
    ))}
  </>) },

  mittens: { w: 34, h: 26, draw: () => (<>
    {shadow(17, 24, 14)}
    <path d="M3 22 V10 q0 -6 6 -6 q6 0 6 6 V22 Z" fill="#d9483b" /><path d="M3 10 q-3 -1 -2 3" stroke="#d9483b" strokeWidth="3" fill="none" />
    <path d="M18 22 V12 q0 -6 6 -6 q6 0 6 6 V22 Z" fill="#3f6fb5" /><path d="M30 12 q3 -1 2 3" stroke="#3f6fb5" strokeWidth="3" fill="none" />
    <path d="M3 18 h12 M18 18 h12" stroke={C.white} strokeWidth="2" />
    {[6, 9, 12].map((x) => <circle key={x} cx={x} cy="12" r=".9" fill={C.white} />)}{[21, 24, 27].map((x) => <circle key={x} cx={x} cy="13" r=".9" fill={C.white} />)}
  </>) },
  cocoa: { w: 30, h: 26, draw: () => (<>
    {shadow(14, 24, 12)}
    <path d="M5 8 h18 v10 q0 6 -9 6 q-9 0 -9 -6 Z" fill="#b5352b" />
    <path d="M23 11 q6 0 5 4 q-1 3 -5 2" stroke="#b5352b" strokeWidth="2.2" fill="none" />
    <ellipse cx="14" cy="8" rx="9" ry="2.2" fill="#7a4e2d" />
    {[[10, 6], [15, 5], [18, 7]].map(([x, y], i) => <rect key={i} x={x} y={y} width="3.4" height="3" rx="1" fill={i === 1 ? C.pink : C.white} />)}
    <path d="M8 14 h12" stroke={C.white} strokeWidth="1.4" strokeDasharray="2 2" />
  </>) },
  seedlings: { w: 40, h: 30, draw: () => (<>
    {shadow(20, 28, 17)}
    {[4, 15, 26].map((x, i) => (
      <g key={x}>
        <path d={`M${x} 18 h10 l-1 10 h-8 Z`} fill={i === 1 ? '#f2f2ea' : '#e9d9b8'} />
        <path d={`M${x + 5} 18 v-8`} stroke={C.green} strokeWidth="1.4" />
        <ellipse cx={x + 2.6} cy="10" rx="3" ry="1.6" fill={C.green} transform={`rotate(-25 ${x + 2.6} 10)`} />
        <ellipse cx={x + 7.4} cy="9" rx="3" ry="1.6" fill="#7cbf6a" transform={`rotate(25 ${x + 7.4} 9)`} />
      </g>
    ))}
  </>) },
  strawberry: { w: 38, h: 26, draw: () => (<>
    {shadow(19, 24, 16)}
    <path d="M3 12 h32 l-4 12 h-24 Z" fill="#c9a26b" />
    <path d="M6 16 h26 M5 20 h28" stroke="#a8814d" strokeWidth="1" />
    {[[9, 10], [15, 8], [21, 10], [27, 8], [13, 12], [24, 12]].map(([x, y], i) => (
      <g key={i}><path d={`M${x - 3} ${y} q3 -3 6 0 q0 4 -3 6 q-3 -2 -3 -6 Z`} fill="#e5354f" /><path d={`M${x - 2} ${y - 1} l2 -2 l2 2`} stroke={C.green} strokeWidth="1.2" fill="none" /></g>
    ))}
  </>) },
  lemonade: { w: 30, h: 38, draw: () => (<>
    {shadow(15, 36, 11)}
    <path d="M6 8 h16 l-2 28 h-12 Z" fill="#fff7c2cc" stroke="#e8d97a" strokeWidth="1" />
    <path d="M7 14 h14" stroke="#f4e04d" strokeWidth="6" opacity=".5" />
    <circle cx="20" cy="9" r="5" fill="#f4e04d" /><circle cx="20" cy="9" r="3.4" fill="#fff7c2" />
    <rect x="10" y="20" width="4" height="4" rx="1" fill="#ffffffcc" /><rect x="15" y="25" width="4" height="4" rx="1" fill="#ffffffcc" />
    <path d="M12 2 L14 30" stroke="#e5486a" strokeWidth="1.6" />
    <ellipse cx="9" cy="8" rx="3" ry="1.5" fill={C.green} transform="rotate(-30 9 8)" />
  </>) },
  fan: { w: 34, h: 46, draw: ({ on }) => (<>
    {shadow(17, 44, 12)}
    <path d="M8 44 h18 l-2 -4 h-14 Z" fill={C.grey2} />
    <rect x="15.5" y="26" width="3" height="15" fill={C.grey} />
    <circle cx="17" cy="16" r="14" fill="#cfe3ec" stroke={C.grey} strokeWidth="1.4" />
    <g className={on ? 'fan-blades' : undefined}>
      {[0, 120, 240].map((a) => <ellipse key={a} cx="17" cy="9" rx="4" ry="7" fill="#7fb2d6" transform={`rotate(${a} 17 16)`} />)}
    </g>
    <circle cx="17" cy="16" r="2.4" fill={C.grey2} />
  </>) },
  apples: { w: 40, h: 28, draw: () => (<>
    {shadow(20, 26, 17)}
    <path d="M3 14 h34 l-4 12 h-26 Z" fill={C.wood} /><path d="M5 18 h30" stroke={C.wood2} strokeWidth="1.2" />
    {[[10, 11, '#d9483b'], [18, 9, '#a8cf6a'], [26, 11, '#d9483b'], [14, 14, '#e8b33a'], [22, 14, '#a8cf6a']].map(([x, y, c], i) => (
      <g key={i}><circle cx={x as number} cy={y as number} r="4.6" fill={c as string} /><path d={`M${x} ${(y as number) - 4} v-2`} stroke={C.dark} strokeWidth="1" /></g>
    ))}
  </>) },
  watermelon: { w: 40, h: 26, draw: () => (<>
    {shadow(20, 24, 16)}
    <ellipse cx="20" cy="22" rx="18" ry="3.5" fill="#f4f1ea" />
    <path d="M5 21 A15 15 0 0 1 35 21 Z" fill="#4f9a3e" />
    <path d="M7.5 21 A12.5 12.5 0 0 1 32.5 21 Z" fill="#eef3c8" />
    <path d="M9 21 A11 11 0 0 1 31 21 Z" fill="#e8445a" />
    {[[14, 17], [20, 14], [26, 17], [17, 19], [23, 19]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="0.9" ry="1.4" fill="#3b2a22" />)}
  </>) },
  jam: { w: 26, h: 34, draw: () => (<>
    {shadow(13, 32, 10)}
    <rect x="4" y="10" width="18" height="22" rx="4" fill="#c4622d" />
    <rect x="6" y="12" width="3" height="16" rx="1.5" fill="#ffffff44" />
    <path d="M2 10 q11 -6 22 0 l-2 -6 h-18 Z" fill="#e8d9b8" />
    <path d="M4 6 q9 3 18 0" stroke={C.red} strokeWidth="1" strokeDasharray="2 2" fill="none" />
    <rect x="7" y="18" width="12" height="8" rx="1" fill={C.paper} />
    <circle cx="13" cy="22" r="2.4" fill="#d9483b" />
  </>) },
  gnome: { w: 28, h: 44, draw: () => (<>
    {shadow(14, 42, 11)}
    <path d="M6 42 v-12 q8 -4 16 0 v12 Z" fill="#3f6fb5" />
    <path d="M5 30 q9 -5 18 0 l-1 4 q-8 -3 -16 0 Z" fill="#7a4e2d" />
    <circle cx="14" cy="20" r="6" fill="#f8d2b4" />
    <path d="M7 22 q7 14 14 0 q-2 6 -7 8 q-5 -2 -7 -8 Z" fill={C.white} />
    <circle cx="14" cy="21.5" r="1.6" fill="#f08aa4" />
    <path d="M6 17 L14 0 L22 17 Z" fill={C.red} />
    <circle cx="11.5" cy="18.5" r=".9" fill={C.dark} /><circle cx="16.5" cy="18.5" r=".9" fill={C.dark} />
  </>) },
  // ─────────── на окне ───────────
  tulle: { w: 44, h: 44, draw: () => (<>
    <rect x="2" y="2" width="40" height="40" rx="3" fill={C.white} />
    <rect x="6" y="6" width="32" height="34" fill={C.sky} />
    <path d="M2 4 h40" stroke={C.wood2} strokeWidth="2.4" strokeLinecap="round" />
    <path d="M5 5 q3 18 -1 36 h10 q-4 -18 2 -36 Z M39 5 q-3 18 1 36 h-10 q4 -18 -2 -36 Z" fill="#ffffffd9" />
    {[[9, 14], [10, 26], [35, 18], [34, 31]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.4" fill={C.pink} />)}
  </>) },
  garland: { w: 48, h: 22, draw: () => (<>
    <path d="M2 4 Q12 16 24 8 Q36 0 46 12" stroke={C.green2} strokeWidth="1.4" fill="none" />
    {[[6, 8, C.red], [13, 12, C.gold], [20, 10, C.blue], [28, 7, C.red], [35, 6, C.gold], [42, 9, '#7ed38a']].map(([x, y, c], i) => <ellipse key={i} cx={x as number} cy={(y as number) + 4} rx="2.4" ry="3.4" fill={c as string} />)}
  </>) },
  paper_snow: { w: 36, h: 36, draw: () => (<>
    {[0, 60, 120].map((a) => <g key={a} transform={`rotate(${a} 18 18)`}><path d="M18 3 V33 M18 8 l-4 -3 M18 8 l4 -3 M18 28 l-4 3 M18 28 l4 3" stroke="#9cc3e6" strokeWidth="2.2" strokeLinecap="round" /></g>)}
    <circle cx="18" cy="18" r="3" fill={C.white} stroke="#9cc3e6" strokeWidth="1.5" />
  </>) },
  carpet: { w: 56, h: 40, draw: () => (<>
    <rect x="2" y="2" width="52" height="36" rx="2" fill="#a8322c" />
    <rect x="6" y="6" width="44" height="28" fill="none" stroke={C.gold} strokeWidth="2" />
    <path d="M28 9 L44 20 L28 31 L12 20 Z" fill="#2f4f8a" />
    <path d="M28 14 L36 20 L28 26 L20 20 Z" fill={C.gold} />
    {[10, 18, 26, 34, 42, 50].map((x) => <path key={x} d={`M${x - 4} 38 v2 M${x - 4} 2 v-2`} stroke={C.cream} strokeWidth="1.4" />)}
  </>) },
  hangers: { w: 34, h: 48, draw: () => (<>
    <circle cx="17" cy="3" r="2.4" fill="none" stroke={C.wood2} strokeWidth="1.6" />
    <path d="M17 5 L6 30 M17 5 L28 30 M17 5 L17 30" stroke="#d8c3a2" strokeWidth="1.6" />
    <path d="M9 20 q8 4 16 0" stroke="#d8c3a2" strokeWidth="1.2" fill="none" />
    <path d="M7 30 h20 l-3 14 h-14 Z" fill="#e07a55" />
    <path d="M12 30 q-6 -8 -3 -14 M17 30 q0 -10 4 -14 M22 30 q6 -4 7 -10" stroke={C.green} strokeWidth="2" fill="none" />
  </>) },
  feeder: { w: 40, h: 42, draw: () => (<>
    <path d="M20 0 v8" stroke={C.dark} strokeWidth="1.4" />
    <path d="M4 16 L20 6 L36 16 Z" fill={C.red2} />
    <rect x="8" y="16" width="24" height="14" fill={C.wood} />
    <rect x="12" y="20" width="16" height="7" fill="#7a4e2d" />
    <rect x="5" y="30" width="30" height="3" rx="1" fill={C.wood2} />
    <g className="tit">
      <ellipse cx="9" cy="37" rx="6" ry="4.5" fill="#f3d34a" />
      <circle cx="5" cy="33" r="3.4" fill={C.ink} /><circle cx="4.2" cy="33" r="1.2" fill={C.white} />
      <path d="M1.8 33.5 l-2 .8 l2 .6" fill={C.dark} />
      <path d="M14 36 l6 -2 l-5 4" fill={C.blue2} />
    </g>
  </>) },
  birdhouse: { w: 32, h: 46, draw: () => (<>
    <path d="M16 0 v6" stroke={C.dark} strokeWidth="1.4" />
    <path d="M2 18 L16 6 L30 18 Z" fill={C.green2} />
    <rect x="6" y="18" width="20" height="24" fill={C.wood} />
    <circle cx="16" cy="27" r="4" fill={C.dark} />
    <path d="M16 34 v4" stroke={C.wood2} strokeWidth="2" />
  </>) },
  catgrass: { w: 34, h: 40, draw: () => (<>
    {shadow(17, 38, 13)}
    <path d="M7 26 h20 l-2.5 12 h-15 Z" fill="#e9dcc6" />
    <rect x="6" y="24" width="22" height="4" rx="2" fill="#d8c7aa" />
    {[[9, 4, -3], [12, 0, -1], [15, 2, 1], [18, -1, 0], [21, 3, 2], [24, 5, 4], [14, 6, -4], [20, 7, 3]].map(([x, top, lean], i) => (
      <path key={i} d={`M${x} 25 Q${x + lean / 2} ${(25 + top) / 2} ${x + lean} ${top}`} stroke={i % 2 ? C.green : '#6cbf5f'} strokeWidth="2" fill="none" strokeLinecap="round" />
    ))}
  </>) },
  humidifier: { w: 34, h: 44, draw: () => (<>
    {shadow(17, 42, 13)}
    <path d="M6 22 Q6 16 17 16 Q28 16 28 22 L27 40 Q17 43 7 40 Z" fill={C.white} />
    <path d="M7 34 Q17 37 27 34 L27 40 Q17 43 7 40 Z" fill="#cfe3ea" />
    <circle cx="17" cy="30" r="2.2" fill="#7fc7e0" />
    <rect x="14" y="12" width="6" height="5" rx="2" fill="#dfe8ea" />
    <g className="steam" fill="none" stroke="#ffffffcc" strokeWidth="2.4" strokeLinecap="round">
      <path d="M17 11 q-3 -3 0 -6 q3 -3 0 -5" />
    </g>
  </>) },
  snowflake: { w: 24, h: 24, draw: () => (<>
    {[0, 60, 120].map((r) => (
      <g key={r} transform={`rotate(${r} 12 12)`} stroke="#fff" strokeWidth="1.6" strokeLinecap="round" fill="none">
        <path d="M12 1 V23" /><path d="M9 4 L12 7 L15 4 M9 20 L12 17 L15 20" />
      </g>
    ))}
    <circle cx="12" cy="12" r="2" fill="#fff" />
  </>) },
  heater: { w: 44, h: 46, draw: (o) => (<>
    {shadow(22, 44, 18)}
    {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={5 + i * 7} y="8" width="6" height="32" rx="3" fill={o.on ? '#f1f1ec' : '#e2e2dc'} stroke="#c9c9c2" strokeWidth="0.8" />)}
    <rect x="3" y="38" width="38" height="3" rx="1.5" fill="#9a9a96" />
    <path d="M8 41 v4 M36 41 v4" stroke="#6f6f6b" strokeWidth="2" strokeLinecap="round" />
    <rect x="16" y="4" width="12" height="5" rx="2" fill="#bfbfb8" />
    <circle cx="25" cy="6.5" r="1.3" fill={o.on ? '#ff6b4a' : '#888'} />
    {o.on && <g className="heat"><path d="M12 4 q-3 -3 0 -6 M22 3 q-3 -3 0 -6 M32 4 q-3 -3 0 -6" stroke="#ff9a6a88" strokeWidth="1.6" fill="none" strokeLinecap="round" /></g>}
  </>) },
  hygrometer: { w: 26, h: 30, draw: () => (<>
    {shadow(13, 28, 10)}
    <rect x="2" y="3" width="22" height="24" rx="4" fill="#fdfdfa" stroke="#cfd6d2" strokeWidth="1" />
    <rect x="5" y="6" width="16" height="11" rx="2" fill="#cfe9df" />
    <text x="13" y="14.6" textAnchor="middle" fontSize="7" fontWeight="700" fill="#1f3832" fontFamily="system-ui, sans-serif">°C</text>
    <circle cx="9" cy="22" r="2" fill="#4aa3df" /><circle cx="17" cy="22" r="2" fill="#f08a3c" />
  </>) },
  lamp_table: { w: 58, h: 64, draw: (o) => (<>
    {shadow(14, 62, 12)}
    <rect x="4" y="57" width="20" height="5" rx="2.5" fill="#3b3742" />
    <path d="M14 58 L18 28 L44 12" stroke="#57525f" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="18" cy="28" r="2.6" fill="#3b3742" />
    <g transform="rotate(18 44 14)">
      <rect x="28" y="10" width="30" height="8" rx="4" fill="#3b3742" />
      <rect x="30" y="16" width="26" height="3.4" rx="1.7" fill={o.on ? '#d18cff' : '#6c6676'} />
      {o.on && [0, 1, 2, 3, 4].map((i) => <circle key={i} cx={33 + i * 5} cy="17.7" r="1.2" fill={i % 2 ? '#ff6fa8' : '#f3d4ff'} />)}
    </g>
    {o.on && <path d="M30 22 L18 64 H62 L56 26 Z" fill="#c77dff22" />}
  </>) },
  growlamp: { w: 160, h: 30, draw: (o) => (<>
    <path d="M30 0 V12 M130 0 V12" stroke="#5d5a66" strokeWidth="1.4" />
    <rect x="6" y="10" width="148" height="12" rx="6" fill="#3b3742" />
    <rect x="10" y="20" width="140" height="5" rx="2.5" fill={o.on ? '#d18cff' : '#6c6676'} />
    {o.on && Array.from({ length: 14 }, (_, i) => <circle key={i} cx={15 + i * 10} cy="22.5" r="1.6" fill={i % 3 === 1 ? '#ff6fa8' : '#f3d4ff'} />)}
    <rect x="70" y="12" width="20" height="5" rx="2" fill="#57525f" />
    <circle cx="80" cy="14.5" r="1.4" fill={o.on ? '#9cff9c' : '#999'} />
  </>) },
  cat_walk: { w: 70, h: 44, draw: (o) => <CatWalk c={catTint(o.tint)} /> },
  // лежанка-гамак на присосках: крепится к стеклу, котик спит в ней чаще всего
  cat_bed: { w: 80, h: 46, draw: (o) => (<>
    <circle cx="8" cy="6" r="5" fill="#dfeef3" fillOpacity=".85" {...CL} strokeWidth={1.3} />
    <circle cx="72" cy="6" r="5" fill="#dfeef3" fillOpacity=".85" {...CL} strokeWidth={1.3} />
    <path d="M9 10 L15 22 M71 10 L65 22" stroke={CL.stroke} strokeWidth="1.6" />
    <path d="M8 22 C14 18 66 18 72 22" fill="#e8a477" {...CL} />
    {o.on && <g transform="translate(12 -3)"><CatSleep c={catTint(o.tint)} noShadow /></g>}
    <path d="M5 21 H75 C73 37 57 44 40 44 C23 44 7 37 5 21 Z" fill="#f2c4a0" {...CL} />
    <path d="M14 30 C26 35 54 35 66 30" stroke="#fff" strokeWidth="2" strokeDasharray="3 3" fill="none" opacity=".75" />
    <path d="M10 25 q3 -2 6 0" stroke="#fff" strokeWidth="2" fill="none" opacity=".5" strokeLinecap="round" />
  </>) },
  suncatcher: { w: 26, h: 44, draw: () => (<>
    <path d="M13 0 v10" stroke={C.grey} strokeWidth="1" />
    <circle cx="13" cy="18" r="8" fill="none" stroke={C.gold} strokeWidth="1.6" />
    <path d="M13 10 L18 18 L13 26 L8 18 Z" fill="#bfe3ee" />
    <path d="M13 26 v8" stroke={C.grey} strokeWidth="1" />
    {['#ff6b6b', '#ffb347', '#ffe066', '#7ed38a', '#7fb2f0'].map((c, i) => <path key={i} d={`M${7 + i * 3} 34 l1.5 ${6 + (i % 2) * 3} l1.5 -${6 + (i % 2) * 3}`} fill={c} />)}
  </>) },
};

/** Стикерный контур и белая кайма — у предметов. Котики, свет и прозрачные вещи — без неё. */
const NO_STICKER = new Set(['cat', 'cat2', 'cat3', 'cat_walk', 'cat_bed', 'lamp', 'lamp_table', 'growlamp', 'candle', 'lantern', 'garland', 'suncatcher', 'tulle', 'paper_snow', 'snowflake', 'carpet', 'hangers', 'glass_dome']);
const STICKER = { has: (id: string) => !!ART[id] && !NO_STICKER.has(id) };

export const hasDecorArt = (id: string) => !!ART[id] || id === 'cat2' || id === 'cat3';

/** Нарисованный предмет декора. scale — во сколько раз крупнее «натурального» размера. */
export function DecorArt({ id, scale = 1, className = '', on = true, tint }: { id: string; scale?: number; className?: string; on?: boolean; tint?: string }) {
  const a = ART[id === 'cat2' || id === 'cat3' ? 'cat' : id];
  if (!a) return null;
  const opts: DrawOpts = { on, now: Date.now(), tint };
  const fx = STICKER.has(id) ? 'dfx-' + id : undefined;
  return (
    <svg className={'decor-svg ' + className} viewBox={`0 0 ${a.w} ${a.h}`} width={a.w * scale} height={a.h * scale} overflow="visible" aria-hidden>
      {fx && (
        <defs>
          <filter id={fx} x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
            <feMorphology in="SourceAlpha" operator="dilate" radius="0.7" result="o" />
            <feFlood floodColor="#3b2a22" />
            <feComposite in2="o" operator="in" result="line" />
            <feMorphology in="SourceAlpha" operator="dilate" radius="1.2" result="w0" />
            <feFlood floodColor="#ffffff" />
            <feComposite in2="w0" operator="in" result="white" />
            <feMerge><feMergeNode in="white" /><feMergeNode in="line" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
      )}
      <g filter={fx ? `url(#${fx})` : undefined}>{a.draw(opts)}</g>
    </svg>
  );
}
