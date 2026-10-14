import { useEffect, useRef, useState } from 'react';
import { D } from '../../game/constants';
import { fmt, plural } from '../../game/sim';
import { SPECIES, sp } from '../../game/species';
import { addTwin, addTwinPhoto, closeSheet, openSheet, now, removeTwin, removeTwinPhoto, updateTwin, useStore, waterTwin } from '../../game/store';
import { photoDue, twinStage } from '../../game/twins';
import { MONTH_IN, careTasks } from '../../game/calendar';
import { doCareTask, monthKey } from '../../game/store';
import { loadPhoto } from '../../net/photos';
import { shareBeforeAfter } from '../share';
import type { Twin } from '../../game/types';
import { PlantArt } from '../art/PlantArt';
import { Btn } from '../kit/kit';

const NO_TWINS: Twin[] = [];

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
      <CareCalendar twins={twins} />
      {adding ? <AddTwin onDone={() => setAdding(false)} /> : <Btn onClick={() => setAdding(true)}>➕ Добавить настоящее растение</Btn>}
      <Btn kind="ghost" onClick={closeSheet}>Закрыть</Btn>
    </div>
  );
}

/** Календарь ухода: сезонные дела этого месяца для настоящих растений. */
function CareCalendar({ twins }: { twins: Twin[] }) {
  const cal = useStore((s) => s.game.calendar);
  const t = now();
  const month = new Date(t).getMonth() + 1;
  const done = cal?.month === monthKey(t) ? cal.done : [];
  const tasks = careTasks(month, twins.map((x) => x.sp));
  return (
    <div className="panel care-cal">
      <h3>📅 Уход в {MONTH_IN[month - 1]}</h3>
      {tasks.map((k) => {
        const ok = done.includes(k.key);
        return (
          <button key={k.key} className={'care-task' + (ok ? ' done' : '')} disabled={ok} onClick={() => doCareTask(k.key)}>
            <span>{ok ? '✅' : k.icon}</span>
            <span>{k.sp ? <b>{sp(k.sp).name}: </b> : null}{k.text}</span>
          </button>
        );
      })}
      <p className="muted small">Сделал(а) по-настоящему — отметь: +5 🍃 за каждое дело.</p>
    </div>
  );
}

const dateText = (at: number) => new Date(at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

/** Снимок из памяти устройства. */
export function Photo({ id, className }: { id: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let u: string | null = null;
    loadPhoto(id).then((b) => { if (b) { u = URL.createObjectURL(b); setUrl(u); } else setMissing(true); });
    return () => { if (u) URL.revokeObjectURL(u); };
  }, [id]);
  if (missing) return <div className={'photo missing ' + (className ?? '')}>📵<small>на другом устройстве</small></div>;
  return url ? <img className={'photo ' + (className ?? '')} src={url} alt="" /> : <div className={'photo ' + (className ?? '')} />;
}

function TwinPhotos({ t }: { t: Twin }) {
  const input = useRef<HTMLInputElement>(null);
  const [compare, setCompare] = useState(false);
  const [busy, setBusy] = useState(false);
  const list = t.photos ?? [];
  const first = list[0];
  const last = list[list.length - 1];
  const canCompare = list.length >= 2;
  return (
    <div className="twin-photos">
      <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={async (e) => {
        const f = e.target.files?.[0];
        e.target.value = '';
        if (!f) return;
        setBusy(true);
        await addTwinPhoto(t.id, f);
        setBusy(false);
      }} />
      {list.length > 0 && (
        <div className="photo-strip">
          {list.map((ph) => (
            <figure key={ph.id}>
              <Photo id={ph.id} />
              <figcaption>{dateText(ph.at)}</figcaption>
            </figure>
          ))}
        </div>
      )}
      {photoDue(t, now()) && <p className="small due-text">Прошёл месяц — сфотографируй снова и сравни, как подрос 📷</p>}
      <div className="twin-actions">
        <Btn small kind={!list.length || photoDue(t, now()) ? 'gold' : 'soft'} disabled={busy} onClick={() => input.current?.click()}>
          📷 {list.length ? 'Новое фото' : 'Сфотографировать'}
        </Btn>
        {canCompare && <Btn small kind="soft" onClick={() => setCompare(!compare)}>{compare ? 'Скрыть' : '↔ Было / стало'}</Btn>}
      </div>
      {compare && first && last && (
        <div className="before-after">
          <figure><Photo id={first.id} /><figcaption>Было · {dateText(first.at)}</figcaption></figure>
          <figure><Photo id={last.id} /><figcaption>Стало · {dateText(last.at)}</figcaption></figure>
          <div className="ba-actions">
            <Btn small kind="gold" onClick={() => shareBeforeAfter(t, first, last)}>Поделиться 📸</Btn>
            <Btn small kind="ghost" onClick={() => removeTwinPhoto(t.id, last.id)}>Удалить последнее</Btn>
          </div>
        </div>
      )}
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
            <Btn small kind="soft" onClick={() => openSheet({ kind: 'doctor', sp: t.sp })}>🩺 Что-то не так с растением?</Btn>
            <Btn small kind="warn" onClick={() => removeTwin(t.id)}>Удалить двойника</Btn>
          </div>
        )}
      </div>
      <TwinPhotos t={t} />
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
