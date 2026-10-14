// «Первые шаги»: короткие задания на первые часы — пока растения растут.

import { FIRST_STEPS, newbieLeft } from '../../game/onboarding';
import { fmt } from '../../game/sim';
import { claimFirstStep, closeSheet, now, useStore } from '../../game/store';
import { Btn } from '../kit/kit';

export function FirstStepsSheet() {
  const g = useStore((s) => s.game);
  const claimed = g.firstSteps ?? [];
  const boost = newbieLeft(g, now());
  return (
    <div className="first-steps">
      <h2>🧭 Первые шаги</h2>
      <p className="muted small">Пока растения растут, освойся на подоконнике: за каждый шаг — награда. {claimed.length}/{FIRST_STEPS.length}</p>
      {boost > 0 && <div className="newbie-boost">🌟 <b>Бонус новичка:</b> растения растут втрое быстрее ещё {fmt(boost)}</div>}
      <div className="list">
        {FIRST_STEPS.map((st, i) => {
          const got = claimed.includes(i);
          const done = st.done(g);
          return (
            <div key={i} className={'row-item step' + (got ? ' got' : done ? ' ready' : '')}>
              <div className="ricon">{got ? '✅' : st.icon}</div>
              <div className="rtext"><b>{st.title}</b><span className="muted small">{got ? 'Готово' : st.hint}</span></div>
              {got ? null : done ? (
                <Btn small kind="gold" onClick={() => claimFirstStep(i)}>+{st.leaves} 🍃</Btn>
              ) : <span className="muted small">+{st.leaves} 🍃</span>}
            </div>
          );
        })}
      </div>
      <Btn kind="ghost" onClick={closeSheet}>Закрыть</Btn>
    </div>
  );
}
