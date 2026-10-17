// Цвета комнаты: стены, столик и подоконник — выбрать из палитры.

import { SILLS, TABLES, WALLS, type Swatch } from '../../game/room';
import { closeSheet, setCatColor, setRoomColor, useGame } from '../../game/store';
import { CAT_DEFAULT_COLOR, CAT_IDS, CAT_NAMES } from '../../game/cat';
import { CAT_COLORS, DecorArt } from '../art/DecorArt';
import { Btn } from '../kit/kit';
import { Emo, rich } from '../kit/rich';

function Row({ title, list, value, def, onPick }: { title: string; list: Swatch[]; value?: string; def: string; onPick: (id: string) => void }) {
  const cur = value ?? def;
  return (
    <>
      <h3>{rich(title)}</h3>
      <div className="swatches">
        {list.map((s) => (
          <button key={s.id} className={'swatch' + (cur === s.id ? ' on' : '')} onClick={() => onPick(s.id)} aria-label={s.name} title={s.name}>
            <i style={{ background: `linear-gradient(135deg, ${s.main} 50%, ${s.shade} 50%)` }} />
            <small>{rich(s.name)}</small>
          </button>
        ))}
      </div>
    </>
  );
}

export function RoomSheet() {
  const g = useGame();
  const sill = g.sills.find((s) => s.id === g.activeSill) ?? g.sills[0];
  const c = sill.colors ?? {};
  const cats = CAT_IDS.filter((id) => (g.owned[id] ?? 0) > 0);
  return (
    <div className="room-sheet">
      <h2><Emo e="🎨" /> Цвета комнаты</h2>
      <p className="muted small">Меняется сразу — посмотри на подоконник за окном выбора. Обои из магазина снимутся, но останутся в коллекции.</p>
      <Row title="Стены" list={WALLS} value={c.wall} def="cream" onPick={(id) => setRoomColor(sill.id, 'wall', id)} />
      <Row title="Столик" list={TABLES} value={c.table} def="oak" onPick={(id) => setRoomColor(sill.id, 'table', id)} />
      <Row title="Подоконник" list={SILLS} value={c.sill} def="wood" onPick={(id) => setRoomColor(sill.id, 'sill', id)} />
      {cats.map((id) => {
        const cur = g.catColors?.[id] ?? CAT_DEFAULT_COLOR[id];
        return (
          <div key={id}>
            <h3 className="cat-h"><DecorArt id="cat" tint={cur} scale={0.7} /> {rich(CAT_NAMES[id])}</h3>
            <div className="swatches">
              {Object.entries(CAT_COLORS).map(([cid, c]) => (
                <button key={cid} className={'swatch' + (cur === cid ? ' on' : '')} onClick={() => setCatColor(id, cid)} aria-label={c.name} title={c.name}>
                  <i style={{ background: c.patch ? `conic-gradient(${c.main} 0 50%, ${c.patch} 0 75%, ${c.patch2} 0)` : `linear-gradient(135deg, ${c.main} 50%, ${c.shade} 50%)` }} />
                  <small>{rich(c.name)}</small>
                </button>
              ))}
            </div>
          </div>
        );
      })}
      <Btn kind="primary" onClick={closeSheet}>Готово</Btn>
    </div>
  );
}
