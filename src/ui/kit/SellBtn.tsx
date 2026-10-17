import { useEffect, useState } from 'react';
import { sellPrice } from '../../game/shop';
import { sellItem } from '../../game/store';
import { Emo } from './rich';

/** «Продать» в два касания: первое спрашивает, второе продаёт. */
export function SellBtn({ id }: { id: string }) {
  const [ask, setAsk] = useState(false);
  useEffect(() => { if (!ask) return; const tm = setTimeout(() => setAsk(false), 3000); return () => clearTimeout(tm); }, [ask]);
  const n = sellPrice(id);
  if (!n) return null;
  return (
    <button className={'sell-btn' + (ask ? ' ask' : '')} onClick={() => { if (ask) { sellItem(id); setAsk(false); } else setAsk(true); }}>
      {ask ? <>Точно продать? +{n} <Emo e="🍃" /></> : <>Продать за {n} <Emo e="🍃" /></>}
    </button>
  );
}
