// «Дизайн» горшка в карточке растения: форма и узор. Некупленные — с ценой:
// нажал — горшок примеряется на растение, а снизу кнопка «Купить и поставить».

import { useState, type ReactNode } from 'react';
import { ITEM_BY_ID, POT_SHAPES, POTS } from '../../game/shop';
import { buyItem, closeSheet, ownsPot, ownsShape, setPot, setPotShape, setTab, toast, useStore } from '../../game/store';
import type { Plant } from '../../game/types';
import { PlantArt } from '../art/PlantArt';
import { Icon, Money } from '../kit/icons';
import { Btn } from '../kit/kit';
import { rich } from '../kit/rich';

type Offer = { kind: 'pot' | 'shape'; k: string };

export function PotDesigner({ p }: { p: Plant }) {
  const g = useStore((s) => s.game);
  const [offer, setOffer] = useState<Offer | null>(null);
  const itemOf = (o: Offer) => ITEM_BY_ID[(o.kind === 'pot' ? 'pot_' : 'shape_') + o.k];
  const owns = (o: Offer) => (o.kind === 'pot' ? ownsPot(g, o.k) : ownsShape(g, o.k));
  // что сейчас показываем на растении: примерка или своё
  const shape = offer?.kind === 'shape' ? offer.k : p.shape ?? 'classic';
  const pot = offer?.kind === 'pot' ? offer.k : p.pot;

  const pick = (o: Offer) => {
    if (owns(o)) {
      setOffer(null);
      if (o.kind === 'pot') setPot(p.id, o.k); else setPotShape(p.id, o.k);
      return;
    }
    setOffer(offer?.kind === o.kind && offer.k === o.k ? null : o);
  };
  const buy = () => {
    if (!offer) return;
    if (offer.kind === 'pot' && offer.k === 'gold') { closeSheet(); setTab('shop'); toast('👑 Золотой горшок — в подписке Садовник+'); return; }
    const it = itemOf(offer);
    if (!it) return;
    if (buyItem(it.id)) {
      if (offer.kind === 'pot') setPot(p.id, offer.k); else setPotShape(p.id, offer.k);
      setOffer(null);
    }
  };

  const tag = (o: Offer) => {
    if (owns(o)) return null;
    const it = itemOf(o);
    if (o.kind === 'pot' && o.k === 'gold') return <span className="pp-tag plus"><Icon name="crown" size={12} /> Плюс</span>;
    if (!it || it.eventOnly) return <span className="pp-tag"><Icon name="lock" size={12} /> событие</span>;
    if (it.level && g.level < it.level) return <span className="pp-tag"><Icon name="lock" size={12} /> {it.level} ур.</span>;
    return <span className="pp-tag price"><Money n={it.price} size={12} /></span>;
  };
  const tile = (o: Offer, name: string, art: ReactNode) => {
    const on = o.kind === 'pot' ? p.pot === o.k : (p.shape ?? 'classic') === o.k;
    const trying = offer?.kind === o.kind && offer.k === o.k;
    return (
      <button key={o.kind + o.k} className={'pot-pick' + (on ? ' on' : '') + (trying ? ' trying' : '') + (owns(o) ? '' : ' shop')} onClick={() => pick(o)}>
        {art}
        <span className="pp-name">{rich(name)}</span>
        {tag(o)}
      </button>
    );
  };

  const it = offer && itemOf(offer);
  const blocked = !offer || !it ? 'none' : it.eventOnly && !(offer.kind === 'pot' && offer.k === 'gold') ? 'event' : it.level && g.level < it.level ? 'level' : '';
  return (
    <div className="block pot-designer">
      <h4 className="pd-h">Форма</h4>
      <div className="pots shapes">
        {Object.keys(POT_SHAPES).map((k) => tile({ kind: 'shape', k }, POT_SHAPES[k].name, <PlantArt sp={p.sp} stage={2} pot={pot} shape={k} seed={p.id} className="mini" potView />))}
      </div>
      <h4 className="pd-h">Узор</h4>
      <div className="pots">
        {Object.keys(POTS).map((k) => tile({ kind: 'pot', k }, POTS[k].name, <PlantArt sp={p.sp} stage={2} pot={k} shape={shape} seed={p.id} className="mini" potView />))}
      </div>
      {offer && it && (
        <div className="pd-buy">
          <PlantArt sp={p.sp} stage={2} pot={pot} shape={shape} seed={p.id} className="mini" potView />
          <div className="pd-text">
            <b>{rich(it.name)}</b>
            <small>{blocked === 'event' ? 'Награда сезонного события' : blocked === 'level' ? `Откроется на ${it.level} уровне` : offer.kind === 'pot' && offer.k === 'gold' ? 'Входит в Садовник+' : 'Навсегда, для всех растений'}</small>
          </div>
          {blocked === '' && (
            <Btn small kind="primary" disabled={!(offer.kind === 'pot' && offer.k === 'gold') && g.leaves < it.price} onClick={buy}>
              {offer.kind === 'pot' && offer.k === 'gold' ? 'Подробнее' : <>Купить · <Money n={it.price} size={14} /></>}
            </Btn>
          )}
        </div>
      )}
    </div>
  );
}
