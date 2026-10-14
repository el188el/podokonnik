// Процедурная графика: каждое растение рисуется из простых форм по виду,
// стадии и «зерну» конкретного горшка — все немного разные, но узнаваемые.
// Холст 140×200, земля на y=142, центр x=70. «Вверх» — минус y.

import { createContext, useContext, useId, type ReactNode } from 'react';
import { FORM_BY_ID } from '../../game/products';
import { POTS } from '../../game/shop';
import { sp } from '../../game/species';
import type { ArtSpec, Stage } from '../../game/types';

type R = () => number;
function rng(seed: string): R {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
const j = (r: R, a: number) => (r() - 0.5) * 2 * a;
const f = (n: number) => Math.round(n * 10) / 10;
const rad = (d: number) => (d * Math.PI) / 180;

// ─────────────── формы листьев (основание в 0,0, лист смотрит вверх) ───────────────
const P = {
  ellipse: (L: number, W: number) =>
    `M0,0 C${f(W * 0.62)},${f(-L * 0.18)} ${f(W * 0.56)},${f(-L * 0.8)} 0,${f(-L)} C${f(-W * 0.56)},${f(-L * 0.8)} ${f(-W * 0.62)},${f(-L * 0.18)} 0,0Z`,
  heart: (L: number, W: number) =>
    `M0,${f(-L * 0.12)} C${f(W * 0.2)},${f(L * 0.06)} ${f(W * 0.62)},${f(-L * 0.04)} ${f(W * 0.52)},${f(-L * 0.45)} C${f(W * 0.42)},${f(-L * 0.76)} ${f(W * 0.14)},${f(-L * 0.88)} 0,${f(-L)} C${f(-W * 0.14)},${f(-L * 0.88)} ${f(-W * 0.42)},${f(-L * 0.76)} ${f(-W * 0.52)},${f(-L * 0.45)} C${f(-W * 0.62)},${f(-L * 0.04)} ${f(-W * 0.2)},${f(L * 0.06)} 0,${f(-L * 0.12)}Z`,
  blade: (L: number, W: number) =>
    `M${f(-W / 2)},0 C${f(-W * 0.62)},${f(-L * 0.55)} ${f(-W * 0.22)},${f(-L * 0.88)} 0,${f(-L)} C${f(W * 0.22)},${f(-L * 0.88)} ${f(W * 0.62)},${f(-L * 0.55)} ${f(W / 2)},0Z`,
  round: (L: number, W: number) =>
    `M0,0 C${f(W * 0.75)},${f(-L * 0.02)} ${f(W * 0.62)},${f(-L)} 0,${f(-L)} C${f(-W * 0.62)},${f(-L)} ${f(-W * 0.75)},${f(-L * 0.02)} 0,0Z`,
};

interface LeafProps {
  x?: number; y?: number; a?: number; s?: number;
  d: string; fill: string; vein?: string | false; L: number; children?: ReactNode; mask?: string;
}
/** Цвет пестролистности редкой формы: светлые мазки на каждом листе. */
const Variegate = createContext<string | undefined>(undefined);

function Leaf({ x = 0, y = 0, a = 0, s = 1, d, fill, vein, L, children, mask }: LeafProps) {
  const vg = useContext(Variegate);
  return (
    <g transform={`translate(${f(x)},${f(y)}) rotate(${f(a)}) scale(${f(s)})`}>
      <g mask={mask}>
        <path d={d} fill={fill} />
        {vg && <path d={d} fill={vg} opacity={0.92} transform={`translate(${f(L * 0.1)},${f(-L * 0.08)}) scale(0.55 0.78)`} />}
        {children}
      </g>
      {vein !== false && <path d={`M0,${f(-L * 0.06)} L0,${f(-L * 0.82)}`} stroke={vein ?? '#ffffff'} strokeOpacity={vein ? 1 : 0.28} strokeWidth={1.1} strokeLinecap="round" fill="none" />}
    </g>
  );
}

function Flower5({ x, y, r, color, center = '#ffd84a', petals = 5, rot = 0 }: { x: number; y: number; r: number; color: string; center?: string; petals?: number; rot?: number }) {
  return (
    <g transform={`translate(${f(x)},${f(y)}) rotate(${f(rot)})`}>
      {Array.from({ length: petals }, (_, i) => {
        const a = (i / petals) * Math.PI * 2;
        return <circle key={i} cx={f(Math.cos(a) * r * 0.62)} cy={f(Math.sin(a) * r * 0.62)} r={f(r * 0.55)} fill={color} />;
      })}
      <circle r={f(r * 0.3)} fill={center} />
    </g>
  );
}

const darker = (hex: string, k = 0.78) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `#${((c(n >> 16) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).padStart(6, '0')}`;
};

const STEM = '#5d8a3a';
const WOOD = '#8a6a48';

// ─────────────── композиции по видам ───────────────
type Draw = (o: { art: ArtSpec; n: number; r: R; bloom: boolean; uid: string }) => ReactNode;

