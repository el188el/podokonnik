import { DIFFICULTY_LABEL, SPECIES } from '../../game/species';
import { openSheet, useStore, visitHerbarium } from '../../game/store';
import { PlantArt } from '../art/PlantArt';

export function Herbarium() {
  const g = useStore((s) => s.game);
  return (
    <div className="tab">
      <div className="tab-head">
        <h1>Гербарий</h1>
        <span className="muted">
          {g.grownAdult.length}/{SPECIES.length} выращено
        </span>
      </div>
      <p className="muted small">Всё о видах, которые ты открыл(а): как поливать, где ставить и как вырастить такое же дома.</p>
      <button className="mini-banner doctor-banner" onClick={() => openSheet({ kind: 'doctor' })}>🩺 Что с моим цветком? Желтеют листья, не цветёт — подскажем причину</button>
      {[1, 2, 3].map((d) => (
        <section key={d}>
          <h3>{DIFFICULTY_LABEL[d]}</h3>
          <div className="grid">
            {SPECIES.filter((s) => s.difficulty === d).map((s) => {
              const known = g.discovered.includes(s.id);
              return (
                <button key={s.id} className="pick" onClick={() => { openSheet({ kind: 'herb', sp: s.id }); visitHerbarium(); }}>
                  <PlantArt sp={s.id} stage={4} seed="herb" className={known ? '' : 'unknown'} noPot />
                  <b>{known ? s.name : '???'}</b>
                  <span className="muted small">{g.grownAdult.includes(s.id) ? '🏅 выращено' : known ? 'открыто' : `с ${s.unlockLevel} ур.`}</span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
