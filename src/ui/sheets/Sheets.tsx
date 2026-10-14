import { useState } from 'react';
import { LIGHT_NAME, NEIGHBOR_FREE_DAYS, NOTES, WINDOWS } from '../../game/constants';
import { fmt, plural } from '../../game/sim';
import { DIFFICULTY_LABEL, SPECIES, STARTERS, sp } from '../../game/species';
import {
  chooseWindow, closeSheet, giftCutting, now, openSheet, placeCutting, plantCutting, setTab, startNeighbor, stopNeighbor, useStore,
} from '../../game/store';
import type { WindowSide } from '../../game/types';
import { formsOf } from '../../game/products';
import { hueOf, PALETTES } from '../../game/breeding';
import { PlantArt } from '../art/PlantArt';
import { Btn, Safe, Sheet } from '../kit/kit';
import { shareGift } from '../share';
import { PlantCard } from './PlantCard';
import { Visit } from './Visit';
import { EventSheet } from './EventSheet';
import { TwinsSheet } from './TwinsSheet';
import { WeatherSheet } from './WeatherSheet';
import { StarterSheet } from './StarterSheet';

export function Sheets() {
  const sheet = useStore((s) => s.sheet);
  return (
    <Sheet open={!!sheet} onClose={closeSheet} wide={sheet?.kind === 'visit'}>
      <Safe key={sheet?.kind} label={sheet?.kind}>
      {sheet?.kind === 'card' && <PlantCard id={sheet.plant} />}
      {sheet?.kind === 'picker' && <Picker slot={sheet.slot} sill={sheet.sill} />}
      {sheet?.kind === 'window' && <WindowPick sill={sheet.sill} then={sheet.then} slot={sheet.slot} />}
      {sheet?.kind === 'send' && <CuttingSheet id={sheet.cutting} />}
      {sheet?.kind === 'herb' && <Herb id={sheet.sp} />}
      {sheet?.kind === 'neighbor' && <Neighbor />}
      {sheet?.kind === 'install' && <Install />}
      {sheet?.kind === 'visit' && <Visit key={sheet.id} id={sheet.id} name={sheet.name} />}
      {sheet?.kind === 'event' && <EventSheet />}
      {sheet?.kind === 'twins' && <TwinsSheet />}
      {sheet?.kind === 'weather' && <WeatherSheet />}
      {sheet?.kind === 'starter' && <StarterSheet />}
      </Safe>
    </Sheet>
  );
}

// ─────────────── выбор растения на пустое место ───────────────
function Picker({ slot, sill }: { slot: number; sill: string }) {
  const g = useStore((s) => s.game);
  const newbie = g.plants.length === 0 && g.cuttings.length === 0;
  return (
    <div>
      <h2>{newbie ? 'Выбери первое растение' : 'Что поставим сюда?'}</h2>
      {newbie && <p className="muted">Начнём с неубиваемых. Черенок встанет в стакан с водой — налей воды, и через пару минут появятся корни.</p>}
      {g.cuttings.length > 0 && (
        <>
          <h3>✂️ Черенки в запасе</h3>
          <div className="grid">
            {g.cuttings.map((c) => (
              <button key={c.id} className="pick" onClick={() => { plantCutting(c.id, sill, slot); closeSheet(); }}>
                <PlantArt sp={c.sp} form={c.form} hue={c.hue} stage={0} />
                <b>{sp(c.sp).name}</b>
              </button>
            ))}
          </div>
        </>
      )}
      {newbie && (
        <div className="grid">
          {STARTERS.map((id) => {
            const s = sp(id);
            return (
              <button key={id} className="pick" onClick={() => { placeCutting(id, sill, slot); closeSheet(); }}>
                <PlantArt sp={id} stage={4} seed="pick" />
                <b>{s.name}</b>
                <span className="muted small">{s.speed} · полив раз в {s.waterDays} {plural(s.waterDays, 'день', 'дня', 'дней')}</span>
              </button>
            );
          })}
        </div>
      )}
      {!newbie && (
        <>
          <p className="muted">Новые черенки — в магазине или от взрослых растений. А ещё их дарят друзья 🎁</p>
          <Btn kind="primary" onClick={() => setTab('shop')}>🛒 В магазин</Btn>
        </>
      )}
    </div>
  );
}

