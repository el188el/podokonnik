// Общий подоконник: те же растения видят и поливают двое (или вся квартира).

import { clone } from '../../game/constants';
import { potSizeOf } from '../../game/sim';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { CONFIG, tgAppLink } from '../../config';
import { WINDOWS } from '../../game/constants';
import { DEEP_ROW, GLASS_ROW, zoneOfSlot } from '../../game/layout';
import { coopAdvance, coopTight, coopWorld, COOP_ITEMS, type CoopAction, type CoopItem } from '../../game/coop';
import { approx, canCut, ctxFor, fmt, isSad, need, rootsAt, tight } from '../../game/sim';
import { sp } from '../../game/species';
import { coopDo, coopInviteCode, itemFits, leaveCoop, loadCoops, now, openSheet, setTool, toast, useStore } from '../../game/store';
import { ITEM_BY_ID } from '../../game/shop';
import { PROBLEMS } from '../../game/problems';
import { leftShort, plantEffects } from '../../game/effects';
import { Processes } from '../sheets/Processes';
import { Icon, TONE, type IconName } from '../kit/icons';
import type { Plant } from '../../game/types';
import type { CoopView } from '../../net/api';
import { playerId } from '../../net/api';
import { platform } from '../../platform';
import { PlantArt } from '../art/PlantArt';
import { Btn } from '../kit/kit';
import { SillScene, timeOfDay } from '../SillScene';
import { isWinter } from '../../game/sim';
import { Emo, rich } from '../kit/rich';

const ago = (ms: number) => (ms < 60e3 ? 'только что' : ms < 86400e3 ? `${fmt(ms)} назад` : `${approx(ms)} назад`);

export const coopLink = (c: CoopView) => tgAppLink(coopInviteCode(c)) || `${CONFIG.siteUrl}?start=${coopInviteCode(c)}`;

export async function shareCoop(c: CoopView) {
  const r = await platform().share({ text: `Давай вместе ухаживать за подоконником «${c.state.name}» 🪴 Поливаем по очереди — кто полил, видно сразу:`, url: coopLink(c) });
  if (r === 'copied') toast('Ссылка скопирована — отправь её 📋');
}

const BADGES = ['cut', 'boost', 'feed', 'guard', 'mist', 'wet'];

/** Кому сейчас пригодится инструмент — подсвечиваем, как на своём подоконнике. */
function wants(tool: string, item: string | undefined, p: Plant, t: number, g: ReturnType<typeof useStore.getState>['game']) {
  if (p.stage < 2) return false;
  if (tool === 'water') return p.moisture < 0.5;
  if (tool === 'mist') return sp(p.sp).mist === 'love' && !(p.mistUntil && t < p.mistUntil);
  if (tool === 'cut') return canCut(p, t);
  if (tool === 'use' && item) return itemFits(g, item, p, t);
  return false;
}

