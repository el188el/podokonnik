// Выбор подоконника: свои комнаты и общие с друзьями.

import { closeSheet, openSheet, setActiveSill, setTab, showCoop, TUTORIAL_DONE, useStore } from '../../game/store';
import { WINDOWS } from '../../game/constants';
import { loggedIn } from '../../net/api';
import { Btn } from '../kit/kit';

export function SillsSheet() {
  const g = useStore((s) => s.game);
  const coops = useStore((s) => s.coops) ?? [];
  const coopOn = useStore((s) => s.coopOn);
  const canCoop = loggedIn() && g.tutorial >= TUTORIAL_DONE;
  const count = (id: string) => g.plants.filter((p) => p.sill === id).length;
  return (
    <div className="sills-sheet">
      <h2>Подоконники</h2>
      <h3>🏠 Мои</h3>
      <div className="list">
        {g.sills.map((s) => (
          <button key={s.id} className={'row-item sill-row' + (!coopOn && s.id === g.activeSill ? ' on' : '')} onClick={() => { showCoop(null); setActiveSill(s.id); closeSheet(); }}>
            <div className="ricon">🪟</div>
            <div className="rtext"><b>{s.name}</b><span className="muted small">{s.window ? WINDOWS[s.window].short : 'окно не выбрано'} · растений: {count(s.id)}</span></div>
            {!coopOn && s.id === g.activeSill && <span className="sill-here">✓</span>}
          </button>
        ))}
      </div>
      {(coops.length > 0 || canCoop) && <h3>💞 Общие с друзьями</h3>}
      <div className="list">
        {coops.map((c) => (
          <button key={c.id} className={'row-item sill-row' + (coopOn === c.id ? ' on' : '')} onClick={() => showCoop(c.id)}>
            <div className="ricon">💞</div>
            <div className="rtext"><b>{c.state.name}</b><span className="muted small">ухаживаете вместе: {c.members.length}</span></div>
            {coopOn === c.id && <span className="sill-here">✓</span>}
          </button>
        ))}
        {canCoop && coops.length < 2 && (
          <button className="row-item sill-row add" onClick={() => openSheet({ kind: 'coop' })}>
            <div className="ricon">➕</div>
            <div className="rtext"><b>Общий подоконник</b><span className="muted small">Растения, за которыми ухаживаете с друзьями вместе</span></div>
          </button>
        )}
      </div>
      <Btn onClick={() => openSheet({ kind: 'postcard' })}>💌 Открытка с этого подоконника</Btn>
      <button className="linkish small" onClick={() => { closeSheet(); setTab('shop'); }}>🛒 Ещё подоконник — в магазине, раздел «Окна»</button>
    </div>
  );
}
