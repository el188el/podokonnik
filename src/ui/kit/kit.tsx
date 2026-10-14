import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, type ReactNode } from 'react';
import { platform } from '../../platform';

export function Sheet({ open, onClose, children, wide }: { open: boolean; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    platform().setBack(onClose);
    return () => platform().setBack(null);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            className={'sheet' + (wide ? ' wide' : '')}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            dragListener={false}
          >
            <div className="grip" />
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    platform().setBack(onClose);
    return () => platform().setBack(null);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="backdrop center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            className="modal"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
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
      {label && <span>{label}</span>}
    </div>
  );
}

export function Btn({ children, onClick, kind = 'soft', disabled, small }: { children: ReactNode; onClick?: () => void; kind?: 'primary' | 'soft' | 'warn' | 'ghost' | 'gold'; disabled?: boolean; small?: boolean }) {
  return (
    <motion.button whileTap={disabled ? undefined : { scale: 0.96 }} className={`btn ${kind}${small ? ' small' : ''}`} onClick={onClick} disabled={disabled}>
      {children}
    </motion.button>
  );
}

export const Leaves = ({ n }: { n: number }) => (
  <span className="leaves">
    {n} <span aria-label="листиков">🍃</span>
  </span>
);