const grass: Draw = ({ art, n, r }) => {
  const count = [5, 9, 14][n];
  const L = [26, 44, 60][n];
  const out: ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1);
    const a = rad(-75 + t * 150 + j(r, 6));
    const len = L * (0.75 + r() * 0.35);
    const ex = Math.sin(a) * len * 1.05;
    const ey = -len * 0.55 + Math.abs(Math.sin(a)) * len * 0.35;
    const cx = Math.sin(a) * len * 0.35;
    const cy = -len * (0.95 - Math.abs(Math.sin(a)) * 0.3);
    const d = `M0,0 Q${f(cx)},${f(cy)} ${f(ex)},${f(ey)}`;
    out.push(
      <g key={i}>
        <path d={d} stroke={art.leaf} strokeWidth={4.2} fill="none" strokeLinecap="round" />
        <path d={d} stroke={art.leaf2} strokeWidth={1.3} fill="none" strokeLinecap="round" opacity={0.9} />
      </g>,
    );
  }
  if (n === 2) {
    for (const side of [-1, 1]) {
      const ex = side * 58, ey = 34;
      out.push(
        <g key={'run' + side}>
          <path d={`M0,-8 Q${side * 40},-40 ${ex},${ey}`} stroke="#b5c46a" strokeWidth={1.4} fill="none" />
          {[-50, 0, 50].map((da) => (
            <path key={da} d={`M${ex},${ey} q${f(Math.sin(rad(da)) * 6)},-10 ${f(Math.sin(rad(da)) * 12)},-6`} stroke={art.leaf} strokeWidth={2.6} fill="none" strokeLinecap="round" />
          ))}
        </g>,
      );
    }
  }
  return out;
};

function vine(art: ArtSpec, n: number, r: R, leafShape: 'ellipse' | 'heart') {
  const stems = [2, 4, 7][n];
  const out: ReactNode[] = [];
  for (let i = 0; i < stems; i++) {
    const side = i % 2 ? 1 : -1;
    const spread = 14 + (i >> 1) * 9 + j(r, 3);
    const hang = n === 0 ? -6 : n === 1 ? 12 + i * 3 : 18 + i * 4;
    const up = -18 - r() * 16 - n * 8;
    const pts: [number, number][] = [];
    const d = `M0,0 C${side * spread * 0.3},${f(up * 1.4)} ${side * (spread + 10)},${f(up)} ${f(side * (spread + 14))},${f(hang)}`;
    // точки вдоль кривой для листьев
    for (let k = 1; k <= 3 + n; k++) {
      const t = k / (3.5 + n);
      const mt = 1 - t;
      const x = 3 * mt * mt * t * side * spread * 0.3 + 3 * mt * t * t * side * (spread + 10) + t * t * t * side * (spread + 14);
      const y = 3 * mt * mt * t * up * 1.4 + 3 * mt * t * t * up + t * t * t * hang;
      pts.push([x, y]);
    }
    out.push(<path key={'s' + i} d={d} stroke={leafShape === 'heart' ? STEM : darker(art.leaf, 0.85)} strokeWidth={1.6} fill="none" />);
    pts.forEach(([x, y], k) => {
      const L = leafShape === 'heart' ? 14 + n * 2 : 12 + n;
      const W = leafShape === 'heart' ? L * 0.85 : L * 0.55;
      const a = side * (k % 2 ? 60 : 110) + j(r, 15);
      out.push(
        <Leaf key={`l${i}-${k}`} x={x} y={y} a={a} d={P[leafShape](L, W)} fill={art.leaf} L={L} vein={false}>
          {leafShape === 'ellipse' ? (
            <>
              <path d={`M${f(-W * 0.2)},${f(-L * 0.15)} Q${f(-W * 0.32)},${f(-L * 0.5)} ${f(-W * 0.08)},${f(-L * 0.85)}`} stroke={art.leaf2} strokeWidth={1.5} fill="none" opacity={0.85} />
              <path d={`M${f(W * 0.2)},${f(-L * 0.15)} Q${f(W * 0.32)},${f(-L * 0.5)} ${f(W * 0.08)},${f(-L * 0.85)}`} stroke={art.leaf2} strokeWidth={1.5} fill="none" opacity={0.85} />
            </>
          ) : (
            <>
              <ellipse cx={f(W * 0.18)} cy={f(-L * 0.45)} rx={f(W * 0.14)} ry={f(L * 0.08)} fill={art.leaf2} opacity={0.7} />
              <ellipse cx={f(-W * 0.2)} cy={f(-L * 0.62)} rx={f(W * 0.1)} ry={f(L * 0.06)} fill={art.leaf2} opacity={0.55} />
            </>
          )}
        </Leaf>,
      );
    });
  }
  // пара листьев на макушке
  out.push(<Leaf key="t1" a={-25} d={P[leafShape](14, leafShape === 'heart' ? 12 : 8)} fill={art.leaf} L={14} />);
  out.push(<Leaf key="t2" a={20} y={-2} d={P[leafShape](12, leafShape === 'heart' ? 10 : 7)} fill={darker(art.leaf, 1.1)} L={12} />);
  return out;
}

const trail: Draw = ({ art, n, r }) => vine(art, n, r, 'ellipse');
const heartTrail: Draw = ({ art, n, r }) => vine(art, n, r, 'heart');

const blades: Draw = ({ art, n, r }) => {
  const count = [2, 4, 6][n];
  const out: ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const a = -18 + t * 36 + j(r, 4);
    const L = [40, 72, 104][n] * (0.75 + r() * 0.3) * (1 - Math.abs(t - 0.5) * 0.5);
    const W = [9, 12, 14][n];
    const x = (t - 0.5) * W * 1.6;
    out.push(
      <g key={i} transform={`translate(${f(x)},0) rotate(${f(a)})`}>
        <path d={P.blade(L, W)} fill={art.leaf2} />
        <path d={P.blade(L - 2, W - 3.2)} fill={art.leaf} />
        {Array.from({ length: Math.floor(L / 9) }, (_, k) => (
          <path key={k} d={`M${f(-W / 2 + 2)},${f(-6 - k * 9)} q${f(W / 4)},-3 ${f(W / 2 - 2)},0 q${f(W / 4)},3 ${f(W / 2 - 2)},0`} stroke="#9ccf8a" strokeWidth={1.1} fill="none" opacity={0.5} />
        ))}
      </g>,
    );
  }
  return out;
};

