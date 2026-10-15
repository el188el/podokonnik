import { useTheme } from './theme';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { D, H, MIN } from '../game/constants';
import { decodeGift, legacyGift } from '../game/gifts';
import { xpToNext } from '../game/progression';
import { claimPlusGift, debug, joinCoop, openSheet, setTab, showGift, toast, useStore, type Tab } from '../game/store';
import { loggedIn, playerId } from '../net/api';
import { platform } from '../platform';
import { Safe } from './kit/kit';
import { Popups } from './Popups';
import { Sheets } from './sheets/Sheets';
import { Friends } from './tabs/Friends';
import { Herbarium } from './tabs/Herbarium';
import { Profile } from './tabs/Profile';
import { Quests } from './tabs/Quests';
import { Shop } from './tabs/Shop';
import { SillView } from './tabs/SillView';
import { Icon, TONE, type IconName } from './kit/icons';
import { Emo, rich } from './kit/rich';

const TABS: [Tab, IconName, string][] = [
  ['sill', 'sill', 'Подоконник'],
  ['shop', 'shop', 'Магазин'],
  ['friends', 'friends', 'Друзья'],
  ['quests', 'quests', 'Задания'],
  ['herbarium', 'herbarium', 'Гербарий'],
];

// Панель отладки (перемотка времени, листики) есть только в тестовых сборках с VITE_DEBUG=1.
// В опубликованной игре её не включить ни ссылкой, ни иначе.
const isDebug = import.meta.env.VITE_DEBUG === '1' && new URLSearchParams(location.search).has('debug');

export function App() {
  const tab = useStore((s) => s.tab);
  const g = useStore((s) => s.game);
  const toasts = useStore((s) => s.toasts);
  const coopOn = useStore((s) => s.coopOn);
  useTheme();
  const questsReady = g.quests.list.some((q) => !q.claimed && q.progress >= q.target);
  // новая вкладка открывается с самого верха, а не там, где прокрутили прошлую
  const main = useRef<HTMLElement>(null);
  useEffect(() => { main.current?.scrollTo(0, 0); }, [tab]);

  // подарок по ссылке: ?g=… (веб), startapp (Telegram) или старый формат ?gift=…
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const gift = decodeGift(platform().startParam) ?? legacyGift(q);
    if (gift) {
      showGift(gift);
      const keep = new URLSearchParams();
      if (isDebug) keep.set('debug', '1');
      history.replaceState(null, '', location.pathname + (keep.toString() ? '?' + keep : '') + location.hash);
    } else if (g.pending.length) showGift({ ...g.pending[0], ok: true });
    const start = platform().startParam ?? q.get('start') ?? '';
    if (/^v[0-9a-f-]{36}$/.test(start) && start.slice(1) !== playerId()) openSheet({ kind: 'visit', id: start.slice(1), name: 'друга' });
    if (/^p[A-Za-z0-9]{12}$/.test(start)) {
      const code = start.slice(1);
      let tries = 0;
      const go = () => (loggedIn() ? claimPlusGift(code) : ++tries < 20 ? setTimeout(go, 500) : toast('Подарок можно забрать, когда есть интернет'));
      go();
    }
    if (/^c[A-Za-z0-9]{10}$/.test(start)) {
      // вход на сервер идёт параллельно — ждём токен и вступаем
      const code = start.slice(1);
      let tries = 0;
      const go = () => (loggedIn() ? joinCoop(code) : ++tries < 20 ? setTimeout(go, 500) : toast('Общий подоконник работает, когда есть интернет'));
      go();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <button className="lvl-ring" onClick={() => openSheet({ kind: 'levels' })} aria-label={`Уровень ${g.level}: ${g.xp} из ${xpToNext(g.level)} опыта`}>
          <svg viewBox="0 0 40 40" aria-hidden>
            <circle cx="20" cy="20" r="17" className="ring-bg" />
            <circle cx="20" cy="20" r="17" className="ring-fg" strokeDasharray={`${Math.max(0.02, Math.min(1, g.xp / xpToNext(g.level))) * 106.8} 106.8`} />
          </svg>
          <b>{g.level}</b>
        </button>
        {tab === 'sill' ? <SillPicker /> : <div className="title">Подоконник</div>}
        <div className="money">
          {g.level < 10 && tab === 'sill' && (
            <button className="help-btn" onClick={() => openSheet({ kind: 'howto' })} aria-label="Как играть"><Icon name="help" size={22} /></button>
          )}
          <LeafCounter n={g.leaves} />
          <button className="me" onClick={() => setTab('profile')} aria-label="Профиль"><Icon name="user" size={22} /></button>
        </div>
      </header>

      <main ref={main} className={'content' + (tab === 'sill' && !coopOn ? ' fixed' : '')}>
        <Safe key={tab} label={tab}>
        {tab === 'sill' && <SillView />}
        {tab === 'shop' && <Shop />}
        {tab === 'herbarium' && <Herbarium />}
        {tab === 'quests' && <Quests />}
        {tab === 'profile' && <Profile />}
        {tab === 'friends' && <Friends />}
        </Safe>
      </main>

      {isDebug && (
        <div className="debug">
          <button onClick={() => debug.skip(2 * MIN)}>+2 мин</button>
          <button onClick={() => debug.skip(H)}>+1 ч</button>
          <button onClick={() => debug.skip(12 * H)}>+12 ч</button>
          <button onClick={() => debug.skip(D)}>+1 день</button>
          <button onClick={debug.adult}>Взрослые</button>
          <button onClick={debug.cramp}>Тесно</button>
          <button onClick={debug.fill}>Заполнить</button>
          <button onClick={debug.rich}>+1000 <Emo e="🍃" /></button>
          <button onClick={debug.decor}>Декор</button>
          <button onClick={debug.older}>+30 дн. возраста</button>
          <button onClick={debug.reset}>Сброс</button>
        </div>
      )}

      <nav className="tabbar">
        {TABS.map(([k, icon, label]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); platform().haptic('select'); }}>
            {tab === k && <motion.span layoutId="tab-pill" className="tab-pill" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
            <span className="ti"><Icon name={icon} size={24} stroke={tab === k ? 2.4 : 2} /></span>
            <span className="tl">{rich(label)}</span>
            {k === 'quests' && questsReady && <i className="dot" />}
          </button>
        ))}
      </nav>

      <Sheets />
      <Popups />
      <div className="toasts">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div key={t.id} className="toast" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}>
              {rich(t.text)}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

