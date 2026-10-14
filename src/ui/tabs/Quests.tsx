import { ACHIEVEMENTS } from '../../game/achievements';
import { QUEST_BONUS, QUEST_ICON, QUEST_TEXT, STREAK_REWARDS } from '../../game/quests';
import { claimQuest, claimQuestBonus, useStore } from '../../game/store';
import { Bar, Btn } from '../kit/kit';

export function Quests() {
  const g = useStore((s) => s.game);
  const allClaimed = g.quests.list.length > 0 && g.quests.list.every((q) => q.claimed);
  const day = g.streak.count ? ((g.streak.count - 1) % 7) + 1 : 0;
  return (
    <div className="tab">
      <div className="tab-head">
        <h1>Задания</h1>
        <span className="streak">🔥 {g.streak.count}</span>
      </div>

      <section className="panel">
        <h3>Серия заходов</h3>
        <div className="streak-row">
          {STREAK_REWARDS.map((r, i) => (
            <div key={i} className={'sday' + (i + 1 < day ? ' done' : i + 1 === day ? ' today' : '')}>
              <small>{i + 1}</small>
              <b>{r}</b>
            </div>
          ))}
        </div>
        <p className="muted small">Лучшая серия: {g.streak.best}. Пропустишь день — начнёшь сначала.</p>
      </section>

      <section className="panel">
        <h3>Сегодня</h3>
        {g.quests.list.length === 0 && <p className="muted">Посади первое растение — и появятся задания.</p>}
        {g.quests.list.map((q) => (
          <div key={q.id} className="quest">
            <span className="qicon">{QUEST_ICON[q.kind]}</span>
            <div className="qbody">
              <b>{QUEST_TEXT[q.kind](q.target)}</b>
              <Bar value={q.progress / q.target} label={`${q.progress}/${q.target}`} />
            </div>
            {q.claimed ? (
              <span className="owned">✓</span>
            ) : (
              <Btn small kind={q.progress >= q.target ? 'gold' : 'soft'} disabled={q.progress < q.target} onClick={() => claimQuest(q.id)}>
                +{q.reward} 🍃
              </Btn>
            )}
          </div>
        ))}
        {g.quests.list.length > 0 && (
          <Btn kind={allClaimed && !g.quests.bonusClaimed ? 'gold' : 'soft'} disabled={!allClaimed || g.quests.bonusClaimed} onClick={claimQuestBonus}>
            {g.quests.bonusClaimed ? '✓ Бонус дня получен' : `🎁 Все три — бонус +${QUEST_BONUS} 🍃 и подкормка`}
          </Btn>
        )}
      </section>

      <section className="panel">
        <h3>Достижения · {g.achievements.length}/{ACHIEVEMENTS.length}</h3>
        <div className="ach-list">
          {ACHIEVEMENTS.map((a) => {
            const done = g.achievements.includes(a.id);
            const pr = a.progress?.(g);
            return (
              <div key={a.id} className={'ach' + (done ? ' done' : '')}>
                <span className="aicon">{done ? a.icon : '🔒'}</span>
                <div>
                  <b>{a.title}</b>
                  <span className="muted small">{a.text} · {a.reward} 🍃</span>
                  {!done && pr && <Bar value={pr[0] / pr[1]} label={`${pr[0]}/${pr[1]}`} />}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
