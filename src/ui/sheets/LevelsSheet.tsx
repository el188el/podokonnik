import { useEffect, useRef } from 'react';
import { RANKS, levelPerks, levelReward, nextRank, rankOf, xpToNext } from '../../game/progression';
import { EXTRA_PLACES } from '../../game/layout';
import { SPECIES } from '../../game/species';
import { closeSheet, useStore } from '../../game/store';
import { Bar, Btn } from '../kit/kit';

/** «Путь садовода»: ранги и награды за каждый уровень. */
export function LevelsSheet() {
  const g = useStore((s) => s.game);
  const rank = rankOf(g.level);
  const next = nextRank(g.level);
  const cur = useRef<HTMLDivElement>(null);
  useEffect(() => { cur.current?.scrollIntoView({ block: 'center' }); }, []);
  const top = Math.max(55, g.level + 10);
  return (
    <div>
      <div className="rank-head">
        <span className="rank-icon">{rank.icon}</span>
        <div>
          <h2>{rank.title}</h2>
          <span className="muted small">Уровень {g.level}{next ? ` · до ранга «${next.title}» — ${next.level} ур.` : ' · высший ранг!'}</span>
        </div>
      </div>
      <Bar value={g.xp / xpToNext(g.level)} label={`${g.xp}/${xpToNext(g.level)} опыта`} />
      <p className="muted small">Опыт дают полив, посадка, черенки, цветение, подарки и задания. На каждом уровне — листики, а на многих ещё и подарки.</p>
      <div className="ranks-row">
        {RANKS.map((r) => <span key={r.level} className={'rank-chip' + (g.level >= r.level ? ' got' : '')} title={r.title}>{r.icon}<small>{r.level}</small></span>)}
      </div>
      <div className="level-road">
        {Array.from({ length: top - 1 }, (_, i) => i + 2).map((l) => {
          const perks = levelPerks(l);
          const species = SPECIES.filter((s) => s.unlockLevel === l);
          const place = Object.values(EXTRA_PLACES).find((x) => x.level === l);
          const rk = RANKS.find((r) => r.level === l);
          const done = g.level >= l;
          return (
            <div key={l} ref={l === g.level + 1 ? cur : undefined} className={'road-step' + (done ? ' done' : l === g.level + 1 ? ' next' : '')}>
              <span className="road-lvl">{done ? '✓' : l}</span>
              <div className="road-body">
                {rk && <b className="road-rank">{rk.icon} Ранг «{rk.title}»</b>}
                <span>🍃 {levelReward(l)}</span>
                {perks.filter((p) => !place || !p.text.includes('Четвёртое')).map((p) => <span key={p.text}>{p.icon} {p.text}</span>)}
                {place && <span>🪴 {place.name[0].toUpperCase() + place.name.slice(1)}</span>}
                {species.map((s) => <span key={s.id}>🌱 Новый вид: {s.name}</span>)}
              </div>
            </div>
          );
        })}
      </div>
      <Btn kind="ghost" onClick={closeSheet}>Закрыть</Btn>
    </div>
  );
}
