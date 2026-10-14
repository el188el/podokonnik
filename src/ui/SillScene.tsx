// Сцена подоконника без прокрутки: окно с подоконником (верхний ряд)
// и столик в глубине комнаты (нижний ряд). Декор — на стекле, над окном,
// на подоконнике, на столе и на стене. Предметы живые: их можно включать,
// переставлять, а кот Барсик сам гуляет по подоконнику.

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent, type ReactNode } from 'react';
import { DEEP_ROW, GLASS_ROW, HANG_ROW } from '../game/layout';
import { ITEM_BY_ID, placeOf } from '../game/shop';
import type { DecorPos } from '../game/types';
import { DecorArt, hasDecorArt } from './art/DecorArt';
import type { Sky } from '../game/weather';

export interface SceneProps {
  decor: string[];
  tod: 'day' | 'eve' | 'dawn' | 'night';
  winter?: boolean;
  sky?: Sky;            // настоящая погода за окном
  theme?: 'autumn' | 'winter' | 'spring' | 'summer';
  win?: string;
  cell: (slot: number) => ReactNode;
  /** Места в подвесных кашпо (6–8) — только на своём подоконнике. */
  hangCell?: (slot: number) => ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Куда переставлены предметы и какие выключены (свой подоконник). */
  pos?: Record<string, DecorPos>;
  off?: string[];
  /** Режим перестановки: предметы можно таскать. */
  arrange?: boolean;
  /** Нажали на предмет (включить, выключить, рассказать о нём). Без обработчика предметы неживые. */
  onItem?: (id: string) => void;
  /** Предмет перетащили. */
  onMove?: (id: string, x: number, row?: 'sill' | 'table') => void;
  /** Нажали на кота — погладить. */
  onCat?: () => void;
  /** Форточка открыта, шторы задёрнуты, на улице холодно (сквозняк). */
  vent?: boolean;
  curtains?: boolean;
  draft?: boolean;
}

const icon = (id: string) => ITEM_BY_ID[id]?.icon ?? '';
const DEFAULT_X = [0.04, 0.25, 0.75, 0.96, 0.5]; // промежутки между горшками (по 4 в ряду); середина — коту
const CAT_X = 0.5;
const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Куда уронили предмет: ряд (подоконник или столик) и доля ширины. */
function dropAt(el: HTMLElement, cx: number, cy: number): { x: number; row: 'sill' | 'table' } | null {
  const scene = el.closest('.scene');
  const ledge = scene?.querySelector('.ledge')?.getBoundingClientRect();
  const rows = scene?.querySelector('.rows')?.getBoundingClientRect();
  if (!ledge || !rows) return null;
  return { x: (cx - rows.left) / rows.width, row: cy < ledge.bottom ? 'sill' : 'table' };
}

/** Перетаскивание пальцем: короткое касание — тап, движение — перенос. */
function useDrag(enabled: boolean, onTap: (() => void) | undefined, onDrop: (x: number, row: 'sill' | 'table') => void) {
  const st = useRef({ x0: 0, y0: 0, id: -1, drag: false, down: false });
  const [d, setD] = useState<{ dx: number; dy: number } | null>(null);
  return {
    dragging: !!d,
    style: d ? { transform: `translate(calc(-50% + ${d.dx}px), ${d.dy}px)`, zIndex: 50, transition: 'none' } as CSSProperties : undefined,
    handlers: {
      onPointerDown: (e: RPointerEvent<HTMLElement>) => {
        e.stopPropagation();
        st.current = { x0: e.clientX, y0: e.clientY, id: e.pointerId, drag: false, down: true };
        if (enabled) try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      },
      onPointerMove: (e: RPointerEvent<HTMLElement>) => {
        const c = st.current;
        if (!c.down || !enabled || e.pointerId !== c.id) return;
        const dx = e.clientX - c.x0, dy = e.clientY - c.y0;
        if (!c.drag && Math.hypot(dx, dy) < 8) return;
        c.drag = true;
        setD({ dx, dy });
      },
      onPointerUp: (e: RPointerEvent<HTMLElement>) => {
        const c = st.current;
        e.stopPropagation();
        if (!c.down) return;
        c.down = false;
        if (c.drag) {
          const at = dropAt(e.currentTarget, e.clientX, e.clientY);
          setD(null);
          if (at) onDrop(at.x, at.row);
        } else onTap?.();
      },
      onPointerCancel: () => { st.current.down = false; setD(null); },
      onClick: (e: React.MouseEvent) => e.stopPropagation(),
    },
  };
}

