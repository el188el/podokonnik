import { useEffect, useState } from 'react';
import { plural } from '../../game/sim';
import { VISIT_DAY_LIMIT, VISIT_HOST_LIMIT, VISIT_REWARD } from '../../game/social';
import { openSheet, useStore } from '../../game/store';
import * as api from '../../net/api';
import { Btn } from '../kit/kit';
import { Icon, Money, TONE } from '../kit/icons';
import { Market } from './Market';
import { Contest } from './Contest';
import { InviteLadder } from './InviteLadder';
import { shareVacation } from '../share';
import { CONFIG } from '../../config';
import { platform } from '../../platform';
import { rich } from '../kit/rich';
import { formsProgress, rareScore } from '../../game/rarity';

function seen(ms: number) {
  const m = Math.floor(ms / 60e3);
  if (m < 10) return 'сейчас в игре';
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч назад`;
  const d = Math.floor(h / 24);
  return `${d} ${plural(d, 'день', 'дня', 'дней')} назад`;
}

/** Кто из друзей собрал больше редкостей: формы и редкие цвета. */
function RareBoard({ list }: { list: api.Friend[] }) {
  const g = useStore((s) => s.game);
  const me = { id: 'me', name: 'Ты', rare: rareScore(g) };
  const rows = [me, ...list.map((f) => ({ id: f.id, name: f.name, rare: f.rare ?? 0 }))].sort((a, b) => b.rare - a.rare);
  const place = rows.findIndex((r) => r.id === 'me');
  const top = rows.slice(0, 5);
  const show = place < 5 ? top : [...top.slice(0, 4), rows[place]];
  const { got, total } = formsProgress(g);
  return (
    <section className="panel rare-board">
      <h3 className="ih3"><Icon name="sparkles" size={20} tone="#8b5cc7" />Коллекционеры редкостей</h3>
      <p className="muted small">Очки за редкие формы (1, 3 и 10 за легендарную) и редкие цвета цветков (по 2). У тебя форм: {got} из {total}.</p>
      <ol>
        {show.map((r) => {
          const i = rows.indexOf(r);
          return (
            <li key={r.id} className={r.id === 'me' ? 'rb-me' : ''}>
              <span className="rb-place">{i < 3 ? rich(['🥇', '🥈', '🥉'][i]) : i + 1}</span>
              <span className="rb-name">{rich(r.name)}</span>
              <b className="rb-pts">{r.rare}</b>
            </li>
          );
        })}
      </ol>
    </section>
  );
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

      {CONFIG.tgBot && (
        <button className="chat-plant-card" onClick={() => platform().openLink(`https://t.me/${CONFIG.tgBot}?startgroup=plant`)}>
          <span className="cpc-icon"><Icon name="chat" size={26} tone={TONE.share} /></span>
          <span className="cpc-text">
            <b>Растение для группового чата</b>
            <small>Добавь бота в чат друзей, семьи или коллег — поливайте общее растение вместе. Каждый полив — <Money n={3} plus size={13} /> тебе в игру</small>
          </span>
          <span className="cpc-go"><Icon name="plus" size={22} /></span>
        </button>
      )}

      {api.online() && api.loggedIn() && (
        <div className="segment">
          <button className={mode === 'friends' ? 'on' : ''} onClick={() => setMode('friends')}><Icon name="friends" size={17} /> Друзья</button>
          <button className={mode === 'market' ? 'on' : ''} onClick={() => setMode('market')}><Icon name="market" size={17} /> Барахолка</button>
          <button className={mode === 'contest' ? 'on' : ''} onClick={() => setMode('contest')}><Icon name="trophy" size={17} /> Конкурс</button>
        </div>
      )}
      {mode === 'contest' && api.loggedIn() ? <Contest /> : mode === 'market' && api.loggedIn() ? <Market /> : <>
      <InviteLadder />

      {!api.online() || !api.loggedIn() ? (
        <section className="panel">
          <p className="muted">Друзья появятся, когда игра подключится к серверу. Проверь интернет и открой игру ещё раз.</p>
        </section>
      ) : (
        <>
          <section className="panel">
            <h3 className="ih3"><Icon name="luggage" size={20} tone={TONE.repot} />Уезжаешь?</h3>
            <p className="muted small">Попроси друзей присмотреть за подоконником: они зайдут в гости и польют тех, кто хочет пить.</p>
            <Btn onClick={() => shareVacation(name)}>Попросить полить</Btn>
          </section>

          <section className="panel">
            <h3>Подоконники друзей</h3>
            <p className="muted small">
              Полей растение у друга — получишь <Money n={VISIT_REWARD} plus size={13} />. До {VISIT_HOST_LIMIT} растений у одного друга и {VISIT_DAY_LIMIT} в день.
            </p>
            {error && <p className="muted">Не получилось загрузить список. Попробуем ещё раз через минуту.</p>}
            {!list && !error && <p className="muted">Загружаем…</p>}
            {list?.length === 0 && <p className="muted">Пока никого. Пригласи друга или подари черенок — и здесь появится его подоконник.</p>}
            <div className="friends">
              {list?.map((f) => (
                <button key={f.id} className="friend" onClick={() => openSheet({ kind: 'visit', id: f.id, name: f.name })}>
                  <span className="avatar">{rich(f.name.slice(0, 1).toUpperCase())}</span>
                  <span className="fbody">
                    <b>{f.plus && <Icon name="crown" size={15} tone="#e8a325" className="inl" />}{rich(f.name)}</b>
                    <span className="muted small fmeta"><Icon name="star" size={13} /> {f.level} · <Icon name="sill" size={13} /> {f.plants} · {rich(seen(Date.now() - f.lastSeen))}</span>
                  </span>
                  {f.thirsty > 0 ? <span className="thirsty"><Icon name="water" size={15} tone={TONE.water} /> {f.thirsty}</span> : <span className="muted small">в гости →</span>}
                </button>
              ))}
            </div>
          </section>
          {!!list?.length && <RareBoard list={list} />}
        </>
      )}
      </>}
    </div>
  );
}
