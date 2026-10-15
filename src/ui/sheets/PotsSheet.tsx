import { ITEM_BY_ID } from '../../game/shop';
import { buyPots, closeSheet, grannyPotReady, potsLeft, takeGrannyPot, useStore } from '../../game/store';
import { PlantArt } from '../art/PlantArt';
import { Btn } from '../kit/kit';
import { Emo, rich } from '../kit/rich';

/** Горшки закончились — купить или попросить у Валентины Петровны. */
export function PotsSheet({ plant }: { plant?: string }) {
  const g = useStore((s) => s.game);
  const p = plant ? g.plants.find((x) => x.id === plant) : undefined;
  const offers = ['pot', 'pot5', 'pot12'].map((id) => ITEM_BY_ID[id]).filter((it) => it && (!it.level || g.level >= it.level));
  return (
    <div className="center">
      <div className="pots-pic">
        {p ? <PlantArt sp={p.sp} form={p.form} hue={p.hue} stage={1} seed={p.id} /> : <span className="gicon"><Emo e="🪴" /></span>}
      </div>
      <h2>{rich(p ? 'Нужен горшок' : 'Горшки')}</h2>
      <p className="muted">
        Каждому растению — свой горшок, как в жизни. В запасе: <b>{potsLeft(g)}</b>.
        Цвет и узор потом выберешь из своих дизайнов.
      </p>
      {offers.map((it) => (
        <Btn key={it.id} kind={it.id === 'pot5' ? 'gold' : 'primary'} disabled={g.leaves < it.price} onClick={() => { buyPots(it.id, plant); closeSheet(); }}>
          {rich(it.name)} · {it.price} <Emo e="🍃" />{rich(it.id === 'pot5' ? ' · выгодно' : '')}
        </Btn>
      ))}
      {grannyPotReady(g) && (
        <Btn kind="soft" onClick={() => { closeSheet(); takeGrannyPot(plant); }}><Emo e="👵" /> Попросить у Валентины Петровны (раз в день)</Btn>
      )}
      <Btn kind="ghost" onClick={closeSheet}>Потом</Btn>
    </div>
  );
}