const dracaena: Draw = ({ art, n, r }) => {
  const trunk = [0, 22, 58][n];
  const out: ReactNode[] = [];
  if (trunk) out.push(<path key="tr" d={`M0,0 C-2,${-trunk * 0.4} 3,${-trunk * 0.7} 1,${-trunk}`} stroke={WOOD} strokeWidth={4.5} fill="none" strokeLinecap="round" />);
  const count = [8, 13, 20][n];
  for (let i = 0; i < count; i++) {
    const a = -150 + (i / (count - 1)) * 300 + j(r, 8);
    const droop = Math.abs(a) > 90;
    const L = [22, 32, 40][n] * (0.75 + r() * 0.35) * (droop ? 0.8 : 1);
    out.push(
      <g key={i} transform={`translate(1,${-trunk}) rotate(${f(a)})`}>
        <path d={`M0,0 Q${f(droop ? 6 : 2)},${f(-L * 0.6)} 0,${f(-L)}`} stroke={art.leaf} strokeWidth={3.2} fill="none" strokeLinecap="round" />
        <path d={`M0,0 Q${f(droop ? 6 : 2)},${f(-L * 0.6)} 0,${f(-L)}`} stroke={art.leaf2} strokeWidth={0.7} fill="none" strokeLinecap="round" transform="translate(1.3,0)" />
      </g>,
    );
  }
  return out;
};

const aloe: Draw = ({ art, n, r }) => {
  const count = [4, 7, 11][n];
  const out: ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const a = -62 + t * 124 + j(r, 5);
    const L = [24, 40, 56][n] * (0.7 + (1 - Math.abs(t - 0.5)) * 0.45);
    const W = [7, 10, 12][n];
    out.push(
      <Leaf key={i} a={a} d={P.blade(L, W)} fill={i % 2 ? art.leaf : darker(art.leaf, 0.9)} L={L} vein={false}>
        {Array.from({ length: 4 }, (_, k) => (
          <circle key={k} cx={f(j(r, W * 0.2))} cy={f(-L * (0.2 + k * 0.17))} r={0.9} fill={art.leaf2} />
        ))}
        <path d={`M${f(-W / 2)},0 C${f(-W * 0.62)},${f(-L * 0.55)} ${f(-W * 0.22)},${f(-L * 0.88)} 0,${f(-L)}`} stroke={art.leaf2} strokeWidth={0.8} fill="none" strokeDasharray="1.5 3" />
      </Leaf>,
    );
  }
  return out;
};

const rosette: Draw = ({ art, n, r, bloom }) => {
  const count = [5, 8, 12][n];
  const R = [8, 10, 12][n];
  const out: ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    const a = -100 + (i / (count - 1)) * 200 + j(r, 6);
    const outer = i % 2 === 0;
    out.push(
      <Leaf key={i} a={a} y={-2} d={P.round(R * (outer ? 2.3 : 1.9), R * 1.9)} fill={outer ? darker(art.leaf, 0.92) : art.leaf} L={R * 2} vein="#5f9a5a" />,
    );
  }
  if (bloom) {
    const k = [0, 3, 6][n];
    for (let i = 0; i < k; i++) out.push(<Flower5 key={'f' + i} x={(i - (k - 1) / 2) * 7 + j(r, 2)} y={-R * 2.3 - (i % 2) * 6} r={6} color={art.flower!} rot={r() * 70} />);
  }
  return out;
};

const crassula: Draw = ({ art, n, r }) => {
  const out: ReactNode[] = [];
  const pair = (x: number, y: number, a: number, s: number, key: string) => (
    <g key={key}>
      {[-1, 1].map((sd) => (
        <Leaf key={sd} x={x} y={y} a={a + sd * 48} s={s} d={P.round(12, 10)} fill={art.leaf} L={12} vein={false}>
          <path d={P.round(12, 10)} fill="none" stroke={art.leaf2} strokeWidth={1.2} opacity={0.75} />
        </Leaf>
      ))}
      <Leaf x={x} y={y} a={a} s={s * 0.8} d={P.round(10, 8)} fill={darker(art.leaf, 1.12)} L={10} vein={false} />
    </g>
  );
  if (n === 0) return [pair(0, 0, 0, 1, 'a'), pair(0, -10, 0, 0.8, 'b')];
  const h = n === 1 ? 26 : 46;
  out.push(<path key="t" d={`M0,0 C-2,${-h * 0.5} 2,${-h * 0.8} 0,${-h}`} stroke="#7d7a4c" strokeWidth={n === 1 ? 4 : 7} fill="none" strokeLinecap="round" />);
  const branches = n === 1 ? [[-14, -h - 8], [12, -h - 10]] : [[-28, -h - 14], [-8, -h - 30], [16, -h - 22], [32, -h - 6]];
  branches.forEach(([bx, by], i) => {
    out.push(<path key={'b' + i} d={`M0,${-h * 0.75} Q${f(bx * 0.4)},${f(by * 0.9)} ${bx},${by}`} stroke="#7d7a4c" strokeWidth={n === 1 ? 2.5 : 4} fill="none" strokeLinecap="round" />);
    out.push(pair(bx, by, bx * 0.8 + j(r, 10), 1.1, 'p' + i));
    out.push(pair(bx * 0.6, (by - h * 0.75) / 2 - h * 0.35, bx + j(r, 20), 0.85, 'q' + i));
  });
  return out;
};