// ─────────────── сторона окна ───────────────
function WindowPick({ sill, then, slot = 0 }: { sill: string; then?: 'picker'; slot?: number }) {
  const g = useStore((s) => s.game);
  const cur = g.sills.find((s) => s.id === sill)?.window;
  const pick = (w: WindowSide) => {
    chooseWindow(sill, w);
    if (then === 'picker') openSheet({ kind: 'picker', slot, sill });
    else closeSheet();
  };
  return (
    <div>
      <h2>Куда смотрит твоё окно?</h2>
      <p className="muted">Так растения поймут, где светлее. Можно выбрать как дома — тогда игра научит ухаживать по-настоящему.</p>
      <div className="wingrid">
        {(['N', 'E', 'S', 'W'] as WindowSide[]).map((w) => (
          <button key={w} className={'chip big' + (cur === w ? ' on' : '')} onClick={() => pick(w)}>
            {{ N: '⬆️', E: '➡️', S: '⬇️', W: '⬅️' }[w]} {WINDOWS[w].short}
            <small>у стекла: {LIGHT_NAME[WINDOWS[w].glass]}</small>
          </button>
        ))}
      </div>
      <Btn onClick={() => pick('E')}>🤷 Не знаю (будет восток)</Btn>
      <p className="muted small">Солнце заглядывает утром — восток, днём — юг, вечером — запад, почти никогда — север. Зимой везде темнее.</p>
    </div>
  );
}

// ─────────────── черенок: посадить или подарить ───────────────
function CuttingSheet({ id }: { id: string }) {
  const g = useStore((s) => s.game);
  const c = g.cuttings.find((x) => x.id === id);
  const [name, setName] = useState(g.name);
  const [note, setNote] = useState(1);
  const [sent, setSent] = useState<string | null>(null);
  if (!c && !sent) return null;
  if (sent) {
    return (
      <div className="center">
        <div className="gicon">💌</div>
        <h2>Черенок отправлен!</h2>
        <p className="muted">Когда друг заберёт его, у тебя будет повод показать друг другу подоконники. Если ссылка не ушла — вот она:</p>
        <div className="soon linkbox">{sent}</div>
        <Btn kind="ghost" onClick={closeSheet}>Готово</Btn>
      </div>
    );
  }
  const s = sp(c!.sp);
  const send = async () => {
    const from = name.trim().replace(/\s+/g, ' ');
    if (!from) return;
    const r = giftCutting(c!.id, from, note);
    if (!r) return;
    setSent(r.link);
    await shareGift(r.gift, r.link);
  };
  return (
    <div>
      <div className="postcard">
        <PlantArt sp={c!.sp} form={c!.form} hue={c!.hue} stage={0} className="mid" />
        <div>
          <h2>{c!.seed ? 'Семечко' : 'Черенок'} {s.gen}</h2>
          {c!.hue && <p className="small"><span className="hue-dot" style={{ background: hueOf(c!.sp, c!.hue)?.color }} /> цветы: {hueOf(c!.sp, c!.hue)?.name}{hueOf(c!.sp, c!.hue)?.rare ? ' 🌈 редкость' : ''}</p>}
          <p className="muted small">Поставь в воду у себя или подари другу — он посадит его на свой подоконник.</p>
        </div>
      </div>
      <Btn kind="primary" onClick={() => { plantCutting(c!.id); closeSheet(); }}>🫙 Поставить в воду у себя</Btn>
      <h3>🎁 Подарить другу</h3>
      <label className="lbl" htmlFor="from">От кого</label>
      <input id="from" className="inp" maxLength={24} placeholder="Твоё имя" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="lbl">Пожелание</div>
      <div className="notes">
        {Object.entries(NOTES).map(([k, v]) => (
          <button key={k} className={'chip' + (+k === note ? ' on' : '')} onClick={() => setNote(+k)}>{v}</button>
        ))}
      </div>
      <Btn kind="gold" disabled={!name.trim()} onClick={send}>📤 Отправить подарок</Btn>
      <p className="muted small center">Друг получит открытку. Если игры у него ещё нет — она откроется прямо по ссылке.</p>
    </div>
  );
}

