import { useState } from 'react';
import { BOOST_COOLDOWN, LIGHT_NAME, SHOWOFF_MS, STAGE_NAME, ZONE_NAME } from '../../game/constants';
import { FORM_BY_ID } from '../../game/products';
import { BREED_COOLDOWN, canBreed, hueOf } from '../../game/breeding';
import { POTS } from '../../game/shop';
import { canCut, cramped, ctxFor, cutLeft, fmt, isSad, isThirstySad, lightLevel, need, neighborsOf, nextStageAt, stageProgress } from '../../game/sim';
import { DIFFICULTY_LABEL, sp } from '../../game/species';
import {
  adsLeft, addDrain, boostBlock, boostPlant, breedPartners, drainTray, freshSoil, treat, closeSheet, feed, mist, pollinate, watchAd, move, now, openSheet, ownsPot, plantInPot, removePlant, renamePlant, setPot, takeCutting, toast, useStore, water,
} from '../../game/store';
import { adsAvailable } from '../../net/ads';
import { ageDays, ageMark, daysText, nextAgeMark } from '../../game/age';
import { PlantArt } from '../art/PlantArt';
import { PROBLEMS, cureFor } from '../../game/problems';
import { ITEM_BY_ID } from '../../game/shop';
import { chatter, moodOf } from '../../game/mood';
import { weatherAt } from '../../game/weather';
import { Bar, Btn } from '../kit/kit';
import { shareShowoff, shareThanks } from '../share';
import { sharePlantStory } from '../story';
import { genName, isHeirloom } from '../../game/lineage';
import type { Ancestor } from '../../game/types';

