import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
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

const TABS: [Tab, string, string][] = [
  ['sill', '🪴', 'Подоконник'],
  ['shop', '🛒', 'Магазин'],
  ['friends', '👯', 'Друзья'],
  ['quests', '🎯', 'Задания'],
  ['herbarium', '📖', 'Гербарий'],
];

const isDebug = new URLSearchParams(location.search).has('debug');

export function App() {
  const tab = useStore((s) => s.tab);
  const g = useStore((s) => s.game);
  const toasts = useStore((s) => s.toasts);
  const questsReady = g.quests.list.some((q) => !q.claimed && q.progress >= q.target);

  // подарок по ссылке: ?g=… (веб), startapp (Telegram) или старый формат ?gift=…
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const gift = decodeGift(platform().startParam) ?? legacyGift(q);
    if (gift) {
      showGift(gift);
      const keep = new URLSearchParams();
      if (q.has('debug')) keep.set('debug', '1');
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
        <div className="lvlbadge" onClick={() => openSheet({ kind: 'levels' })}>
          <b>{g.level}</b>
          <div className="xp"><div style={{ width: `${(g.xp / xpToNext(g.level)) * 100}%` }} /></div>
        </div>
        <div className="title">Подоконник</div>
        <div className="money">
          {g.streak.count > 0 && <span className="streak">🔥{g.streak.count}</span>}
          <span className="leaves">{g.leaves} 🍃</span>
          <button className="me" onClick={() => setTab('profile')} aria-label="Профиль">👤</button>
        </div>
      </header>

      <main className="content">
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
          <button onClick={debug.rich}>+1000 🍃</button>
          <button onClick={debug.decor}>Декор</button>
          <button onClick={debug.older}>+30 дн. возраста</button>
          <button onClick={debug.reset}>Сброс</button>
        </div>
      )}

      <nav className="tabbar">
        {TABS.map(([k, icon, label]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); platform().haptic('select'); }}>
            <span className="ti">{icon}</span>
            <span className="tl">{label}</span>
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
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
