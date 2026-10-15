// Обучение: соседка Валентина Петровна ведёт новичка по первым шагам.
// Шаги продвигаются сами, когда игрок делает нужное действие.

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { finishTutorial, openSheet, setTool, setTutorial, TUTORIAL_DONE, useStore } from '../game/store';
import { Btn } from './kit/kit';
import { online } from '../net/api';
import { platform } from '../platform';
import { Granny } from './art/Granny';
import { rich } from './kit/rich';

interface Step {
  text: string;
  action?: { label: string; run: () => void };
}

export function Guide() {
  const g = useStore((s) => s.game);
  const step = g.tutorial;
  const sill = g.sills.find((s) => s.id === g.activeSill) ?? g.sills[0];
  const first = g.plants[0];

  // сами переходим к следующему шагу, когда игрок сделал то, что нужно
  useEffect(() => {
    if (step >= TUTORIAL_DONE) return;
    if (step === 1 && sill.window) setTutorial(2);
    else if (step === 2 && first) setTutorial(3);
    else if (step === 3 && first?.rootStart) setTutorial(4);
    else if (step === 4 && first && first.stage >= 1) setTutorial(5);
    else if (step === 5 && first && first.stage >= 2) setTutorial(6);
  }, [step, sill.window, first, first?.rootStart, first?.stage]);

  if (step >= TUTORIAL_DONE) return null;

  // коротко и простыми словами — чтобы понял и десятилетний
  const steps: Record<number, Step> = {
    0: {
      text: 'Привет! Я Валентина Петровна, твоя соседка. Давай вместе вырастим твой первый цветок!',
      action: { label: 'Давай!', run: () => setTutorial(1) },
    },
    1: {
      text: 'Куда смотрит твоё окно? Не знаешь — не страшно, выбери «Не знаю».',
      action: { label: 'Выбрать окно', run: () => openSheet({ kind: 'window', sill: sill.id, then: 'picker', slot: 0 }) },
    },
    2: {
      text: 'Держи подарок — черенок! Это веточка, из которой вырастет новый цветок. Выбери любой.',
      action: { label: 'Выбрать черенок', run: () => openSheet({ kind: 'picker', slot: 0, sill: sill.id }) },
    },
    3: { text: 'Черенок стоит в стакане. Нажми на стакан — нальём воды 💧' },
    4: { text: 'Теперь ждём корешки — пару минут. Наверху у стекла светло, внизу — тень. Цветок можно перетащить пальцем.' },
    5: { text: 'Ура, корешки выросли! Нажми на стакан — посадим цветок в горшок 🪴' },
    6: {
      text: 'Внизу — инструменты. Нажми «Уход», выбери «Полить» и нажми на цветок. Полоска под горшком покраснела — пора поливать.',
      action: { label: 'Понятно!', run: () => { setTool('water'); setTutorial(7); } },
    },
    7: {
      text: 'Ты настоящий садовод! Держи подарок: листики и белый горшок. Заходи каждый день — цветы будут ждать 🌿',
      action: { label: 'Спасибо!', run: () => finishTutorial(true) },
    },
  };
  const st = steps[step] ?? steps[0];

  return (
    <AnimatePresence mode="wait">
      <motion.div key={step} className="guide" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
        <div className="guide-avatar"><Granny size={52} /></div>
        <div className="guide-body">
          <div className="guide-top">
            <b>Валентина Петровна</b>
            <span className="guide-dots" aria-label={`Шаг ${Math.min(step, 7) + 1} из 8`}>
              {Array.from({ length: 8 }, (_, i) => <i key={i} className={i < step ? 'done' : i === step ? 'on' : ''} />)}
            </span>
          </div>
          <p>{rich(st.text)}</p>
          <div className="guide-actions">
            {st.action && <Btn small kind="primary" onClick={st.action.run}>{rich(st.action.label)}</Btn>}
            {step < 7 && <button className="guide-skip" onClick={() => finishTutorial(false)}>Пропустить</button>}
            {step === 0 && online() && platform().kind !== 'telegram' && <button className="guide-skip" onClick={() => openSheet({ kind: 'login' })}>Уже играю в Telegram — войти</button>}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