const kalanchoe: Draw = ({ art, n, r, bloom }) => {
  const out: ReactNode[] = [];
  const count = [4, 8, 12][n];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const a = -70 + t * 140 + j(r, 8);
    const L = [12, 15, 18][n];
    const y = -((i % 3) * 7) * (n + 1) * 0.6;
    out.push(<Leaf key={i} y={y} a={a} d={P.round(L, L * 0.9)} fill={i % 2 ? art.leaf : darker(art.leaf, 0.9)} L={L} />);
  }
  if (bloom) {
    const clusters = [0, 2, 4][n];
    for (let c = 0; c < clusters; c++) {
      const cx = (c - (clusters - 1) / 2) * 16, cy = -[0, 34, 46][n] - (c % 2) * 6;
      out.push(<path key={'st' + c} d={`M0,-6 Q${f(cx * 0.5)},${f(cy * 0.6)} ${f(cx)},${f(cy)}`} stroke={STEM} strokeWidth={1.2} fill="none" />);
      for (let k = 0; k < 7; k++) out.push(<Flower5 key={`f${c}-${k}`} x={cx + j(r, 6)} y={cy + j(r, 4)} r={3.4} color={art.flower!} petals={4} center="#ffe08a" rot={r() * 90} />);
    }
  }
  return out;
};

const zamioculcas: Draw = ({ art, n, r }) => {
  const stems = [2, 4, 6][n];
  const out: ReactNode[] = [];
  for (let i = 0; i < stems; i++) {
    const t = stems === 1 ? 0.5 : i / (stems - 1);
    const a = -28 + t * 56 + j(r, 4);
    const L = [34, 64, 96][n] * (0.8 + r() * 0.25);
    const pairs = [2, 4, 6][n];
    out.push(
      <g key={i} transform={`rotate(${f(a)})`}>
        <path d={`M0,0 L0,${f(-L)}`} stroke={darker(art.leaf, 0.9)} strokeWidth={3.2} strokeLinecap="round" />
        <ellipse cx={0} cy={-4} rx={3.6} ry={6} fill={darker(art.leaf, 0.85)} />
        {Array.from({ length: pairs }, (_, k) => {
          const y = -L * (0.35 + (k / pairs) * 0.62);
          return [-1, 1].map((sd) => (
            <Leaf key={`${k}${sd}`} y={y} a={sd * 52} d={P.ellipse(13, 7)} fill={art.leaf} L={13}>
              <path d="M-1.5,-3 Q-2.5,-7 -1,-10" stroke="#fff" strokeOpacity={0.35} strokeWidth={1} fill="none" />
            </Leaf>
          ));
        })}
        <Leaf y={-L} d={P.ellipse(12, 6.5)} fill={art.leaf} L={12} />
      </g>,
    );
  }
  return out;
};

const monstera: Draw = ({ art, n, r, uid }) => {
  const count = [2, 4, 6][n];
  const out: ReactNode[] = [];
  const mid = `${uid}-mon`;
  out.push(
    <defs key="d">
      <mask id={mid} maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="-40" y="-60" width="80" height="70">
        <rect x="-40" y="-60" width="80" height="70" fill="#fff" />
        {[0.28, 0.45, 0.62, 0.78].map((k, i) =>
          [-1, 1].map((sd) => (
            <path key={`${i}${sd}`} d={`M${sd * 30},${f(-50 * k + 6)} L${sd * 4},${f(-50 * k - 2)}`} stroke="#000" strokeWidth={2.6} strokeLinecap="round" />
          )),
        )}
        <ellipse cx="-8" cy="-22" rx="1.8" ry="3" fill="#000" />
        <ellipse cx="9" cy="-32" rx="1.6" ry="2.6" fill="#000" />
      </mask>
    </defs>,
  );
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const a = -55 + t * 110 + j(r, 6);
    const pet = [14, 30, 46][n] * (0.7 + r() * 0.4);
    const ex = Math.sin(rad(a)) * pet, ey = -Math.cos(rad(a)) * pet;
    const split = n === 2 || (n === 1 && i % 2 === 0);
    const s = [0.38, 0.55, 0.72][n] * (0.85 + r() * 0.2);
    out.push(<path key={'p' + i} d={`M0,0 Q${f(ex * 0.3)},${f(ey * 0.8)} ${f(ex)},${f(ey)}`} stroke={STEM} strokeWidth={2} fill="none" />);
    out.push(
      <Leaf key={'l' + i} x={ex} y={ey} a={a * 1.25 + (a > 0 ? 15 : -15)} s={s} d={P.heart(50, 48)} fill={i % 2 ? art.leaf : darker(art.leaf, 0.9)} L={50} mask={split ? `url(#${mid})` : undefined} vein="#7fb98a" />,
    );
  }
  return out;
};

const ficus: Draw = ({ art, n, r }) => {
  const h = [18, 44, 82][n];
  const leaves = [3, 6, 10][n];
  const out: ReactNode[] = [<path key="t" d={`M0,0 C-2,${-h * 0.4} 2,${-h * 0.7} 0,${-h}`} stroke="#6f6a40" strokeWidth={3.4} fill="none" strokeLinecap="round" />];
  for (let i = 0; i < leaves; i++) {
    const y = -h * (0.2 + (i / leaves) * 0.8);
    const side = i % 2 ? 1 : -1;
    const L = [18, 24, 30][n] * (0.85 + r() * 0.25);
    out.push(
      <Leaf key={i} y={y} a={side * (52 + j(r, 10))} d={P.ellipse(L, L * 0.52)} fill={art.leaf} L={L} vein="#b9d3a9">
        <path d={`M${f(-L * 0.12)},${f(-L * 0.25)} Q${f(-L * 0.18)},${f(-L * 0.5)} ${f(-L * 0.05)},${f(-L * 0.75)}`} stroke="#fff" strokeOpacity={0.25} strokeWidth={1.4} fill="none" />
      </Leaf>,
    );
  }
  out.push(<path key="tip" d={`M0,${-h} q2,-6 0,-12 q-2,6 0,12Z`} fill={art.leaf2} />);
  return out;
};

