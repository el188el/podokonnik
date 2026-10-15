// Поделиться растением: фото в сторис, таймлапс роста или открытка с подоконника.

import { potSizeOf } from '../../game/sim';
import { sp } from '../../game/species';
import { closeSheet, openSheet, useStore } from '../../game/store';
import { PlantArt } from '../art/PlantArt';
import { Btn } from '../kit/kit';
import { sharePlantStory } from '../story';

export function ShareSheet({ id }: { id: string }) {
  const p = useStore((s) => s.game.plants.find((x) => x.id === id));
  if (!p) return null;
  const name = p.nick || sp(p.sp).name;
  const opts = [
    { icon: '📷', title: 'Фото в сторис', text: 'Красивая карточка с растением', run: () => { closeSheet(); sharePlantStory(p, p.blooming ? 'Зацвело! 🌸' : p.stage === 4 ? 'Совсем взрослое!' : 'Расту!', name); } },
    { icon: '🎬', title: 'Таймлапс', text: 'Видео: от черенка до сегодняшнего дня', run: () => openSheet({ kind: 'timelapse', plant: p.id }) },
    { icon: '💌', title: 'Открытка', text: 'Весь подоконник на открытке с маркой и подписью', run: () => openSheet({ kind: 'postcard' }) },
  ];
  return (
    <div className="share-sheet">
      <div className="share-head">
        <PlantArt sp={p.sp} form={p.form} hue={p.hue} stage={p.stage} seed={p.id} pot={p.pot} size={potSizeOf(p)} shape={p.shape} blooming={p.blooming} className="mini" />
        <h2>Поделиться: {name}</h2>
      </div>
      <div className="list">
        {opts.map((o) => (
          <button key={o.title} className="row-item share-opt" onClick={o.run}>
            <div className="ricon">{o.icon}</div>
            <div className="rtext"><b>{o.title}</b><span className="muted small">{o.text}</span></div>
            <span className="muted">›</span>
          </button>
        ))}
      </div>
      <Btn kind="ghost" onClick={closeSheet}>Закрыть</Btn>
    </div>
  );
}
