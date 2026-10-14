import { STARTER, starterDaysOpen } from '../../game/onboarding';
import { claimStarter, closeSheet, now, useStore } from '../../game/store';
import { Btn } from '../kit/kit';

/** Подарки новичка на первые 7 дней. */
export function StarterSheet() {
  const g = useStore((s) => s.game);
  const t = now();
  const open = starterDaysOpen(g, t);
  const claimed = g.starter?.claimed ?? [];
  return (
    <div>
      <div className="gicon">🎁</div>
      <h2 className="center">Подарки новичка</h2>
      <p className="muted center small">Заходи 7 дней — каждый день новый подарок. На седьмой — редкая Традесканция Нанук!</p>
      <div className="starter">
        {STARTER.map((r, i) => {
          const got = claimed.includes(i);
          const ready = i < open && !got;
          return (
            <button key={i} className={'sday-card' + (got ? ' got' : ready ? ' ready' : ' locked') + (i === 6 ? ' big' : '')} disabled={!ready} onClick={() => claimStarter(i)}>
              <small>День {i + 1}</small>
              <span className="si">{got ? '✓' : r.icon}</span>
              <span className="st">{r.title}</span>
              {!got && !ready && <small className="muted">через {i + 1 - open} дн.</small>}
            </button>
          );
        })}
      </div>
      <Btn kind="ghost" onClick={closeSheet}>Закрыть</Btn>
    </div>
  );
}
