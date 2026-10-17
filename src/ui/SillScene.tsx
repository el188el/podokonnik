// Сцена подоконника без прокрутки: окно с подоконником (верхний ряд)
// и столик в глубине комнаты (нижний ряд). Декор — на стекле, над окном,
// на подоконнике, на столе и на стене. Предметы живые: их можно включать,
// переставлять, а кот Барсик сам гуляет по подоконнику.

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent, type ReactNode } from 'react';
import { DEEP_ROW, FLOOR_ROW, GLASS_ROW, HANG_ROW } from '../game/layout';
import { ITEM_BY_ID, placeOf } from '../game/shop';
import type { DecorPos } from '../game/types';
import { DecorArt, hasDecorArt } from './art/DecorArt';
import { CAT_DEFAULT_COLOR, CAT_IDS, CAT_NAMES } from '../game/cat';
import type { Sky } from '../game/weather';
import { Emo, rich } from './kit/rich';
import { catTrip, toast, useStore } from '../game/store';

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
  /** Пол под столиком (11–13): места для больших растений. */
  floorCell?: (slot: number) => ReactNode;
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
  /** Убрать предмет с подоконника (режим перестановки). */
  onHide?: (id: string) => void;
  /** Окрасы котиков. */
  catColors?: Record<string, string>;
  /** Форточка открыта, шторы задёрнуты, на улице холодно (сквозняк). */
  vent?: boolean;
  curtains?: boolean;
  draft?: boolean;
}

const icon = (id: string) => ITEM_BY_ID[id]?.icon ?? '';
const DEFAULT_X = [0.04, 0.25, 0.75, 0.96, 0.5]; // промежутки между горшками (по 4 в ряду); середина — коту
const CAT_X: Record<string, number> = { cat: 0.5, cat2: 0.14, cat3: 0.86 };
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

/** Крестик «убрать с подоконника» в режиме перестановки. */
function HideX({ id, onHide }: { id: string; onHide?: (id: string) => void }) {
  if (!onHide) return null;
  return (
    <span className="deco-x" role="button" aria-label="Убрать" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => { e.stopPropagation(); onHide(id); }}><Emo e="✕" /></span>
  );
}

function Deco({ id, x, on, arrange, onItem, onMove, onHide }: { id: string; x: number; on: boolean; arrange?: boolean; onItem?: (id: string) => void; onMove?: SceneProps['onMove']; onHide?: (id: string) => void }) {
  const live = !!onItem;
  const [poke, setPoke] = useState(0);
  const drag = useDrag(!!arrange, live && !arrange ? () => { setPoke(Date.now()); onItem!(id); } : undefined, (nx, row) => onMove?.(id, nx, placeOf(id) === 'wall' ? undefined : row));
  const art = hasDecorArt(id) ? <DecorArt id={id} scale={1} on={on} /> : icon(id);
  if (!live) return <span className={'deco deco-' + id} style={{ left: `${x * 100}%` }}>{rich(art)}</span>;
  return (
    <button
      className={`deco live deco-${id}${on ? '' : ' off'}${arrange ? ' movable' : ''}${drag.dragging ? ' dragging' : ''}`}
      style={{ left: `${x * 100}%`, ...drag.style }}
      aria-label={ITEM_BY_ID[id]?.name ?? id}
      {...drag.handlers}
    >
      <span className="deco-in" key={poke}>{rich(art)}</span>
      {id === 'radio' && on && !arrange && <span className="notes" aria-hidden><i><Emo e="♪" /></i><i><Emo e="♫" /></i><i><Emo e="♪" /></i></span>}
      {arrange && <HideX id={id} onHide={onHide} />}
    </button>
  );
}

/**
 * Кот Барсик: лежит, иногда встаёт и гуляет вдоль ряда, а иногда прыгает
 * с подоконника на столик и обратно. Нажми — погладить, потяни — переставить.
 * Живёт поверх обоих рядов, чтобы прыжок был одним движением.
 */
type Bed = { has: boolean; who: string | null; set: (who: string | null) => void };

