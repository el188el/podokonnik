// Инвентарь: всё, что есть у игрока, — средства ухода, горшки, черенки и предметы.
// Средство можно взять «в руку» и нажать на цветок.

import { useState } from 'react';
import { ITEM_BY_ID, ITEMS, sellPrice } from '../../game/shop';
import { sp } from '../../game/species';
import { COMPOST_N, compostable, cuttingLeft } from '../../game/cuttings';
import { buyItem, closeSheet, compostCuttings, now, freeCopies, openSheet, perRoom, placedIn, takeItem, toast, toggleDecor, USABLE, useStore } from '../../game/store';
import { DecorArt, hasDecorArt } from '../art/DecorArt';
import { PlantArt } from '../art/PlantArt';
import { Btn } from '../kit/kit';
import { Icon } from '../kit/icons';
import { Emo, rich } from '../kit/rich';
import { SellBtn } from '../kit/SellBtn';
import { Rarity } from '../kit/Rarity';
import { Price } from '../tabs/Shop';

type Tab = 'care' | 'pots' | 'items';
const POT_SIZES: [string, number, string][] = [['pot', 1, 'S'], ['potM', 2, 'M'], ['potL', 3, 'L'], ['potXL', 4, 'XL']];

export function InventorySheet() {
  const g = useStore((s) => s.game);
  const [tab, setTab] = useState<Tab>('care');
  const items = ITEMS.filter((i) => i.cat === 'decor' && !i.consumable && (g.owned[i.id] ?? 0) > 0);
  const sillHere = g.sills.find((s) => s.id === g.activeSill);

  const take = (id: string) => {
    takeItem(id);
    toast(`${ITEM_BY_ID[id].icon} ${ITEM_BY_ID[id].name} в руке — нажми на цветок. Кому нужно — светятся`);
  };

  return (
    <div className="inventory">
      <h2 className="center">Инвентарь</h2>
      <div className="segment">
        <button className={tab === 'care' ? 'on' : ''} onClick={() => setTab('care')}><Icon name="feed" size={17} /> Уход</button>
        <button className={tab === 'pots' ? 'on' : ''} onClick={() => setTab('pots')}><Icon name="pots" size={17} /> Горшки</button>
        <button className={tab === 'items' ? 'on' : ''} onClick={() => setTab('items')}><Icon name="decor" size={17} /> Предметы</button>
      </div>

      {tab === 'care' && (
        <>
          <p className="muted small">Возьми средство и нажми на цветок. Подсветятся те, кому оно поможет.</p>
          <div className="bag-list">
            {USABLE.map((id) => {
              const it = ITEM_BY_ID[id];
              const n = g.owned[id] ?? 0;
              const locked = it.level && g.level < it.level;
              return (
                <div key={id} className={'row-item bag-row' + (n ? '' : ' zero')}>
                  <div className="ricon"><Emo e={it.icon} size={28} /></div>
                  <div className="rtext"><b>{rich(it.name)}{n > 0 && <span className="bag-n"> ×{n}</span>}</b><span className="muted small">{rich(it.desc)}</span></div>
                  {n > 0 ? <Btn small kind="primary" onClick={() => take(id)}>Взять</Btn>
                    : locked ? <Btn small disabled><Icon name="lock" size={15} /> {it.level} ур.</Btn>
                    : <Btn small onClick={() => buyItem(id)}><Price n={it.price} /></Btn>}
                </div>
              );
            })}
            {(g.owned.neighbor7 ?? 0) > 0 && (
              <div className="row-item bag-row">
                <div className="ricon"><Emo e="👵" size={28} /></div>
                <div className="rtext"><b>Соседка на неделю <span className="bag-n">×{g.owned.neighbor7}</span></b><span className="muted small">Польёт всё, пока тебя нет.</span></div>
                <Btn small onClick={() => openSheet({ kind: 'neighbor' })}>Позвать</Btn>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'pots' && (
        <>
          <p className="muted small">Пустые горшки в запасе. Пересадить — кнопкой «Пересадить» в карточке растения.</p>
          <div className="bag-pots">
            {POT_SIZES.map(([id, size, label]) => (
              <div key={id} className={'bag-pot' + ((g.owned[id] ?? 0) ? '' : ' zero')}>
                <PlantArt sp="chlorophytum" stage={2} size={size} seed="inv" potView className="mini" />
                <b>{label}</b>
                <small>×{g.owned[id] ?? 0}</small>
              </div>
            ))}
          </div>
          <Btn small onClick={() => openSheet({ kind: 'pots' })}><Icon name="design" size={16} /> Дизайны и формы горшков</Btn>
          <h3 className="bag-h">Черенки в стаканах · {g.cuttings.length}</h3>
          {g.cuttings.length === 0 ? <p className="muted small">Пусто. Черенок можно взять у взрослого растения инструментом «Черенок».</p> : (
            <div className="bag-cuts">
              {g.cuttings.map((c) => {
                const left = cuttingLeft(c, now());
                return (
                  <button key={c.id} className={'bag-cut' + (left < 2 * 86400e3 ? ' wilting' : '')} onClick={() => openSheet({ kind: 'send', cutting: c.id })}>
                    <PlantArt sp={c.sp} form={c.form} hue={c.hue} stage={0} noPot className="mini" />
                    <small>{rich(sp(c.sp).name)}</small>
                    <Rarity x={c} short />
                    <i className="bag-life">{left < 86400e3 ? `${Math.max(1, Math.ceil(left / 3600e3))} ч` : `${Math.ceil(left / 86400e3)} дн`}</i>
                  </button>
                );
              })}
            </div>
          )}
          {g.cuttings.length > 0 && <p className="muted small">Черенок стоит в воде неделю (редкий — две), потом засыхает. Посади, подари, сдай в лавку — или в компост.</p>}
          {compostable(g.cuttings).length >= COMPOST_N && (
            <Btn small onClick={compostCuttings}><Emo e="🟫" /> Компост: {COMPOST_N} обычных черенка → подкормка</Btn>
          )}
        </>
      )}

      {tab === 'items' && (
        <>
          <p className="muted small">Декор и приборы. Свободный экземпляр можно поставить в эту комнату{sillHere ? ` («${sillHere.name}»)` : ''}, ненужное — продать.</p>
          {items.length === 0 && <p className="muted center">Пока ничего нет — загляни в магазин.</p>}
          <div className="bag-list">
            {items.map((it) => {
              const where = placedIn(g, it.id);
              const free = freeCopies(g, it.id);
              const here = sillHere?.decor.includes(it.id);
              return (
                <div key={it.id} className="row-item bag-row">
                  <div className="ricon">{hasDecorArt(it.id) ? <DecorArt id={it.id} scale={1.2} className="shop-decor" /> : <Emo e={it.icon} size={28} />}</div>
                  <div className="rtext">
                    <b>{rich(it.name)}{(g.owned[it.id] ?? 0) > 1 && <span className="bag-n"> ×{g.owned[it.id]}</span>}</b>
                    <span className="small where">{rich(where.length ? 'Стоит: ' + where.map((x) => x.name).join(', ') : 'Убран')}{free > 0 ? ` · свободно ${free}` : ''}</span>
                    {sellPrice(it.id) > 0 && <SellBtn id={it.id} />}
                  </div>
                  {perRoom(it.id) && !here && free > 0 ? <Btn small onClick={() => toggleDecor(g.activeSill, it.id)}>Поставить</Btn> : null}
                </div>
              );
            })}
          </div>
        </>
      )}

      <Btn kind="ghost" onClick={closeSheet}>Закрыть</Btn>
    </div>
  );
}