const spathiphyllum: Draw = ({ art, n, r, bloom }) => {
  const count = [4, 7, 11][n];
  const out: ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const a = -58 + t * 116 + j(r, 6);
    const pet = [6, 16, 26][n] * (0.7 + r() * 0.5);
    const ex = Math.sin(rad(a)) * pet, ey = -Math.cos(rad(a)) * pet;
    const L = [20, 30, 38][n];
    out.push(<path key={'p' + i} d={`M0,0 L${f(ex)},${f(ey)}`} stroke={STEM} strokeWidth={1.6} />);
    out.push(<Leaf key={'l' + i} x={ex} y={ey} a={a * 1.15} d={P.ellipse(L, L * 0.4)} fill={i % 2 ? art.leaf : darker(art.leaf, 0.88)} L={L} vein="#8fc49a" />);
  }
  if (bloom) {
    const k = [0, 1, 3][n];
    for (let i = 0; i < k; i++) {
      const x = (i - (k - 1) / 2) * 18, top = -[0, 58, 78][n] - (i % 2) * 8;
      out.push(<path key={'fs' + i} d={`M0,0 Q${f(x * 0.4)},${f(top * 0.6)} ${f(x)},${f(top)}`} stroke={STEM} strokeWidth={1.4} fill="none" />);
      out.push(<Leaf key={'fl' + i} x={x} y={top + 2} a={x * 0.6} d={P.ellipse(20, 11)} fill={art.flower!} L={20} vein="#dfe8d6" />);
      out.push(<rect key={'sp' + i} x={x - 1.6} y={top - 12} width={3.2} height={9} rx={1.6} fill="#efe6a8" transform={`rotate(${f(x * 0.6)} ${f(x)} ${f(top)})`} />);
    }
  }
  return out;
};

const anthurium: Draw = ({ art, n, r, bloom }) => {
  const count = [3, 5, 8][n];
  const out: ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const a = -55 + t * 110 + j(r, 6);
    const pet = [8, 22, 34][n] * (0.75 + r() * 0.4);
    const ex = Math.sin(rad(a)) * pet, ey = -Math.cos(rad(a)) * pet;
    const L = [16, 24, 30][n];
    out.push(<path key={'p' + i} d={`M0,0 Q${f(ex * 0.2)},${f(ey * 0.9)} ${f(ex)},${f(ey)}`} stroke={STEM} strokeWidth={1.6} fill="none" />);
    out.push(<Leaf key={'l' + i} x={ex} y={ey} a={a * 1.3 + 180} d={P.heart(L, L * 0.8)} fill={i % 2 ? art.leaf : darker(art.leaf, 0.85)} L={L} vein="#7aa884" />);
  }
  if (bloom) {
    const k = [0, 1, 2][n];
    for (let i = 0; i < k; i++) {
      const x = (i ? 1 : -1) * 14, top = -[0, 46, 62][n] + i * 8;
      out.push(<path key={'fs' + i} d={`M0,0 Q${f(x * 0.3)},${f(top * 0.6)} ${f(x)},${f(top)}`} stroke={STEM} strokeWidth={1.4} fill="none" />);
      out.push(
        <Leaf key={'fl' + i} x={x} y={top} a={180 + x} d={P.heart(18, 16)} fill={art.flower!} L={18} vein={darker(art.flower!, 0.8)}>
          <ellipse cx={-3} cy={-9} rx={2.5} ry={4} fill="#fff" opacity={0.25} />
        </Leaf>,
      );
      out.push(<rect key={'sp' + i} x={x - 1.4} y={top - 14} width={2.8} height={12} rx={1.4} fill="#f4d35e" transform={`rotate(${f(x * 0.8 + 10)} ${f(x)} ${f(top)})`} />);
    }
  }
  return out;
};

const geranium: Draw = ({ art, n, r, bloom }) => {
  const count = [4, 7, 10][n];
  const out: ReactNode[] = [];
  const h = [6, 16, 26][n];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const a = -70 + t * 140 + j(r, 8);
    const pet = h * (0.6 + r() * 0.6);
    const ex = Math.sin(rad(a)) * pet, ey = -Math.cos(rad(a)) * pet - (i % 2) * 6;
    const R = [9, 11, 13][n];
    out.push(<path key={'p' + i} d={`M0,0 L${f(ex)},${f(ey)}`} stroke={STEM} strokeWidth={1.4} />);
    out.push(
      <Leaf key={'l' + i} x={ex} y={ey} a={a} d={P.round(R * 1.8, R * 2)} fill={art.leaf} L={R * 1.8} vein={false}>
        <path d={P.round(R * 1.25, R * 1.35)} transform={`translate(0,${f(-R * 0.25)})`} fill="none" stroke={art.leaf2} strokeWidth={2} opacity={0.35} />
      </Leaf>,
    );
  }
  if (bloom) {
    const k = [0, 2, 3][n];
    for (let i = 0; i < k; i++) {
      const x = (i - (k - 1) / 2) * 20, top = -[0, 52, 70][n] - (i % 2) * 8;
      out.push(<path key={'fs' + i} d={`M0,-4 Q${f(x * 0.3)},${f(top * 0.5)} ${f(x)},${f(top)}`} stroke={STEM} strokeWidth={1.3} fill="none" />);
      for (let q = 0; q < 8; q++) {
        const aa = (q / 8) * Math.PI * 2;
        out.push(<Flower5 key={`f${i}-${q}`} x={x + Math.cos(aa) * 6 * (q % 2 ? 1 : 0.5)} y={top + Math.sin(aa) * 5 * (q % 2 ? 1 : 0.5)} r={4.2} color={q % 3 ? art.flower! : darker(art.flower!, 0.88)} center="#fff3c4" rot={r() * 72} />);
      }
    }
  }
  return out;
};

