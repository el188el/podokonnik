import { EXTRA_PLACES } from '../../game/layout';
import { buyPlace, buyStars, closeSheet, useStore } from '../../game/store';
import { platform } from '../../platform';
import { Btn } from '../kit/kit';
import { Emo, rich } from '../kit/rich';

/** Четвёртое место в ряду: за листики (с уровня) или за звёзды (сразу). */
export function PlaceSheet({ slot }: { slot: number }) {
  const g = useStore((s) => s.game);
  const x = EXTRA_PLACES[slot];
  if (!x) return null;
  const levelOk = g.level >= x.level;
  return (
    <div className="center">
      <div className="gicon"><Emo e="🪴" /></div>
      <h2>Ещё одно место</h2>
      <p className="muted">{rich(x.name[0].toUpperCase() + x.name.slice(1))} — на всех твоих подоконниках сразу. Больше растений — больше черенков, цветения и опыта.</p>
      <Btn kind="primary" disabled={!levelOk || g.leaves < x.price} onClick={() => { buyPlace(slot); closeSheet(); }}>
        {rich(levelOk ? `Открыть за ${x.price} 🍃` : `🔒 За листики — с ${x.level} уровня`)}
      </Btn>
      {platform().kind === 'telegram' && (
        <Btn kind="gold" onClick={async () => { if (await buyStars(x.product)) closeSheet(); }}>Открыть сразу · {x.stars} <Emo e="⭐" /></Btn>
      )}
      <Btn kind="ghost" onClick={closeSheet}>Не сейчас</Btn>
    </div>
  );
}
