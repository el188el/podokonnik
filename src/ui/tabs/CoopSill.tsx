// Общий подоконник: те же растения видят и поливают двое (или вся квартира).

import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { CONFIG, tgAppLink } from '../../config';
import { WINDOWS } from '../../game/constants';
import { DEEP_ROW, GLASS_ROW, zoneOfSlot } from '../../game/layout';
import { COOP_SILL, coopAdvance, type CoopAction } from '../../game/coop';
import { approx, canCut, fmt, isSad, need, rootsAt, type Ctx } from '../../game/sim';
import { sp } from '../../game/species';
import { coopDo, coopInviteCode, leaveCoop, loadCoops, now, setTool, toast, useStore, type Tool } from '../../game/store';
import type { Plant } from '../../game/types';
import type { CoopView } from '../../net/api';
import { playerId } from '../../net/api';
import { platform } from '../../platform';
import { PlantArt } from '../art/PlantArt';
import { Btn } from '../kit/kit';
import { SillScene, timeOfDay } from '../SillScene';
import { isWinter } from '../../game/sim';

const ago = (ms: number) => (ms < 60e3 ? 'только что' : ms < 86400e3 ? `${fmt(ms)} назад` : `${approx(ms)} назад`);

export const coopLink = (c: CoopView) => tgAppLink(coopInviteCode(c)) || `${CONFIG.siteUrl}?start=${coopInviteCode(c)}`;

export async function shareCoop(c: CoopView) {
  const r = await platform().share({ text: `Давай вместе ухаживать за подоконником «${c.state.name}» 🪴 Поливаем по очереди — кто полил, видно сразу:`, url: coopLink(c) });
  if (r === 'copied') toast('Ссылка скопирована — отправь её 📋');
}

const TOOLS: [Tool, string, string][] = [
  ['water', '💧', 'Лейка'],
  ['mist', '💦', 'Опрыскать'],
  ['cut', '✂️', 'Черенок'],
  ['look', '🔍', 'Осмотр'],
];

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
    const c = structuredClone(coop.state);
    coopAdvance(c, tSec * 1000);
    return c;
  }, [coop, tSec]);
  useEffect(() => { const i = setInterval(loadCoops, 60e3); return () => clearInterval(i); }, []);

  const ctx: Ctx = { sill: { id: COOP_SILL, name: st.name, window: st.window, decor: [] }, lamp: false, neighbor: false };
  const me = playerId();
  const others = coop.members.filter((m) => m.id !== me);
  const at = (slot: number) => st.plants.find((p) => p.slot === slot);
  const selected = st.plants.find((p) => p.id === sel);
  const act = (a: CoopAction, cutting?: string) => coopDo(coop.id, a, cutting);

  const tap = async (p: Plant) => {
    if (p.stage === 1) return act({ kind: 'pot', plant: p.id });
    if (tool === 'look' || (p.stage === 0 && p.rootStart)) return setSel(p.id === sel ? null : p.id);
    if (tool === 'mist') return act({ kind: 'mist', plant: p.id });
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
    if (p.moisture < 0.25) return 'Хочу пить';
    if (canCut(p, t)) return '✂️ Черенок готов';
    return null;
  };

  return (
    <div className="sillview coop">
      <div className="coop-head">
        <div>
          <b>💞 {st.name}</b>
          <span className="muted small">{coop.members.map((m) => (m.id === me ? 'ты' : m.name)).join(' · ')}</span>
        </div>
        <Btn small kind={others.length ? 'soft' : 'gold'} onClick={() => shareCoop(coop)}>{others.length ? '+ Позвать' : 'Пригласить'}</Btn>
        <button className="chip" onClick={() => setMenu(!menu)} aria-label="Настройки общего подоконника">⋯</button>
      </div>
      {menu && (
        <div className="panel coop-menu">
          <div className="lbl">Окно</div>
          <div className="chips">
            {(['N', 'E', 'S', 'W'] as const).map((w) => (
              <button key={w} className={'chip' + (st.window === w ? ' on' : '')} onClick={() => act({ kind: 'window', side: w })}>{WINDOWS[w].short}</button>
            ))}
          </div>
          <p className="muted small">Код приглашения: <b>{coop.code}</b></p>
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
                <small>{zoneOfSlot(i) === 'glass' ? 'у стекла' : 'в глубине'}</small>
              </motion.button>
            );
          }
          const b = bubble(p);
          return (
            <div className={'slot' + (isSad(p) ? ' sad' : '') + (sel === p.id ? ' picked' : '')} role="button" onClick={() => tap(p)}>
              {b && <div className="bubble">{b}</div>}
              <div className="art">
                <PlantArt sp={p.sp} form={p.form} hue={p.hue} stage={p.stage} seed={p.id} pot={p.pot} bigPot={p.bigPot} blooming={p.blooming} className="plant-svg" />
              </div>
              <div className="label">
                {p.stage >= 2 && (
                  <i className="meter"><i style={{ width: `${Math.min(100, p.moisture * 100)}%`, background: p.moisture > 1 ? '#d9822b' : p.moisture < 0.25 ? '#e0574f' : '#4aa3df' }} /></i>
                )}
                <b>{sp(p.sp).name}</b>
                <span>{p.waterBy ? `💧 ${p.waterBy.name === g.name ? 'ты' : p.waterBy.name}, ${ago(t - p.waterBy.at)}` : p.from?.name ? `🌱 ${p.from.name === g.name ? 'ты' : p.from.name}` : ''}</span>
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
                <span>{sp(c.sp).name}</span>
              </button>
            ))}
          </div>
          <Btn small kind="ghost" onClick={() => setPlanting(null)}>Отмена</Btn>
        </div>
      )}

      {selected && (
        <div className="panel coop-card">
          <b>{sp(selected.sp).name}</b>
          <p className="small">💡 {need(selected, t, ctx)}</p>
          <div className="actions">
            {selected.stage >= 2 && <Btn small onClick={() => act({ kind: 'water', plant: selected.id, insist: true })}>💧 Полить</Btn>}
            <Btn small onClick={() => {
              const other = selected.zone === 'glass' ? DEEP_ROW : GLASS_ROW;
              const free = other.find((s) => !at(s)) ?? other[0];
              act({ kind: 'move', plant: selected.id, slot: free });
            }}>{selected.zone === 'glass' ? '↓ В глубину' : '↑ К стеклу'}</Btn>
            {canCut(selected, t) && <Btn small kind="gold" onClick={() => act({ kind: 'cut', plant: selected.id })}>✂️ Черенок</Btn>}
            <Btn small kind="warn" onClick={() => { if (confirm('Убрать растение с общего подоконника?')) { act({ kind: 'remove', plant: selected.id }); setSel(null); } }}>Убрать</Btn>
          </div>
        </div>
      )}

      {st.plants.some((p) => p.stage >= 2) && (
        <div className="toolbar">
          <div className="tools">
            {TOOLS.map(([k, icon, label]) => (
              <button key={k} className={'tool' + (tool === k ? ' on' : '')} onClick={() => setTool(k)} aria-pressed={tool === k}>
                <span>{icon}</span>
                <small>{label}</small>
              </button>
            ))}
          </div>
        </div>
      )}

      {st.log.length > 0 && (
        <div className="panel coop-log">
          <h3>Что нового</h3>
          {st.log.slice(0, 8).map((l, i) => (
            <div key={i} className="small"><b>{l.who ? (l.who === g.name ? 'Ты' : l.who) : '🌿'}</b> {l.text} <span className="muted">· {ago(t - l.at)}</span></div>
          ))}
        </div>
      )}
    </div>
  );
}
