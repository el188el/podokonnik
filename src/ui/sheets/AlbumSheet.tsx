import { useState } from 'react';
import { SHELVES, hasItem, shelfDone, shelfProgress } from '../../game/album';
import { ITEM_BY_ID } from '../../game/shop';
import { claimShelf, closeSheet, useStore } from '../../game/store';
import { PlantArt } from '../art/PlantArt';
import { Bar, Btn } from '../kit/kit';

/** Альбом редкостей: полки с коллекциями форм, цветов и цветений. */
export function AlbumSheet() {
  const g = useStore((s) => s.game);
  const [tab, setTab] = useState(SHELVES[0].id);
  const shelf = SHELVES.find((s) => s.id === tab)!;
  const [n, total] = shelfProgress(g, shelf);
  const claimed = (g.shelves ?? []).includes(shelf.id);
  const prize = ITEM_BY_ID[shelf.reward.item];
  return (
    <div>
      <h2>📒 Альбом редкостей</h2>
      <div className="chips album-tabs">
        {SHELVES.map((s) => {
          const [a, b] = shelfProgress(g, s);
          return (
            <button key={s.id} className={'chip' + (s.id === tab ? ' on' : '') + (shelfDone(g, s) && !(g.shelves ?? []).includes(s.id) ? ' alert' : '')} onClick={() => setTab(s.id)}>
              {s.icon} {s.title} {a}/{b}
            </button>
          );
        })}
      </div>
      <p className="muted small">{shelf.desc}</p>
      <div className="album-shelf">
        {shelf.items.map((it) => {
          const got = hasItem(g, it.key);
          return (
            <div key={it.key} className={'album-item' + (got ? ' got' : '')}>
              <PlantArt sp={it.sp} form={it.form} hue={it.hue} stage={4} seed={it.key} blooming className={got ? '' : 'unknown'} />
              <span>{got ? it.label : '???'}</span>
            </div>
          );
        })}
      </div>
      <Bar value={n / total} label={`${n}/${total}`} />
      <div className="album-prize">
        <span className="aicon">{prize?.icon}</span>
        <div>
          <b>Награда за полку: {prize?.name}</b>
          <span className="muted small">{prize?.desc} И ещё +{shelf.reward.leaves} 🍃</span>
        </div>
      </div>
      {claimed ? <p className="center ok-text">✓ Полка собрана</p> : (
        <Btn kind={n === total ? 'gold' : 'soft'} disabled={n < total} onClick={() => claimShelf(shelf.id)}>
          {n === total ? 'Забрать награду' : `Осталось собрать: ${total - n}`}
        </Btn>
      )}
      <p className="muted small">Редкие формы выпадают из черенков (3%), приходят в подарках, по обмену на барахолке и в сундуке недели. Новые цвета — от опыления.</p>
      <Btn kind="ghost" onClick={closeSheet}>Закрыть</Btn>
    </div>
  );
}
