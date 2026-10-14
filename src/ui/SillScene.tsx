// Сцена подоконника без прокрутки: окно с подоконником (верхний ряд, 3 места)
// и столик в глубине комнаты (нижний ряд, 3 места). Декор — на стекле,
// на подоконнике, на столе и на стене.

import type { ReactNode } from 'react';
import { DEEP_ROW, GLASS_ROW, HANG_ROW } from '../game/layout';
import { ITEM_BY_ID, placeOf } from '../game/shop';
import { DecorArt, hasDecorArt } from './art/DecorArt';
import type { Sky } from '../game/weather';

export interface SceneProps {
  decor: string[];
  tod: 'day' | 'eve' | 'dawn' | 'night';
  winter?: boolean;
  sky?: Sky;            // настоящая погода за окном
  theme?: 'autumn' | 'winter' | 'spring';
  win?: string;
  cell: (slot: number) => ReactNode;
  /** Места в подвесных кашпо (6–8) — только на своём подоконнике. */
  hangCell?: (slot: number) => ReactNode;
  className?: string;
}

const icon = (id: string) => ITEM_BY_ID[id]?.icon ?? '';
const LEDGE_POS = ['4%', '25%', '50%', '75%', '96%']; // промежутки между горшками (по 4 в ряду)

function Deco({ id, left }: { id: string; left: string }) {
  return (
    <span className={'deco deco-' + id} style={{ left }}>
      {hasDecorArt(id) ? <DecorArt id={id} scale={0.85} /> : icon(id)}
    </span>
  );
}

export function SillScene({ decor, tod, winter, sky, theme, win = 'E', cell, hangCell, className = '' }: SceneProps) {
  const at = (place: string) => decor.filter((d) => placeOf(d) === place);
  const windowD = at('window');
  const sillD = at('sill').slice(0, 5);
  const tableD = at('table').slice(0, 5);
  const wallD = at('wall');
  const snow = sky === 'snow' || (!sky && (winter || theme === 'winter'));
  const rain = sky === 'rain' || sky === 'storm';
  const wallpaper = at('wallpaper')[0];
  const hang = !!hangCell && decor.includes('hangers');

  return (
    <div className={`scene tod-${tod}${winter ? ' winter' : ''}${sky ? ' sky-' + sky : ''}${hang ? ' has-hang' : ''} ${className}`} data-win={win} data-wp={wallpaper}>
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
          {theme === 'spring' && <div className="fall petals">{['🌸', '🌸', '🌸', '🌸'].map((x, i) => <span key={i} style={{ left: `${12 + i * 22}%`, animationDelay: `${i * 2.1}s` }}>{x}</span>)}</div>}
          {windowD.includes('feeder') && <div className="feeder"><DecorArt id="feeder" /></div>}
          {windowD.includes('birdhouse') && <div className="birdhouse"><DecorArt id="birdhouse" /></div>}
          {windowD.includes('suncatcher') && <div className="suncatcher"><DecorArt id="suncatcher" /></div>}
        </div>
        <div className="frame" />
        {windowD.includes('paper_snow') && <div className="paper-snow">{['❄', '❅', '❆', '❄'].map((x, i) => <span key={i}>{x}</span>)}</div>}
        {windowD.includes('garland') && <div className="garland" />}
        {windowD.includes('tulle') && (
          <>
            <div className="tulle left" />
            <div className="tulle right" />
          </>
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

      {/* ─── ряды с горшками ─── */}
      <div className="rows">
        <div className="row row-glass">
          {GLASS_ROW.map((i) => (
            <div className="cell glass" data-slot={i} data-zone="glass" key={i}>{cell(i)}</div>
          ))}
          <div className="ledge-decor">{sillD.map((d, i) => <Deco key={d} id={d} left={LEDGE_POS[i]} />)}</div>
        </div>
        <div className="ledge" />
        <div className="row row-deep">
          {DEEP_ROW.map((i) => (
            <div className="cell deep" data-slot={i} data-zone="deep" key={i}>{cell(i)}</div>
          ))}
          <div className="ledge-decor">{tableD.map((d, i) => <Deco key={d} id={d} left={LEDGE_POS[i]} />)}</div>
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