const decembrist: Draw = ({ art, n, r, bloom }) => {
  const stems = [2, 4, 7][n];
  const segs = [2, 4, 6][n];
  const out: ReactNode[] = [];
  for (let i = 0; i < stems; i++) {
    const t = stems === 1 ? 0.5 : i / (stems - 1);
    let a = -60 + t * 120 + j(r, 6);
    let x = 0, y = 0;
    for (let k = 0; k < segs; k++) {
      out.push(
        <g key={`${i}-${k}`} transform={`translate(${f(x)},${f(y)}) rotate(${f(a)})`}>
          <path d="M-4,0 C-6,-4 -7,-9 -5,-12 L-3,-11 L0,-13 L3,-11 L5,-12 C7,-9 6,-4 4,0Z" fill={k % 2 ? art.leaf : darker(art.leaf, 0.9)} />
        </g>,
      );
      x += Math.sin(rad(a)) * 12;
      y -= Math.cos(rad(a)) * 12;
      a += (a > 0 ? 1 : -1) * (14 + r() * 6);
    }
    if (bloom) {
      out.push(
        <g key={'f' + i} transform={`translate(${f(x)},${f(y)}) rotate(${f(a)})`}>
          <path d="M0,0 C-3,-8 -2,-14 -7,-20 C-2,-17 0,-14 0,-10 C0,-14 2,-17 7,-20 C2,-14 3,-8 0,0Z" fill={art.flower} />
          <path d="M0,-4 C-2,-10 -6,-12 -9,-12 M0,-4 C2,-10 6,-12 9,-12" stroke={darker(art.flower!, 0.85)} strokeWidth={2} fill="none" />
          <path d="M0,-8 L0,-19" stroke="#fff" strokeWidth={0.8} />
        </g>,
      );
    }
  }
  return out;
};

const orchid: Draw = ({ art, n, r, bloom }) => {
  const out: ReactNode[] = [];
  const count = [2, 3, 5][n];
  for (let k = 0; k < [1, 2, 3][n]; k++) {
    const sd = k % 2 ? 1 : -1;
    out.push(<path key={'root' + k} d={`M${sd * 4},-2 q${sd * 10},-4 ${sd * 16},6 q${sd * 4},6 ${sd * 2},12`} stroke="#b9c9b0" strokeWidth={2.2} fill="none" strokeLinecap="round" />);
  }
  for (let i = 0; i < count; i++) {
    const sd = i % 2 ? 1 : -1;
    const a = sd * (62 + i * 6 + j(r, 6));
    const L = [22, 30, 36][n];
    out.push(<Leaf key={'l' + i} y={-i * 3} a={a} d={P.ellipse(L, L * 0.48)} fill={i % 2 ? art.leaf : darker(art.leaf, 0.88)} L={L} vein="#6f9a75" />);
  }
  if (bloom && n >= 1) {
    const h = n === 2 ? 108 : 72;
    out.push(<path key="spike" d={`M2,-6 C6,${-h * 0.5} 2,${-h * 0.9} 20,${-h}`} stroke="#6a7a4a" strokeWidth={1.6} fill="none" />);
    out.push(<line key="stake" x1={0} y1={0} x2={2} y2={-h * 0.85} stroke="#c9a46a" strokeWidth={1.4} />);
    const flowers = n === 2 ? 5 : 3;
    for (let q = 0; q < flowers; q++) {
      const t = 0.55 + (q / flowers) * 0.5;
      const x = 2 + (t - 0.55) * 40 + j(r, 2);
      const y = -h * t - 2;
      out.push(
        <g key={'fl' + q} transform={`translate(${f(x)},${f(y)})`}>
          {[0, 72, 144, 216, 288].map((d) => (
            <ellipse key={d} cx={f(Math.cos(rad(d - 90)) * 5)} cy={f(Math.sin(rad(d - 90)) * 5)} rx={4.6} ry={6} fill={art.flower} transform={`rotate(${d} ${f(Math.cos(rad(d - 90)) * 5)} ${f(Math.sin(rad(d - 90)) * 5)})`} />
          ))}
          <ellipse cx={0} cy={3} rx={2.6} ry={3.2} fill={darker(art.flower!, 0.7)} />
          <circle r={1.6} fill="#fff7d6" />
        </g>,
      );
    }
  }
  return out;
};