function LiveCat({ id, tint, x0, row0, arrange, onCat, onMove, onHide, bed }: { id: string; tint?: string; x0: number; row0: 'sill' | 'table'; arrange?: boolean; onCat?: () => void; onMove?: SceneProps['onMove']; onHide?: (id: string) => void; bed: Bed }) {
  // пришёл из другой комнаты — входит с края
  const entering = Date.now() - catTrip.at < 1500;
  const [x, setX] = useState(entering ? -0.15 : x0);
  const [row, setRow] = useState<'sill' | 'table' | 'bed'>(row0);
  const [move, setMove] = useState<{ dur: number; left: boolean; jump?: boolean; run?: boolean } | null>(null);
  // проснулся: стоит пару секунд, а потом снова ложится
  const [awake, setAwake] = useState(0);
  const wake = (ms = 3500) => { setAwake(Date.now() + ms); setTimeout(() => setAwake((a) => (a && a <= Date.now() ? 0 : a)), ms + 50); };
  const [away, setAway] = useState(false);
  const [pet, setPet] = useState(0);
  const [bottoms, setBottoms] = useState<{ sill: number; table: number; bed: number } | null>(null);
  const ref = useRef<HTMLButtonElement>(null);
  const cur = useRef<{ x: number; row: 'sill' | 'table' | 'bed' }>({ x: entering ? -0.15 : x0, row: row0 });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inBed = bed.who === id;
  const bedRef = useRef(bed);
  bedRef.current = bed;
  useEffect(() => { if (!entering) { cur.current = { x: x0, row: row0 }; setX(x0); setRow(row0); } }, [x0, row0]); // eslint-disable-line react-hooks/exhaustive-deps
  // где «пол» у каждого ряда — считаем от низа контейнера рядов
  useEffect(() => {
    const rows = ref.current?.closest('.rows') as HTMLElement | null;
    if (!rows) return;
    const measure = () => {
      const g = rows.querySelector<HTMLElement>('.row-glass');
      const d = rows.querySelector<HTMLElement>('.row-deep');
      if (!g || !d) return;
      const H = rows.clientHeight;
      const rb = rows.getBoundingClientRect();
      const bedEl = rows.closest('.scene')?.querySelector('.cat-bed');
      const bed = bedEl ? rb.bottom - bedEl.getBoundingClientRect().bottom + 10 : H - (g.offsetTop + g.offsetHeight) + 60;
      setBottoms({ sill: H - (g.offsetTop + g.offsetHeight) - 2, table: H - (d.offsetTop + d.offsetHeight) - 2, bed });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(rows);
    return () => ro.disconnect();
  }, []);

  /** Пройти к точке; по приходу — then(). */
  const walkTo = (to: number, then?: () => void, run = false) => {
    const c = cur.current;
    const dur = run ? 0.7 : Math.max(1.6, Math.abs(to - c.x) * 9);
    setMove({ dur, left: to < c.x, run });
    cur.current = { ...c, x: to };
    setX(to);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { setMove(null); wake(); then?.(); }, dur * 1000);
  };
  /** Прыжок по дуге: на другой ряд или в лежанку. */
  const hop = (to: number, toRow: 'sill' | 'table' | 'bed', then?: () => void) => {
    const c = cur.current;
    const dur = 0.7;
    setMove({ dur, left: to < c.x, jump: true });
    cur.current = { x: to, row: toRow };
    setX(to); setRow(toRow);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { setMove(null); wake(); then?.(); }, dur * 1000 + 250);
  };
  const plan = (wait = 12000 + Math.random() * 20000) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const b = bedRef.current;
      if (b.who === id) {
        // проснулся в лежанке — встаёт и спрыгивает на подоконник
        b.set(null);
        cur.current = { x: 0.16, row: 'bed' };
        setX(0.16); setRow('bed'); wake(1200);
        timer.current = setTimeout(() => hop(0.26, 'sill', () => plan()), 900);
        return;
      }
      // есть лежанка и она свободна — чаще всего идёт спать туда
      if (b.has && !b.who && Math.random() < 0.6) {
        if (cur.current.row !== 'sill') { cur.current = { ...cur.current, row: 'sill' }; setRow('sill'); }
        return walkTo(0.16, () => hop(0.16, 'bed', () => { bedRef.current.set(id); plan(40000 + Math.random() * 50000); }));
      }
      // сначала просыпается и встаёт, потом идёт или прыгает
      const c = cur.current;
      wake(1500);
      timer.current = setTimeout(() => {
        if (Math.random() < 0.35) hop(Math.min(0.92, Math.max(0.08, c.x + (Math.random() - 0.5) * 0.3)), c.row === 'sill' ? 'table' : 'sill', () => plan());
        else walkTo(0.05 + Math.random() * 0.9, () => plan());
      }, 700);
    }, wait);
  };
  useEffect(() => {
    if (reduced() || arrange) return;
    if (entering) walkTo(x0, () => plan());
    else plan(bed.has && !bed.who ? 3000 + Math.random() * 5000 : undefined);
    return () => clearTimeout(timer.current);
  }, [arrange, bed.has]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Брызнули водой — обиделся, убежал за край и вернулся через полминуты. */
  const flee = () => {
    if (bedRef.current.who === id) bedRef.current.set(null);
    const left = cur.current.x < 0.5;
    toast(`💦 Мяу! ${CAT_NAMES[id] ?? 'Котик'} не любит брызги — убегает, но скоро вернётся`);
    walkTo(left ? -0.3 : 1.3, () => {
      setAway(true);
      timer.current = setTimeout(() => {
        const from = left ? 1.3 : -0.3;
        cur.current = { x: from, row: 'sill' };
        setX(from); setRow('sill');
        setAway(false);
        setTimeout(() => walkTo(0.2 + Math.random() * 0.6, () => plan()), 60);
      }, 20000 + Math.random() * 20000);
    }, true);
  };
  const tap = () => {
    const tool = useStore.getState().tool;
    if (tool === 'water' || tool === 'mist') return flee();
    setPet(Date.now());
    wake();
    onCat?.();
  };
  // тап по лежанке приходит сюда же
  useEffect(() => {
    if (!inBed) return;
    const h = (e: Event) => { if ((e as CustomEvent).detail === id) tap(); };
    window.addEventListener('cat-bed-tap', h);
    return () => window.removeEventListener('cat-bed-tap', h);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const drag = useDrag(true, tap, (nx, r) => { clearTimeout(timer.current); setMove(null); cur.current = { x: nx, row: r }; setX(nx); setRow(r); wake(); onMove?.(id, nx, r); plan(); });
  const up = !!move || awake > Date.now();
  const tr = move ? (move.jump ? `left ${move.dur}s ease-in-out, bottom ${move.dur}s cubic-bezier(.45,0,.55,1)` : `left ${move.dur}s ${move.run ? 'ease-in' : 'linear'}`) : undefined;
  const hidden = away || inBed || !bottoms;
  return (
    <button
      ref={ref}
      className={'cat-live' + (move ? ' walking' : up ? ' standing' : '') + (move?.run ? ' running' : '') + (move?.jump ? ' jumping' : '') + (move?.left ? ' to-left' : '') + (drag.dragging ? ' dragging' : '')}
      style={{ left: `${x * 100}%`, bottom: bottoms ? bottoms[row] : undefined, visibility: hidden ? 'hidden' : undefined, pointerEvents: hidden ? 'none' : undefined, transition: tr, ['--jump' as string]: `${move?.dur ?? 0.75}s`, ...drag.style }}
      aria-label={`${CAT_NAMES[id] ?? 'Котик'}: погладить или перетащить`}
      {...drag.handlers}
    >
      <span className="cat-flip"><span className="cat-hop"><DecorArt id={up ? 'cat_walk' : 'cat'} tint={tint} scale={up ? 1.15 : 1.25} /></span></span>
      {pet > 0 && <span className="purr" key={pet}><Emo e="💕" /></span>}
      {arrange && <HideX id={id} onHide={onHide} />}
    </button>
  );
}

export function SillScene({ decor, tod, winter, sky, theme, win = 'E', cell, hangCell, floorCell, className = '', style, pos = {}, off = [], arrange, onItem, onMove, onCat, vent, curtains, draft, catColors, onHide }: SceneProps) {
  const at = (place: string) => decor.filter((d) => placeOf(d) === place);
  const windowD = at('window');
  const ledgeItems = decor.filter((d) => (placeOf(d) === 'sill' || placeOf(d) === 'table') && !CAT_IDS.includes(d));
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
  const cats = CAT_IDS.filter((c) => decor.includes(c));
  const [bedWho, setBedWho] = useState<string | null>(null);
  const hasBed = windowD.includes('cat_bed') && !!onCat;
  const bed: Bed = { has: hasBed, who: hasBed && bedWho && cats.includes(bedWho) ? bedWho : null, set: setBedWho };
  const isOn = (d: string) => !off.includes(d);
  const xOf = (d: string, i: number) => pos[d]?.x ?? DEFAULT_X[i] ?? 0.5;
  const deco = (d: string, i: number) => <Deco key={d} id={d} x={xOf(d, i)} on={isOn(d)} arrange={arrange} onItem={onItem} onMove={onMove} onHide={onHide} />;

  return (
    <div className={`scene tod-${tod}${winter ? ' winter' : ''}${sky ? ' sky-' + sky : ''}${hang ? ' has-hang' : ''}${floorCell ? ' has-floor' : ''}${lampOn ? ' lamp-on' : ''}${arrange ? ' arranging' : ''} ${className}`} data-win={win} data-wp={wallpaper} style={style}>
      {hang && (
        <div className="hang-row">
          {HANG_ROW.map((i) => (
            <div className="cell hang" data-slot={i} data-zone="glass" key={i}>{rich(hangCell!(i))}</div>
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
        {windowD.includes('cat_bed') && (
          <button className={'cat-bed' + (bed.who ? ' busy' : '')} onClick={() => (bed.who ? window.dispatchEvent(new CustomEvent('cat-bed-tap', { detail: bed.who })) : onItem?.('cat_bed'))} aria-label="Лежанка для котика">
            <DecorArt id="cat_bed" on={!!bed.who} tint={bed.who ? catColors?.[bed.who] ?? CAT_DEFAULT_COLOR[bed.who] : undefined} scale={1.35} />
          </button>
        )}
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
            <span key={d} className={'wall-' + d}>{hasDecorArt(d) ? <DecorArt id={d} scale={0.9} /> : rich(icon(d))}</span>
          ))}
        </div>
      </div>
      {(lampOn || (decor.includes('lamp_table') && isOn('lamp_table'))) && <div className={'lamp-glow-deep' + (decor.includes('lamp_table') && isOn('lamp_table') ? ' strong' : '')} />}

      {/* ─── ряды с горшками ─── */}
      <div className="rows">
        <div className="row row-glass">
          {GLASS_ROW.map((i) => (
            <div className="cell glass" data-slot={i} data-zone="glass" key={i}>{rich(cell(i))}</div>
          ))}
          <div className="ledge-decor">
            {sillD.map(deco)}
            {!onCat && cats.map((c) => <span key={c} className="deco deco-cat" style={{ left: `${CAT_X[c] * 100}%` }}><DecorArt id="cat" tint={catColors?.[c] ?? CAT_DEFAULT_COLOR[c]} /></span>)}
          </div>
        </div>
        <div className="ledge" />
        <div className="row row-deep">
          {DEEP_ROW.map((i) => (
            <div className="cell deep" data-slot={i} data-zone="deep" key={i}>{rich(cell(i))}</div>
          ))}
          <div className="ledge-decor">
            {tableD.map(deco)}
          </div>
        </div>
        <div className="table" />
        {onCat && cats.map((c) => <LiveCat key={c + ':' + catTrip.at} id={c} tint={catColors?.[c] ?? CAT_DEFAULT_COLOR[c]} x0={pos[c]?.x ?? CAT_X[c]} row0={rowOf(c)} arrange={arrange} onCat={onCat} onMove={onMove} onHide={onHide} bed={bed} />)}
      </div>
      {/* ─── пол: большие растения ─── */}
      {floorCell && (
        <div className="floor">
          <div className="baseboard" />
          <div className="row row-floor">
            {FLOOR_ROW.map((i) => (
              <div className="cell floor-cell" data-slot={i} data-zone="deep" key={i}>{rich(floorCell(i))}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function timeOfDay(t: number): SceneProps['tod'] {
  const h = new Date(t).getHours();
  return h >= 7 && h < 17 ? 'day' : h >= 17 && h < 21 ? 'eve' : h >= 5 && h < 7 ? 'dawn' : 'night';
}