export function PlantCard({ id }: { id: string }) {
  const g = useStore((s) => s.game);
  const p = g.plants.find((x) => x.id === id);
  const [real, setReal] = useState(false);
  const [sure, setSure] = useState(false);
  const [pots, setPots] = useState(false);
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState<{ text: string; ask?: 'water' | 'mist' } | null>(null);
  if (!p) return null;
  const neighbours = g.plants.filter((x) => x.sill === p.sill).sort((a, b) => a.slot - b.slot);
  const idx = neighbours.findIndex((x) => x.id === p.id);
  const go = (d: number) => {
    const n = neighbours[(idx + d + neighbours.length) % neighbours.length];
    setNote(null);
    setSure(false);
    openSheet({ kind: 'card', plant: n.id });
  };
  const doWater = (insist = false) => {
    const before = p.moisture;
    const r = water(p.id, insist);
    if (r === 'watered') setNote({ text: `💧 Полито! Влажность ${Math.round(before * 100)}% → 100%` });
    else if (r === 'enough') setNote({ text: `Земля ещё влажная (${Math.round(before * 100)}%). Растение пока не хочет пить.`, ask: 'water' });
    else if (r === 'over') setNote({ text: '😵 Перелили. Теперь дай земле просохнуть.' });
    else if (r === 'rooting') setNote({ text: '💧 Налили воды в стакан — черенок пускает корни.' });
    else if (r === 'glass') setNote({ text: p.stage === 1 ? 'Корни уже есть — посади в горшок 🪴' : 'В стакане хватает воды.' });
  };
  const doMist = (insist = false) => {
    const ok = mist(p.id, insist);
    if (ok) setNote({ text: '💦 Опрыскано! 12 часов растёт быстрее.' });
    else if (sp(p.sp).mist === 'no' && !insist) setNote({ text: `⚠️ ${sp(p.sp).mistTip}`, ask: 'mist' });
    else setNote({ text: sp(p.sp).mistTip });
  };
  const t = now();
  const s = sp(p.sp);
  const ctx = ctxFor(g, p, t);
  const light = lightLevel(ctx.sill, p.zone, t, ctx.lamp, ctx.dim || ctx.tulle, ctx.shade);
  const next = nextStageAt(p, t, ctx);
  const potted = p.stage >= 2;
  const mistOn = p.mistUntil && t < p.mistUntil;
  const feedOn = p.feedUntil && t < p.feedUntil;
  const boostOn = p.boostUntil && t < p.boostUntil;
  const showoff = !!p.from && t - (p.claimedAt ?? p.createdAt) >= SHOWOFF_MS;
  const days = ageDays(p, t);
  const mark = ageMark(p, t);
  const nextMark = nextAgeMark(p, t);

  return (
    <div className="card">
      {neighbours.length > 1 && (
        <div className="card-nav">
          <button onClick={() => go(-1)} aria-label="Предыдущее растение">‹</button>
          <span className="muted small">{idx + 1} из {neighbours.length}</span>
          <button onClick={() => go(1)} aria-label="Следующее растение">›</button>
        </div>
      )}
      <div className="card-head">
        <PlantArt sp={p.sp} form={p.form} hue={p.hue} stage={p.stage} seed={p.id} pot={p.pot} bigPot={p.bigPot} blooming={p.blooming} className={'big' + (isSad(p) ? ' sad' : '') + (mark?.frame ? ' gold-frame' : '')} />
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
          {potted && (
            <button className="linkish story-link" onClick={() => sharePlantStory(p, p.blooming ? 'Зацвело! 🌸' : p.stage === 4 ? 'Совсем взрослое!' : 'Расту!', p.nick || s.name)}>📲 в сторис</button>
          )}
          <p className={'age-line' + (mark?.frame ? ' gold' : '')}>
            {mark?.icon ?? '🗓'} С тобой {days < 1 ? 'первый день' : daysText(days)}
            {nextMark && <span className="muted"> · до {nextMark.icon} ещё {daysText(nextMark.days - days)}</span>}
            {mark && mark.days >= 30 && <button className="linkish" onClick={() => sharePlantStory(p, `${daysText(days)} вместе`, p.nick || s.name, 'age')}>поделиться</button>}
          </p>
          <p className="stage-line">
            <b>{STAGE_NAME[p.stage]}</b>
            {p.blooming && ' · цветёт 🌸'}
          </p>
          {p.stage < 4 && (
            <Bar value={stageProgress(p, t)} label={p.stage === 1 ? 'пора сажать' : next ? `ещё ${fmt(next - t)}` : '…'} />
          )}
        </div>
      </div>

      {isHeirloom(p, t) && (
        <div className="heirloom">🏺 <b>Семейная реликвия</b><span>Год у тебя на подоконнике. Черенки от него — «потомки реликвии» с родословной.</span></div>
      )}
      {p.line?.length ? <Lineage line={p.line} /> : null}
      {potted && (() => {
        const m = moodOf(p, t, ctx);
        return <p className="mood-line">{m.icon} <b>{m.label}</b> · <i>«{chatter(p, t, ctx, weatherAt(g, t), (p.id.charCodeAt(0) + Math.floor(t / 600e3)) % 17 / 17)}»</i></p>;
      })()}
      {p.problem && (() => {
        const info = PROBLEMS[p.problem.kind];
        const cures = cureFor(p.problem.kind);
        return (
          <div className="problem-box">
            <div className="problem-head"><span className="problem-icon">{info.icon}</span><div><b>{info.name}</b><Bar value={p.problem.sev} color="#e0574f" label={p.problem.sev > 0.7 ? 'сильно' : p.problem.sev > 0.4 ? 'заметно' : 'только началось'} /></div></div>
            <p className="small"><b>Признаки:</b> {info.sign}</p>
            <p className="small"><b>Почему:</b> {info.cause}</p>
            <p className="small"><b>Что делать:</b> {info.heal}</p>
            {info.pest && <p className="small warn-text">⚠️ Переползает на соседей — лечи поскорее.</p>}
            <div className="actions">
              {cures.map((c) => {
                const it = ITEM_BY_ID[c];
                const have = g.owned[c] ?? 0;
                return <Btn key={c} small kind="gold" onClick={() => treat(p.id, c)}>{it.icon} {it.name} {have ? `(${have})` : `· ${it.price} 🍃`}</Btn>;
              })}
              {(p.problem.kind === 'burn' || p.problem.kind === 'leggy') && <Btn small onClick={() => move(p.id, p.zone === 'glass' ? 'deep' : 'glass')}>{p.zone === 'glass' ? '↓ Убрать от солнца' : '↑ Ближе к свету'}</Btn>}
            </div>
          </div>
        );
      })()}
      {!p.problem && <p className="need">💡 {need(p, t, ctx)}</p>}
      {potted && p.moisture > 1 && (
        <div className="problem-box over-box">
          <div className="problem-head"><span className="problem-icon">🌊</span><div><b>Перелив</b><p className="small">Вода стоит в горшке — корни задыхаются. {s.overwater === 'sensitive' ? `${s.name} от этого быстро гниёт.` : 'Если повторять, начнётся гниль и мошки.'}</p></div></div>
          <div className="actions">
            <Btn small onClick={() => drainTray(p.id)}>🫗 Слить из поддона</Btn>
            <Btn small kind="gold" onClick={() => freshSoil(p.id)}>🟫 В сухой грунт {(g.owned.soil ?? 0) > 0 ? `(${g.owned.soil})` : `· ${ITEM_BY_ID.soil.price} 🍃`}</Btn>
            {!p.drain && <Btn small onClick={() => addDrain(p.id)}>🪨 Дренаж {(g.owned.drain ?? 0) > 0 ? `(${g.owned.drain})` : `· ${ITEM_BY_ID.drain.price} 🍃`}</Btn>}
          </div>
          {!(g.owned.meter) && <p className="small muted">📟 Влагомер из магазина не даст залить мокрую землю.</p>}
        </div>
      )}
      {potted && (() => {
        const near = neighborsOf(g, p);
        const notes: string[] = [];
        if (ctx.shade) notes.push('🌳 Большой сосед затеняет — света меньше');
        if (ctx.repel) notes.push('🌸 Рядом взрослая герань — вредители заводятся реже');
        if (ctx.humid) notes.push('💨 Увлажнитель рядом — клещу неуютно');
        if (s.mist === 'love' && near.some((n) => sp(n.sp).mist === 'no')) notes.push(`⚠️ Опрыскивая, заденешь соседа: ${near.filter((n) => sp(n.sp).mist === 'no').map((n) => sp(n.sp).acc).join(', ')}`);
        const sick = near.filter((n) => n.problem && PROBLEMS[n.problem.kind].pest);
        if (sick.length) notes.push(`🐛 У соседа вредители — могут перебраться сюда`);
        return notes.length ? <div className="neighbors-note">{notes.map((x) => <span key={x} className="small">{x}</span>)}</div> : null;
      })()}

      {potted && (
        <div className="meters">
          <div>
            <span>💧 Влажность</span>
            <Bar value={Math.min(1, p.moisture)} color={p.moisture > 1 ? '#d9822b' : p.moisture < 0.25 ? '#e0574f' : '#4aa3df'} label={`${Math.round(p.moisture * 100)}%${p.moisture > 1 ? ' — перелив' : p.moisture < 0.25 ? ' — хочет пить' : p.moisture < 0.5 ? ' — можно поливать' : ''}`} />
          </div>
          <div>
            <span>❤️ Здоровье</span>
            <Bar value={p.health / 100} color={p.health < 40 ? '#e0574f' : p.health < 70 ? '#e8b043' : '#4caf6a'} />
          </div>
          <div className="light-line">
            ☀️ Свет: <b>{LIGHT_NAME[light]}</b> · нужно {LIGHT_NAME[s.light[0]]}
            {s.light[1] !== s.light[0] && ` — ${LIGHT_NAME[s.light[1]]}`}
            {ctx.dim && p.zone === 'glass' && ' · ☁️ сегодня пасмурно'}
            {ctx.sunny && s.light[1] === 4 && ' · ☀️ солнечный день — растёт быстрее'}
          </div>
          {(mistOn || feedOn || boostOn || p.drain) && (
            <div className="boosts">
              {mistOn && <span>💦 бонус ещё {fmt(p.mistUntil! - t)}</span>}
              {feedOn && <span>🧪 подкормка ещё {fmt(p.feedUntil! - t)}</span>}
              {boostOn && <span>⚡ стимулятор ещё {fmt(p.boostUntil! - t)}</span>}
              {p.drain && <span>🪨 с дренажом</span>}
            </div>
          )}
        </div>
      )}

      {note && (
        <div className="card-note">
          <span>{note.text}</span>
          {note.ask === 'water' && <Btn small kind="warn" onClick={() => doWater(true)}>Всё равно полить</Btn>}
          {note.ask === 'mist' && <Btn small kind="warn" onClick={() => doMist(true)}>Всё равно опрыскать</Btn>}
        </div>
      )}
      <div className="actions">
        {p.stage === 1 && <Btn kind="primary" onClick={() => plantInPot(p.id)}>🪴 Посадить в горшок</Btn>}
        {p.stage === 0 && !p.rootStart && <Btn kind="primary" onClick={() => doWater()}>💧 Налить воды в стакан</Btn>}
        {p.stage === 0 && !!p.rootStart && adsAvailable() && adsLeft(g) > 0 && (
          <Btn kind="gold" onClick={() => watchAd({ kind: 'root', plant: p.id })}>🎬 Ролик — и корни сразу</Btn>
        )}
        {potted && <Btn kind={p.moisture < 0.5 ? 'primary' : 'soft'} onClick={() => doWater()}>💧 Полить</Btn>}
        {potted && <Btn onClick={() => doMist()}>💦 Опрыскать</Btn>}
        <Btn onClick={() => move(p.id, p.zone === 'glass' ? 'deep' : 'glass')}>{p.zone === 'glass' ? '↓ В глубину' : '↑ К стеклу'}</Btn>
        {potted && <Btn onClick={() => { if (feed(p.id)) setNote({ text: '🧪 Подкормлено! Сутки растёт в 1,5 раза быстрее.' }); }}>🧪 Подкормить {(g.owned.feed ?? 0) > 0 ? `(${g.owned.feed})` : '· 15 🍃'}</Btn>}
        {potted && p.stage < 4 && (() => {
          const why = boostBlock(g, p, t);
          const label = why === 'cooldown' ? `⚡ через ${fmt(p.boostAt! + BOOST_COOLDOWN - t)}` : why === 'daily' ? '⚡ на сегодня всё' : why === 'level' ? `⚡ с ${ITEM_BY_ID.boost.level} уровня` : `⚡ Стимулятор ${(g.owned.boost ?? 0) > 0 ? `(${g.owned.boost})` : `· ${ITEM_BY_ID.boost.price} 🍃`}`;
          return <Btn kind={why ? 'soft' : 'gold'} disabled={why === 'cooldown' || why === 'level'} onClick={() => { if (boostPlant(p.id)) setNote({ text: '⚡ Сутки растёт вдвое быстрее. Следующий раз — через неделю.' }); }}>{label}</Btn>;
        })()}
      </div>
      <p className="muted small center">Сейчас: {ZONE_NAME[p.zone]}. {s.mist === 'love' ? s.mistTip : ''}</p>

      {p.stage === 4 && (
        <div className="block">
          {cramped(p, t) ? (
            <Btn kind="gold" onClick={() => openSheet({ kind: 'repot', plant: p.id })}>🏡 Пересадить в большой горшок {(g.owned.potL ?? 0) > 0 ? `(есть ${g.owned.potL})` : '· 25 🍃'}</Btn>
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

      {canBreed(p.sp) && p.stage >= 2 && (
        <div className="block breed">
          <h3>🐝 Гибридизация</h3>
          <p className="small">
            Цвет: <span className="hue-dot" style={{ background: hueOf(p.sp, p.hue)?.color }} /> <b>{hueOf(p.sp, p.hue)?.name}</b>
            {p.hue && hueOf(p.sp, p.hue)?.rare && ' 🌈'}
          </p>
          {!p.blooming ? (
            <p className="muted small">Скрещивать можно, когда растение цветёт. Нужно второе цветущее растение того же вида — получишь семечко с шансом на новый цвет.</p>
          ) : p.pollinatedAt && t - p.pollinatedAt < BREED_COOLDOWN ? (
            <p className="muted small">Сегодня уже опыляли. Снова — через {fmt(p.pollinatedAt + BREED_COOLDOWN - t)}.</p>
          ) : breedPartners(g, p.id, t).length === 0 ? (
            <p className="muted small">Нужно второе цветущее растение «{s.name}». Подари себе черенок или попроси у друзей!</p>
          ) : (
            <div className="partners">
              {breedPartners(g, p.id, t).map((q) => (
                <button key={q.id} className="partner" onClick={() => pollinate(p.id, q.id)}>
                  <PlantArt sp={q.sp} hue={q.hue} stage={q.stage} seed={q.id} blooming noPot className="mini" />
                  <span>× {q.nick || hueOf(q.sp, q.hue)?.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {p.from && (
        <div className="block">
          <Btn onClick={() => shareThanks(p.sp)}>Сказать спасибо {p.from.name} 🌱</Btn>
          {showoff && <Btn kind="primary" onClick={() => shareShowoff(p)}>📸 Показать дарителю, как подросло</Btn>}
        </div>
      )}

      {potted && (
        <div className="block">
          <Btn onClick={() => setPots(!pots)}>🎨 Дизайн горшка: {POTS[p.pot]?.name ?? 'Глиняный'}</Btn>
          {pots && (
            <div className="pots">
              {Object.keys(POTS).map((k) => (
                <button key={k} className={'pot-pick' + (p.pot === k ? ' on' : '')} onClick={() => (ownsPot(g, k) ? setPot(p.id, k) : toast('Этот дизайн продаётся в магазине 🛒 — покупается один раз, навсегда'))}>
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

/** Родословная: от чьих растений этот черенок — мама, бабушка, прабабушка… */
export function Lineage({ line, title = '🌳 Родословная' }: { line: Ancestor[]; title?: string }) {
  return (
    <div className="lineage">
      <b>{title}</b>
      <ol>
        {[...line].reverse().map((a, i) => (
          <li key={i}><span className="gen">{genName(i)}</span> {a.n}, {a.y}{a.k ? ` · «${a.k}»` : ''}{a.h ? ' 🏺' : ''}</li>
        ))}
      </ol>
    </div>
  );
}
