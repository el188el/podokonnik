import { clone } from '../../game/constants';
import { useState } from 'react';
import { activeEvent, eventEndsAt, EVENT_TOKENS, tierOf } from '../../game/events';
import { PRODUCT_BY_ID } from '../../game/products';
import { approx } from '../../game/sim';
import { buyStars, catchesLeft, claimTier, closeSheet, eventProgress, now, rewardText, useStore } from '../../game/store';
import { Bar, Btn } from '../kit/kit';

/** Ивент и сезонный пропуск: две ветки наград по уровням. */
export function EventSheet() {
  const g = useStore((s) => s.game);
  const [busy, setBusy] = useState(false);
  const t = now();
  const e = activeEvent(t);
  if (!e) return <div className="center"><p className="muted">Сейчас ивентов нет. Следующий скоро!</p><Btn kind="ghost" onClick={closeSheet}>Закрыть</Btn></div>;
  const st = eventProgress(clone(g), e, t);
  const tier = tierOf(e, st.tokens);
  const next = e.tiers[tier];
  const prev = tier ? e.tiers[tier - 1] : 0;
  const pass = PRODUCT_BY_ID.pass;

  return (
    <div className={`event theme-${e.theme}`}>
      <div className="event-head">
        <div className="gicon">{e.token}</div>
        <h2>{e.title}</h2>
        <p className="muted small">Ещё {approx(eventEndsAt(e, t) - t)} · {e.desc}</p>
      </div>
      <div className="event-tokens">
        <b>{st.tokens} {e.token}</b>
        <span className="muted small">уровень {tier} из {e.tiers.length}</span>
      </div>
      {next && <Bar value={(st.tokens - prev) / (next - prev)} label={`до ${tier + 1} уровня: ${next - st.tokens} ${e.token}`} />}
      <p className="muted small">
        Как получить {e.tokenName}: полив +{EVENT_TOKENS.water}, посадка +{EVENT_TOKENS.plant}, черенок +{EVENT_TOKENS.cut}, задание +{EVENT_TOKENS.quest},
        подарок другу +{EVENT_TOKENS.gift}, полив у друга +{EVENT_TOKENS.friendWater}, полив настоящего растения +{EVENT_TOKENS.twin}.
      </p>
      <p className="catch-hint">{e.token} Иногда {e.tokenName} пролетают над подоконником — успей поймать! +1 {e.token} и +1 опыт. Сегодня ещё можно поймать: {catchesLeft(g)}</p>

      {!st.premium && (
        <div className="plus-card pass-card">
          <b>🎟 Сезонный пропуск</b>
          <p className="small">Открывает платную ветку на все {e.tiers.length} уровней: эксклюзивный дизайн горшка, декор сезона, {e.premium.reduce((n, r) => n + (r.leaves ?? 0), 0)} 🍃, подкормки, горшки и редкую форму на {e.tiers.length}-м уровне. Награды за уже пройденные уровни заберёшь сразу.</p>
          <Btn kind="gold" disabled={busy} onClick={async () => { setBusy(true); await buyStars('pass'); setBusy(false); }}>Открыть за {pass.stars} ⭐</Btn>
        </div>
      )}

      <div className="pass">
        <div className="pass-row pass-headrow"><span>Ур.</span><span>Бесплатно</span><span>🎟 Пропуск</span></div>
        {e.tiers.map((need, i) => {
          const reached = st.tokens >= need;
          const fr = e.free[i], pr = e.premium[i];
          const gotF = st.free.includes(i), gotP = st.prem.includes(i);
          return (
            <div key={i} className={'pass-row' + (reached ? ' reached' : '')}>
              <span className="lvl-n">{i + 1}<small>{need}{e.token}</small></span>
              <button className={'reward' + (gotF ? ' got' : reached ? ' ready' : '')} disabled={!reached || gotF} onClick={() => claimTier(i, false)}>
                {gotF ? '✓ ' : ''}{rewardText(fr)}
              </button>
              <button className={'reward prem' + (gotP ? ' got' : reached && st.premium ? ' ready' : '')} disabled={!reached || gotP || !st.premium} onClick={() => claimTier(i, true)}>
                {gotP ? '✓ ' : st.premium ? '' : '🔒 '}{rewardText(pr)}
              </button>
            </div>
          );
        })}
      </div>
      <Btn kind="ghost" onClick={closeSheet}>Закрыть</Btn>
    </div>
  );
}
