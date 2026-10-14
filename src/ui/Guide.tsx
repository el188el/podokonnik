// Обучение: соседка Валентина Петровна ведёт новичка по первым шагам.
// Шаги продвигаются сами, когда игрок делает нужное действие.

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { finishTutorial, openSheet, setTool, setTutorial, TUTORIAL_DONE, useStore } from '../game/store';
import { Btn } from './kit/kit';

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

  const steps: Record<number, Step> = {
    0: {
      text: 'Здравствуй! Я Валентина Петровна, соседка. Сорок лет цветы ращу — научу и тебя. Давай заведём тебе подоконник!',
      action: { label: 'Давайте 🌿', run: () => setTutorial(1) },
    },
    1: {
      text: 'Сначала скажи, куда смотрит твоё окно. От этого зависит, сколько света достанется цветам.',
      action: { label: 'Выбрать окно', run: () => openSheet({ kind: 'window', sill: sill.id, then: 'picker', slot: 0 }) },
    },
    2: {
      text: 'Держи черенок от меня в подарок! Выбирай любой — все трое неприхотливые.',
      action: { label: 'Выбрать черенок', run: () => openSheet({ kind: 'picker', slot: 0, sill: sill.id }) },
    },
    3: { text: 'Черенок стоит в стакане. Тапни по нему — нальём водички, и он начнёт пускать корни.' },
    4: {
      text: 'Пару минут подождём корешков. А пока запоминай: верхний ряд — у стекла, там светло. Нижний — столик в глубине, там тень. Каждому цветку — своё место.',
    },
    5: { text: 'Корешки есть! Тапни по стакану — посадим в настоящий горшок.' },
    6: {
      text: 'Под подоконником — инструменты: лейка, опрыскиватель, подкормка, ножницы. Полоска под горшком — влажность земли: покраснела — пора поливать.',
      action: { label: 'Понятно', run: () => { setTool('water'); setTutorial(7); } },
    },
    7: {
      text: 'Вот ты и садовод! Держи на новоселье листики и белый горшок. Заходи каждый день — я буду рядом, а растения будут тебя ждать 🌿',
      action: { label: 'Спасибо!', run: () => finishTutorial(true) },
    },
  };
  const st = steps[step] ?? steps[0];

  return (
    <AnimatePresence mode="wait">
      <motion.div key={step} className="guide" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
        <div className="guide-avatar">👵</div>
        <div className="guide-body">
          <b>Валентина Петровна</b>
          <p>{st.text}</p>
          <div className="guide-actions">
            {st.action && <Btn small kind="primary" onClick={st.action.run}>{st.action.label}</Btn>}
            {step < 7 && <button className="guide-skip" onClick={() => finishTutorial(false)}>Пропустить</button>}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