/** Листики в шапке: при пополнении счётчик подпрыгивает и показывает «+N». */
function LeafCounter({ n }: { n: number }) {
  const prev = useRef(n);
  const [gain, setGain] = useState<{ id: number; v: number } | null>(null);
  useEffect(() => {
    const d = n - prev.current;
    prev.current = n;
    if (d > 0) setGain({ id: Date.now(), v: d });
  }, [n]);
  return (
    <span className="leaves">
      <motion.span key={gain?.id ?? 0} className="leaves-n" initial={gain ? { scale: 1.35 } : false} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 14 }}>{n}</motion.span>
      <Icon name="leaf" size={18} tone={TONE.leaf} />
      <AnimatePresence>
        {gain && (
          <motion.b key={gain.id} className="leaves-gain" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 18 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} onAnimationComplete={() => setTimeout(() => setGain((x) => (x?.id === gain.id ? null : x)), 700)}>
            +{gain.v}
          </motion.b>
        )}
      </AnimatePresence>
    </span>
  );
}

/** В шапке — какой подоконник открыт; по нажатию — выбрать другой. */
function SillPicker() {
  const g = useStore((s) => s.game);
  const coop = useStore((s) => s.coops?.find((c) => c.id === s.coopOn));
  const sill = g.sills.find((s) => s.id === g.activeSill) ?? g.sills[0];
  return (
    <button className="sill-picker" onClick={() => openSheet({ kind: 'sills' })}>
      <span>{rich(coop ? `💞 ${coop.state.name}` : sill.name)}</span>
      <Icon name="chevron" size={18} />
    </button>
  );
}