const hibiscus: Draw = ({ art, n, r, bloom }) => {
  const h = [14, 40, 70][n];
  const out: ReactNode[] = [<path key="t" d={`M0,0 C-1,${-h * 0.5} 1,${-h * 0.8} 0,${-h}`} stroke={WOOD} strokeWidth={3} fill="none" strokeLinecap="round" />];
  const branches = [0, 2, 4][n];
  const tips: [number, number][] = [[0, -h]];
  for (let b = 0; b < branches; b++) {
    const sd = b % 2 ? 1 : -1;
    const y0 = -h * (0.4 + (b >> 1) * 0.25);
    const ex = sd * (18 + r() * 12), ey = y0 - 14 - r() * 10;
    out.push(<path key={'b' + b} d={`M0,${f(y0)} Q${f(ex * 0.4)},${f(y0 - 4)} ${f(ex)},${f(ey)}`} stroke={WOOD} strokeWidth={2} fill="none" />);
    tips.push([ex, ey]);
  }
  tips.forEach(([x, y], i) => {
    const k = [4, 4, 4][n];
    for (let q = 0; q < k; q++) {
      const a = -100 + (q / (k - 1)) * 200 + j(r, 10);
      out.push(<Leaf key={`l${i}-${q}`} x={x} y={y + 4} a={a} d={P.ellipse(16, 10)} fill={q % 2 ? art.leaf : darker(art.leaf, 0.88)} L={16} vein="#8bb98a" />);
    }
  });
  if (bloom && n >= 1) {
    tips.slice(0, n === 2 ? 3 : 1).forEach(([x, y], i) => {
      out.push(
        <g key={'fl' + i} transform={`translate(${f(x)},${f(y - 8)})`}>
          {[0, 72, 144, 216, 288].map((d) => (
            <ellipse key={d} cx={f(Math.cos(rad(d)) * 7)} cy={f(Math.sin(rad(d)) * 7)} rx={7} ry={6} fill={art.flower} transform={`rotate(${d} ${f(Math.cos(rad(d)) * 7)} ${f(Math.sin(rad(d)) * 7)})`} />
          ))}
          <circle r={3} fill={darker(art.flower!, 0.65)} />
          <path d="M0,0 L6,-9" stroke="#f6d36a" strokeWidth={1.5} />
          <circle cx={6} cy={-9} r={1.6} fill="#f6d36a" />
        </g>,
      );
    });
  }
  return out;
};

const DRAW: Record<ArtSpec['kind'], Draw> = {
  grass, trail, heartTrail, blades, dracaena, aloe, rosette, crassula, kalanchoe, zamioculcas, monstera, ficus, spathiphyllum, anthurium, geranium, decembrist, orchid, hibiscus,
};

// ─────────────── черенок в стакане ───────────────
function Cutting({ art, roots, r }: { art: ArtSpec; roots: boolean; r: R }) {
  const leafShape = ['heartTrail', 'anthurium', 'monstera'].includes(art.kind) ? 'heart' : ['rosette', 'crassula', 'kalanchoe', 'geranium'].includes(art.kind) ? 'round' : ['blades', 'aloe', 'dracaena'].includes(art.kind) ? 'blade' : 'ellipse';
  const L = leafShape === 'blade' ? 26 : 16;
  const W = leafShape === 'blade' ? 7 : leafShape === 'round' ? 14 : leafShape === 'heart' ? 13 : 9;
  return (
    <g>
      {roots && (
        <g stroke="#b89a5e" strokeWidth={1.6} fill="none" strokeLinecap="round">
          {[-12, -6, -1, 5, 11].map((x, i) => (
            <path key={i} d={`M70,${170 + (i % 3) * 5} q${x * 0.6},${6 + j(r, 2)} ${x},${14 + (i % 2) * 4}`} />
          ))}
        </g>
      )}
      <path d="M70,180 L70,112" stroke={STEM} strokeWidth={2.4} strokeLinecap="round" />
      <Leaf x={70} y={118} a={-38} d={P[leafShape](L, W)} fill={art.leaf} L={L} />
      <Leaf x={70} y={112} a={28} d={P[leafShape](L * 0.85, W * 0.85)} fill={darker(art.leaf, 0.92)} L={L * 0.85} />
    </g>
  );
}

function Glass({ front }: { front?: boolean }) {
  if (front)
    return (
      <g>
        <rect x={46} y={124} width={48} height={72} rx={6} fill="#cfeef7" opacity={0.28} />
        <rect x={46} y={142} width={48} height={54} rx={6} fill="#8fd0e8" opacity={0.35} />
        <path d="M52,130 L52,188" stroke="#fff" strokeWidth={3} opacity={0.55} strokeLinecap="round" />
        <rect x={46} y={124} width={48} height={72} rx={6} fill="none" stroke="#9fc9d6" strokeWidth={2} />
      </g>
    );
  return <rect x={46} y={124} width={48} height={72} rx={6} fill="#eaf8fc" opacity={0.5} />;
}

