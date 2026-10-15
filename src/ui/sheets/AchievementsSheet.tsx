// Достижения — отдельной страницей: сетка карточек, сначала полученные.

import { ACHIEVEMENTS } from '../../game/achievements';
import { useStore } from '../../game/store';
import { Icon, Money } from '../kit/icons';
import { Bar } from '../kit/kit';
import { rich } from '../kit/rich';

export function AchievementsSheet() {
  const g = useStore((s) => s.game);
  const done = ACHIEVEMENTS.filter((a) => g.achievements.includes(a.id));
  const left = ACHIEVEMENTS.filter((a) => !g.achievements.includes(a.id));
  return (
    <div className="achs">
      <h2 className="center">Достижения</h2>
      <div className="achs-sum">
        <Bar value={done.length / ACHIEVEMENTS.length} label={`${done.length} из ${ACHIEVEMENTS.length}`} />
      </div>
      {done.length > 0 && <h3 className="achs-h">Получены</h3>}
      <div className="ach-grid">
        {done.map((a) => (
          <div key={a.id} className="ach-card done">
            <span className="ach-ic">{rich(a.icon)}</span>
            <b>{rich(a.title)}</b>
            <small>{rich(a.text)}</small>
            <span className="ach-rw"><Icon name="check" size={13} /> <Money n={a.reward} size={13} /></span>
          </div>
        ))}
      </div>
      <h3 className="achs-h">Впереди</h3>
      <div className="ach-grid">
        {left.map((a) => {
          const pr = a.progress?.(g);
          return (
            <div key={a.id} className="ach-card">
              <span className="ach-ic"><Icon name="lock" size={22} /></span>
              <b>{rich(a.title)}</b>
              <small>{rich(a.text)}</small>
              {pr ? <Bar value={pr[0] / pr[1]} label={`${pr[0]}/${pr[1]}`} /> : null}
              <span className="ach-rw"><Money n={a.reward} size={13} plus /></span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
