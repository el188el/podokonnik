// Мини-игра пересадки: постучать по горшку, аккуратно вытянуть растение
// (зажать и держать — резко нельзя, порвёшь корни) и поставить в большой горшок.

import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { ITEM_BY_ID } from '../../game/shop';
import { sp } from '../../game/species';
import { closeSheet, potsOf, repot, useStore } from '../../game/store';
import { needSize, POT_SIZE_ITEM, POT_SIZE_NAME, potSizeOf, tight } from '../../game/sim';
import { platform } from '../../platform';
import { PlantArt } from '../art/PlantArt';
import { Bar, Btn } from '../kit/kit';

const HOLD_MS = 1600;

export function RepotGame({ id }: { id: string }) {
  const g = useStore((s) => s.game);
  const p = g.plants.find((x) => x.id === id);
  const [step, setStep] = useState(0);
  const [taps, setTaps] = useState(0);
  const [pull, setPull] = useState(0);
  const [oops, setOops] = useState(0);
  const [msg, setMsg] = useState('');
  const [size, setSize] = useState<number | undefined>();
  const hold = useRef<number | null>(null);
  useEffect(() => () => { if (hold.current) cancelAnimationFrame(hold.current); }, []);
  if (!p) return null;
  const s = sp(p.sp);
  const cur = potSizeOf(p);
  const sizes = [2, 3, 4].filter((z) => z > cur && z >= needSize(p.stage));
  const pick = size ?? sizes[0];

  const knock = () => {
    platform().haptic('light');
    const n = taps + 1;
    setTaps(n);
    if (n >= 3) { setStep(1); setMsg(''); }
  };
  const startPull = () => {
    const t0 = performance.now();
    const tick = () => {
      const v = Math.min(1, (performance.now() - t0) / HOLD_MS);
      setPull(v);
      if (v >= 1) { hold.current = null; platform().haptic('success'); setStep(2); setMsg(''); return; }
      hold.current = requestAnimationFrame(tick);
    };
    hold.current = requestAnimationFrame(tick);
  };
  const stopPull = () => {
    if (hold.current === null) return;
    cancelAnimationFrame(hold.current);
    hold.current = null;
    if (step === 1) {
      setOops((o) => o + 1);
      setPull(0);
      platform().haptic('warning');
      setMsg('Ой, резковато — корни помялись. Тяни плавно, не отпуская');
    }
  };
  const finish = () => {
    repot(p.id, oops === 0, pick);
    closeSheet();
  };

  const lift = step === 1 ? pull * 40 : 0;
  return (
    <div className="repot-game center">
      <h2>Пересадка: {p.nick || s.name}</h2>
      {tight(p) && step === 0 && <p className="warn-text small">Корни упёрлись в стенки — растение грустит и не растёт</p>}
      <p className="muted small">
        {step === 0 && `Постучи по горшку, чтобы земля отошла от стенок (${taps}/3)`}
        {step === 1 && 'Зажми кнопку и держи — растение выходит медленно, вместе с комом земли'}
        {step === 2 && 'Вытянули! Выбери новый горшок — чем просторнее, тем дольше не понадобится пересадка'}
      </p>
      <div className="repot-stage" onClick={step === 0 ? knock : undefined}>
        {step < 2 ? (
          <motion.div key={taps} animate={step === 0 && taps ? { rotate: [0, -6, 6, -3, 0], y: 0 } : { y: -lift }} transition={{ duration: step === 1 ? 0 : 0.35 }}>
            <PlantArt sp={p.sp} form={p.form} hue={p.hue} stage={p.stage} seed={p.id} pot={p.pot} size={cur} shape={p.shape} blooming={p.blooming} />
          </motion.div>
        ) : (
          <motion.div initial={{ scale: 0.7, y: -30, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} transition={{ type: 'spring', damping: 12 }}>
            <PlantArt sp={p.sp} form={p.form} hue={p.hue} stage={p.stage} seed={p.id} pot={p.pot} size={pick} shape={p.shape} blooming={p.blooming} />
          </motion.div>
        )}
      </div>
      {msg && <p className="warn-text small">{msg}</p>}
      {step === 0 && <Btn kind="primary" onClick={knock}>👊 Постучать</Btn>}
      {step === 1 && (
        <>
          <Bar value={pull} color="#4caf6a" label={pull > 0 ? 'тянем…' : 'держи кнопку'} />
          <button className="btn primary hold-btn" onPointerDown={startPull} onPointerUp={stopPull} onPointerLeave={stopPull} onPointerCancel={stopPull}>✋ Держать и тянуть</button>
        </>
      )}
      {step === 2 && (
        <>
          <div className="size-pick">
            {sizes.map((z) => (
              <button key={z} className={'size-opt' + (pick === z ? ' on' : '')} onClick={() => setSize(z)}>
                <b>{POT_SIZE_NAME[z]}</b>
                <small>{potsOf(g, z) > 0 ? `есть ${potsOf(g, z)}` : `${ITEM_BY_ID[POT_SIZE_ITEM[z]].price} 🍃`}</small>
              </button>
            ))}
          </div>
          {pick >= 4 && <p className="muted small">XL — простор: черенки отрастают на 25% быстрее</p>}
          <Btn kind="gold" disabled={!pick || (potsOf(g, pick) <= 0 && g.leaves < ITEM_BY_ID[POT_SIZE_ITEM[pick]].price)} onClick={finish}>🪴 Сажаем в {POT_SIZE_NAME[pick]}</Btn>
        </>
      )}
      <p className="muted small">{oops === 0 ? 'Аккуратная пересадка — растение скажет спасибо' : `Корни помяты ${oops} раз — ничего страшного, отрастут`}</p>
    </div>
  );
}
