import { useState } from 'react';
import { LIGHT_NAME, SHOWOFF_MS, STAGE_NAME, ZONE_NAME } from '../../game/constants';
import { FORM_BY_ID } from '../../game/products';
import { POTS } from '../../game/shop';
import { canCut, cramped, ctxFor, cutLeft, fmt, isSad, isThirstySad, lightLevel, need, nextStageAt, stageProgress } from '../../game/sim';
import { DIFFICULTY_LABEL, sp } from '../../game/species';
import {
  closeSheet, feed, mist, move, now, openSheet, ownsPot, plantInPot, removePlant, renamePlant, repot, setPot, takeCutting, toast, useStore, water,
} from '../../game/store';
import { PlantArt } from '../art/PlantArt';
import { Bar, Btn } from '../kit/kit';
import { shareShowoff, shareThanks } from '../share';

export function PlantCard({ id }: { id: string }) {
  const g = useStore((s) => s.game);
  const p = g.plants.find((x) => x.id === id);
  const [real, setReal] = useState(false);
  const [sure, setSure] = useState(false);
  const [pots, setPots] = useState(false);
  const [editing, setEditing] = useState(false);
  if (!p) return null;
  const t = now();
  const s = sp(p.sp);
  const ctx = ctxFor(g, p, t);
  const light = lightLevel(ctx.sill, p.zone, t, ctx.lamp);
  const next = nextStageAt(p, t, ctx);
  const potted = p.stage >= 2;
  const mistOn = p.mistUntil && t < p.mistUntil;
  const feedOn = p.feedUntil && t < p.feedUntil;
  const showoff = !!p.from && t - (p.claimedAt ?? p.createdAt) >= SHOWOFF_MS;

  return (
    <div className="card">
      <div className="card-head">
        <PlantArt sp={p.sp} form={p.form} stage={p.stage} seed={p.id} pot={p.pot} bigPot={p.bigPot} blooming={p.blooming} className={'big' + (isSad(p) ? ' sad' : '')} />
        <div>
          {editing ? (
            <input
              className="inp"
              autoFocus
              defaultValue={p.nick ?? ''}
              placeholder={s.name}
              maxLength={20}
              onBlur={(e) => { renamePlant(p.id, e.target.value); setEditing(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            />
          ) : (
            <h2 onClick={() => setEditing(true)}>
              {p.nick || s.name} <small className="edit">✏️</small>
            </h2>
          )}
          <p className="muted small">{p.nick ? s.name + ' · ' : ''}{s.folk ? `«${s.folk}» · ` : ''}{DIFFICULTY_LABEL[s.difficulty]}</p>
          {p.form && FORM_BY_ID[p.form] && <p className="rare-mark">✨ {FORM_BY_ID[p.form].name}</p>}
          {p.from && <p className="giftmark">🎁 Подарок от {p.from.name}</p>}
          <p className="stage-line">
            <b>{STAGE_NAME[p.stage]}</b>
            {p.blooming && ' · цветёт 🌸'}
          </p>
          {p.stage < 4 && (
            <Bar value={stageProgress(p, t)} label={p.stage === 1 ? 'пора сажать' : next ? `ещё ${fmt(next - t)}` : '…'} />
          )}
        </div>
      </div>

      <p className="need">💡 {need(p, t, ctx)}</p>

      {potted && (
        <div className="meters">
          <div>
            <span>💧 Влажность</span>
            <Bar value={Math.min(1, p.moisture)} color={p.moisture > 1 ? '#d9822b' : '#4aa3df'} />
          </div>
          <div>
            <span>❤️ Здоровье</span>
            <Bar value={p.health / 100} color={p.health < 40 ? '#e0574f' : p.health < 70 ? '#e8b043' : '#4caf6a'} />
          </div>
          <div className="light-line">
            ☀️ Свет: <b>{LIGHT_NAME[light]}</b> · нужно {LIGHT_NAME[s.light[0]]}
            {s.light[1] !== s.light[0] && ` — ${LIGHT_NAME[s.light[1]]}`}
          </div>
          {(mistOn || feedOn) && (
            <div className="boosts">
              {mistOn && <span>💦 бонус ещё {fmt(p.mistUntil! - t)}</span>}
              {feedOn && <span>🧪 подкормка ещё {fmt(p.feedUntil! - t)}</span>}
            </div>
          )}
        </div>
      )}

      <div className="actions">
        {p.stage === 1 && <Btn kind="primary" onClick={() => plantInPot(p.id)}>🪴 Посадить в горшок</Btn>}
        {p.stage === 0 && !p.rootStart && <Btn kind="primary" onClick={() => water(p.id)}>💧 Налить воды в стакан</Btn>}
        {potted && <Btn kind="primary" onClick={() => water(p.id)}>💧 Полить</Btn>}
        {potted && <Btn onClick={() => mist(p.id)}>💦 Опрыскать</Btn>}
        <Btn onClick={() => move(p.id, p.zone === 'glass' ? 'deep' : 'glass')}>{p.zone === 'glass' ? '↓ В глубину' : '↑ К стеклу'}</Btn>
        {potted && <Btn onClick={() => feed(p.id)}>🧪 Подкормить {(g.owned.feed ?? 0) > 0 ? `(${g.owned.feed})` : '· 15 🍃'}</Btn>}
      </div>
      <p className="muted small center">Сейчас: {ZONE_NAME[p.zone]}. {s.mist === 'love' ? s.mistTip : ''}</p>

      {p.stage === 4 && (
        <div className="block">
          {cramped(p, t) ? (
            <Btn kind="gold" onClick={() => repot(p.id)}>🏡 Пересадить в большой горшок {(g.owned.potL ?? 0) > 0 ? `(есть ${g.owned.potL})` : '· 25 🍃'}</Btn>
          ) : p.bigPot ? (
            <p className="muted small">🏡 Уже в большом горшке — черенки отрастают на 25% быстрее.</p>
          ) : null}
          {canCut(p, t) ? (
            <Btn kind="gold" onClick={() => { const c = takeCutting(p.id); if (c) openSheet({ kind: 'send', cutting: c }); }}>✂️ Взять черенок</Btn>
          ) : (
            <Btn disabled>
              ✂️ {isSad(p) ? (isThirstySad(p) ? 'Сначала полей: грустному не до черенков' : 'Сначала помоги ему: грустному не до черенков') : `Следующий черенок через ${fmt(cutLeft(p, t))}`}
            </Btn>
          )}
        </div>
      )}
      {p.stage > 0 && p.stage < 4 && <p className="muted small center">✂️ Черенки можно брать у взрослого растения.</p>}

      {p.from && (
        <div className="block">
          <Btn onClick={() => shareThanks(p.sp)}>Сказать спасибо {p.from.name} 🌱</Btn>
          {showoff && <Btn kind="primary" onClick={() => shareShowoff(p)}>📸 Показать дарителю, как подросло</Btn>}
        </div>
      )}

      {potted && (
        <div className="block">
          <Btn onClick={() => setPots(!pots)}>🎨 Горшок: {POTS[p.pot]?.name ?? 'Глиняный'}</Btn>
          {pots && (
            <div className="pots">
              {Object.keys(POTS).map((k) => (
                <button key={k} className={'pot-pick' + (p.pot === k ? ' on' : '')} onClick={() => (ownsPot(g, k) ? setPot(p.id, k) : toast('Этот горшок продаётся в магазине 🛒'))}>
                  <PlantArt sp={p.sp} stage={2} pot={k} seed={p.id} className="mini" />
                  <span>{ownsPot(g, k) ? POTS[k].name : '🔒 ' + POTS[k].name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <ul className="facts">
        {s.facts.map((x) => <li key={x}>{x}</li>)}
      </ul>

      <Btn onClick={() => setReal(!real)}>🌍 Вырастить по-настоящему</Btn>
      {real && (
        <div className="soon">
          <p><b>Уход:</b> {s.care}</p>
          <p><b>Купить:</b> {s.buy}. Цены примерные.</p>
          <p><b>Бесплатно:</b> попроси черенок у знакомых, соседей или на «Авито» в разделе «Отдам даром». Как укоренить: {s.free}</p>
        </div>
      )}

      <div className="block">
        <Btn kind={sure ? 'warn' : 'ghost'} onClick={() => (sure ? removePlant(p.id) : setSure(true))}>
          {sure ? 'Точно убрать? Нажми ещё раз' : 'Убрать с подоконника'}
        </Btn>
        <Btn kind="ghost" onClick={closeSheet}>Закрыть</Btn>
      </div>
    </div>
  );
}
