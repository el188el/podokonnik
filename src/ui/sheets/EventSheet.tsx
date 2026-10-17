import { clone } from '../../game/constants';
import { useEffect, useRef, useState } from 'react';
import { activeEvent, eventEndsAt, EVENT_TOKENS, isEmptyReward, tierOf, type PassReward } from '../../game/events';
import { hueOf } from '../../game/breeding';
import { sp } from '../../game/species';
import { FORM_BY_ID, PRODUCT_BY_ID } from '../../game/products';
import { ITEM_BY_ID, potIdOf } from '../../game/shop';
import { approx } from '../../game/sim';
import { buyStars, catchesLeft, claimTier, closeSheet, eventProgress, now, useStore } from '../../game/store';
import { DecorArt, hasDecorArt } from '../art/DecorArt';
import { PlantArt } from '../art/PlantArt';
import { Icon, StarsPrice, TONE } from '../kit/icons';
import { Bar, Btn } from '../kit/kit';
import { Emo, rich } from '../kit/rich';

/** Картинка и подпись награды пропуска. */
function Reward({ r }: { r: PassReward }) {
  if (r.leaves) return <><span className="rw-art"><Icon name="leaf" size={26} tone={TONE.leaf} /></span><span className="rw-t">+{r.leaves}</span></>;
  if (r.pots) return <><span className="rw-art"><Icon name="pots" size={26} tone="#c4703f" /></span><span className="rw-t">Горшки ×{r.pots}</span></>;
  if (r.boost) return <><span className="rw-art"><Icon name="boost" size={26} tone={TONE.boost} /></span><span className="rw-t">Рост ×{r.boost}</span></>;
  if (r.feed) return <><span className="rw-art"><Icon name="feed" size={26} tone={TONE.feed} /></span><span className="rw-t">Подкормка ×{r.feed}</span></>;
  if (r.item) {
    const it = ITEM_BY_ID[r.item];
    const art = r.item.startsWith('pot_')
      ? <PlantArt sp="chlorophytum" stage={2} pot={potIdOf(r.item)} seed="pass" className="mini" potView />
      : hasDecorArt(r.item) ? <DecorArt id={r.item} scale={0.9} /> : <Emo e={it?.icon ?? '🎁'} size={26} />;
    return <><span className="rw-art">{art}</span><span className="rw-t">{rich(it?.name ?? '')}</span></>;
  }
  if (r.form) return <><span className="rw-art"><Icon name="sparkles" size={26} tone="#8b5cc7" /></span><span className="rw-t">{rich(FORM_BY_ID[r.form]?.name ?? '')}</span></>;
  if (r.hue) return <><span className="rw-art"><i className="rw-hue" style={{ background: hueOf(r.hue.sp, r.hue.hue)?.color }}><Emo e="🌸" size={14} /></i></span><span className="rw-t">{rich(`${sp(r.hue.sp).name} ${hueOf(r.hue.sp, r.hue.hue)?.name ?? ''}`)}</span></>;
  if (r.title) return <><span className="rw-art"><Icon name="trophy" size={26} tone="#e8a325" /></span><span className="rw-t">Звание «{rich(r.title)}»</span></>;
  return null;
}

