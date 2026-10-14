import { useState } from 'react';
import { SILL_UNLOCK } from '../../game/progression';
import { ITEMS, potIdOf, type ShopCat } from '../../game/shop';
import { DIFFICULTY_LABEL, SPECIES } from '../../game/species';
import { buyItem, buySpecies, now, unlockSill, useStore } from '../../game/store';
import { PlantArt } from '../art/PlantArt';
import { Btn, Leaves } from '../kit/kit';

type Cat = 'plants' | ShopCat | 'sills';
const CATS: [Cat, string][] = [
  ['plants', '🌱 Черенки'],
  ['pots', '🪴 Горшки'],
  ['decor', '🖼 Декор'],
  ['care', '🧪 Уход'],
  ['packs', '🎁 Наборы'],
  ['sills', '🪟 Окна'],
];

export function Shop() {
  const g = useStore((s) => s.game);
  const [cat, setCat] = useState<Cat>('plants');
  const month = new Date(now()).getMonth() + 1;
  return (
    <div className="tab">
      <div className="tab-head">
        <h1>Магазин</h1>
        <Leaves n={g.leaves} />
      </div>
      <div className="chips scroll">
        {CATS.map(([k, v]) => (
          <button key={k} className={'chip' + (cat === k ? ' on' : '')} onClick={() => setCat(k)}>{v}</button>
        ))}
      </div>

      {cat === 'plants' && (
        <>
          <p className="muted small">Черенок попадёт в запас. Поставь его в воду на свободное место или подари другу.</p>
          {[1, 2, 3].map((d) => (
            <section key={d}>
              <h3>{DIFFICULTY_LABEL[d]}</h3>
              <div className="grid">
                {SPECIES.filter((s) => s.difficulty === d).map((s) => {
                  const locked = g.level < s.unlockLevel;
                  return (
                    <div key={s.id} className={'shop-item' + (locked ? ' locked' : '')}>
                      <PlantArt sp={s.id} stage={4} seed="shop" className={locked ? 'unknown' : ''} />
                      <b>{s.name}</b>
                      <span className="muted small">{s.folk ?? s.speed}</span>
                      {locked ? (
                        <Btn small disabled>🔒 {s.unlockLevel} ур.</Btn>
                      ) : (
                        <Btn small kind="primary" disabled={g.leaves < s.price} onClick={() => buySpecies(s.id)}>{s.price} 🍃</Btn>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </>
      )}

      {cat !== 'plants' && cat !== 'sills' && (
        <div className="list">
          {ITEMS.filter((i) => i.cat === cat).map((it) => {
            const owned = (g.owned[it.id] ?? 0) > 0 && !it.consumable;
            const lockLevel = it.level && g.level < it.level;
            const offSeason = it.months && !it.months.includes(month);
            return (
              <div key={it.id} className="row-item">
                <div className="ricon">
                  {it.cat === 'pots' ? <PlantArt sp="chlorophytum" stage={2} pot={potIdOf(it.id)} seed="pot" /> : it.icon}
                </div>
                <div className="rtext">
                  <b>{it.name}</b>
                  <span className="muted small">{it.desc}</span>
                  {it.consumable && (g.owned[it.id] ?? 0) > 0 && <span className="small">В запасе: {g.owned[it.id]}</span>}
                </div>
                {owned ? (
                  <span className="owned">✓ есть</span>
                ) : lockLevel ? (
                  <Btn small disabled>🔒 {it.level} ур.</Btn>
                ) : offSeason ? (
                  <Btn small disabled>не сезон</Btn>
                ) : (
                  <Btn small kind="primary" disabled={g.leaves < it.price} onClick={() => buyItem(it.id)}>{it.price} 🍃</Btn>
                )}
              </div>
            );
          })}
        </div>
      )}

      {cat === 'sills' && (
        <div className="list">
          {Object.entries(SILL_UNLOCK).filter(([id]) => id !== 'room').map(([id, u]) => {
            const has = g.sills.some((s) => s.id === id);
            return (
              <div key={id} className="row-item">
                <div className="ricon">{id === 'kitchen' ? '🍳' : '🌇'}</div>
                <div className="rtext">
                  <b>{id === 'kitchen' ? 'Подоконник на кухне' : 'Балкон'}</b>
                  <span className="muted small">Ещё 6 мест для растений и своё окно со своим светом.</span>
                </div>
                {has ? <span className="owned">✓ есть</span> : g.level < u.level ? <Btn small disabled>🔒 {u.level} ур.</Btn> : (
                  <Btn small kind="primary" disabled={g.leaves < u.price} onClick={() => unlockSill(id)}>{u.price} 🍃</Btn>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="soon stars">
        ⭐ Скоро: подписка «Садовник+», редкие пёстрые формы и сезонный пропуск за Telegram Stars.
      </div>
    </div>
  );
}
