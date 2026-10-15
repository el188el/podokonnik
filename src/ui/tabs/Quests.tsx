import { ACHIEVEMENTS } from '../../game/achievements';
import { QUEST_BONUS, QUEST_TEXT, STREAK_REWARDS, WEEKLY_CHEST, WEEKLY_TEXT, weekLeftMs } from '../../game/quests';
import { approx } from '../../game/sim';
import { claimQuest, claimQuestBonus, claimWeekly, claimWeeklyChest, now, useStore } from '../../game/store';
import { Bar, Btn } from '../kit/kit';
import { Icon, Money, TONE, type IconName } from '../kit/icons';
import { rich } from '../kit/rich';

// иконки и цвета заданий — те же, что у инструментов
const QI: Record<string, [IconName, string]> = {
  water: ['water', TONE.water], mist: ['mist', TONE.mist], cut: ['cut', TONE.cut], plant: ['pots', TONE.leaf], gift: ['gift', '#d0578f'],
  fixLight: ['clear', '#e8a325'], buy: ['shop', TONE.share], repot: ['repot', TONE.repot], feed: ['feed', TONE.feed], visitHerbarium: ['herbarium', TONE.look],
  adult: ['sill', TONE.leaf], bloom: ['flower', '#d0578f'], friendWater: ['handshake', TONE.water], days: ['calendar', TONE.look],
};
const QIcon = ({ k }: { k: string }) => { const [n, c] = QI[k] ?? ['check', TONE.look]; return <span className="qicon" style={{ color: c, background: c + '1f' }}><Icon name={n} size={22} /></span>; };

export function Quests() {
  const g = useStore((s) => s.game);
  const allClaimed = g.quests.list.length > 0 && g.quests.list.every((q) => q.claimed);
  const day = g.streak.count ? ((g.streak.count - 1) % 7) + 1 : 0;
  return (
    <div className="tab">
      <div className="tab-head">
        <h1>Задания</h1>
        <span className="streak"><Icon name="flame" size={18} tone="#e8743b" /> {g.streak.count}</span>
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
            <QIcon k={q.kind} />
            <div className="qbody">
              <b>{rich(QUEST_TEXT[q.kind](q.target))}</b>
              <Bar value={q.progress / q.target} label={`${q.progress}/${q.target}`} />
            </div>
            {q.claimed ? (
              <span className="owned"><Icon name="check" size={22} tone={TONE.leaf} /></span>
            ) : (
              <Btn small kind={q.progress >= q.target ? 'gold' : 'soft'} disabled={q.progress < q.target} onClick={() => claimQuest(q.id)}>
                <Money n={q.reward} plus />
              </Btn>
            )}
          </div>
        ))}
        {g.quests.list.length > 0 && (
          <Btn kind={allClaimed && !g.quests.bonusClaimed ? 'gold' : 'soft'} disabled={!allClaimed || g.quests.bonusClaimed} onClick={claimQuestBonus}>
            {g.quests.bonusClaimed ? <><Icon name="check" size={17} /> Бонус дня получен</> : <><Icon name="gift" size={17} /> Все три — бонус <Money n={QUEST_BONUS} plus /> и подкормка</>}
          </Btn>
        )}
      </section>

      {g.weekly && g.weekly.list.length > 0 && (
        <section className="panel weekly">
          <h3 className="ih3"><Icon name="trophy" size={20} tone="#e8a325" />На неделю <small className="muted">· ещё {rich(approx(weekLeftMs(now())))}</small></h3>
          {g.weekly.list.map((q) => (
            <div key={q.id} className="quest">
              <QIcon k={q.kind} />
              <div className="qbody">
                <b>{rich(WEEKLY_TEXT[q.kind](q.target))}</b>
                <Bar value={q.progress / q.target} label={`${q.progress}/${q.target}`} />
              </div>
              {q.claimed ? (
                <span className="owned"><Icon name="check" size={22} tone={TONE.leaf} /></span>
              ) : (
                <Btn small kind={q.progress >= q.target ? 'gold' : 'soft'} disabled={q.progress < q.target} onClick={() => claimWeekly(q.id)}>
                  <Money n={q.reward} plus />
                </Btn>
              )}
            </div>
          ))}
          {(() => {
            const all = g.weekly!.list.every((q) => q.claimed);
            return (
              <Btn kind={all && !g.weekly!.chest ? 'gold' : 'soft'} disabled={!all || g.weekly!.chest} onClick={claimWeeklyChest}>
                {g.weekly!.chest ? <><Icon name="check" size={17} /> Сундук недели открыт</> : <><Icon name="gift" size={17} /> Сундук недели: <Money n={WEEKLY_CHEST} plus />, 3 горшка и редкий черенок</>}
              </Btn>
            );
          })()}
        </section>
      )}

      <section className="panel">
        <h3>Достижения · {g.achievements.length}/{ACHIEVEMENTS.length}</h3>
        <div className="ach-list">
          {ACHIEVEMENTS.map((a) => {
            const done = g.achievements.includes(a.id);
            const pr = a.progress?.(g);
            return (
              <div key={a.id} className={'ach' + (done ? ' done' : '')}>
                <span className="aicon">{done ? rich(a.icon) : <Icon name="lock" size={22} tone="#9aa9a2" />}</span>
                <div>
                  <b>{rich(a.title)}</b>
                  <span className="muted small">{rich(a.text)} · <Money n={a.reward} size={14} /></span>
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
