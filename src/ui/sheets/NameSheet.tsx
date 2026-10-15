import { useMemo, useState } from 'react';
import { sp } from '../../game/species';
import { closeSheet, renamePlant, useStore } from '../../game/store';
import { PlantArt } from '../art/PlantArt';
import { Btn } from '../kit/kit';
import { Emo, rich } from '../kit/rich';

const NAMES = ['Зелёнка', 'Кеша', 'Листик', 'Фрося', 'Тимоша', 'Буся', 'Жора', 'Груша', 'Марфуша', 'Кузя', 'Ромашка', 'Пушок', 'Гоша', 'Василиса', 'Шуршик', 'Лёля'];

/** Как назовёшь? Сразу после посадки в горшок. */
export function NameSheet({ plant }: { plant: string }) {
  const p = useStore((s) => s.game.plants.find((x) => x.id === plant));
  const [nick, setNick] = useState('');
  const ideas = useMemo(() => [...NAMES].sort(() => Math.random() - 0.5).slice(0, 5), []);
  if (!p) return null;
  const s = sp(p.sp);
  const save = (n: string) => { renamePlant(p.id, n); closeSheet(); };
  return (
    <div className="center">
      <div className="postcard big2"><PlantArt sp={p.sp} form={p.form} hue={p.hue} stage={2} seed={p.id} pot={p.pot} /></div>
      <h2>Как назовёшь {rich(s.acc)}?</h2>
      <p className="muted small">У растения с именем и характер появляется. За имя — +5 <Emo e="🍃" />.</p>
      <input className="inp" autoFocus maxLength={20} placeholder={s.name} value={nick} onChange={(e) => setNick(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && nick.trim()) save(nick); }} />
      <div className="chips name-ideas">
        {ideas.map((n) => <button key={n} className="chip" onClick={() => save(n)}>{rich(n)}</button>)}
      </div>
      <Btn kind="primary" disabled={!nick.trim()} onClick={() => save(nick)}>Назвать</Btn>
      <Btn kind="ghost" onClick={closeSheet}>Потом</Btn>
    </div>
  );
}
