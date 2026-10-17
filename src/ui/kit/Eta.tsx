import { useEffect, useRef, useState } from 'react';
import { fmt } from '../../game/sim';

/** Коротко для чипа под горшком: 12:30, 5 ч, 3 дн. */
const short = (ms: number) => (ms < 3600e3 ? fmt(ms) : ms < 48 * 3600e3 ? `${Math.ceil(ms / 3600e3)} ч` : `${Math.round(ms / 86400e3)} дн`);

/**
 * Таймер до следующей стадии. Когда время сразу сократилось (подкормка, стимулятор) —
 * быстро отщёлкивает вниз, чтобы было видно, сколько сэкономили. Если растение сейчас
 * ускорено (опрыскано) — рядом «×1,5», и таймер просто идёт быстрее.
 */
export function Eta({ ms, compact, speed = 1 }: { ms: number; compact?: boolean; speed?: number }) {
  const [shown, setShown] = useState(ms);
  const [skip, setSkip] = useState(false);
  const anim = useRef<{ from: number; at: number; raf: number } | null>(null);
  const target = useRef(ms);
  const last = useRef(ms);

  useEffect(() => {
    target.current = ms;
    const from = last.current;
    last.current = ms;
    if (from - ms > 2 * 60e3 && !anim.current) {
      setSkip(true);
      const a = { from, at: performance.now(), raf: 0 };
      anim.current = a;
      const step = (now: number) => {
        const k = Math.min(1, (now - a.at) / 1400);
        const e = 1 - (1 - k) ** 3;
        setShown(a.from + (target.current - a.from) * e);
        if (k < 1) a.raf = requestAnimationFrame(step);
        else { anim.current = null; setTimeout(() => setSkip(false), 700); }
      };
      a.raf = requestAnimationFrame(step);
    } else if (!anim.current) setShown(ms);
  }, [ms]);
  useEffect(() => () => { if (anim.current) cancelAnimationFrame(anim.current.raf); }, []);

  const fast = speed > 1.05;
  return (
    <span className={'eta' + (skip ? ' skip' : '') + (fast ? ' fast' : '')}>
      {skip || !compact ? fmt(shown) : short(shown)}
      {fast && <i className="eta-x">×{(Math.round(speed * 10) / 10).toString().replace('.', ',')}</i>}
    </span>
  );
}
