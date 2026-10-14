// Сцена подоконника без прокрутки: окно с подоконником (верхний ряд, 3 места)
// и столик в глубине комнаты (нижний ряд, 3 места). Декор — на стекле,
// на подоконнике, на столе и на стене.

import type { ReactNode } from 'react';
import { ROW } from '../game/layout';
import { ITEM_BY_ID, placeOf } from '../game/shop';
import type { Sky } from '../game/weather';

export interface SceneProps {
  decor: string[];
  tod: 'day' | 'eve' | 'dawn' | 'night';
  winter?: boolean;
  sky?: Sky;            // настоящая погода за окном
  theme?: 'autumn' | 'winter' | 'spring';
  win?: string;
  cell: (slot: number) => ReactNode;
  className?: string;
}

const icon = (id: string) => ITEM_BY_ID[id]?.icon ?? '';
const LEDGE_POS = ['4%', '35%', '65%', '96%']; // промежутки между горшками

export function SillScene({ decor, tod, winter, sky, theme, win = 'E', cell, className = '' }: SceneProps) {
  const at = (place: string) => decor.filter((d) => placeOf(d) === place);
  const windowD = at('window');
  const sillD = at('sill').slice(0, 4);
  const tableD = at('table').slice(0, 4);
  const wallD = at('wall');
  const snow = sky === 'snow' || (!sky && (winter || theme === 'winter'));
  const rain = sky === 'rain' || sky === 'storm';

  return (
    <div className={`scene tod-${tod}${winter ? ' winter' : ''}${sky ? ' sky-' + sky : ''} ${className}`} data-win={win}>
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
          {windowD.includes('feeder') && <div className="feeder"><span className="feeder-box">🏠</span><span className="tit">🐦</span></div>}
          {windowD.includes('suncatcher') && <div className="suncatcher">🌈</div>}
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
            <span key={d} className={'wall-' + d}>{icon(d)}</span>
          ))}
        </div>
      </div>

      {/* ─── ряды с горшками ─── */}
      <div className="rows">
        <div className="row row-glass">
          {Array.from({ length: ROW }, (_, i) => (
            <div className="cell glass" data-slot={i} data-zone="glass" key={i}>{cell(i)}</div>
          ))}
          <div className="ledge-decor">{sillD.map((d, i) => <span key={d} className={'deco deco-' + d} style={{ left: LEDGE_POS[i] }}>{icon(d)}</span>)}</div>
        </div>
        <div className="ledge" />
        <div className="row row-deep">
          {Array.from({ length: ROW }, (_, i) => (
            <div className="cell deep" data-slot={ROW + i} data-zone="deep" key={i}>{cell(ROW + i)}</div>
          ))}
          <div className="ledge-decor">{tableD.map((d, i) => <span key={d} className={'deco deco-' + d} style={{ left: LEDGE_POS[i] }}>{icon(d)}</span>)}</div>
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
