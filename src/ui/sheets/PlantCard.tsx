import { needSize, POT_SIZE_NAME, potSizeOf, tight } from '../../game/sim';
import { useState } from 'react';
import { BOOST_COOLDOWN, LIGHT_NAME, SHOWOFF_MS, STAGE_NAME, ZONE_NAME } from '../../game/constants';
import { FORM_BY_ID } from '../../game/products';
import { BREED_COOLDOWN, canBreed, hueOf } from '../../game/breeding';
import { POT_SHAPES, POTS } from '../../game/shop';
import { canCut, cramped, ctxFor, cutLeft, fmt, isSad, isThirstySad, lightLevel, need, neighborsOf, nextStageAt, stageProgress } from '../../game/sim';
import { DIFFICULTY_LABEL, sp } from '../../game/species';
import {
  adsLeft, addDrain, buyItem, toggleVent, boostBlock, boostPlant, breedPartners, drainTray, freshSoil, treat, closeSheet, feed, mist, pollinate, watchAd, move, now, openSheet, ownsPot, ownsShape, wipeLeaves, potsOf, setPotShape, plantInPot, removePlant, renamePlant, setPot, takeCutting, toast, useStore, water,
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
import { coldLimit, rhWord, tempWord } from '../../game/climate';
import { diagnose, recoverHours, type Fix } from '../../game/diagnose';
import type { Plant } from '../../game/types';
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
    else if (r === 'topped') setNote({ text: `💧 Подлили до краёв: ${Math.round(before * 100)}% → 100%. Следующий полив — когда подсохнет до 50%.` });
    else if (r === 'enough') setNote({ text: (g.owned.meter ?? 0) > 0 ? `📟 Земля мокрая (${Math.round(before * 100)}%) — влагомер не даст залить.` : `Земля мокрая (${Math.round(before * 100)}%) — вода уйдёт в поддон, это перелив. Всё равно полить?`, ask: (g.owned.meter ?? 0) > 0 ? undefined : 'water' });
    else if (r === 'over') setNote({ text: '😵 Вода в поддоне — перелив. Слей её или дай земле просохнуть.' });
    else if (r === 'rooting') setNote({ text: '💧 Налили воды в стакан — черенок пускает корни.' });
    else if (r === 'glass') setNote({ text: p.stage === 1 ? 'Корни уже есть — посади в горшок 🪴' : 'В стакане хватает воды.' });
  };
  const doMist = (insist = false) => {
    const ok = mist(p.id, insist);
    const m = sp(p.sp).mist;
    if (ok) setNote({ text: m === 'love' ? '💦 Опрыскано! 12 часов растёт быстрее.' : m === 'ok' ? '💦 Освежили листья — 6 часов растёт быстрее.' : '💧 Листья мокрые — протри салфеткой, иначе пойдут пятна.' });
    else if (m === 'no' && !insist) setNote({ text: `⚠️ ${sp(p.sp).mistTip} Всё равно опрыскать? Потом придётся протереть листья.`, ask: 'mist' });
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
        <PlantArt sp={p.sp} form={p.form} hue={p.hue} stage={p.stage} seed={p.id} pot={p.pot} size={potSizeOf(p)} shape={p.shape} blooming={p.blooming} className={'big' + (isSad(p) ? ' sad' : '') + (mark?.frame ? ' gold-frame' : '')} />
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
            <span className="story-links">
              <button className="icon-btn" onClick={() => openSheet({ kind: 'share', plant: p.id })} aria-label="Поделиться" title="Поделиться"><ShareIcon /></button>
            </span>
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
      {potted && <HealthBox p={p} />}
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
        if (ctx.humid) notes.push('💨 Увлажнитель работает — воздух влажнее, клещу неуютно');
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
          <button className="light-line linkish-row" onClick={() => openSheet({ kind: 'climate' })}>
            🌡 Воздух: <b>{tempWord(ctx.temp ?? 22)}, {rhWord(ctx.rh ?? 45)}</b>
            {(ctx.temp ?? 22) < coldLimit(p.sp) ? ' · 🥶 ему холодно' : ''}
            {s.mist === 'love' && (ctx.rh ?? 45) < 35 ? ' · любит влажный воздух' : ''}
            {ctx.draft ? ' · сквозняк!' : ''} ›
          </button>
          {(mistOn || feedOn || boostOn || p.drain || ctx.newbie) && (
            <div className="boosts">
              {ctx.newbie && potted && p.stage < 4 && <span>🌟 бонус новичка: ×3 к росту</span>}
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
      </div>
      {potted && (() => {
        const why = boostBlock(g, p, t);
        const boostSub = why === 'cooldown' ? `через ${fmt(p.boostAt! + BOOST_COOLDOWN - t)}` : why === 'daily' ? 'на сегодня всё' : why === 'level' ? `с ${ITEM_BY_ID.boost.level} ур.` : why === 'adult' ? 'уже взрослое' : (g.owned.boost ?? 0) > 0 ? `есть ${g.owned.boost}` : `${ITEM_BY_ID.boost.price} 🍃`;
        const feedSub = feedOn ? `ещё ${fmt(p.feedUntil! - t)}` : (g.owned.feed ?? 0) > 0 ? `есть ${g.owned.feed}` : '15 🍃';
        return (
          <div className="care-grid">
            <button className={'care' + (p.moisture < 0.5 ? ' hot' : '')} onClick={() => doWater()}><span>💧</span><b>Полить</b><small>{Math.round(p.moisture * 100)}%</small></button>
            <button className="care" onClick={() => doMist()}><span>💦</span><b>Опрыскать</b><small>{s.mist === 'love' ? 'любит' : s.mist === 'no' ? 'не любит' : 'можно'}</small></button>
            <button className="care" disabled={!!feedOn} onClick={() => { if (feed(p.id)) setNote({ text: '🧪 Подкормлено! Сутки растёт в 1,5 раза быстрее.' }); }}><span>🧪</span><b>Подкормить</b><small>{feedSub}</small></button>
            <button className="care" disabled={!!why && why !== 'sick'} onClick={() => { if (boostPlant(p.id)) setNote({ text: '⚡ Сутки растёт вдвое быстрее. Следующий раз — через неделю.' }); }}><span>⚡</span><b>Стимулятор</b><small>{boostSub}</small></button>
            <button className="care" onClick={() => move(p.id, p.zone === 'glass' ? 'deep' : 'glass')}><span>{p.zone === 'glass' ? '⬇️' : '⬆️'}</span><b>{p.zone === 'glass' ? 'В глубину' : 'К стеклу'}</b><small>сейчас {p.zone === 'glass' ? 'у стекла' : 'в глубине'}</small></button>
            <button className="care" onClick={() => openSheet({ kind: 'share', plant: p.id })}><span><ShareIcon /></span><b>Поделиться</b><small>фото, видео</small></button>
          </div>
        );
      })()}
      {!potted && <Btn onClick={() => move(p.id, p.zone === 'glass' ? 'deep' : 'glass')}>{p.zone === 'glass' ? '↓ В глубину' : '↑ К стеклу'}</Btn>}
      <p className="muted small center">Сейчас: {ZONE_NAME[p.zone]}. {s.mist === 'love' ? s.mistTip : ''}</p>

      {potted && (
        <div className={'block pot-size' + (tight(p) ? ' tight' : '')}>
          {tight(p) ? (
            <>
              <p className="small"><b>😣 Тесно в горшке {POT_SIZE_NAME[potSizeOf(p)]}!</b> Корни упёрлись в стенки — рост остановился, пока не пересадишь в {POT_SIZE_NAME[needSize(p.stage)]}.</p>
              <Btn kind="gold" onClick={() => openSheet({ kind: 'repot', plant: p.id })}>🪴 Пересадить</Btn>
            </>
          ) : cramped(p, t) ? (
            <Btn kind="gold" onClick={() => openSheet({ kind: 'repot', plant: p.id })}>🏡 Тесновато — пересадить в XL {potsOf(g, 4) > 0 ? `(есть ${potsOf(g, 4)})` : `· ${ITEM_BY_ID.potXL.price} 🍃`}</Btn>
          ) : (
            <p className="muted small">
              🪴 Горшок {POT_SIZE_NAME[potSizeOf(p)]}{potSizeOf(p) >= 4 ? ' — простор, черенки отрастают на 25% быстрее' : p.stage < 4 ? ` · подрастёт — понадобится ${POT_SIZE_NAME[needSize(p.stage + 1)]}` : ''}
              {potSizeOf(p) < 4 && <> · <button className="linkish" onClick={() => openSheet({ kind: 'repot', plant: p.id })}>пересадить заранее</button></>}
            </p>
          )}
        </div>
      )}
      {p.stage === 4 && (
        <div className="block">
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
          <Btn onClick={() => setPots(!pots)}>🎨 Горшок: {POTS[p.pot]?.name ?? 'Глиняный'} · {POT_SHAPES[p.shape ?? 'classic']?.name}</Btn>
          {pots && (
            <div className="pots shapes">
              {Object.keys(POT_SHAPES).map((k) => (
                <button key={k} className={'pot-pick' + ((p.shape ?? 'classic') === k ? ' on' : '')} onClick={() => (ownsShape(g, k) ? setPotShape(p.id, k) : toast('Эта форма продаётся в магазине 🛒 — раздел «Горшки»'))}>
                  <PlantArt sp={p.sp} stage={2} pot={p.pot} shape={k} seed={p.id} className="mini" potView />
                  <span>{ownsShape(g, k) ? POT_SHAPES[k].name : '🔒 ' + POT_SHAPES[k].name}</span>
                </button>
              ))}
            </div>
          )}
          {pots && (
            <div className="pots">
              {Object.keys(POTS).map((k) => (
                <button key={k} className={'pot-pick' + (p.pot === k ? ' on' : '')} onClick={() => (ownsPot(g, k) ? setPot(p.id, k) : toast('Этот дизайн продаётся в магазине 🛒 — покупается один раз, навсегда'))}>
                  <PlantArt sp={p.sp} stage={2} pot={k} shape={p.shape} seed={p.id} className="mini" potView />
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

/** Здоровье: почему падает и что сделать — с кнопками действий и покупок. */
function HealthBox({ p }: { p: Plant }) {
  const g = useStore((st) => st.game);
  const t = now();
  // перелив и болезнь показаны своими блоками ниже
  const causes = diagnose(g, p, t).filter((c) => c.title !== 'Перелив' && !(p.problem && c.title === PROBLEMS[p.problem.kind].name));
  const hurting = diagnose(g, p, t).some((c) => c.hurts);
  if (p.health >= 95 && !causes.length) return null;
  const sill = g.sills.find((s) => s.id === p.sill) ?? g.sills[0];
  const run = (f: Fix) => {
    if (f.kind === 'water') water(p.id, true);
    else if (f.kind === 'mist') mist(p.id, true);
    else if (f.kind === 'wipe') wipeLeaves(p.id);
    else if (f.kind === 'move') move(p.id, f.to);
    else if (f.kind === 'vent') toggleVent(sill.id);
    else if (f.kind === 'tray') drainTray(p.id);
    else if (f.kind === 'soil') freshSoil(p.id);
    else if (f.kind === 'drain') addDrain(p.id);
    else if (f.kind === 'buy') buyItem(f.item);
  };
  return (
    <div className={'health-box' + (hurting ? ' hurt' : '')}>
      <div className="hb-head">
        <span className="hb-heart">{hurting ? '💔' : p.health < 95 ? '❤️‍🩹' : '💚'}</span>
        <div>
          <b>Здоровье {Math.round(p.health)}% — {hurting ? 'падает' : p.health < 95 ? 'идёт на поправку' : 'в порядке'}</b>
          <small>{hurting ? 'Вот что ему мешает:' : p.health < 95 ? `Сейчас ничего не вредит — восстановится примерно за ${recoverHours(p)} ч.${p.health < 30 ? ' Пока слабое, растёт медленнее.' : ''}` : 'Но есть что улучшить:'}</small>
        </div>
      </div>
      {causes.map((c) => (
        <div key={c.title} className="hb-cause">
          <b>{c.icon} {c.title}{c.hurts ? ' · вредит' : ''}</b>
          <span className="small">{c.text}</span>
          {c.fixes.length > 0 && (
            <div className="hb-fixes">
              {c.fixes.map((f) => {
                if (f.kind === 'buy' || f.kind === 'cure') {
                  const it = ITEM_BY_ID[f.item];
                  if (!it) return null;
                  const have = (g.owned[f.item] ?? 0) > 0;
                  const locked = it.level && g.level < it.level;
                  if (f.kind === 'cure') return <Btn key={f.item} small kind="gold" onClick={() => treat(p.id, f.item)}>{it.icon} {it.name} {have ? `(${g.owned[f.item]})` : `· ${it.price} 🍃`}</Btn>;
                  return <Btn key={f.item} small kind="gold" disabled={!!locked} onClick={() => run(f)}>{f.label} {locked ? `· с ${it.level} ур.` : have ? '(есть)' : `· ${it.price} 🍃`}</Btn>;
                }
                return <Btn key={f.label} small onClick={() => run(f)}>{f.label}</Btn>;
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** Значок «поделиться»: квадрат со стрелкой вверх. */
export function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" />
      <path d="M5 12v6.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V12" />
    </svg>
  );
}
