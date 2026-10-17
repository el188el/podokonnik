// Общий подоконник: те же растения видят и поливают двое (или вся квартира).
// Сам подоконник рисуется тем же экраном, что и свой (SillView), — здесь только
// шапка: кто участвует, приглашение, окно и лента «что нового».

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { CONFIG, tgAppLink } from '../../config';
import { WINDOWS } from '../../game/constants';
import { approx, fmt } from '../../game/sim';
import { coopDo, coopInviteCode, leaveCoop, loadCoops, now, toast, useStore } from '../../game/store';
import type { CoopView } from '../../net/api';
import { playerId } from '../../net/api';
import { platform } from '../../platform';
import { Btn } from '../kit/kit';
import { Emo, rich } from '../kit/rich';

const ago = (ms: number) => (ms < 60e3 ? 'только что' : ms < 86400e3 ? `${fmt(ms)} назад` : `${approx(ms)} назад`);

export const coopLink = (c: CoopView) => tgAppLink(coopInviteCode(c)) || `${CONFIG.siteUrl}?start=${coopInviteCode(c)}`;

export async function shareCoop(c: CoopView) {
  const r = await platform().share({ text: `Давай вместе ухаживать за подоконником «${c.state.name}» 🪴 Поливаем по очереди — кто полил, видно сразу:`, url: coopLink(c) });
  if (r === 'copied') toast('Ссылка скопирована — отправь её 📋');
}

/** Кто и когда полил — коротко, под горшком на общем подоконнике: «ты · 2 ч». */
export function coopWaterLine(p: { waterBy?: { name: string; at: number } }, myName: string, t: number) {
  if (!p.waterBy) return '';
  const ms = t - p.waterBy.at;
  const when = ms < 3600e3 ? `${Math.max(1, Math.round(ms / 60e3))} мин` : ms < 86400e3 ? `${Math.round(ms / 3600e3)} ч` : `${Math.round(ms / 86400e3)} дн`;
  return `💧 ${p.waterBy.name === myName ? 'ты' : p.waterBy.name} · ${when}`;
}

/** Шапка общего подоконника — вместо полоски дел на своём. */
export function CoopHead({ coop }: { coop: CoopView }) {
  const myName = useStore((s) => s.game.name);
  const [menu, setMenu] = useState<'menu' | 'log' | null>(null);
  // пока подоконник открыт — подтягиваем действия соседей каждые 8 с (и сразу при возвращении в игру)
  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') loadCoops(); };
    const i = setInterval(tick, 8e3);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(i); document.removeEventListener('visibilitychange', tick); };
  }, []);
  // пока открыта лента или настройки — облачка растений не лезут поверх них
  useEffect(() => {
    document.body.classList.toggle('coop-panel-open', !!menu);
    return () => document.body.classList.remove('coop-panel-open');
  }, [menu]);
  const st = coop.state;
  const me = playerId();
  const others = coop.members.filter((m) => m.id !== me);
  const t = now();
  const fresh = st.log.filter((l) => t - l.at < 86400e3 && l.who && l.who !== myName).length;
  const toggle = (k: 'menu' | 'log') => setMenu(menu === k ? null : k);
  return (
    <div className="coop-top">
      <div className="coop-head">
        <div>
          <b><Emo e="💞" /> {rich(st.name)}</b>
          <span className="muted small">{rich(coop.members.map((m) => (m.id === me ? 'ты' : m.name)).join(' · '))}</span>
        </div>
        <Btn small kind={others.length ? 'soft' : 'gold'} onClick={() => shareCoop(coop)}>{rich(others.length ? '+ Позвать' : 'Пригласить')}</Btn>
        {st.log.length > 0 && (
          <button className={'chip coop-news' + (menu === 'log' ? ' on' : '')} onClick={() => toggle('log')} aria-label="Что нового">
            <Emo e="🔔" />{fresh > 0 && <i className="se-dot" />}
          </button>
        )}
        <button className={'chip' + (menu === 'menu' ? ' on' : '')} onClick={() => toggle('menu')} aria-label="Настройки общего подоконника">⋯</button>
      </div>
      <AnimatePresence>
        {menu === 'menu' && (
          <motion.div key="menu" className="panel coop-menu" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
            <div className="lbl">Окно</div>
            <div className="chips">
              {(['N', 'E', 'S', 'W'] as const).map((w) => (
                <button key={w} className={'chip' + (st.window === w ? ' on' : '')} onClick={() => coopDo(coop.id, { kind: 'window', side: w })}>{rich(WINDOWS[w].short)}</button>
              ))}
            </div>
            <p className="muted small">Код приглашения: <b>{rich(coop.code)}</b></p>
            <Btn small kind="warn" onClick={() => { if (confirm('Выйти из общего подоконника? Растения останутся у остальных.')) leaveCoop(coop.id); }}>Выйти</Btn>
          </motion.div>
        )}
        {menu === 'log' && (
          <motion.div key="log" className="panel coop-log" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
            <h3>Что нового</h3>
            {st.log.slice(0, 10).map((l, i) => (
              <div key={i} className="small"><b>{rich(l.who ? (l.who === myName ? 'Ты' : l.who) : '🌿')}</b> {rich(l.text)} <span className="muted">· {rich(ago(t - l.at))}</span></div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {!others.length && !menu && <p className="hint">Пригласи того, с кем живёшь: поливайте по очереди — кто полил, видно под горшком</p>}
    </div>
  );
}
