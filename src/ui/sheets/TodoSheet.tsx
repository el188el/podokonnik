// Все дела на сегодня: то, что не поместилось в ленту на главном экране.

import { closeSheet, now, useStore } from '../../game/store';
import { dayTiles } from '../tabs/SillView';
import { Emo, rich } from '../kit/rich';

export function TodoSheet() {
  const g = useStore((s) => s.game);
  const tiles = dayTiles(g, now());
  return (
    <div className="todo-sheet">
      <h2>Дела на сегодня</h2>
      <div className="todo-list">
        {tiles.map((x) => (
          <button key={x.key} className={'tile ' + x.cls} disabled={x.disabled || !x.onClick} onClick={() => { closeSheet(); setTimeout(() => x.onClick?.(), 0); }}>{rich(x.text)}</button>
        ))}
        {!tiles.length && <p className="muted center">Всё сделано <Emo e="🌿" /></p>}
      </div>
    </div>
  );
}
