import { DAILY, STARTER, dailyToday, starterDaysOpen, starterDone } from '../../game/onboarding';
import { dayKey } from '../../game/quests';
import { claimDaily, claimStarter, closeSheet, now, useStore } from '../../game/store';
import { Btn } from '../kit/kit';
import { Emo, rich } from '../kit/rich';

/** Сундучок: первую неделю — подарки по дням, потом — подарок каждый день. */
export function StarterSheet() {
  const g = useStore((s) => s.game);
  const t = now();
  if (starterDone(g)) {
    const today = dailyToday(t);
    const got = g.daily === dayKey(t);
    const tomorrow = dailyToday(t + 86400e3);
    return (
      <div className="center">
        <div className="gicon"><Emo e="🎁" /></div>
        <h2>Сундучок</h2>
        <p className="muted small">Каждый день — новый подарок. Заходи завтра!</p>
        <div className={'sday-card big' + (got ? ' got' : ' ready')} style={{ margin: '12px auto', maxWidth: 220 }}>
          <span className="si">{rich(got ? '✓' : today.icon)}</span>
          <span className="st">{rich(today.title)}</span>
        </div>
        {got ? <p className="muted small">Завтра: {rich(tomorrow.icon)} {rich(tomorrow.title)}</p> : <Btn kind="gold" onClick={claimDaily}>Открыть сундучок</Btn>}
        <p className="muted small">По кругу: {rich(DAILY.map((d) => d.icon).join(' '))}</p>
        <Btn kind="ghost" onClick={closeSheet}>Закрыть</Btn>
      </div>
    );
  }
  const open = starterDaysOpen(g, t);
  const claimed = g.starter?.claimed ?? [];
  return (
    <div>
      <div className="gicon"><Emo e="🎁" /></div>
      <h2 className="center">Сундучок</h2>
      <p className="muted center small">Каждый день — новый подарок. Первая неделя особенная: на седьмой день — редкая Традесканция Нанук!</p>
      <div className="starter">
        {STARTER.map((r, i) => {
          const got = claimed.includes(i);
          const ready = i < open && !got;
          return (
            <button key={i} className={'sday-card' + (got ? ' got' : ready ? ' ready' : ' locked') + (i === 6 ? ' big' : '')} disabled={!ready} onClick={() => claimStarter(i)}>
              <small>День {i + 1}</small>
              <span className="si">{rich(got ? '✓' : r.icon)}</span>
              <span className="st">{rich(r.title)}</span>
              {!got && !ready && <small className="muted">через {i + 1 - open} дн.</small>}
            </button>
          );
        })}
      </div>
      <Btn kind="ghost" onClick={closeSheet}>Закрыть</Btn>
    </div>
  );
}
