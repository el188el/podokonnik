import { useEffect, useRef } from 'react';
import { RANKS, levelPerks, levelReward, nextRank, rankOf, xpToNext } from '../../game/progression';
import { SPECIES } from '../../game/species';
import { closeSheet, useStore } from '../../game/store';
import { Bar, Btn } from '../kit/kit';
import { Emo, rich } from '../kit/rich';

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
        <span className="rank-icon">{rich(rank.icon)}</span>
        <div>
          <h2>{rich(rank.title)}</h2>
          <span className="muted small">Уровень {g.level}{rich(next ? ` · до ранга «${next.title}» — ${next.level} ур.` : ' · высший ранг!')}</span>
        </div>
      </div>
      <Bar value={g.xp / xpToNext(g.level)} label={`${g.xp}/${xpToNext(g.level)} опыта`} />
      <p className="muted small">Опыт дают полив, посадка, черенки, цветение, подарки и задания. На каждом уровне — листики, а на многих ещё и подарки.</p>
      <div className="ranks-row">
        {RANKS.map((r) => <span key={r.level} className={'rank-chip' + (g.level >= r.level ? ' got' : '')} title={r.title}>{rich(r.icon)}<small>{r.level}</small></span>)}
      </div>
      <div className="level-road">
        {Array.from({ length: top - 1 }, (_, i) => i + 2).map((l) => {
          const perks = levelPerks(l);
          const species = SPECIES.filter((s) => s.unlockLevel === l);
          const rk = RANKS.find((r) => r.level === l);
          const done = g.level >= l;
          return (
            <div key={l} ref={l === g.level + 1 ? cur : undefined} className={'road-step' + (done ? ' done' : l === g.level + 1 ? ' next' : '')}>
              <span className="road-lvl">{rich(done ? '✓' : l)}</span>
              <div className="road-body">
                {rk && <b className="road-rank">{rich(rk.icon)} Ранг «{rich(rk.title)}»</b>}
                <span><Emo e="🍃" /> {levelReward(l)}</span>
                {perks.map((p) => <span key={p.text}>{rich(p.icon)} {rich(p.text)}</span>)}
                {species.map((s) => <span key={s.id}><Emo e="🌱" /> Новый вид: {rich(s.name)}</span>)}
              </div>
            </div>
          );
        })}
      </div>
      <Btn kind="ghost" onClick={closeSheet}>Закрыть</Btn>
    </div>
  );
}
