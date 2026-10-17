// Выбор подоконника: свои комнаты и общие с друзьями.

import { useEffect } from 'react';
import { closeSheet, loadCoops, openSheet, setActiveSill, setArrange, setTab, showCoop, TUTORIAL_DONE, useStore } from '../../game/store';
import { WINDOWS } from '../../game/constants';
import { loggedIn } from '../../net/api';
import { Btn } from '../kit/kit';
import { Emo, rich } from '../kit/rich';

export function SillsSheet() {
  const g = useStore((s) => s.game);
  const coops = useStore((s) => s.coops) ?? [];
  const coopOn = useStore((s) => s.coopOn);
  const canCoop = loggedIn() && g.tutorial >= TUTORIAL_DONE;
  // список общих подоконников — свежий при каждом открытии (вдруг при запуске не загрузился)
  useEffect(() => { void loadCoops(); }, []);
  const count = (id: string) => g.plants.filter((p) => p.sill === id).length;
  return (
    <div className="sills-sheet">
      <h2>Подоконники</h2>
      <h3><Emo e="🏠" /> Мои</h3>
      <div className="list">
        {g.sills.map((s) => (
          <button key={s.id} className={'row-item sill-row' + (!coopOn && s.id === g.activeSill ? ' on' : '')} onClick={() => { showCoop(null); setActiveSill(s.id); closeSheet(); }}>
            <div className="ricon"><Emo e="🪟" /></div>
            <div className="rtext"><b>{rich(s.name)}</b><span className="muted small">{rich(s.window ? WINDOWS[s.window].short : 'окно не выбрано')} · растений: {count(s.id)}</span></div>
            {!coopOn && s.id === g.activeSill && <span className="sill-here"><Emo e="✓" /></span>}
          </button>
        ))}
      </div>
      {!coopOn && (
        <div className="sill-actions">
          <button className="chip" onClick={() => { setTab('sill'); setArrange(true); closeSheet(); }}><Emo e="🛋" /> Переставить предметы</button>
          <button className="chip" onClick={() => openSheet({ kind: 'room' })}><Emo e="🎨" /> Цвета комнаты</button>
          <button className="chip" onClick={() => openSheet({ kind: 'window', sill: g.activeSill })}><Emo e="🧭" /> Сторона окна</button>
        </div>
      )}
      {(coops.length > 0 || canCoop) && <h3><Emo e="💞" /> Общие с друзьями</h3>}
      <div className="list">
        {coops.map((c) => (
          <button key={c.id} className={'row-item sill-row' + (coopOn === c.id ? ' on' : '')} onClick={() => showCoop(c.id)}>
            <div className="ricon"><Emo e="💞" /></div>
            <div className="rtext"><b>{rich(c.state.name)}</b><span className="muted small">ухаживаете вместе: {c.members.length}</span></div>
            {coopOn === c.id && <span className="sill-here"><Emo e="✓" /></span>}
          </button>
        ))}
        {canCoop && coops.length < 2 && (
          <button className="row-item sill-row add" onClick={() => openSheet({ kind: 'coop' })}>
            <div className="ricon"><Emo e="➕" /></div>
            <div className="rtext"><b>Общий подоконник</b><span className="muted small">Растения, за которыми ухаживаете с друзьями вместе</span></div>
          </button>
        )}
      </div>
      <Btn onClick={() => openSheet({ kind: 'room' })}><Emo e="🎨" /> Цвета стен, стола и подоконника</Btn>
      <Btn onClick={() => openSheet({ kind: 'postcard' })}><Emo e="💌" /> Открытка с этого подоконника</Btn>
      <button className="linkish small" onClick={() => { closeSheet(); setTab('shop'); }}><Emo e="🛒" /> Ещё подоконник — в магазине, раздел «Окна»</button>
    </div>
  );
}
