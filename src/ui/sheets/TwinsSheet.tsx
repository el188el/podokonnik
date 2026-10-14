import { useState } from 'react';
import { D } from '../../game/constants';
import { fmt, plural } from '../../game/sim';
import { SPECIES, sp } from '../../game/species';
import { addTwin, closeSheet, now, removeTwin, updateTwin, useStore, waterTwin } from '../../game/store';
import type { Twin } from '../../game/types';
import { PlantArt } from '../art/PlantArt';
import { Btn } from '../kit/kit';

const NO_TWINS: Twin[] = [];
const twinStage = (t: Twin) => (t.waters < 3 ? 2 : t.waters < 10 ? 3 : 4);

/** «Двойник подоконника»: виртуальные копии настоящих растений игрока. */
export function TwinsSheet() {
  const twins = useStore((s) => s.game.twins) ?? NO_TWINS;
  const [adding, setAdding] = useState(twins.length === 0);
  return (
    <div>
      <h2>🏠 Мои настоящие растения</h2>
      <p className="muted small">
        Заведи двойника своего настоящего цветка. Бот напомнит, когда его пора полить, а когда отметишь полив здесь — двойник подрастёт. Полил вовремя: +3 🍃 и серия.
      </p>
      {twins.map((t) => <TwinCard key={t.id} t={t} />)}
      {adding ? <AddTwin onDone={() => setAdding(false)} /> : <Btn onClick={() => setAdding(true)}>➕ Добавить настоящее растение</Btn>}
      <Btn kind="ghost" onClick={closeSheet}>Закрыть</Btn>
    </div>
  );
}

function TwinCard({ t }: { t: Twin }) {
  const [menu, setMenu] = useState(false);
  const n = now();
  const due = t.lastWater ? t.lastWater + t.every * D : n;
  const left = due - n;
  const s = sp(t.sp);
  return (
    <div className={'twin' + (left <= 0 ? ' due' : '')}>
      <PlantArt sp={t.sp} stage={twinStage(t)} seed={t.id} blooming={t.streak >= 5 && !!s.bloom} className="twin-art" />
      <div className="twin-body">
        <b>{t.nick}</b>
        <span className="muted small">{s.name} · раз в {t.every} {plural(t.every, 'день', 'дня', 'дней')}{t.streak > 1 ? ` · 🔥 ${t.streak}` : ''}</span>
        <span className={'small ' + (left <= 0 ? 'due-text' : 'muted')}>
          {!t.lastWater ? 'Отметь первый полив' : left <= 0 ? (left > -D ? 'Пора полить сегодня 💧' : `Просрочено на ${fmt(-left)}`) : `Полить через ${fmt(left)}`}
        </span>
        <div className="twin-actions">
          <Btn small kind={left <= 0 ? 'primary' : 'soft'} onClick={() => waterTwin(t.id)}>💧 Полил(а)</Btn>
          <button className="chip" onClick={() => setMenu(!menu)}>⋯</button>
        </div>
        {menu && (
          <div className="twin-menu">
            <label className="toggle small"><input type="checkbox" checked={t.notify} onChange={(e) => updateTwin(t.id, { notify: e.target.checked })} /> Напоминать в боте</label>
            <div className="chips">
              {[2, 3, 5, 7, 10, 14].map((d) => (
                <button key={d} className={'chip' + (t.every === d ? ' on' : '')} onClick={() => updateTwin(t.id, { every: d })}>{d} дн</button>
              ))}
            </div>
            <Btn small kind="warn" onClick={() => removeTwin(t.id)}>Удалить двойника</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

function AddTwin({ onDone }: { onDone: () => void }) {
  const [spId, setSp] = useState('');
  const [nick, setNick] = useState('');
  const [every, setEvery] = useState(0);
  const s = spId ? sp(spId) : null;
  return (
    <div className="panel add-twin">
      <h3>Какое растение у тебя дома?</h3>
      <div className="twin-pick">
        {SPECIES.map((x) => (
          <button key={x.id} className={'pick small-pick' + (spId === x.id ? ' on' : '')} onClick={() => { setSp(x.id); setEvery(x.waterDays); }}>
            <PlantArt sp={x.id} stage={4} seed="twin" noPot />
            <span>{x.name}</span>
          </button>
        ))}
      </div>
      {s && (
        <>
          <label className="lbl" htmlFor="tn">Как его зовут?</label>
          <input id="tn" className="inp" maxLength={20} placeholder={s.name} value={nick} onChange={(e) => setNick(e.target.value)} />
          <div className="lbl">Как часто поливаешь (обычно — раз в {s.waterDays} {plural(s.waterDays, 'день', 'дня', 'дней')})</div>
          <div className="chips">
            {[2, 3, 4, 5, 7, 10, 14].map((d) => (
              <button key={d} className={'chip' + (every === d ? ' on' : '')} onClick={() => setEvery(d)}>{d} дн</button>
            ))}
          </div>
          <Btn kind="primary" onClick={() => { addTwin(spId, nick, every || s.waterDays); onDone(); }}>Создать двойника</Btn>
        </>
      )}
    </div>
  );
}
