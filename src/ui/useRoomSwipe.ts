// Свайп влево-вправо по комнате — переход в соседнюю комнату (и на общие подоконники).

import { useRef } from 'react';
import { setActiveSill, showCoop, toast, useStore } from '../game/store';

/** Куда листали в последний раз: -1 — назад, 1 — вперёд (для анимации появления). */
export const swipeDir = { v: 0 };

type Room = { kind: 'sill'; id: string; name: string } | { kind: 'coop'; id: number; name: string };

function rooms(): Room[] {
  const s = useStore.getState();
  return [
    ...s.game.sills.map((x): Room => ({ kind: 'sill', id: x.id, name: x.name })),
    ...(s.coops ?? []).map((c): Room => ({ kind: 'coop', id: c.id, name: c.state.name })),
  ];
}

function go(step: number) {
  const s = useStore.getState();
  const list = rooms();
  if (list.length < 2) { toast('Другая комната откроется в магазине: «Подоконники» 🪟'); return; }
  const cur = s.coopOn != null ? list.findIndex((r) => r.kind === 'coop' && r.id === s.coopOn) : list.findIndex((r) => r.kind === 'sill' && r.id === s.game.activeSill);
  const next = list[(Math.max(0, cur) + step + list.length) % list.length];
  swipeDir.v = step;
  if (next.kind === 'coop') showCoop(next.id);
  else { showCoop(null); setActiveSill(next.id); }
}

/** Обработчики касаний для контейнера комнаты. */
export function useRoomSwipe() {
  const st = useRef<{ x: number; y: number; at: number; skip: boolean } | null>(null);
  return {
    onTouchStart: (e: React.TouchEvent) => {
      const tch = e.touches[0];
      const target = e.target as Element;
      // не мешаем перетаскиванию котика, декора и прокрутке полочек
      const skip = e.touches.length > 1 || useStore.getState().arrange || !!target.closest('.live-cat, .cat, .decor-drag, .stash, .tray-list, .care-menu, input, .info-strip');
      st.current = { x: tch.clientX, y: tch.clientY, at: Date.now(), skip };
    },
    onTouchEnd: (e: React.TouchEvent) => {
      const s0 = st.current;
      st.current = null;
      if (!s0 || s0.skip) return;
      const tch = e.changedTouches[0];
      const dx = tch.clientX - s0.x, dy = tch.clientY - s0.y;
      if (Date.now() - s0.at > 700 || Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx) * 0.6) return;
      go(dx < 0 ? 1 : -1);
    },
  };
}