export function CoopSill({ coop }: { coop: CoopView }) {
  const g = useStore((s) => s.game);
  const tool = useStore((s) => s.tool);
  const t = now();
  const [sel, setSel] = useState<string | null>(null);
  const [planting, setPlanting] = useState<number | null>(null);
  const [menu, setMenu] = useState(false);
  const [lastEnough, setLastEnough] = useState<{ id: string; at: number } | null>(null);
  const tSec = Math.floor(t / 1000);

  // локально досчитываем рост между обновлениями с сервера
  const st = useMemo(() => {
    const c = clone(coop.state);
    coopAdvance(c, tSec * 1000);
    return c;
  }, [coop, tSec]);
  // пока подоконник открыт — подтягиваем действия соседей каждые 8 с (и сразу при возвращении в игру)
  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') loadCoops(); };
    const i = setInterval(tick, 8e3);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(i); document.removeEventListener('visibilitychange', tick); };
  }, []);

  const world = useMemo(() => coopWorld(st), [st]);
  const useItem = useStore((s) => s.useItem);
  const [care, setCare] = useState(false);
  const me = playerId();
  const others = coop.members.filter((m) => m.id !== me);
  const at = (slot: number) => st.plants.find((p) => p.slot === slot);
  const selected = st.plants.find((p) => p.id === sel);
  const act = (a: CoopAction, cutting?: string) => coopDo(coop.id, a, cutting);

  const tap = async (p: Plant) => {
    if (p.stage === 1) return act({ kind: 'pot', plant: p.id });
    if (tool === 'look' || (p.stage === 0 && p.rootStart)) return setSel(p.id === sel ? null : p.id);
    if (tool === 'mist') return act({ kind: 'mist', plant: p.id });
    if (tool === 'use') {
      if (useItem && (COOP_ITEMS as readonly string[]).includes(useItem)) return act({ kind: 'use', plant: p.id, item: useItem as CoopItem });
      return setSel(p.id);
    }
    if (tool === 'cut') return canCut(p, t) ? act({ kind: 'cut', plant: p.id }) : toast(p.stage < 4 ? 'Растение ещё маленькое ✂️' : 'Черенок пока не готов');
    const again = lastEnough?.id === p.id && Date.now() - lastEnough.at < 2500;
    const r = await act({ kind: 'water', plant: p.id, insist: again });
    setLastEnough(r && !r.ok && r.reason === 'enough' ? { id: p.id, at: Date.now() } : null);
  };

  const bubble = (p: Plant) => {
    if (p.stage === 0 && p.rootStart) return `🌱 ${fmt(Math.max(0, rootsAt(p)! - t))}`;
    if (p.stage === 0) return 'Налей воды 💧';
    if (p.stage === 1) return 'Посади меня 🪴';
    if (p.moisture > 1) return 'Перелили 😵';
    if (p.moisture < 0.5) return 'Хочу пить 💧';
    if (coopTight(p)) return 'Тесно в горшке 🪴';
    if (p.problem) return `${PROBLEMS[p.problem.kind].icon} ${PROBLEMS[p.problem.kind].short}`;
    if (canCut(p, t) && tool === 'cut') return '✂️';
    return null;
  };

  return (
    <div className="sillview coop">
      <div className="coop-head">
        <div>
          <b><Emo e="💞" /> {rich(st.name)}</b>
          <span className="muted small">{rich(coop.members.map((m) => (m.id === me ? 'ты' : m.name)).join(' · '))}</span>
        </div>
        <Btn small kind={others.length ? 'soft' : 'gold'} onClick={() => shareCoop(coop)}>{rich(others.length ? '+ Позвать' : 'Пригласить')}</Btn>
        <button className="chip" onClick={() => setMenu(!menu)} aria-label="Настройки общего подоконника">⋯</button>
      </div>
      {menu && (
        <div className="panel coop-menu">
          <div className="lbl">Окно</div>
          <div className="chips">
            {(['N', 'E', 'S', 'W'] as const).map((w) => (
              <button key={w} className={'chip' + (st.window === w ? ' on' : '')} onClick={() => act({ kind: 'window', side: w })}>{rich(WINDOWS[w].short)}</button>
            ))}
          </div>
          <p className="muted small">Код приглашения: <b>{rich(coop.code)}</b></p>
          <Btn small kind="warn" onClick={() => { if (confirm('Выйти из общего подоконника? Растения останутся у остальных.')) leaveCoop(coop.id); }}>Выйти</Btn>
        </div>
      )}
      {!others.length && <p className="hint">Пригласи того, с кем живёшь: поливайте по очереди — кто полил, видно под горшком</p>}

      <SillScene
        decor={[]}
        tod={timeOfDay(t)}
        winter={isWinter(t)}
        win={st.window}
        cell={(i) => {
          const p = at(i);
          if (!p) {
            return (
              <motion.button whileTap={{ scale: 0.92 }} className="empty" onClick={() => (g.cuttings.length ? setPlanting(i) : toast('Нет черенков в запасе — возьми у своего растения ✂️'))}>
                <span>+</span>
                <small>{rich(zoneOfSlot(i) === 'glass' ? 'у стекла' : 'в глубине')}</small>
              </motion.button>
            );
          }
          const b = bubble(p);
          return (
            <div className={'slot' + (isSad(p) ? ' sad' : '') + (sel === p.id ? ' picked' : '') + (wants(tool, useItem, p, t, g) ? ' want want-' + tool : '')} role="button" onClick={() => tap(p)}>
              {b && <div className="bubble">{rich(b)}</div>}
              {wants(tool, useItem, p, t, g) && <i className="want-ring" aria-hidden />}
              <div className="art">
                <PlantArt sp={p.sp} form={p.form} hue={p.hue} stage={p.stage} seed={p.id} pot={p.pot} size={potSizeOf(p)} shape={p.shape} blooming={p.blooming} className="plant-svg" />
                {p.stage >= 2 && (() => {
                  const list = plantEffects(p, t).filter((e) => BADGES.includes(e.id)).slice(0, 3);
                  return list.length > 0 && <div className="fx-badges" aria-hidden>{list.map((e) => <i key={e.id} className={'fxb' + (e.bad ? ' bad' : '') + (e.id === 'cut' ? ' ask' : '')}><Emo e={e.icon} size={11} /></i>)}</div>;
                })()}
              </div>
              <div className="label">
                {p.stage >= 2 && (
                  <i className="meter"><i style={{ width: `${Math.min(100, p.moisture * 100)}%`, background: p.moisture > 1 ? '#d9822b' : p.moisture < 0.5 ? '#e0574f' : '#4aa3df' }} /></i>
                )}
                <span>{rich(p.waterBy ? `💧 ${p.waterBy.name === g.name ? 'ты' : p.waterBy.name}, ${ago(t - p.waterBy.at)}` : p.from?.name ? `🌱 ${p.from.name === g.name ? 'ты' : p.from.name}` : '')}</span>
              </div>
            </div>
          );
        }}
      />

      {planting !== null && (
        <div className="panel">
          <div className="lbl">Какой черенок поставить в воду?</div>
          <div className="tray-list">
            {g.cuttings.map((c) => (
              <button key={c.id} className="cutting" onClick={async () => {
                const slot = planting;
                setPlanting(null);
                await act({ kind: 'plant', slot, cutting: { sp: c.sp, ...(c.form ? { form: c.form } : {}), ...(c.hue ? { hue: c.hue } : {}) } }, c.id);
              }}>
                <PlantArt sp={c.sp} form={c.form} hue={c.hue} stage={0} noPot className="mini" />
                <span>{rich(sp(c.sp).name)}</span>
              </button>
            ))}
          </div>
          <Btn small kind="ghost" onClick={() => setPlanting(null)}>Отмена</Btn>
        </div>
      )}

      {selected && (() => {
        const ctx = ctxFor(world, selected, t);
        const effects = plantEffects(selected, t).filter((e) => e.id !== 'problem');
        return (
          <div className="panel coop-card">
            <div className="coop-card-head">
              <b>{rich(sp(selected.sp).name)}</b>
              <button className="linkish small" onClick={() => setSel(null)}>Закрыть</button>
            </div>
            <p className="small"><Emo e="💡" /> {rich(need(selected, t, ctx))}</p>
            {effects.length > 0 && (
              <div className="effects">
                {effects.map((e) => (
                  <div key={e.id} className={'effect' + (e.bad ? ' bad' : '')}>
                    <span className="ef-ic"><Emo e={e.icon} size={18} /></span>
                    <span className="ef-t"><b>{rich(e.name)}</b><small>{rich(e.text)}</small></span>
                    {e.left !== undefined && <span className="ef-left">ещё {leftShort(e.left)}</span>}
                  </div>
                ))}
              </div>
            )}
            <div className="actions">
              {selected.stage >= 2 && <Btn small onClick={() => act({ kind: 'water', plant: selected.id, insist: true })}><Icon name="water" size={16} tone={TONE.water} /> Полить</Btn>}
              {selected.stage >= 2 && sp(selected.sp).mist !== 'no' && <Btn small onClick={() => act({ kind: 'mist', plant: selected.id })}><Icon name="mist" size={16} tone={TONE.mist} /> Опрыскать</Btn>}
              {selected.stage >= 2 && tight(selected) && <Btn small kind="gold" onClick={() => act({ kind: 'repot', plant: selected.id })}><Icon name="repot" size={16} /> Пересадить</Btn>}
              <Btn small onClick={() => {
                const other = selected.zone === 'glass' ? DEEP_ROW : GLASS_ROW;
                const free = other.find((s) => !at(s)) ?? other[0];
                act({ kind: 'move', plant: selected.id, slot: free });
              }}>{rich(selected.zone === 'glass' ? '↓ В глубину' : '↑ К стеклу')}</Btn>
              {canCut(selected, t) && <Btn small kind="gold" onClick={() => act({ kind: 'cut', plant: selected.id })}><Icon name="cut" size={16} /> Черенок</Btn>}
              {selected.stage >= 2 && <Btn small onClick={() => openSheet({ kind: 'inventory' })}><Icon name="bag" size={16} tone="#c98a4b" /> Инвентарь</Btn>}
              <Btn small kind="warn" onClick={() => { if (confirm('Убрать растение с общего подоконника?')) { act({ kind: 'remove', plant: selected.id }); setSel(null); } }}>Убрать</Btn>
            </div>
            {selected.stage >= 2 && (
              <details className="more" open>
                <summary>Что с растением происходит</summary>
                <Processes g={world} p={selected} t={t} ctx={ctx} />
              </details>
            )}
          </div>
        );
      })()}

      {st.plants.some((p) => p.stage >= 2) && (
        <div className="toolbar">
          <AnimatePresence>
            {care && (
              <motion.div className="care-menu" initial={{ opacity: 0, y: 10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.96 }}>
                <button className={tool === 'water' ? 'on' : ''} onClick={() => { setCare(false); setTool('water'); }}><Icon name="water" size={26} tone={TONE.water} /><span>Полить</span></button>
                <button className={tool === 'mist' ? 'on' : ''} onClick={() => { setCare(false); setTool('mist'); }}><Icon name="mist" size={26} tone={TONE.mist} /><span>Опрыскать</span></button>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="tools">
            {([['look', 'look', 'Осмотр'], ['water', tool === 'mist' ? 'mist' : 'water', tool === 'mist' ? 'Опрыскать' : tool === 'water' ? 'Полить' : 'Уход'], ['use', 'bag', 'Инвентарь'], ['cut', 'cut', 'Черенок']] as [string, IconName, string][]).map(([k, icon, label]) => {
              const on = k === 'water' ? tool === 'water' || tool === 'mist' : tool === k;
              const inHand = k === 'use' && tool === 'use' && useItem ? ITEM_BY_ID[useItem] : null;
              return (
                <button key={k} className={'tool' + (on ? ' on' : '')} aria-pressed={on} onClick={() => {
                  if (k === 'water') { setCare(!care); return; }
                  setCare(false);
                  if (k === 'use') { if (tool === 'use') setTool('look'); else openSheet({ kind: 'inventory' }); return; }
                  setTool(tool === k && k !== 'look' ? 'look' : (k as 'look' | 'cut'));
                }}>
                  <span>{inHand ? <Emo e={inHand.icon} size={24} /> : <Icon name={icon} size={24} tone={k === 'use' ? '#c98a4b' : TONE[icon as keyof typeof TONE]} />}</span>
                  <small>{inHand ? rich(inHand.name.split(' ')[0]) : rich(label)}</small>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {st.log.length > 0 && (
        <div className="panel coop-log">
          <h3>Что нового</h3>
          {st.log.slice(0, 8).map((l, i) => (
            <div key={i} className="small"><b>{rich(l.who ? (l.who === g.name ? 'Ты' : l.who) : '🌿')}</b> {rich(l.text)} <span className="muted">· {rich(ago(t - l.at))}</span></div>
          ))}
        </div>
      )}
    </div>
  );
}
