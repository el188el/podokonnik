import { needSize, POT_SIZE_NAME, potSizeOf, tight } from '../../game/sim';
import { useState } from 'react';
import { BOOST_COOLDOWN, LIGHT_NAME, SHOWOFF_MS, STAGE_NAME, ZONE_NAME } from '../../game/constants';
import { FORM_BY_ID } from '../../game/products';
import { BREED_COOLDOWN, canBreed, hueOf } from '../../game/breeding';
import { BOOST_GROW_H, canCut, cramped, ctxFor, cutLeft, FEED_GROW_H, fmt, fussyOf, isSad, lightLevel, need, neighborsOf, nextStageAt, stageProgress, timerSpeed } from '../../game/sim';
import { Eta } from '../kit/Eta';
import { DIFFICULTY_LABEL, sp } from '../../game/species';
import {
  adsLeft, addDrain, buyItem, toggleVent, boostBlock, boostPlant, breedPartners, drainTray, freshSoil, treat, feed, mist, pollinate, watchAd, move, now, openSheet, wipeLeaves, plantInPot, removePlant, renamePlant, takeCutting, useStore, water,
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
import { leftShort, plantEffects } from '../../game/effects';
import { Processes } from './Processes';
import { coldLimit, FUSSY_TEXT, rhWord, tempWord } from '../../game/climate';
import { diagnose, recoverHours, type Fix } from '../../game/diagnose';
import type { Plant } from '../../game/types';
import type { Ancestor } from '../../game/types';
import { Icon, TONE } from '../kit/icons';
import { Emo, rich } from '../kit/rich';
import { PotDesigner } from './PotDesigner';

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
  const showoff = !!p.from && t - (p.claimedAt ?? p.createdAt) >= SHOWOFF_MS;
  const days = ageDays(p, t);
  const mark = ageMark(p, t);
  const nextMark = nextAgeMark(p, t);

  const sad = isSad(p);
  const why = potted ? boostBlock(g, p, t) : null;
  const boostSub = why === 'cooldown' ? `через ${fmt(p.boostAt! + BOOST_COOLDOWN - t)}` : why === 'daily' ? 'на сегодня всё' : why === 'level' ? `с ${ITEM_BY_ID.boost.level} ур.` : why === 'adult' ? 'взрослое' : why === 'tight' ? 'тесно' : (g.owned.boost ?? 0) > 0 ? `есть ${g.owned.boost}` : `${ITEM_BY_ID.boost.price} 🍃`;
  const feedSub = p.stage >= 4 ? 'не нужно' : tight(p) ? 'тесно' : feedOn ? `через ${fmt(p.feedUntil! - t)}` : (g.owned.feed ?? 0) > 0 ? `есть ${g.owned.feed}` : '15 🍃';
  const size = potSizeOf(p);
  const potHot = potted && (tight(p) || cramped(p, t));
  const cutReady = p.stage === 4 && canCut(p, t);
  const lightBad = light < s.light[0] || light > s.light[1];

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
        <PlantArt sp={p.sp} form={p.form} hue={p.hue} stage={p.stage} seed={p.id} pot={p.pot} size={size} shape={p.shape} blooming={p.blooming} className={'big' + (sad ? ' sad' : '') + (mark?.frame ? ' gold-frame' : '')} />
        <div className="card-title">
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
              {rich(p.nick || s.name)} <small className="edit"><Emo e="✏️" /></small>
            </h2>
          )}
          <p className="muted small">
            {rich(p.nick ? s.name + ' · ' : '')}{rich(DIFFICULTY_LABEL[s.difficulty])}
            {p.form && FORM_BY_ID[p.form] && <> · <Emo e="✨" /> {rich(FORM_BY_ID[p.form].name)}</>}
            {p.from && <> · <Emo e="🎁" /> от {rich(p.from.name)}</>}
          </p>
          <p className="stage-line"><b>{rich(STAGE_NAME[p.stage])}</b>{rich(p.blooming && ' · цветёт 🌸')}</p>
          {p.stage < 4 && <Bar value={stageProgress(p, t)} label={p.stage === 1 ? 'пора сажать' : tight(p) ? 'тесно — не растёт' : next ? <>ещё <Eta ms={next - t} speed={timerSpeed(p, t, ctx)} /></> : '…'} />}
          {potted && (
            <div className="stat-chips">
              <span className={p.moisture > 1 ? 'bad' : p.moisture < 0.25 ? 'bad' : ''}><Icon name="water" size={15} tone={TONE.water} /> {Math.round(p.moisture * 100)}%</span>
              <span className={p.health < 60 ? 'bad' : ''}><Icon name="heart" size={15} tone="#e0574f" /> {Math.round(p.health)}%</span>
              <span className={lightBad ? 'bad' : ''}><Icon name="clear" size={15} tone="#e8a325" /> {rich(LIGHT_NAME[light])}</span>
            </div>
          )}
        </div>
      </div>

      {potted && (() => {
        const m = moodOf(p, t, ctx);
        return <p className="mood-line">{rich(m.icon)} <i>«{rich(chatter(p, t, ctx, weatherAt(g, t), (p.id.charCodeAt(0) + Math.floor(t / 600e3)) % 17 / 17))}»</i></p>;
      })()}

      {/* ── что сейчас действует ── */}
      {potted && (() => {
        const list = plantEffects(p, t, g, ctx.fan).filter((e) => e.id !== 'problem');
        if (!list.length) return null;
        return (
          <div className="effects">
            <small className="effects-h">Сейчас действует</small>
            {list.map((e) => (
              <div key={e.id} className={'effect' + (e.bad ? ' bad' : '')}>
                <span className="ef-ic"><Emo e={e.icon} size={18} /></span>
                <span className="ef-t"><b>{rich(e.name)}</b><small>{rich(e.text)}</small></span>
                {e.left !== undefined && <span className="ef-left">ещё {leftShort(e.left)}</span>}
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── что требует внимания ── */}
      {p.problem && (() => {
        const info = PROBLEMS[p.problem.kind];
        const cures = cureFor(p.problem.kind);
        return (
          <div className="problem-box">
            <div className="problem-head"><span className="problem-icon">{rich(info.icon)}</span><div><b>{rich(info.name)}</b><Bar value={p.problem.sev} color="#e0574f" label={p.problem.sev > 0.7 ? 'сильно' : p.problem.sev > 0.4 ? 'заметно' : 'только началось'} /></div></div>
            <p className="small">{rich(info.heal)}{rich(info.pest ? ' ⚠️ Переползает на соседей.' : '')}</p>
            <div className="actions">
              {cures.map((c) => {
                const it = ITEM_BY_ID[c];
                const have = g.owned[c] ?? 0;
                return <Btn key={c} small kind="gold" onClick={() => treat(p.id, c)}>{rich(it.icon)} {rich(it.name)} {rich(have ? `(${have})` : `· ${it.price} 🍃`)}</Btn>;
              })}
              {(p.problem.kind === 'burn' || p.problem.kind === 'leggy') && <Btn small onClick={() => move(p.id, p.zone === 'glass' ? 'deep' : 'glass')}>{rich(p.zone === 'glass' ? '↓ Убрать от солнца' : '↑ Ближе к свету')}</Btn>}
            </div>
            <details className="more"><summary>Признаки и причины</summary><p className="small">{rich(info.sign)} {rich(info.cause)}</p></details>
          </div>
        );
      })()}
      {potted && p.moisture > 1 && (
        <div className="problem-box over-box">
          <div className="problem-head"><span className="problem-icon"><Emo e="🌊" /></span><div><b>Перелив</b><p className="small">Вода стоит в горшке — корни задыхаются.</p></div></div>
          <div className="actions">
            <Btn small onClick={() => drainTray(p.id)}><Emo e="🫗" /> Слить</Btn>
            <Btn small kind="gold" onClick={() => freshSoil(p.id)}><Emo e="🟫" /> Сухой грунт {rich((g.owned.soil ?? 0) > 0 ? `(${g.owned.soil})` : `· ${ITEM_BY_ID.soil.price} 🍃`)}</Btn>
            {!p.drain && <Btn small onClick={() => addDrain(p.id)}><Emo e="🪨" /> Дренаж {rich((g.owned.drain ?? 0) > 0 ? `(${g.owned.drain})` : `· ${ITEM_BY_ID.drain.price} 🍃`)}</Btn>}
          </div>
        </div>
      )}
      {potted && <HealthBox p={p} />}

      {note && (
        <div className="card-note">
          <span>{rich(note.text)}</span>
          {note.ask === 'water' && <Btn small kind="warn" onClick={() => doWater(true)}>Всё равно полить</Btn>}
          {note.ask === 'mist' && <Btn small kind="warn" onClick={() => doMist(true)}>Всё равно опрыскать</Btn>}
        </div>
      )}

      {/* ── действия ── */}
      {p.stage === 1 && <Btn kind="primary" onClick={() => plantInPot(p.id)}><Emo e="🪴" /> Посадить в горшок</Btn>}
      {p.stage === 0 && !p.rootStart && <Btn kind="primary" onClick={() => doWater()}><Emo e="💧" /> Налить воды в стакан</Btn>}
      {p.stage === 0 && !!p.rootStart && adsAvailable() && adsLeft(g) > 0 && (
        <Btn kind="gold" onClick={() => watchAd({ kind: 'root', plant: p.id })}><Emo e="🎬" /> Ролик — и корни сразу</Btn>
      )}
      {potted && (
        <div className="care-grid">
          <button className={'care' + (p.moisture < 0.5 ? ' hot' : '')} onClick={() => doWater()}><span><Icon name="water" size={24} tone={TONE.water} /></span><b>Полить</b></button>
          <button className={'care' + (s.mist === 'love' && !mistOn ? ' hot' : '')} onClick={() => doMist()}><span><Icon name="mist" size={24} tone={TONE.mist} /></span><b>Опрыскать</b><small>{rich(mistOn ? fmt(p.mistUntil! - t) : s.mist === 'love' ? 'любит' : s.mist === 'no' ? 'не любит' : 'можно')}</small></button>
          <button className="care" disabled={!!feedOn || p.stage >= 4} onClick={() => { if (feed(p.id)) setNote({ text: `🧪 Подкормлено: до следующей стадии на ${FEED_GROW_H} ч меньше. Следующая подкормка — через сутки.` }); }}><span><Icon name="feed" size={24} tone={TONE.feed} /></span><b>Подкормка</b><small>{rich(feedSub)}</small></button>
          {p.stage < 4 ? (
            <button className="care" disabled={!!why && why !== 'sick'} onClick={() => { if (boostPlant(p.id)) setNote({ text: `⚡ До следующей стадии на ${BOOST_GROW_H} ч меньше. Следующий раз — через неделю.` }); }}><span><Icon name="boost" size={24} tone={TONE.boost} /></span><b>Стимулятор</b><small>{rich(boostSub)}</small></button>
          ) : (
            <button className={'care' + (cutReady ? ' ready' : '')} disabled={!cutReady} onClick={() => { const c = takeCutting(p.id); if (c) openSheet({ kind: 'send', cutting: c }); }}><span><Icon name="cut" size={24} tone={TONE.cut} /></span><b>Черенок</b><small>{rich(cutReady ? 'можно!' : sad || tight(p) ? 'грустит' : fmt(cutLeft(p, t)))}</small></button>
          )}
          <button className={'care' + (potHot ? ' warn' : '')} disabled={size >= 4 && !potHot} onClick={() => openSheet({ kind: 'repot', plant: p.id })}><span><Icon name="repot" size={24} tone={TONE.repot} /></span><b>Пересадить</b><small>{rich(tight(p) ? `тесно! → ${POT_SIZE_NAME[needSize(p.stage)]}` : cramped(p, t) ? 'тесновато → XL' : `горшок ${POT_SIZE_NAME[size]}`)}</small></button>
          <button className="care" onClick={() => move(p.id, p.zone === 'glass' ? 'deep' : 'glass')}><span><Icon name={p.zone === 'glass' ? 'down' : 'up'} size={24} tone={TONE.look} /></span><b>{rich(p.zone === 'glass' ? 'В глубину' : 'К стеклу')}</b></button>
          <button className="care" onClick={() => setPots(!pots)}><span><Icon name="design" size={24} tone={TONE.design} /></span><b>Дизайн</b></button>
          <button className="care" onClick={() => openSheet({ kind: 'share', plant: p.id })}><span><Icon name="share" size={24} tone={TONE.share} /></span><b>Поделиться</b></button>
        </div>
      )}
      {!potted && <Btn onClick={() => move(p.id, p.zone === 'glass' ? 'deep' : 'glass')}>{rich(p.zone === 'glass' ? '↓ В глубину' : '↑ К стеклу')}</Btn>}

      {potted && pots && <PotDesigner p={p} />}

      {canBreed(p.sp) && p.blooming && (
        <div className="block breed">
          <h3><Emo e="🐝" /> Скрестить · <span className="hue-dot" style={{ background: hueOf(p.sp, p.hue)?.color }} /> {rich(hueOf(p.sp, p.hue)?.name)}{rich(p.hue && hueOf(p.sp, p.hue)?.rare && ' 🌈')}</h3>
          {p.pollinatedAt && t - p.pollinatedAt < BREED_COOLDOWN ? (
            <p className="muted small">Снова — через {rich(fmt(p.pollinatedAt + BREED_COOLDOWN - t))}.</p>
          ) : breedPartners(g, p.id, t).length === 0 ? (
            <p className="muted small">Нужно второе цветущее растение «{rich(s.name)}».</p>
          ) : (
            <div className="partners">
              {breedPartners(g, p.id, t).map((q) => (
                <button key={q.id} className="partner" onClick={() => pollinate(p.id, q.id)}>
                  <PlantArt sp={q.sp} hue={q.hue} stage={q.stage} seed={q.id} blooming noPot className="mini" />
                  <span>× {rich(q.nick || hueOf(q.sp, q.hue)?.name)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {p.from && showoff && <Btn kind="primary" onClick={() => shareShowoff(p)}><Emo e="📸" /> Показать дарителю, как подросло</Btn>}

      {/* ── всё остальное — свёрнуто ── */}
      {potted && (
        <details className="more proc-wrap" open>
          <summary>Что с растением происходит</summary>
          <Processes g={g} p={p} t={t} ctx={ctx} />
        </details>
      )}

      <details className="more">
        <summary>Подробнее о растении</summary>
        <p className="small"><Emo e="💡" /> {rich(need(p, t, ctx))}</p>
        {potted && (
          <>
            <p className="small"><Emo e="☀️" /> Свет: <b>{rich(LIGHT_NAME[light])}</b>, нужно {rich(LIGHT_NAME[s.light[0]])}{rich(s.light[1] !== s.light[0] && ` — ${LIGHT_NAME[s.light[1]]}`)} · сейчас {rich(ZONE_NAME[p.zone])}</p>
            <button className="linkish small" onClick={() => openSheet({ kind: 'climate' })}>
              <Emo e="🌡" /> Воздух: {rich(tempWord(ctx.temp ?? 22))}, {rich(rhWord(ctx.rh ?? 45))}{rich((ctx.temp ?? 22) < coldLimit(p.sp) ? ' · ему холодно' : '')}{rich(ctx.draft ? ' · сквозняк' : '')}{rich(fussyOf(p, ctx) ? ` · ${FUSSY_TEXT[fussyOf(p, ctx)!]}` : '')} ›
            </button>
            {s.fussy && <p className="small"><Emo e="⚠️" /> Капризное: {rich(s.fussy.note)}</p>}
            {(() => {
              const near = neighborsOf(g, p);
              const notes: string[] = [];
              if (ctx.shade) notes.push('🌳 Большой сосед затеняет');
              if (ctx.repel) notes.push('🌸 Рядом герань — вредителей меньше');
              if (s.mist === 'love' && near.some((n) => sp(n.sp).mist === 'no')) notes.push(`⚠️ Опрыскивая, заденешь: ${near.filter((n) => sp(n.sp).mist === 'no').map((n) => sp(n.sp).acc).join(', ')}`);
              if (near.some((n) => n.problem && PROBLEMS[n.problem.kind].pest)) notes.push('🐛 У соседа вредители');
              return notes.map((x) => <p key={x} className="small">{rich(x)}</p>);
            })()}
          </>
        )}
        <p className={'small age-line' + (mark?.frame ? ' gold' : '')}>
          {rich(mark?.icon ?? '🗓')} С тобой {rich(days < 1 ? 'первый день' : daysText(days))}
          {nextMark && <span className="muted"> · до {rich(nextMark.icon)} ещё {rich(daysText(nextMark.days - days))}</span>}
          {mark && mark.days >= 30 && <> · <button className="linkish" onClick={() => sharePlantStory(p, `${daysText(days)} вместе`, p.nick || s.name, 'age')}>поделиться</button></>}
        </p>
        {isHeirloom(p, t) && <p className="small"><Emo e="🏺" /> <b>Семейная реликвия</b> — год на подоконнике.</p>}
        {p.line?.length ? <Lineage line={p.line} /> : null}
        {canBreed(p.sp) && !p.blooming && p.stage >= 2 && <p className="small"><Emo e="🐝" /> Цвет: {rich(hueOf(p.sp, p.hue)?.name)}. Скрещивать можно, когда цветут два растения этого вида.</p>}
        {p.from && <Btn small onClick={() => shareThanks(p.sp)}>Сказать спасибо {rich(p.from.name)} <Emo e="🌱" /></Btn>}
        <ul className="facts">{s.facts.map((x) => <li key={x}>{rich(x)}</li>)}</ul>
      </details>

      <details className="more" open={real} onToggle={(e) => setReal((e.target as HTMLDetailsElement).open)}>
        <summary>Вырастить по-настоящему</summary>
        <p className="small"><b>Уход:</b> {rich(s.care)}</p>
        <p className="small"><b>Купить:</b> {rich(s.buy)}. Цены примерные.</p>
        <p className="small"><b>Бесплатно:</b> попроси черенок у знакомых или на «Авито» в «Отдам даром». Как укоренить: {rich(s.free)}</p>
      </details>

      <button className={'linkish remove-link' + (sure ? ' warn' : '')} onClick={() => (sure ? removePlant(p.id) : setSure(true))}>
        {rich(sure ? 'Точно убрать? Нажми ещё раз' : 'Убрать с подоконника')}
      </button>
    </div>
  );
}

/** Родословная: от чьих растений этот черенок — мама, бабушка, прабабушка… */
export function Lineage({ line, title = '🌳 Родословная' }: { line: Ancestor[]; title?: string }) {
  return (
    <div className="lineage">
      <b>{rich(title)}</b>
      <ol>
        {[...line].reverse().map((a, i) => (
          <li key={i}><span className="gen">{rich(genName(i))}</span> {rich(a.n)}, {a.y}{rich(a.k ? ` · «${a.k}»` : '')}{rich(a.h ? ' 🏺' : '')}</li>
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
  const bad = causes.filter((c) => c.hurts);
  if (!bad.length) {
    // ничего не вредит — одна строка, только если здоровье заметно просело
    return p.health < 80 ? <p className="small hb-line"><Emo e="❤️‍🩹" /> Поправляется — примерно {recoverHours(p)} ч до полного здоровья</p> : null;
  }
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
    <div className="health-box hurt">
      <b className="hb-title"><Emo e="💔" /> Здоровье {Math.round(p.health)}% — падает</b>
      {bad.map((c) => (
        <div key={c.title} className="hb-cause">
          <details>
            <summary><b>{rich(c.icon)} {rich(c.title)}</b></summary>
            <span className="small">{rich(c.text)}</span>
          </details>
          {c.fixes.some((f) => f.kind !== 'water' && f.kind !== 'mist' && f.kind !== 'move') && (
            <div className="hb-fixes">
              {c.fixes.filter((f) => f.kind !== 'water' && f.kind !== 'mist' && f.kind !== 'move').map((f) => {
                if (f.kind === 'buy' || f.kind === 'cure') {
                  const it = ITEM_BY_ID[f.item];
                  if (!it) return null;
                  const have = (g.owned[f.item] ?? 0) > 0;
                  const locked = it.level && g.level < it.level;
                  if (f.kind === 'cure') return <Btn key={f.item} small kind="gold" onClick={() => treat(p.id, f.item)}>{rich(it.icon)} {rich(it.name)} {rich(have ? `(${g.owned[f.item]})` : `· ${it.price} 🍃`)}</Btn>;
                  return <Btn key={f.item} small kind="gold" disabled={!!locked} onClick={() => run(f)}>{rich(f.label)} {rich(locked ? `· с ${it.level} ур.` : have ? '(есть)' : `· ${it.price} 🍃`)}</Btn>;
                }
                return <Btn key={f.label} small onClick={() => run(f)}>{rich(f.label)}</Btn>;
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" />
      <path d="M5 12v6.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V12" />
    </svg>
  );
}
