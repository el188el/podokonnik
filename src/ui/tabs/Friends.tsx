import { useEffect, useState } from 'react';
import { plural } from '../../game/sim';
import { VISIT_DAY_LIMIT, VISIT_HOST_LIMIT, VISIT_REWARD } from '../../game/social';
import { openSheet, useStore } from '../../game/store';
import * as api from '../../net/api';
import { Btn } from '../kit/kit';
import { Market } from './Market';
import { Contest } from './Contest';
import { shareInvite, shareVacation } from '../share';

function seen(ms: number) {
  const m = Math.floor(ms / 60e3);
  if (m < 10) return 'сейчас в игре';
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч назад`;
  const d = Math.floor(h / 24);
  return `${d} ${plural(d, 'день', 'дня', 'дней')} назад`;
}

export function Friends() {
  const name = useStore((s) => s.game.name);
  const [mode, setMode] = useState<'friends' | 'market' | 'contest'>('friends');
  const [list, setList] = useState<api.Friend[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!api.loggedIn()) return;
    let alive = true;
    const load = () => api.friends().then((f) => alive && (setList(f), setError(false))).catch(() => alive && setError(true));
    load();
    const t = setInterval(load, 60e3);
    return () => { alive = false; clearInterval(t); };
  }, []);

  return (
    <div className="tab">
      <div className="tab-head">
        <h1>Друзья</h1>
        {list && <span className="muted">{list.length}</span>}
      </div>

      {api.online() && api.loggedIn() && (
        <div className="segment">
          <button className={mode === 'friends' ? 'on' : ''} onClick={() => setMode('friends')}>👯 Друзья</button>
          <button className={mode === 'market' ? 'on' : ''} onClick={() => setMode('market')}>🔄 Барахолка</button>
          <button className={mode === 'contest' ? 'on' : ''} onClick={() => setMode('contest')}>🏆 Конкурс</button>
        </div>
      )}
      {mode === 'contest' && api.loggedIn() ? <Contest /> : mode === 'market' && api.loggedIn() ? <Market /> : <>
      <section className="panel invite">
        <h3>👯 Позови друзей</h3>
        <p className="muted small">Друг получит +30 🍃 на первые черенки, а ты +50 🍃. Подаренный черенок тоже делает вас друзьями.</p>
        <Btn kind="gold" onClick={shareInvite}>Пригласить друга</Btn>
      </section>

      {!api.online() || !api.loggedIn() ? (
        <section className="panel">
          <p className="muted">Друзья появятся, когда игра подключится к серверу. Проверь интернет и открой игру ещё раз.</p>
        </section>
      ) : (
        <>
          <section className="panel">
            <h3>🧳 Уезжаешь?</h3>
            <p className="muted small">Попроси друзей присмотреть за подоконником: они зайдут в гости и польют тех, кто хочет пить.</p>
            <Btn onClick={() => shareVacation(name)}>Попросить полить</Btn>
          </section>

          <section className="panel">
            <h3>Подоконники друзей</h3>
            <p className="muted small">
              Полей растение у друга — получишь +{VISIT_REWARD} 🍃. До {VISIT_HOST_LIMIT} растений у одного друга и {VISIT_DAY_LIMIT} в день.
            </p>
            {error && <p className="muted">Не получилось загрузить список. Попробуем ещё раз через минуту.</p>}
            {!list && !error && <p className="muted">Загружаем…</p>}
            {list?.length === 0 && <p className="muted">Пока никого. Пригласи друга или подари черенок — и здесь появится его подоконник.</p>}
            <div className="friends">
              {list?.map((f) => (
                <button key={f.id} className="friend" onClick={() => openSheet({ kind: 'visit', id: f.id, name: f.name })}>
                  <span className="avatar">{f.name.slice(0, 1).toUpperCase()}</span>
                  <span className="fbody">
                    <b>{f.plus ? '🌟 ' : ''}{f.name}</b>
                    <span className="muted small">⭐ {f.level} · 🪴 {f.plants} · {seen(Date.now() - f.lastSeen)}</span>
                  </span>
                  {f.thirsty > 0 ? <span className="thirsty">💧 {f.thirsty}</span> : <span className="muted small">в гости →</span>}
                </button>
              ))}
            </div>
          </section>
        </>
      )}
      </>}
    </div>
  );
}
