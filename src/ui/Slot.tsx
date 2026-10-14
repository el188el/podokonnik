import { motion } from 'framer-motion';
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { STAGE_NAME } from '../game/constants';
import { badLight, canCut, cramped, ctxFor, fmt, isSad, isLightSad, isThirstySad, nextStageAt, rootsAt } from '../game/sim';
import { SHOWOFF_MS } from '../game/constants';
import { sp } from '../game/species';
import { checkRound, feed, mist, now, openSheet, plantInPot, say, swap, takeCutting, toast, useStore, water } from '../game/store';
import { canCut as canCutNow } from '../game/sim';
import type { Plant } from '../game/types';
import { PlantArt } from './art/PlantArt';
import { roundInfo } from '../game/onboarding';
import { ageMark } from '../game/age';
import { PROBLEMS } from '../game/problems';

const lastEnough: Record<string, number> = {};

function bubbleFor(p: Plant, t: number, flash?: { text: string; until: number }) {
  const g = useStore.getState().game;
  const ctx = ctxFor(g, p, t);
  if (flash && flash.until > Date.now()) return { text: flash.text, cls: 'pop' };
  if (p.stage === 0 && p.rootStart) {
    const r = rootsAt(p)!;
    return { text: `🌱 ${fmt(Math.max(0, r - t))}`, cls: '' };
  }
  if (p.stage === 0) return { text: 'Налей воды 💧', cls: '' };
  if (p.stage === 1) return { text: (g.owned.pot ?? 0) > 0 ? 'Посади меня 🪴' : 'Нужен горшок 🪴', cls: 'ready' };
  if (p.moisture > 1) return { text: 'Перелили 😵', cls: '' };
  if (p.moisture < 0.25) return { text: isThirstySad(p) ? 'Мне грустно… 💧' : 'Хочу пить', cls: isThirstySad(p) ? 'sad' : '' };
  if (p.problem) return { text: `${PROBLEMS[p.problem.kind].icon} ${PROBLEMS[p.problem.kind].short}`, cls: 'sad' };
  const bad = badLight(p, t, ctx);
  if (bad === 'hot') return { text: isLightSad(p) ? 'Жарко на солнце 🥵' : 'Жарковато', cls: '' };
  if (bad === 'dark') return { text: isLightSad(p) ? 'Темновато… 🌥' : 'Темновато', cls: '' };
  if (cramped(p, t)) return { text: 'Тесно в горшке 🪴', cls: '' };
  if (p.from && !p.showoffDone && t - (p.claimedAt ?? p.createdAt) >= SHOWOFF_MS) return { text: '📸 Покажи', cls: 'ready' };
  if (canCut(p, t)) return { text: '✂️ Черенок', cls: 'ready' };
  return null;
}

/** Маленький таймер под горшком: сколько до следующей стадии. Название — в карточке. */
function timerFor(p: Plant, t: number): string | null {
  if (p.stage < 2 || p.stage >= 4) return null;
  const at = nextStageAt(p, t, ctxFor(useStore.getState().game, p, t));
  if (!at) return null;
  const ms = at - t;
  return `⏱ ${ms < 3600e3 ? fmt(ms) : ms < 48 * 3600e3 ? `${Math.ceil(ms / 3600e3)} ч` : `${Math.round(ms / 86400e3)} дн`}`;
}

export function etaFor(p: Plant, t: number) {
  const g = useStore.getState().game;
  if (p.stage === 0) return p.rootStart ? 'черенок пускает корни' : 'полей меня 💧';
  if (p.stage === 1) return 'тапни, чтобы посадить';
  if (p.stage < 4) {
    const at = nextStageAt(p, t, ctxFor(g, p, t));
    if (!at) return STAGE_NAME[p.stage];
    const ms = at - t;
    const left = ms < 3600e3 ? fmt(ms) : ms < 48 * 3600e3 ? `${Math.ceil(ms / 3600e3)} ч` : `${Math.round(ms / 86400e3)} дн`;
    return `${STAGE_NAME[p.stage + 1]} через ${left}`;
  }
  return p.blooming ? 'цветёт 🌸' : 'взрослое 🌿';
}