function Deco({ id, x, on, arrange, onItem, onMove }: { id: string; x: number; on: boolean; arrange?: boolean; onItem?: (id: string) => void; onMove?: SceneProps['onMove'] }) {
  const live = !!onItem;
  const [poke, setPoke] = useState(0);
  const drag = useDrag(!!arrange, live && !arrange ? () => { setPoke(Date.now()); onItem!(id); } : undefined, (nx, row) => onMove?.(id, nx, placeOf(id) === 'wall' ? undefined : row));
  const art = hasDecorArt(id) ? <DecorArt id={id} scale={1} on={on} /> : icon(id);
  if (!live) return <span className={'deco deco-' + id} style={{ left: `${x * 100}%` }}>{art}</span>;
  return (
    <button
      className={`deco live deco-${id}${on ? '' : ' off'}${arrange ? ' movable' : ''}${drag.dragging ? ' dragging' : ''}`}
      style={{ left: `${x * 100}%`, ...drag.style }}
      aria-label={ITEM_BY_ID[id]?.name ?? id}
      {...drag.handlers}
    >
      <span className="deco-in" key={poke}>{art}</span>
      {id === 'radio' && on && !arrange && <span className="notes" aria-hidden><i>♪</i><i>♫</i><i>♪</i></span>}
    </button>
  );
}

/** Кот Барсик: лежит, иногда встаёт и гуляет вдоль ряда. Нажми — погладить, потяни — переставить. */
function LiveCat({ x0, arrange, onCat, onMove }: { x0: number; arrange?: boolean; onCat?: () => void; onMove?: SceneProps['onMove'] }) {
  const [x, setX] = useState(x0);
  const [walk, setWalk] = useState<{ dur: number; left: boolean } | null>(null);
  const [pet, setPet] = useState(0);
  const xr = useRef(x0);
  useEffect(() => { xr.current = x0; setX(x0); }, [x0]);
  useEffect(() => {
    if (reduced() || arrange) return;
    let timer: ReturnType<typeof setTimeout>;
    const plan = () => {
      timer = setTimeout(() => {
        const to = 0.05 + Math.random() * 0.9;
        const dur = Math.max(2, Math.abs(to - xr.current) * 9);
        setWalk({ dur, left: to < xr.current });
        xr.current = to;
        setX(to);
        timer = setTimeout(() => { setWalk(null); plan(); }, dur * 1000);
      }, 14000 + Math.random() * 22000);
    };
    plan();
    return () => clearTimeout(timer);
  }, [arrange]);
  const drag = useDrag(true, () => { setPet(Date.now()); onCat?.(); }, (nx, row) => { setWalk(null); xr.current = nx; setX(nx); onMove?.('cat', nx, row); });
  return (
    <button
      className={'cat-live' + (walk ? ' walking' : '') + (walk?.left ? ' to-left' : '') + (drag.dragging ? ' dragging' : '')}
      style={{ left: `${x * 100}%`, transition: walk ? `left ${walk.dur}s linear` : undefined, ...drag.style }}
      aria-label="Барсик: погладить или перетащить"
      {...drag.handlers}
    >
      <span className="cat-flip"><DecorArt id={walk ? 'cat_walk' : 'cat'} scale={walk ? 1.15 : 1.25} /></span>
      {pet > 0 && <span className="purr" key={pet}>💕</span>}
    </button>
  );
}

