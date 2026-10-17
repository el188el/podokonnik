import { BIG_LABEL, DIFFICULTY_LABEL, SPECIES } from '../../game/species';
import { now, openSheet, useStore, visitHerbarium } from '../../game/store';
import { SHELVES, shelfProgress, shelvesReady } from '../../game/album';
import { MASTERY, masteryPoints, masteryStars } from '../../game/mastery';
import { rareScore } from '../../game/rarity';
import { PlantArt } from '../art/PlantArt';
import { Emo, rich } from '../kit/rich';

export function Herbarium() {
  const g = useStore((s) => s.game);
  const t = now();
  const twinsDue = (g.twins ?? []).filter((x) => !x.lastWater || t >= x.lastWater + x.every * 86400e3).length;
  return (
    <div className="tab">
      <div className="tab-head">
        <h1>Гербарий</h1>
        <span className="muted">
          {g.grownAdult.length}/{SPECIES.length} выращено
        </span>
      </div>
      <p className="muted small">Всё о видах, которые ты открыл(а): как поливать, где ставить и как вырастить такое же дома.</p>
      <button className={'mini-banner twins-banner' + (twinsDue ? ' ready' : '')} onClick={() => openSheet({ kind: 'twins' })}>
        <Emo e="🏠" /> Настоящие растения · {rich((g.twins ?? []).length ? `${(g.twins ?? []).length}${twinsDue ? ` · полить ${twinsDue} 💧` : ''}` : 'двойники твоих цветов')}
      </button>
      <button className={'mini-banner album-banner' + (shelvesReady(g).length ? ' ready' : '')} onClick={() => openSheet({ kind: 'album' })}>
        <Emo e="📒" /> Альбом редкостей · {SHELVES.reduce((n, s) => n + shelfProgress(g, s)[0], 0)}/{SHELVES.reduce((n, s) => n + s.items.length, 0)}
        {rich(` · ✨ ${rareScore(g)} оч.`)}{rich(shelvesReady(g).length ? ' · награда!' : '')}
      </button>
      <button className="mini-banner doctor-banner" onClick={() => openSheet({ kind: 'doctor' })}><Emo e="🩺" /> Что с моим цветком? Желтеют листья, не цветёт — подскажем причину</button>
      {([1, 2, 3, 4, 'big'] as const).map((d) => (
        <section key={d}>
          <h3>{rich(d === 'big' ? BIG_LABEL : DIFFICULTY_LABEL[d])}</h3>
          <div className="grid">
            {SPECIES.filter((s) => (d === 'big' ? s.big : !s.big && s.difficulty === d)).map((s) => {
              const known = g.discovered.includes(s.id);
              return (
                <button key={s.id} className="pick" onClick={() => { openSheet({ kind: 'herb', sp: s.id }); visitHerbarium(); }}>
                  <PlantArt sp={s.id} stage={4} seed="herb" className={known ? '' : 'unknown'} noPot />
                  <b>{rich(known ? s.name : '???')}</b>
                  <span className="muted small">{rich(masteryStars(masteryPoints(g, s.id)) ? MASTERY.slice(0, masteryStars(masteryPoints(g, s.id))).map((m) => m.icon).join('') : g.grownAdult.includes(s.id) ? '🏅 выращено' : known ? 'открыто' : `с ${s.unlockLevel} ур.`)}</span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