export function Slot({ plant: p, sill, slot }: { plant: Plant; sill: string; slot: number }) {
  const t = now();
  const flash = useStore((s) => s.flash[p.id]);
  const fx = useStore((s) => s.fx[p.id]);
  const ref = useRef<HTMLDivElement>(null);
  const st = useRef({ timer: 0 as unknown as ReturnType<typeof setTimeout>, lifted: false, pressed: false, x0: 0, y0: 0, dx: 0, dy: 0, id: -1 });

  // во время перетаскивания не даём странице прокручиваться
  useEffect(() => {
    const el = ref.current!;
    const block = (e: TouchEvent) => { if (st.current.lifted) e.preventDefault(); };
    el.addEventListener('touchmove', block, { passive: false });
    return () => el.removeEventListener('touchmove', block);
  }, []);

  const s = sp(p.sp);
  const bubble = bubbleFor(p, t, flash);
  const round = useStore((st) => st.game.round);
  const meter = useStore((st) => (st.game.owned.meter ?? 0) > 0);
  const ri = p.stage >= 2 ? roundInfo(useStore.getState().game, t) : null;
  const roundPending = !!ri && !ri.done && !(round?.key === ri.key && round.checked.includes(p.id));
  const sad = isSad(p);
  const fresh = fx && Date.now() - fx.at < 1400;
  const age = ageMark(p, t);

  function reset() {
    clearTimeout(st.current.timer);
    st.current.lifted = false;
    st.current.pressed = false;
    const el = ref.current;
    if (el) {
      el.classList.remove('press', 'lift');
      el.style.removeProperty('--dx');
      el.style.removeProperty('--dy');
    }
    document.querySelectorAll('.cell.target').forEach((c) => c.classList.remove('target'));
  }

  function tap() {
    checkRound(p.id);
    if (p.stage === 1) return plantInPot(p.id);
    if (p.stage === 0 && p.rootStart) return say(p.id, 'Пускаю корни… 🌱', 1600);
    const tool = useStore.getState().tool;
    if (tool === 'look') return openSheet({ kind: 'card', plant: p.id });
    if (p.stage === 0) return water(p.id); // в стакан можно только налить воды
    const again = Date.now() - (lastEnough[p.id] ?? 0) < 1800;
    if (tool === 'mist') {
      const ok = mist(p.id, again);
      if (!ok && sp(p.sp).mist === 'no' && !again) lastEnough[p.id] = Date.now();
      else delete lastEnough[p.id];
      return;
    }
    if (tool === 'feed') return feed(p.id);
    if (tool === 'cut') {
      if (!canCutNow(p, now())) return say(p.id, p.stage < 4 ? 'Я ещё маленькое ✂️' : 'Черенок пока не готов', 1800);
      const c = takeCutting(p.id);
      if (c) openSheet({ kind: 'send', cutting: c });
      return;
    }
    const r = water(p.id, again);
    if (r === 'enough') lastEnough[p.id] = Date.now();
    else delete lastEnough[p.id];
    if (r === 'enough' && !again) toast('Земля ещё влажная. Тапни ещё раз, если всё равно хочешь полить');
  }

  return (
    <div
      ref={ref}
      className={`slot${age?.frame ? ' gold' : ''}${sad ? ' sad' : ''}${p.moisture > 0.6 && p.stage >= 2 ? ' wet' : ''}${p.stage >= 2 && p.moisture <= 0 ? ' dry' : ''}`}
      role="button"
      aria-label={`${s.name}, ${STAGE_NAME[p.stage]}`}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        const c = st.current;
        c.x0 = e.clientX; c.y0 = e.clientY; c.dx = 0; c.dy = 0; c.id = e.pointerId; c.pressed = true; c.lifted = false;
        ref.current!.classList.add('press');
        c.timer = setTimeout(() => {
          c.lifted = true;
          ref.current?.classList.remove('press');
          ref.current?.classList.add('lift');
          try { ref.current?.setPointerCapture(c.id); } catch { /* ignore */ }
          navigator.vibrate?.(12);
        }, 420);
      }}
      onPointerMove={(e) => {
        const c = st.current;
        if (e.pointerId !== c.id || !c.pressed) return;
        c.dx = e.clientX - c.x0; c.dy = e.clientY - c.y0;
        if (!c.lifted) {
          if (Math.abs(c.dx) > 10 || Math.abs(c.dy) > 10) { clearTimeout(c.timer); c.pressed = false; ref.current?.classList.remove('press'); }
          return;
        }
        const el = ref.current!;
        el.style.setProperty('--dx', c.dx + 'px');
        el.style.setProperty('--dy', c.dy + 'px');
        document.querySelectorAll('.cell.target').forEach((x) => x.classList.remove('target'));
        el.style.pointerEvents = 'none';
        const under = document.elementFromPoint(e.clientX, e.clientY)?.closest('.cell[data-slot]');
        el.style.pointerEvents = '';
        if (under && Number((under as HTMLElement).dataset.slot) !== slot) under.classList.add('target');
      }}
      onPointerUp={(e) => {
        const c = st.current;
        const { lifted, pressed } = c;
        let target = slot;
        if (lifted) {
          const el = ref.current!;
          el.style.pointerEvents = 'none';
          const cell = document.elementFromPoint(e.clientX, e.clientY)?.closest('.cell[data-slot]') as HTMLElement | null;
          el.style.pointerEvents = '';
          if (cell) target = Number(cell.dataset.slot);
        }
        reset();
        if (lifted) {
          if (target !== slot) swap(p.id, sill, target);
          else { checkRound(p.id); openSheet({ kind: 'card', plant: p.id }); }
        } else if (pressed) tap();
      }}
      onPointerCancel={reset}
    >
      {bubble && bubble.cls !== 'pop' && (
        <motion.div key={bubble.text.startsWith('🌱 ') ? 'roots' : bubble.text} className={`bubble ${bubble.cls}`} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          {bubble.text}
        </motion.div>
      )}
      {bubble && bubble.cls === 'pop' && <Speech anchor={ref} text={bubble.text} />}
      {p.stage === 0 && !p.rootStart && <div className="finger">👆</div>}
      {roundPending && <div className="round-dot" title="загляни в обходе">👀</div>}
      {p.problem && <div className={'pest pest-' + p.problem.kind} style={{ opacity: 0.45 + 0.55 * p.problem.sev }}>{p.problem.kind === 'gnats' ? <><i /><i /><i /></> : null}</div>}
      {meter && p.stage >= 2 && <div className={'meter-chip' + (p.moisture > 1 ? ' over' : p.moisture < 0.25 ? ' low' : '')}>💧{Math.round(p.moisture * 100)}%</div>}
      {p.boostUntil && t < p.boostUntil && <div className="boost-glow" />}
      {age && age.days >= 30 && <div className="age-badge" title={age.title}>{age.icon}</div>}
      <motion.div
        className="art"
        key={p.stage}
        initial={p.stage > 0 ? { scale: 0.85 } : false}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 9, stiffness: 160 }}
      >
        <PlantArt sp={p.sp} form={p.form} hue={p.hue} stage={p.stage} seed={p.id} pot={p.pot} bigPot={p.bigPot} blooming={p.blooming} className="plant-svg" />
      </motion.div>
      {fresh && fx.kind === 'water' && (
        <div className="fx" key={fx.at}>
          {[0, 1, 2, 3, 4].map((k) => <span key={k} className="drop" style={{ left: 22 + k * 17, animationDelay: k * 0.07 + 's' }}>💧</span>)}
          <span className="plus">+💧</span>
        </div>
      )}
      {fresh && fx.kind === 'mist' && (
        <div className="fx" key={fx.at}>
          {[0, 1, 2, 3, 4, 5].map((k) => <span key={k} className="mist" style={{ left: 14 + k * 16, animationDelay: k * 0.06 + 's' }}>💦</span>)}
        </div>
      )}
      {fresh && (fx.kind === 'grow' || fx.kind === 'feed') && (
        <div className="fx" key={fx.at}>
          {[0, 1, 2, 3].map((k) => <span key={k} className="spark" style={{ left: 20 + k * 22, animationDelay: k * 0.1 + 's' }}>{fx.kind === 'feed' ? '🧪' : '✨'}</span>)}
        </div>
      )}
      <div className="label">
        {p.stage >= 2 && (
          <i className="meter" title="влажность">
            <i style={{ width: `${Math.min(100, p.moisture * 100)}%`, background: p.moisture > 1 ? '#d9822b' : p.moisture < 0.25 ? '#e0574f' : '#4aa3df' }} />
          </i>
        )}
        {timerFor(p, t) && <span className="timer-chip">{timerFor(p, t)}</span>}
      </div>
    </div>
  );
}

/** Реплика растения — облачко поверх всего интерфейса (не обрезается рамкой подоконника). */
function Speech({ anchor, text }: { anchor: RefObject<HTMLDivElement | null>; text: string }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  // пока открыто окно или всплывашка — растения молчат
  const covered = useStore((s) => !!s.sheet || s.popups.length > 0);
  useLayoutEffect(() => {
    const upd = () => {
      // ровно там, где у растения облачко состояния: по центру ячейки, у её верхнего края
      const r = anchor.current?.getBoundingClientRect();
      if (r) setPos({ x: Math.min(window.innerWidth - 74, Math.max(74, r.left + r.width / 2)), y: r.top + 2 });
    };
    upd();
    window.addEventListener('resize', upd);
    return () => window.removeEventListener('resize', upd);
  }, [anchor, text]);
  if (!pos || covered) return null;
  return createPortal(
    <motion.div className="speech" style={{ left: pos.x, top: pos.y, x: '-50%', originY: 1 }} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} key={text}>
      {text}
    </motion.div>,
    document.body,
  );
}
