// Падающие жетоны сезона: время от времени через подоконник пролетает листик
// (снежинка, ягодка…). Успел тапнуть — +1 жетон в пропуск и +1 опыт.

import { useEffect, useState } from 'react';
import { activeEvent } from '../game/events';
import { catchesLeft, catchToken, now, useStore } from '../game/store';
import { rich } from './kit/rich';

interface Drop { id: number; x: number; dur: number; sway: number }

let seq = 0;

export function FallingTokens() {
  const tab = useStore((s) => s.tab);
  const [drops, setDrops] = useState<Drop[]>([]);
  const [pops, setPops] = useState<{ id: number; x: number; y: number }[]>([]);
  const e = activeEvent(now());

  useEffect(() => {
    if (!e || tab !== 'sill') return;
    let timer: ReturnType<typeof setTimeout>;
    const plan = (first = false) => {
      timer = setTimeout(() => {
        const st = useStore.getState();
        if (!document.hidden && !st.sheet && !st.popups.length && catchesLeft(st.game) > 0) {
          const d = { id: ++seq, x: 8 + Math.random() * 78, dur: 6 + Math.random() * 3, sway: Math.random() < 0.5 ? -1 : 1 };
          setDrops((list) => [...list, d]);
          setTimeout(() => setDrops((list) => list.filter((x) => x.id !== d.id)), d.dur * 1000 + 200);
        }
        plan();
      }, first ? 8000 : 25000 + Math.random() * 35000);
    };
    plan(true);
    return () => clearTimeout(timer);
  }, [e?.id, tab]);

  if (!e) return null;
  return (
    <div className="falling-layer" aria-hidden>
      {drops.map((d) => (
        <button
          key={d.id}
          className={'falling-token sway-' + (d.sway > 0 ? 'r' : 'l')}
          style={{ left: `${d.x}%`, animationDuration: `${d.dur}s` }}
          onPointerDown={(ev) => {
            const r = (ev.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
            const pop = { id: d.id, x: ev.clientX - r.left, y: ev.clientY - r.top };
            setDrops((list) => list.filter((x) => x.id !== d.id));
            if (catchToken()) {
              setPops((p) => [...p, pop]);
              setTimeout(() => setPops((p) => p.filter((x) => x.id !== pop.id)), 1200);
            }
          }}
        >
          {rich(e.token)}
        </button>
      ))}
      {pops.map((p) => <span key={p.id} className="catch-pop" style={{ left: p.x, top: p.y }}>+1 {rich(e.token)} · +1 опыт</span>)}
    </div>
  );
}