// ─────────────── гербарий: карточка вида ───────────────
function Herb({ id }: { id: string }) {
  const g = useStore((s) => s.game);
  const s = sp(id);
  const known = g.discovered.includes(id);
  const grown = g.grownAdult.includes(id);
  return (
    <div>
      <div className="card-head">
        <PlantArt sp={id} stage={4} seed="herb" blooming={!!s.bloom} className={'big' + (known ? '' : ' unknown')} />
        <div>
          <h2>{known ? s.name : '???'}</h2>
          {known && <p className="muted small"><i>{s.latin}</i>{s.folk ? ` · «${s.folk}»` : ''}</p>}
          <p className="small">{DIFFICULTY_LABEL[s.difficulty]} · откроется с {s.unlockLevel} ур.</p>
          {grown && <p className="giftmark">🏅 Выращено до взрослого</p>}
        </div>
      </div>
      {known ? (
        <>
          <table className="care">
            <tbody>
              <tr><td>💧 Полив</td><td>раз в {s.waterDays} {plural(s.waterDays, 'день', 'дня', 'дней')}{s.drought >= 5 ? ', терпит засуху' : ''}</td></tr>
              <tr><td>☀️ Свет</td><td>{LIGHT_NAME[s.light[0]]}{s.light[1] !== s.light[0] ? ` — ${LIGHT_NAME[s.light[1]]}` : ''}</td></tr>
              <tr><td>💦 Опрыскивание</td><td>{s.mist === 'love' ? 'любит' : s.mist === 'ok' ? 'всё равно' : 'вредно'}</td></tr>
              <tr><td>🌊 Перелив</td><td>{s.overwater === 'sensitive' ? 'боится' : s.overwater === 'tolerant' ? 'переносит' : 'не любит'}</td></tr>
              <tr><td>⏱ Рост</td><td>{s.speed}</td></tr>
              {s.bloom && <tr><td>🌸 Цветение</td><td>{s.bloom.months ? s.bloom.months.map((m) => ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'][m - 1]).join(', ') : 'круглый год'}{s.bloom.needsRest ? ' — после зимнего покоя' : ''}</td></tr>}
            </tbody>
          </table>
          <ul className="facts">{s.facts.map((f) => <li key={f}>{f}</li>)}</ul>
          {PALETTES[id] && (
            <div className="palette">
              <b className="small">🎨 Цвета цветков: {1 + (g.hues?.[id] ?? []).filter((h) => h !== PALETTES[id][0].id).length}/{PALETTES[id].length}</b>
              <div>
                {PALETTES[id].map((h, i) => {
                  const got = i === 0 || (g.hues?.[id] ?? []).includes(h.id);
                  return <span key={h.id} className={'hue-dot big' + (got ? '' : ' unknown-hue')} style={{ background: got ? h.color : undefined }} title={got ? h.name : '???'} />;
                })}
              </div>
              <p className="muted small">Новые цвета выводятся опылением двух цветущих растений.</p>
            </div>
          )}
          {formsOf(id).length > 0 && (
            <div className="forms-row">
              {formsOf(id).map((f) => (
                <div key={f.id} className={'form-chip' + ((g.forms ?? []).includes(f.id) ? ' got' : '')}>
                  <PlantArt sp={id} form={f.id} stage={4} seed="herb" blooming className={(g.forms ?? []).includes(f.id) ? '' : 'unknown'} />
                  <span>{(g.forms ?? []).includes(f.id) ? '✨ ' + f.name : '✨ ???'}</span>
                </div>
              ))}
            </div>
          )}
          <div className="soon">
            <p><b>Уход по-настоящему:</b> {s.care}</p>
            <p><b>Купить:</b> {s.buy}</p>
            <p><b>Бесплатно:</b> {s.free}</p>
          </div>
        </>
      ) : (
        <p className="muted">Этот вид ещё не открыт. Купи черенок в магазине, получи в подарок или дорасти до {s.unlockLevel} уровня.</p>
      )}
      <Btn kind="ghost" onClick={closeSheet}>Закрыть</Btn>
    </div>
  );
}

// ─────────────── соседка польёт ───────────────
function Neighbor() {
  const g = useStore((s) => s.game);
  const t = now();
  const active = g.neighbor && t < g.neighbor.until;
  const cooldown = g.neighbor && t < g.neighbor.cooldownUntil && !active;
  const [days, setDays] = useState(NEIGHBOR_FREE_DAYS);
  return (
    <div>
      <div className="gicon">👵</div>
      <h2 className="center">Соседка польёт</h2>
      <p className="muted center">Уезжаешь? Валентина Петровна будет поливать все растения, пока тебя нет. Никто не засохнет.</p>
      {active ? (
        <>
          <p className="center"><b>Поливает ещё {fmt(g.neighbor!.until - t)}</b></p>
          <Btn kind="primary" onClick={() => startNeighbor(7, true)}>Продлить на неделю · {(g.owned.neighbor7 ?? 0) > 0 ? 'есть в запасе' : '60 🍃'}</Btn>
          <Btn kind="ghost" onClick={() => { stopNeighbor(); closeSheet(); }}>Я вернулся(ась), спасибо!</Btn>
        </>
      ) : (
        <>
          {!cooldown && (
            <>
              <div className="chips center">
                {[1, 2, 3].map((d) => (
                  <button key={d} className={'chip' + (d === days ? ' on' : '')} onClick={() => setDays(d)}>
                    {d} {plural(d, 'день', 'дня', 'дней')}
                  </button>
                ))}
              </div>
              <Btn kind="primary" onClick={() => { if (startNeighbor(days, false)) closeSheet(); }}>Попросить бесплатно</Btn>
            </>
          )}
          {cooldown && <p className="muted center small">Бесплатно соседка выручает раз в неделю. Снова можно через {fmt(g.neighbor!.cooldownUntil - t)}.</p>}
          <Btn kind="gold" onClick={() => { if (startNeighbor(7, true)) closeSheet(); }}>На целую неделю · {(g.owned.neighbor7 ?? 0) > 0 ? 'есть в запасе' : '60 🍃'}</Btn>
        </>
      )}
    </div>
  );
}

// ─────────────── установка на главный экран (веб) ───────────────
function Install() {
  return (
    <div>
      <h2>Подоконник на главный экран</h2>
      <p className="muted">Так игра будет открываться как приложение, одним тапом, и работать без интернета.</p>
      <p><b>Chrome / Яндекс Браузер:</b></p>
      <ol className="steps"><li>Нажми меню ⋮</li><li>Выбери «Добавить на главный экран» или «Установить приложение».</li></ol>
      <p><b>Safari на iPhone:</b></p>
      <ol className="steps"><li>Нажми «Поделиться» ⬆️</li><li>Выбери «На экран „Домой“».</li></ol>
      <p><b>Samsung Internet:</b></p>
      <ol className="steps"><li>Нажми меню ≡</li><li>«Добавить страницу на» → «Главный экран».</li></ol>
      <Btn kind="ghost" onClick={closeSheet}>Понятно</Btn>
    </div>
  );
}

export const SPECIES_COUNT = SPECIES.length;
