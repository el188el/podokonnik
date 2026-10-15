import { AnimatePresence, animate, motion, useMotionValue, type MotionValue } from 'framer-motion';
import { Component, useEffect, useRef, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import { platform } from '../../platform';
import { Icon, TONE } from './icons';
import { Emo } from './rich';
import { rich } from './rich';

// Окно открывается по отпусканию пальца, а следом браузер шлёт «клик» —
// он попадал в фон только что открытого окна и сразу закрывал его.
// Поэтому закрываем, только если и нажали, и отпустили именно на фоне.
let downOnBackdrop = false;
const backdropDown = (e: PointerEvent) => { downOnBackdrop = e.target === e.currentTarget; };
function guardedClose(e: MouseEvent, onClose: () => void) {
  if (e.target !== e.currentTarget || !downOnBackdrop) return;
  downOnBackdrop = false;
  onClose();
}

/**
 * На компьютере игра — колонка по центру, а вокруг фон. Клик по фону вне колонки
 * (и клавиша Esc) закрывает верхнее открытое окно. Стек — чтобы закрывалось только верхнее.
 */
const openStack: { current: () => void }[] = [];
let downOutside = false;
const outside = (t: EventTarget | null) => t instanceof Element && !t.closest('.app, .float-bubble');
if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', (e) => { downOutside = outside(e.target); }, true);
  document.addEventListener('click', (e) => {
    if (!downOutside || !outside(e.target)) return;
    downOutside = false;
    openStack[openStack.length - 1]?.current();
  }, true);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && openStack.length) openStack[openStack.length - 1].current();
  });
}
function useOutsideClose(open: boolean, onClose: () => void) {
  const ref = useRef(onClose);
  ref.current = onClose;
  useEffect(() => {
    if (!open) return;
    const entry = ref;
    openStack.push(entry);
    return () => { const i = openStack.lastIndexOf(entry); if (i >= 0) openStack.splice(i, 1); };
  }, [open]);
}

/**
 * Свайп вниз закрывает окно — с любого места, если окно прокручено до самого верха.
 * Слушаем touch-события напрямую (не pointer): браузер не отменяет их, когда начинает скролл.
 */
function useSwipeClose(open: boolean, onClose: () => void): [React.RefObject<HTMLDivElement | null>, MotionValue<number>] {
  const ref = useRef<HTMLDivElement>(null);
  const y = useMotionValue(0);
  useEffect(() => {
    const el = ref.current;
    if (!open || !el) return;
    y.set(0);
    let y0 = 0, x0 = 0, t0 = 0, decided = false, active = false;
    const skip = (t: EventTarget | null) => t instanceof Element && !!t.closest('input, textarea, select, .no-swipe, .stash, .pots, .size-pick, .partners');
    const start = (e: TouchEvent) => {
      if (e.touches.length !== 1 || skip(e.target)) { decided = true; active = false; return; }
      y0 = e.touches[0].clientY; x0 = e.touches[0].clientX; t0 = Date.now(); decided = false; active = false;
    };
    const move = (e: TouchEvent) => {
      const dy = e.touches[0].clientY - y0, dx = e.touches[0].clientX - x0;
      if (!decided) {
        if (Math.abs(dy) < 8 && Math.abs(dx) < 8) return;
        decided = true;
        active = dy > 0 && Math.abs(dy) > Math.abs(dx) * 1.2 && el.scrollTop <= 0;
      }
      if (!active) return;
      e.preventDefault();
      y.set(Math.max(0, dy));
    };
    const end = () => {
      if (!active) return;
      active = false;
      const dy = y.get();
      const speed = dy / Math.max(1, Date.now() - t0);
      if (dy > 110 || (dy > 40 && speed > 0.6)) onClose();
      else animate(y, 0, { type: 'spring', damping: 30, stiffness: 400 });
    };
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);
    return () => {
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', end);
      el.removeEventListener('touchcancel', end);
    };
  }, [open, onClose, y]);
  return [ref, y];
}

export function Sheet({ open, onClose, children, wide }: { open: boolean; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useOutsideClose(open, onClose);
  useEffect(() => {
    if (!open) return;
    platform().setBack(onClose);
    return () => platform().setBack(null);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onPointerDown={backdropDown} onClick={(e) => guardedClose(e, onClose)}>
          <motion.div
            className="sheet-slide"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            onClick={(e) => { if (e.target === e.currentTarget) guardedClose(e, onClose); }}
          >
            <SheetBody open={open} onClose={onClose} wide={wide}>{rich(children)}</SheetBody>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SheetBody({ open, onClose, wide, children }: { open: boolean; onClose: () => void; wide?: boolean; children: ReactNode }) {
  const [ref, y] = useSwipeClose(open, onClose);
  return (
    <motion.div ref={ref} className={'sheet' + (wide ? ' wide' : '')} style={{ y }} onClick={(e) => e.stopPropagation()}>
      <div className="grip" />
      {rich(children)}
    </motion.div>
  );
}

export function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  useOutsideClose(open, onClose);
  useEffect(() => {
    if (!open) return;
    platform().setBack(onClose);
    return () => platform().setBack(null);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="backdrop center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onPointerDown={backdropDown} onClick={(e) => guardedClose(e, onClose)}>
          <motion.div
            className="modal"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
          >
            {rich(children)}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Bar({ value, color, label }: { value: number; color?: string; label?: ReactNode }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="bar" aria-label={typeof label === 'string' ? label : undefined}>
      <div className="fill" style={{ width: `${v * 100}%`, background: color }} />
      {label && <span>{rich(label)}</span>}
    </div>
  );
}

export function Btn({ children, onClick, kind = 'soft', disabled, small }: { children: ReactNode; onClick?: () => void; kind?: 'primary' | 'soft' | 'warn' | 'ghost' | 'gold'; disabled?: boolean; small?: boolean }) {
  return (
    <motion.button whileTap={disabled ? undefined : { scale: 0.96 }} className={`btn ${kind}${small ? ' small' : ''}`} onClick={onClick} disabled={disabled}>
      {rich(children)}
    </motion.button>
  );
}

export const Leaves = ({ n }: { n: number }) => (
  <span className="leaves">
    {n} <Icon name="leaf" size={18} tone={TONE.leaf} />
  </span>
);

/** Если в одном окне что-то сломалось — показываем заглушку, а не пустой экран. */
export class Safe extends Component<{ children: ReactNode; label?: string }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch(e: unknown) {
    console.error(this.props.label ?? 'ui', e);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="center crash">
        <div className="gicon"><Emo e="🥀" /></div>
        <p>Здесь что-то сломалось. Растения в порядке — прогресс сохранён.</p>
        <Btn kind="primary" onClick={() => location.reload()}>Перезапустить</Btn>
      </div>
    );
  }
}
