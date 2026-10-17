// Продать черенок или растение: соседям (по заказу), друзьям или на барахолку (свою цену),
// или сразу в цветочный магазин — быстро, но дёшево.

import { useState } from 'react';
import { cuttingPrice, marketPrice, plantPrice } from '../../game/cuttings';
import { canFulfil, neighborOf } from '../../game/orders';
import { STAGE_NAME } from '../../game/constants';
import { sp } from '../../game/species';
import { closeSheet, fulfilOrder, listForSale, sellCutting, sellPlantToShop, useStore } from '../../game/store';
import * as api from '../../net/api';
import { PlantArt } from '../art/PlantArt';
import { Btn } from '../kit/kit';
import { Money } from '../kit/icons';
import { Emo, rich } from '../kit/rich';
import { Rarity } from '../kit/Rarity';

export function SellSheet({ cutting, plant }: { cutting?: string; plant?: string }) {
  const g = useStore((s) => s.game);
  const c = cutting ? g.cuttings.find((x) => x.id === cutting) : undefined;
  const p = plant ? g.plants.find((x) => x.id === plant) : undefined;
  const shop = c ? cuttingPrice(c) : p ? plantPrice(p) : 0;
  const [price, setPrice] = useState(marketPrice(shop));
  const [friends, setFriends] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!c && !p) return <div className="center"><p className="muted">Уже продано 🙂</p><Btn kind="ghost" onClick={closeSheet}>Закрыть</Btn></div>;
  const spId = (c ?? p)!.sp;
  const s = sp(spId);
  // какие соседи ждут именно это
  const orders = (g.orders?.list ?? []).filter((o) => o.sp === spId && (c ? (o.kind === 'cutting' || o.kind === 'rare') : o.kind === 'buy') && canFulfil(g, o, p?.id).ok);
  const online = api.online() && api.loggedIn();

  return (
    <div className="sell">
      <div className="sell-head">
        <PlantArt sp={spId} form={(c ?? p)!.form} hue={(c ?? p)!.hue} stage={c ? 0 : p!.stage} seed={(c ?? p)!.id} pot={p?.pot} size={p?.potSize} blooming={p?.blooming} noPot={!!c} className="mini" />
        <div>
          <h2>Продать {rich(c ? `черенок ${s.gen}` : s.acc)}</h2>
          <Rarity x={(c ?? p)!} />
          {p && <p className="muted small">{rich(STAGE_NAME[p.stage])} · горшок останется у тебя</p>}
        </div>
      </div>

      <section className="sell-opt">
        <h3><Emo e="🏠" /> Соседям</h3>
        {orders.length ? orders.map((o) => {
          const n = neighborOf(o.who);
          return (
            <div key={o.id} className="row-item">
              <div className="ricon"><Emo e={n.icon} size={26} /></div>
              <div className="rtext"><b>{rich(n.name)}</b><span className="muted small">{rich(c ? 'ждёт этот черенок' : 'хочет купить это растение')}</span></div>
              <Btn small kind="primary" onClick={() => { fulfilOrder(o.id, p?.id); closeSheet(); }}>+{o.reward} <Emo e="🍃" /></Btn>
            </div>
          );
        }) : <p className="muted small">Сейчас никто из соседей это не просит. Новые записки появляются на доске объявлений каждые 3 часа — там платят лучше всех.</p>}
      </section>

      <section className="sell-opt">
        <h3><Emo e="🤝" /> Друзьям и на барахолку</h3>
        {online ? (
          <>
            <p className="muted small">Назначь цену: объявление увидят {friends ? 'только друзья' : 'все садоводы, друзья — первыми'}. Когда купят — листики придут тебе.</p>
            <div className="price-pick">
              {[marketPrice(shop), marketPrice(shop * 1.7), marketPrice(shop * 3)].map((v) => (
                <button key={v} className={'chip' + (price === v ? ' on' : '')} onClick={() => setPrice(v)}><Money n={v} size={13} /></button>
              ))}
              <input className="inp price-inp" type="number" inputMode="numeric" min={5} max={3000} value={price} onChange={(e) => setPrice(Math.max(0, Math.min(3000, Math.round(Number(e.target.value) || 0))))} aria-label="Своя цена" />
            </div>
            <label className="toggle small"><input type="checkbox" checked={friends} onChange={(e) => setFriends(e.target.checked)} /> только друзьям</label>
            <Btn kind="gold" disabled={busy || price < 5} onClick={async () => { setBusy(true); if (await listForSale({ cutting: c?.id, plant: p?.id, price, friendsOnly: friends })) closeSheet(); setBusy(false); }}>Выставить за {price} <Emo e="🍃" /></Btn>
          </>
        ) : <p className="muted small">Барахолка откроется, когда игра подключится к серверу.</p>}
      </section>

      <section className="sell-opt">
        <h3><Emo e="🌷" /> Цветочный магазин</h3>
        <p className="muted small">Заберёт сразу, но платит мало.</p>
        <Btn onClick={() => { if (c ? sellCutting(c.id) : sellPlantToShop(p!.id)) closeSheet(); }}>Сдать за {shop} <Emo e="🍃" /></Btn>
      </section>

      <Btn kind="ghost" onClick={closeSheet}>Отмена</Btn>
    </div>
  );
}
