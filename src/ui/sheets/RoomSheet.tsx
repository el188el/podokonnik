// Цвета комнаты: стены, столик и подоконник — выбрать из палитры.

import { SILLS, TABLES, WALLS, type Swatch } from '../../game/room';
import { closeSheet, setRoomColor, useStore } from '../../game/store';
import { Btn } from '../kit/kit';

function Row({ title, list, value, def, onPick }: { title: string; list: Swatch[]; value?: string; def: string; onPick: (id: string) => void }) {
  const cur = value ?? def;
  return (
    <>
      <h3>{title}</h3>
      <div className="swatches">
        {list.map((s) => (
          <button key={s.id} className={'swatch' + (cur === s.id ? ' on' : '')} onClick={() => onPick(s.id)} aria-label={s.name} title={s.name}>
            <i style={{ background: `linear-gradient(135deg, ${s.main} 50%, ${s.shade} 50%)` }} />
            <small>{s.name}</small>
          </button>
        ))}
      </div>
    </>
  );
}

export function RoomSheet() {
  const g = useStore((s) => s.game);
  const sill = g.sills.find((s) => s.id === g.activeSill) ?? g.sills[0];
  const c = sill.colors ?? {};
  return (
    <div className="room-sheet">
      <h2>🎨 Цвета комнаты</h2>
      <p className="muted small">Меняется сразу — посмотри на подоконник за окном выбора. Обои из магазина снимутся, но останутся в коллекции.</p>
      <Row title="Стены" list={WALLS} value={c.wall} def="cream" onPick={(id) => setRoomColor(sill.id, 'wall', id)} />
      <Row title="Столик" list={TABLES} value={c.table} def="oak" onPick={(id) => setRoomColor(sill.id, 'table', id)} />
      <Row title="Подоконник" list={SILLS} value={c.sill} def="wood" onPick={(id) => setRoomColor(sill.id, 'sill', id)} />
      <Btn kind="primary" onClick={closeSheet}>Готово</Btn>
    </div>
  );
}
