import { useState } from 'react';
import { WINDOWS } from '../../game/constants';
import { closeSheet, createCoop, joinCoop } from '../../game/store';
import { Btn } from '../kit/kit';
import { Emo, rich } from '../kit/rich';

/** Завести общий подоконник или вступить по коду. */
export function CoopSheet() {
  const [name, setName] = useState('');
  const [win, setWin] = useState<'N' | 'E' | 'S' | 'W'>('E');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <div className="gicon"><Emo e="💞" /></div>
      <h2 className="center">Общий подоконник</h2>
      <p className="muted center small">
        Один подоконник на двоих — для пары, семьи или соседей по квартире (до 4 человек). Растения общие:
        полил один — видно всем, кто и когда. Награды за уход получает тот, кто поливал.
      </p>
      <div className="lbl">Название</div>
      <input className="inp" maxLength={24} placeholder="Наш подоконник" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="lbl">Куда смотрит окно</div>
      <div className="chips">
        {(['N', 'E', 'S', 'W'] as const).map((w) => (
          <button key={w} className={'chip' + (win === w ? ' on' : '')} onClick={() => setWin(w)}>{rich(WINDOWS[w].short)}</button>
        ))}
      </div>
      <Btn kind="primary" disabled={busy} onClick={async () => { setBusy(true); if (await createCoop(name, win)) closeSheet(); setBusy(false); }}>Создать и пригласить</Btn>
      <div className="lbl">Или вступи по коду из приглашения</div>
      <div className="city-search">
        <input className="inp" maxLength={10} placeholder="Код из 10 символов" value={code} onChange={(e) => setCode(e.target.value.trim())} />
        <Btn small disabled={busy || code.length !== 10} onClick={async () => { setBusy(true); if (await joinCoop(code)) closeSheet(); setBusy(false); }}>Вступить</Btn>
      </div>
      <Btn kind="ghost" onClick={closeSheet}>Закрыть</Btn>
    </div>
  );
}