/** Ивент и сезонный пропуск: дорожка уровней, слева бесплатные награды, справа — пропуска. */
export function EventSheet() {
  const g = useStore((s) => s.game);
  const [busy, setBusy] = useState(false);
  const [how, setHow] = useState(false);
  const cur = useRef<HTMLDivElement>(null);
  const t = now();
  const e = activeEvent(t);
  // открываем на текущем уровне, а не с самого начала
  useEffect(() => { setTimeout(() => cur.current?.scrollIntoView({ block: 'center' }), 350); }, []);
  if (!e) return <div className="center"><p className="muted">Сейчас ивентов нет. Следующий скоро!</p><Btn kind="ghost" onClick={closeSheet}>Закрыть</Btn></div>;
  const st = eventProgress(clone(g), e, t);
  const tier = tierOf(e, st.tokens);
  const next = e.tiers[tier];
  const prev = tier ? e.tiers[tier - 1] : 0;
  const pass = PRODUCT_BY_ID.pass;
  const ready = e.tiers.flatMap((need, i) => (st.tokens < need ? [] : [
    ...(st.free.includes(i) ? [] : [[i, false] as const]),
    ...(st.premium && !st.prem.includes(i) && !isEmptyReward(e.premium[i]) ? [[i, true] as const] : []),
  ]));
  const ways: [string, number][] = [
    ['💧 Полив', EVENT_TOKENS.water], ['🌱 Посадка', EVENT_TOKENS.plant], ['✂️ Черенок', EVENT_TOKENS.cut], ['📋 Задание', EVENT_TOKENS.quest],
    ['🎁 Подарок другу', EVENT_TOKENS.gift], ['🤝 Полив у друга', EVENT_TOKENS.friendWater], ['🪴 Настоящее растение', EVENT_TOKENS.twin],
  ];

  return (
    <div className={`event bp theme-${e.theme}`}>
      <div className="bp-hero">
        <span className="bp-days"><Icon name="calendar" size={14} /> ещё {rich(approx(eventEndsAt(e, t) - t))}</span>
        <div className="bp-token">{rich(e.token)}</div>
        <h2>{rich(e.title)}</h2>
        <p>{rich(e.desc)}</p>
      </div>

      <div className="bp-progress">
        <div className="bp-lvl"><small>уровень</small><b>{tier}</b><small>из {e.tiers.length}</small></div>
        <div className="bp-bar">
          <div className="bp-bar-top"><b>{st.tokens} {rich(e.token)}</b>{next ? <span>до {tier + 1} ур. ещё {next - st.tokens}</span> : <span>все уровни пройдены</span>}</div>
          <Bar value={next ? (st.tokens - prev) / (next - prev) : 1} />
          <button className="bp-how" onClick={() => setHow(!how)}>Как получить {rich(e.tokenName)} <Icon name="chevron" size={14} className={how ? 'up' : ''} /></button>
        </div>
      </div>
      {how && (
        <div className="bp-ways">
          {ways.map(([w, n]) => <span key={w}>{rich(w)} <b>+{n}</b></span>)}
          <p>{rich(e.token)} Иногда они пролетают над подоконником — лови! Сегодня ещё: {catchesLeft(g)}</p>
        </div>
      )}

      {ready.length > 1 && (
        <Btn kind="primary" onClick={() => ready.forEach(([i, p]) => claimTier(i, p))}>Забрать все награды · {ready.length}</Btn>
      )}

      {!st.premium && (
        <div className="bp-buy">
          <span className="bp-buy-ic"><Icon name="crown" size={24} /></span>
          <div>
            <b>Сезонный пропуск</b>
            <small>Награда на каждом уровне: {e.premium.reduce((n, r) => n + (r.leaves ?? 0), 0)} <Emo e="🍃" />, подкормки и стимуляторы, а ещё эксклюзив сезона, которого больше нигде нет: горшки, обои, цвета цветков, декор, звание и редкая форма. За пройденные уровни — сразу.</small>
          </div>
          <Btn small kind="gold" disabled={busy} onClick={async () => { setBusy(true); await buyStars('pass'); setBusy(false); }}><StarsPrice n={pass.stars} /></Btn>
        </div>
      )}

      <div className="bp-cols"><span>Бесплатно</span><span /><span><Icon name="crown" size={13} /> Пропуск</span></div>
      <div className="bp-track">
        {e.tiers.map((need, i) => {
          const reached = st.tokens >= need;
          const gotF = st.free.includes(i), gotP = st.prem.includes(i);
          const state = (got: boolean, open: boolean) => (got ? ' got' : reached && open ? ' ready' : !open ? ' locked' : '');
          return (
            <div key={i} ref={i === Math.min(tier, e.tiers.length - 1) ? cur : undefined} className={'bp-row' + (reached ? ' reached' : '') + (i === tier ? ' next' : '')}>
              <button className={'bp-rw' + state(gotF, true)} disabled={!reached || gotF} onClick={() => claimTier(i, false)}>
                <Reward r={e.free[i]} />
                {gotF ? <i className="bp-mark"><Icon name="check" size={12} /></i> : reached ? <i className="bp-get">Забрать</i> : null}
              </button>
              <span className="bp-node"><b>{i + 1}</b><small>{need}</small></span>
              {isEmptyReward(e.premium[i]) ? <span className="bp-rw prem none" aria-hidden /> : (
                <button className={'bp-rw prem' + state(gotP, st.premium)} disabled={!reached || gotP || !st.premium} onClick={() => claimTier(i, true)}>
                  <Reward r={e.premium[i]} />
                  {gotP ? <i className="bp-mark"><Icon name="check" size={12} /></i> : !st.premium ? <i className="bp-mark lock"><Icon name="lock" size={11} /></i> : reached ? <i className="bp-get">Забрать</i> : null}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <Btn kind="ghost" onClick={closeSheet}>Закрыть</Btn>
    </div>
  );
}
