import { HEARTS_FOR_GIFT, NEIGHBORS, canFulfil, neighborOf, orderGives, orderNeed, orderText } from '../../game/orders';
import { fmt } from '../../game/sim';
import { closeSheet, fulfilOrder, now, useStore } from '../../game/store';
import { PlantArt } from '../art/PlantArt';
import { Btn } from '../kit/kit';

/** Доска объявлений в подъезде: заказы соседей. */
export function OrdersSheet() {
  const g = useStore((s) => s.game);
  const t = now();
  const board = g.orders;
  const list = board?.list ?? [];
  return (
    <div>
      <h2>📋 Доска объявлений</h2>
      <p className="muted small">Соседи просят черенки, хотят посмотреть на цветение и взрослые растения. Чем выше твой уровень, тем интереснее просьбы — и щедрее награды. За помощь — листики, опыт и дружба: на {HEARTS_FOR_GIFT} ❤️ сосед дарит подарок.</p>
      {list.length === 0 && <p className="muted center">Пока записок нет. Новая появится через {fmt(Math.max(0, (board?.next ?? t) - t))}.</p>}
      {list.map((o) => {
        const n = neighborOf(o.who);
        const can = canFulfil(g, o);
        return (
          <div key={o.id} className="order-note">
            <PlantArt sp={o.sp} form={o.form} hue={o.hue} stage={orderGives(o) ? 0 : o.kind === 'healthy' ? 3 : 4} blooming={o.kind === 'bloom' || o.kind === 'hue'} seed={o.id} noPot className="order-art" />
            <div className="order-body">
              <b>{n.icon} {n.name} <span className="muted small">· {n.flat}</span></b>
              <span className="order-text">{o.kind === 'rare' || o.kind === 'hue' ? '⭐ ' : ''}«{orderText(o)}»</span>
              <span className="muted small">+{o.reward} 🍃 · +{o.xp} опыта · ❤️ {Math.min(board?.hearts[o.who] ?? 0, HEARTS_FOR_GIFT)}/{HEARTS_FOR_GIFT} · ещё {fmt(o.until - t)}</span>
            </div>
            <Btn small kind={can.ok ? 'gold' : 'soft'} disabled={!can.ok} onClick={() => fulfilOrder(o.id)}>
              {can.ok ? (orderGives(o) ? 'Отдать' : 'Показать') : orderNeed(o)}
            </Btn>
          </div>
        );
      })}
      {list.length > 0 && list.length < 3 && <p className="muted small center">Следующая записка — через {fmt(Math.max(0, (board?.next ?? t) - t))}</p>}
      <div className="neighbors">
        {NEIGHBORS.map((n) => {
          const h = board?.hearts[n.id] ?? 0;
          return (
            <span key={n.id} className={'neighbor' + (h >= HEARTS_FOR_GIFT ? ' friend' : '')} title={`${n.name}: ${n.gift.text}`}>
              {n.icon}<small>{'❤️'.repeat(Math.min(h, HEARTS_FOR_GIFT)) || '🤍'}</small>
            </span>
          );
        })}
      </div>
      <Btn kind="ghost" onClick={closeSheet}>Закрыть</Btn>
    </div>
  );
}