export function SillScene({ decor, tod, winter, sky, theme, win = 'E', cell, hangCell, className = '', style, pos = {}, off = [], arrange, onItem, onMove, onCat, vent, curtains, draft }: SceneProps) {
  const at = (place: string) => decor.filter((d) => placeOf(d) === place);
  const windowD = at('window');
  const ledgeItems = decor.filter((d) => (placeOf(d) === 'sill' || placeOf(d) === 'table') && d !== 'cat');
  const rowOf = (d: string) => pos[d]?.row ?? (placeOf(d) === 'table' ? 'table' : 'sill');
  const sillD = ledgeItems.filter((d) => rowOf(d) === 'sill').slice(0, 5);
  const tableD = ledgeItems.filter((d) => rowOf(d) === 'table').slice(0, 5);
  const wallD = at('wall');
  const snow = sky === 'snow' || (!sky && (winter || theme === 'winter'));
  const rain = sky === 'rain' || sky === 'storm';
  const wallpaper = at('wallpaper')[0];
  const hang = !!hangCell && decor.includes('hangers');
  const lamp = windowD.includes('lamp') || decor.includes('lamp');
  const lampOn = lamp && !off.includes('lamp');
  const cat = decor.includes('cat');
  const isOn = (d: string) => !off.includes(d);
  const xOf = (d: string, i: number) => pos[d]?.x ?? DEFAULT_X[i] ?? 0.5;
  const deco = (d: string, i: number) => <Deco key={d} id={d} x={xOf(d, i)} on={isOn(d)} arrange={arrange} onItem={onItem} onMove={onMove} />;

  return (
    <div className={`scene tod-${tod}${winter ? ' winter' : ''}${sky ? ' sky-' + sky : ''}${hang ? ' has-hang' : ''}${lampOn ? ' lamp-on' : ''}${arrange ? ' arranging' : ''} ${className}`} data-win={win} data-wp={wallpaper} style={style}>
      {hang && (
        <div className="hang-row">
          {HANG_ROW.map((i) => (
            <div className="cell hang" data-slot={i} data-zone="glass" key={i}>{hangCell!(i)}</div>
          ))}
        </div>
      )}
      {/* ─── окно ─── */}
      <div className="window">
        <div className="sky">
          <div className="sun" />
          <div className="cloud c1" />
          <div className="cloud c2" />
          {snow && <div className="snow" />}
          {rain && <div className="rain" />}
          {sky === 'fog' && <div className="fog" />}
          {theme === 'autumn' && <div className="fall">{['🍂', '🍁', '🍂', '🍁', '🍂'].map((x, i) => <span key={i} style={{ left: `${8 + i * 19}%`, animationDelay: `${i * 1.7}s` }}>{x}</span>)}</div>}
          {theme === 'summer' && <div className="fall butterflies">{['🦋', '🐝', '🦋'].map((x, i) => <span key={i} style={{ left: `${15 + i * 30}%`, animationDelay: `${i * 2.6}s` }}>{x}</span>)}</div>}
          {theme === 'spring' && <div className="fall petals">{['🌸', '🌸', '🌸', '🌸'].map((x, i) => <span key={i} style={{ left: `${12 + i * 22}%`, animationDelay: `${i * 2.1}s` }}>{x}</span>)}</div>}
          {windowD.includes('feeder') && <div className="feeder"><DecorArt id="feeder" /></div>}
          {windowD.includes('birdhouse') && <div className="birdhouse"><DecorArt id="birdhouse" /></div>}
          {windowD.includes('suncatcher') && <div className="suncatcher"><DecorArt id="suncatcher" /></div>}
        </div>
        <div className="frame" />
        {windowD.includes('paper_snow') && <div className="paper-snow">{[0, 1, 2, 3].map((i) => <span key={i}><DecorArt id="snowflake" scale={[1.1, 1.4, 0.8, 1][i]} /></span>)}</div>}
        {windowD.includes('garland') && <div className={'garland' + (isOn('garland') ? '' : ' off')} onClick={onItem ? () => onItem('garland') : undefined} />}
        {windowD.includes('tulle') && (
          <>
            <div className="tulle left" />
            <div className="tulle right" />
          </>
        )}
        {vent && (
          <div className="vent-sash" aria-hidden>
            {windowD.includes('net') && <div className="vent-net" />}
          </div>
        )}
        {vent && draft && <div className="draft" aria-hidden><i /><i /><i /></div>}
        {windowD.includes('curtains') && (
          <>
            <div className={'drape left' + (curtains ? ' closed' : '') + (vent ? ' sway' : '')} />
            <div className={'drape right' + (curtains ? ' closed' : '') + (vent ? ' sway' : '')} />
          </>
        )}
        {lampOn && <div className="lamp-glow" />}
        {lamp && (
          <button className={'growlamp' + (lampOn ? ' on' : '')} onClick={onItem ? (e) => { e.stopPropagation(); onItem('lamp'); } : undefined} aria-label={lampOn ? 'Выключить фитолампу' : 'Включить фитолампу'} disabled={!onItem}>
            <DecorArt id="growlamp" scale={1} on={lampOn} />
          </button>
        )}
      </div>

      {/* ─── стена (за столиком) ─── */}
      <div className="wall">
        {wallD.includes('carpet') && <div className="carpet" />}
        <div className="wall-items">
          {wallD.filter((d) => d !== 'carpet').slice(0, 3).map((d) => (
            <span key={d} className={'wall-' + d}>{hasDecorArt(d) ? <DecorArt id={d} scale={0.9} /> : icon(d)}</span>
          ))}
        </div>
      </div>
      {lampOn && <div className="lamp-glow-deep" />}

      {/* ─── ряды с горшками ─── */}
      <div className="rows">
        <div className="row row-glass">
          {GLASS_ROW.map((i) => (
            <div className="cell glass" data-slot={i} data-zone="glass" key={i}>{cell(i)}</div>
          ))}
          <div className="ledge-decor">
            {sillD.map(deco)}
            {cat && rowOf('cat') === 'sill' && (onCat ? <LiveCat x0={pos.cat?.x ?? CAT_X} arrange={arrange} onCat={onCat} onMove={onMove} /> : <span className="deco deco-cat" style={{ left: '50%' }}><DecorArt id="cat" /></span>)}
          </div>
        </div>
        <div className="ledge" />
        <div className="row row-deep">
          {DEEP_ROW.map((i) => (
            <div className="cell deep" data-slot={i} data-zone="deep" key={i}>{cell(i)}</div>
          ))}
          <div className="ledge-decor">
            {tableD.map(deco)}
            {cat && rowOf('cat') === 'table' && onCat && <LiveCat x0={pos.cat?.x ?? CAT_X} arrange={arrange} onCat={onCat} onMove={onMove} />}
          </div>
        </div>
        <div className="table" />
      </div>
    </div>
  );
}

export function timeOfDay(t: number): SceneProps['tod'] {
  const h = new Date(t).getHours();
  return h >= 7 && h < 17 ? 'day' : h >= 17 && h < 21 ? 'eve' : h >= 5 && h < 7 ? 'dawn' : 'night';
}