// ─────────────── горшок ───────────────
export function Pot({ skin, big }: { skin: string; big?: boolean }) {
  const p = POTS[skin] ?? POTS.terracotta;
  const w = big ? 112 : 96;
  const x0 = 70 - w / 2;
  const bw = w * 0.76;
  const bx = 70 - bw / 2;
  if (p.pattern === 'enamel') {
    return (
      <g>
        <path d={`M${x0 + w - 4},156 c16,0 16,26 0,26`} stroke={p.body} strokeWidth={6} fill="none" />
        <path d={`M${x0 + w - 4},156 c16,0 16,26 0,26`} stroke="#c9c3b4" strokeWidth={1.4} fill="none" />
        <rect x={x0 + 6} y={140} width={w - 12} height={56} rx={6} fill={p.body} />
        <rect x={x0 + 4} y={138} width={w - 8} height={8} rx={4} fill={p.rim} />
        <circle cx={x0 + 22} cy={176} r={3} fill="#3a3a3a" opacity={0.5} />
        <path d={`M${x0 + 30},162 q10,-10 20,0 q10,10 20,0`} stroke={p.rim} strokeWidth={2} fill="none" opacity={0.6} />
      </g>
    );
  }
  return (
    <g>
      <path d={`M${x0 + 6},148 H${x0 + w - 6} L${bx + bw},196 H${bx} Z`} fill={p.body} opacity={p.pattern === 'glass' ? 0.55 : 1} />
      {p.pattern === 'glass' && (
        <g stroke="#a99a74" strokeWidth={1.2} fill="none" opacity={0.7}>
          <path d="M60,150 q-4,20 2,40 M72,150 q6,18 -2,40 M82,152 q2,14 -4,30" />
        </g>
      )}
      {p.pattern === 'gzhel' && (
        <g fill="none" stroke="#2d4fa8" strokeWidth={1.8}>
          <circle cx={70} cy={170} r={6} />
          {[0, 60, 120, 180, 240, 300].map((d) => (
            <ellipse key={d} cx={f(70 + Math.cos(rad(d)) * 11)} cy={f(170 + Math.sin(rad(d)) * 11)} rx={4} ry={2.2} transform={`rotate(${d} ${f(70 + Math.cos(rad(d)) * 11)} ${f(170 + Math.sin(rad(d)) * 11)})`} />
          ))}
          <path d={`M${x0 + 14},186 q8,-6 16,0 t16,0 t16,0 t16,0`} />
        </g>
      )}
      {p.pattern === 'khokhloma' && (
        <g>
          <path d={`M${x0 + 16},180 C${x0 + 30},160 ${x0 + 50},186 ${x0 + 66},166`} stroke="#e6b13a" strokeWidth={2} fill="none" />
          {[[58, 172], [66, 177], [62, 166], [84, 168], [90, 175]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={3.2} fill="#c8352b" />
          ))}
          <path d="M74,162 q6,-6 12,0 q-6,4 -12,0Z M44,176 q6,-6 12,0 q-6,4 -12,0Z" fill="#e6b13a" />
        </g>
      )}
      {p.pattern === 'gold' && (
        <g>
          <path d={`M${x0 + 18},152 L${x0 + 30},192`} stroke="#fff3c4" strokeWidth={5} opacity={0.6} strokeLinecap="round" />
          <path d="M62,170 l4,-8 l4,8 l8,1 l-6,5 l2,8 l-8,-4 l-8,4 l2,-8 l-6,-5Z" fill="#fff3c4" opacity={0.85} />
        </g>
      )}
      {p.pattern === 'autumn' && (
        <path d="M70,158 l3,8 l8,-3 l-3,8 l7,4 l-8,3 l1,8 l-8,-4 l-8,4 l1,-8 l-8,-3 l7,-4 l-3,-8 l8,3Z" fill="#f2b134" />
      )}
      {p.pattern === 'snow' && (
        <g stroke="#7fb2de" strokeWidth={1.6} strokeLinecap="round">
          {[[58, 166], [82, 176], [68, 186]].map(([cx, cy], i) => (
            <g key={i}>{[0, 60, 120].map((d) => <line key={d} x1={f(cx - Math.cos(rad(d)) * 5)} y1={f(cy - Math.sin(rad(d)) * 5)} x2={f(cx + Math.cos(rad(d)) * 5)} y2={f(cy + Math.sin(rad(d)) * 5)} />)}</g>
          ))}
        </g>
      )}
      {p.pattern === 'pastel' && (
        <g>
          {[[56, 166, '#b9e3d0'], [76, 172, '#fff'], [64, 184, '#f2b5c9'], [86, 186, '#b9e3d0']].map(([x, y, c], i) => <circle key={i} cx={x as number} cy={y as number} r={3.5} fill={c as string} />)}
        </g>
      )}
      {p.pattern === 'concrete' && (
        <g fill="#7e7e79">
          {[[52, 160], [80, 170], [66, 184], [90, 156], [58, 178]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={1.2} />)}
        </g>
      )}
      <rect x={x0} y={138} width={w} height={13} rx={4} fill={p.rim} opacity={p.pattern === 'glass' ? 0.8 : 1} />
      <path d={`M${x0 + 8},${152} H${x0 + w - 8}`} stroke="#000" strokeWidth={3} opacity={0.12} />
      <ellipse cx={70} cy={140} rx={w / 2 - 6} ry={3.5} fill="#6b4a33" />
    </g>
  );
}

// ─────────────── главный компонент ───────────────
export interface PlantArtProps {
  sp: string;
  stage: Stage;
  seed?: string;
  pot?: string;
  bigPot?: boolean;
  blooming?: boolean;
  className?: string;
  noPot?: boolean;
  form?: string;
}

export function PlantArt({ sp: spId, stage, seed = '', pot = 'terracotta', bigPot, blooming, className, noPot, form }: PlantArtProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const base = sp(spId);
  const fm = form ? FORM_BY_ID[form] : undefined;
  const s = fm && fm.sp === spId ? { ...base, art: { ...base.art, ...fm.art } } : base;
  const vg = fm && fm.sp === spId ? fm.art.variegate : undefined;
  const r = rng(spId + seed);
  if (stage <= 1) {
    return (
      <svg viewBox="0 0 140 200" className={className} aria-label={s.name}>
        {!noPot && <Glass />}
        <Variegate.Provider value={vg}>
          <Cutting art={s.art} roots={stage === 1} r={r} />
        </Variegate.Provider>
        {!noPot && <Glass front />}
      </svg>
    );
  }
  const n = stage - 2;
  const scale = bigPot && stage === 4 ? 1.08 : 1;
  return (
    <svg viewBox="0 0 140 200" className={className} aria-label={s.name} overflow="visible">
      {!noPot && <Pot skin={pot} big={bigPot} />}
      <svg x={70} y={142} overflow="visible" className="plant-root">
        <g className="sway">
          <Variegate.Provider value={vg}>
            <g transform={`scale(${scale})`}>{DRAW[s.art.kind]({ art: s.art, n, r, bloom: !!blooming, uid })}</g>
          </Variegate.Provider>
        </g>
      </svg>
    </svg>
  );
}
