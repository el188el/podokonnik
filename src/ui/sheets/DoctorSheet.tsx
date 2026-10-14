import { useState } from 'react';
import { CAUSES, SYMPTOMS, SYMPTOM_BY_ID, diagnose } from '../../game/doctor';
import { SPECIES, sp } from '../../game/species';
import { closeSheet, countDoctor, now, useStore } from '../../game/store';
import type { Twin } from '../../game/types';
import { PlantArt } from '../art/PlantArt';
import { Btn } from '../kit/kit';
import { CONFIG } from '../../config';
import { platform } from '../../platform';

const NO_TWINS: Twin[] = [];

/** «Цветочный доктор»: что не так с настоящим растением. */
export function DoctorSheet({ sp: preset }: { sp?: string }) {
  const twins = useStore((s) => s.game.twins) ?? NO_TWINS;
  const [spId, setSp] = useState<string | null | undefined>(preset);
  const [sym, setSym] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  if (spId === undefined) {
    return (
      <div>
        <div className="gicon">🩺</div>
        <h2 className="center">Что с моим цветком?</h2>
        <p className="muted center small">Выбери растение — подскажем, почему ему плохо и как помочь. Советы для настоящих растений дома.</p>
        {twins.length > 0 && (
          <>
            <div className="lbl">Мои настоящие</div>
            <div className="chips">
              {twins.map((t) => <button key={t.id} className="chip" onClick={() => setSp(t.sp)}>{t.nick}</button>)}
            </div>
          </>
        )}
        <div className="lbl">Все растения</div>
        <div className="twin-pick wrap">
          {SPECIES.map((x) => (
            <button key={x.id} className="pick small-pick" onClick={() => setSp(x.id)}>
              <PlantArt sp={x.id} stage={4} seed="doc" noPot />
              <span>{x.name}</span>
            </button>
          ))}
        </div>
        <Btn kind="soft" onClick={() => setSp(null)}>Другое растение</Btn>
        <Btn kind="ghost" onClick={closeSheet}>Закрыть</Btn>
      </div>
    );
  }

  const name = spId ? sp(spId).name : 'Растение';
  if (!sym) {
    return (
      <div>
        <h2>🩺 {name}: что случилось?</h2>
        <div className="symptoms">
          {SYMPTOMS.map((s) => (
            <button key={s.id} className="symptom" onClick={() => { setSym(s.id); setOpen(null); countDoctor(); }}>
              <span>{s.icon}</span>{s.title}
            </button>
          ))}
        </div>
        {!preset && <Btn kind="soft" onClick={() => setSp(undefined)}>← Другое растение</Btn>}
        <Btn kind="ghost" onClick={closeSheet}>Закрыть</Btn>
      </div>
    );
  }

  const d = diagnose(sym, spId, new Date(now()).getMonth() + 1);
  return (
    <div>
      <h2>🩺 {name}</h2>
      <p className="muted">{SYMPTOM_BY_ID[sym].icon} {SYMPTOM_BY_ID[sym].title}</p>
      {d.special && <div className="doc-special">💡 {d.special}</div>}
      <div className="lbl">Возможные причины</div>
      {d.list.map(({ cause, label }, i) => (
        <div key={cause.id} className={'cause' + (i === 0 ? ' top' : '')} onClick={() => setOpen(open === cause.id ? null : cause.id)}>
          <div className="cause-head"><b>{cause.title}</b><small className={'tag ' + (i === 0 ? 'hi' : '')}>{label}</small></div>
          {(open === cause.id || (open === null && i === 0)) && (
            <>
              <p className="small"><b>Как понять:</b> {CAUSES[cause.id].check}</p>
              <p className="small"><b>Что делать:</b> {CAUSES[cause.id].fix}</p>
            </>
          )}
        </div>
      ))}
      {CONFIG.channel && <button className="linkish" onClick={() => platform().openLink(`https://t.me/${CONFIG.channel}`)}>📢 Больше советов — в канале игры</button>}
      <p className="muted small">Это подсказка, а не точный диагноз. Если растение быстро теряет листья — покажи его в цветочном магазине.</p>
      <Btn kind="soft" onClick={() => setSym(null)}>← Другой симптом</Btn>
      <Btn kind="ghost" onClick={closeSheet}>Закрыть</Btn>
    </div>
  );
}
