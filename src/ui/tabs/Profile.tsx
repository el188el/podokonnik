import { useState } from 'react';
import { WINDOWS } from '../../game/constants';
import { rankOf, xpToNext } from '../../game/progression';
import { ITEM_BY_ID, DECOR_IDS } from '../../game/shop';
import { fmt } from '../../game/sim';
import { ageDays } from '../../game/age';
import { isPlus, logoutTelegram, redeemPromo, sendSupport, toast, now, openSheet, setName, setSetting, setTitle, startOver, toggleDecor, useStore } from '../../game/store';
import { platform } from '../../platform';
import { CONFIG } from '../../config';
import { linkedAccount, online, sendSettings } from '../../net/api';
import { Bar, Btn } from '../kit/kit';
import { Icon } from '../kit/icons';
import { Emo, rich } from '../kit/rich';

export function Profile() {
  const g = useStore((s) => s.game);
  const [name, setN] = useState(g.name);
  const t = now();
  const neighbor = g.neighbor && t < g.neighbor.until;
  const pf = platform();
  const stats: [string, number][] = [
    ['💧 Поливов', g.stats.waters],
    ['🪴 Посажено', g.stats.planted],
    ['🌿 Выращено взрослых', g.stats.adults],
    ['✂️ Черенков', g.stats.cuts],
    ['🎁 Подарено', g.stats.giftsSent],
    ['💌 Получено', g.stats.giftsGot],
    ['🌸 Цветений', g.stats.blooms],
    ['🚑 Спасено', g.stats.rescues],
    ['🎂 Старейшее растение, дней', Math.max(0, ...g.plants.map((p) => ageDays(p, t)))],
  ];
  return (
    <div className="tab profile">
      <div className="tab-head">
        <h1>Профиль</h1>
      </div>

      <section className="panel">
        <label className="lbl" htmlFor="nm">Как тебя зовут</label>
        <input id="nm" className="inp" maxLength={24} value={name} placeholder="Имя для подарков" onChange={(e) => setN(e.target.value)} onBlur={() => setName(name)} />
        <p className="lvl" onClick={() => openSheet({ kind: 'levels' })}>{rich(rankOf(g.level).icon)} {rich(rankOf(g.level).title)} · <Emo e="⭐" /> Уровень {g.level}{isPlus(g) && <span className="plus-badge"> · <Emo e="🌟" /> Садовник+</span>}</p>
        <Bar value={g.xp / xpToNext(g.level)} label={`${g.xp}/${xpToNext(g.level)} опыта`} />
        {(g.titles ?? []).length > 0 && (
          <div className="titles">
            <small className="muted">Звания сезонов — нажми, чтобы выбрать:</small>
            <div>{(g.titles ?? []).map((x) => <button key={x} className={'title-chip' + (g.title === x ? ' on' : '')} onClick={() => setTitle(x)}><Emo e="🏅" /> {rich(x)}</button>)}</div>
          </div>
        )}
      </section>
      {online() && <Account />}


      <section className="panel">
        <h3><Emo e="🏠" /> Настоящие растения</h3>
        <p className="muted small">Двойники твоих домашних цветов: бот напомнит о поливе, а двойник подрастёт.</p>
        <Btn onClick={() => openSheet({ kind: 'twins' })}>Открыть ({(g.twins ?? []).length})</Btn>
      </section>

      <section className="panel">
        <h3><Emo e="👵" /> Соседка польёт</h3>
        <p className="muted small">{rich(neighbor ? `Поливает ещё ${fmt(g.neighbor!.until - t)}` : 'Уезжаешь? Растения не засохнут.')}</p>
        <Btn onClick={() => openSheet({ kind: 'neighbor' })}>{rich(neighbor ? 'Управлять' : 'Попросить соседку')}</Btn>
      </section>

      <section className="panel">
        <h3><Emo e="🪟" /> Подоконники и декор</h3>
        {g.sills.map((s) => (
          <div key={s.id} className="sill-set">
            <div className="sill-head">
              <b>{rich(s.name)}</b>
              <button className="chip" onClick={() => openSheet({ kind: 'window', sill: s.id })}>
                Окно: {rich(s.window ? WINDOWS[s.window].short : 'не выбрано')}
              </button>
            </div>
            <div className="chips">
              {DECOR_IDS.filter((d) => (g.owned[d] ?? 0) > 0).map((d) => (
                <button key={d} className={'chip' + (s.decor.includes(d) ? ' on' : '')} onClick={() => toggleDecor(s.id, d)}>
                  {rich(ITEM_BY_ID[d].icon)} {rich(ITEM_BY_ID[d].name)}
                </button>
              ))}
              {!DECOR_IDS.some((d) => (g.owned[d] ?? 0) > 0) && <span className="muted small">Декор продаётся в магазине.</span>}
            </div>
          </div>
        ))}
      </section>

      <section className="panel">
        <h3><Emo e="📊" /> Статистика</h3>
        <div className="stats">
          {stats.map(([k, v]) => (
            <div key={k}><span>{rich(k)}</span><b>{v}</b></div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h3><Emo e="⚙️" /> Настройки</h3>
        <div className="theme-row">
          <span><Emo e="🌙" /> Тема</span>
          <div className="seg">
            {([['auto', 'Как в системе'], ['light', '☀️ Светлая'], ['dark', '🌙 Тёмная']] as const).map(([k, label]) => (
              <button key={k} className={(g.settings.theme ?? 'auto') === k ? 'on' : ''} onClick={() => setSetting('theme', k)}>{rich(label)}</button>
            ))}
          </div>
        </div>
        <label className="toggle">
          <input type="checkbox" checked={g.settings.haptics} onChange={(e) => setSetting('haptics', e.target.checked)} /> Вибрация
        </label>
        {pf.kind === 'telegram' && online() && (
          <label className="toggle">
            <input type="checkbox" checked={g.settings.notify !== false} onChange={(e) => { setSetting('notify', e.target.checked); sendSettings({ notify: e.target.checked }); }} /> Напоминания от бота
          </label>
        )}
        <Btn onClick={() => openSheet({ kind: 'howto' })}><Icon name="help" size={18} className="inl" /> Как играть</Btn>
        {CONFIG.channel && <Btn onClick={() => pf.openLink(`https://t.me/${CONFIG.channel}`)}><Emo e="📢" /> Канал игры: советы по растениям</Btn>}
        {pf.kind !== 'discord' && <Btn onClick={() => openSheet({ kind: 'weather' })}><Emo e="🌦" /> Погода за окном: {rich(g.settings.place ? g.settings.place.city : 'выключена')}</Btn>}
        {pf.kind === 'web' && <Btn onClick={() => openSheet({ kind: 'install' })}><Emo e="📲" /> Добавить на главный экран</Btn>}
        <p className="muted small">
          {rich(online() ? 'Прогресс сохраняется на сервере и доступен на всех устройствах.' : pf.kind === 'telegram' ? 'Прогресс сохраняется в облаке Telegram и доступен на всех устройствах.' : 'Прогресс сохраняется в этом браузере.')}
        </p>
        <StartOver />
      </section>

      {online() && <Help />}
    </div>
  );
}

/** Промокод и «Написать в поддержку»: сообщение становится обращением, ответ придёт от бота. */
function Help() {
  const pf = platform();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [sent, setSent] = useState(false);
  const redeem = async () => {
    if (!code.trim() || busy) return;
    setBusy(true);
    const err = await redeemPromo(code.trim());
    setBusy(false);
    if (err) toast(err);
    else setCode('');
  };
  const send = async () => {
    if (!msg.trim() || busy) return;
    setBusy(true);
    const ok = await sendSupport(msg.trim());
    setBusy(false);
    if (ok) { setMsg(''); setSent(true); } else toast('Не отправилось. Попробуй ещё раз или напиши боту');
  };
  return (
    <section className="panel">
      <h3><Emo e="🎟️" /> Промокод</h3>
      <div className="promo-row">
        <input value={code} maxLength={32} placeholder="Например, ОСЕНЬ" onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && redeem()} />
        <Btn small kind="primary" disabled={!code.trim() || busy} onClick={redeem}>Активировать</Btn>
      </div>
      <h3><Emo e="💌" /> Написать в поддержку</h3>
      {pf.kind === 'telegram' ? (
        <div className="support-box">
          {sent ? (
            <p className="small"><Emo e="✅" /> Сообщение отправлено! Ответ придёт в чат с ботом игры.</p>
          ) : (
            <>
              <textarea value={msg} maxLength={2000} placeholder="Что случилось? Опиши, пожалуйста, подробнее" onChange={(e) => setMsg(e.target.value)} />
              <Btn kind="primary" disabled={!msg.trim() || busy} onClick={send}>Отправить</Btn>
            </>
          )}
          {CONFIG.tgBot && <p className="muted small">Можно и просто написать боту <a href={`https://t.me/${CONFIG.tgBot}`} onClick={(e) => { e.preventDefault(); pf.openLink(`https://t.me/${CONFIG.tgBot}`); }}>@{CONFIG.tgBot}</a> — фото и скриншоты тоже дойдут.</p>}
        </div>
      ) : CONFIG.tgBot ? (
        <Btn onClick={() => pf.openLink(`https://t.me/${CONFIG.tgBot}`)}><Emo e="💌" /> Написать боту @{rich(CONFIG.tgBot)}</Btn>
      ) : null}
    </section>
  );
}

function Account() {
  const pf = platform();
  const acc = linkedAccount();
  const [sure, setSure] = useState(false);
  if (pf.kind === 'telegram') {
    return (
      <section className="panel">
        <h3><Emo e="👤" /> Аккаунт</h3>
        <p className="small">Это твой подоконник в Telegram. Он же откроется в браузере, на Android и в Discord — нажми там в профиле «Войти через Telegram».</p>
        {CONFIG.siteUrl && <Btn onClick={() => pf.openLink(CONFIG.siteUrl)}><Emo e="🌐" /> Открыть в браузере</Btn>}
      </section>
    );
  }
  return (
    <section className="panel">
      <h3><Emo e="👤" /> Аккаунт</h3>
      {acc ? (
        <>
          <p className="small"><Emo e="✅" /> Вошли через Telegram как <b>{rich(acc.username ? '@' + acc.username : acc.name)}</b>. Подоконник один на всех устройствах.</p>
          <Btn kind={sure ? 'warn' : 'ghost'} onClick={() => (sure ? logoutTelegram() : setSure(true))}>{rich(sure ? 'Точно выйти? Нажми ещё раз' : 'Выйти из аккаунта')}</Btn>
        </>
      ) : (
        <>
          <p className="small">Сейчас прогресс хранится только здесь. Войди через Telegram — и подоконник будет один везде: в Telegram, браузере, на Android и в Discord.</p>
          <Btn kind="primary" onClick={() => openSheet({ kind: 'login' })}><Emo e="✈️" /> Войти через Telegram</Btn>
        </>
      )}
    </section>
  );
}

function StartOver() {
  const [step, setStep] = useState(0);
  if (step === 0) return <button className="linkish muted small" onClick={() => setStep(1)}>Начать сначала…</button>;
  return (
    <div className="card-note">
      <span className="small">{rich(step === 1 ? 'Все растения, листики и уровень пропадут. Подписка «Садовник+» и купленные места останутся.' : 'Точно? Вернуть будет нельзя.')}</span>
      <Btn small kind="warn" onClick={() => (step === 1 ? setStep(2) : (startOver(), setStep(0)))}>{rich(step === 1 ? 'Да, начать сначала' : 'Точно, стереть всё')}</Btn>
      <Btn small kind="ghost" onClick={() => setStep(0)}>Отмена</Btn>
    </div>
  );
}
