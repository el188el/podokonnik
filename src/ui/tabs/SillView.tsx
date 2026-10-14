import { motion } from 'framer-motion';
import { WINDOWS } from '../../game/constants';
import { activeEvent, eventSeason, tierOf } from '../../game/events';
import { isWinter, fmt } from '../../game/sim';
import { sp } from '../../game/species';
import { now, openSheet, plantAt, setTool, showGift, useStore, waterAll, type Tool } from '../../game/store';
import { CoopSill } from './CoopSill';
import { canFulfil } from '../../game/orders';
import { FallingTokens } from '../FallingTokens';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { chatter } from '../../game/mood';
import { ctxFor } from '../../game/sim';
import { claimFirstChest, moveItem, petCat, placeOpen, say, setArrange, switchItem, SWITCHABLE, toast } from '../../game/store';
import { ITEM_BY_ID, placeOf } from '../../game/shop';
import { zoneOfSlot } from '../../game/layout';
import { PlantArt } from '../art/PlantArt';
import { Slot } from '../Slot';
import { Guide } from '../Guide';
import { firstChest, roundInfo, starterDone, starterLeft } from '../../game/onboarding';
import { TUTORIAL_DONE } from '../../game/store';
import { SillScene, timeOfDay } from '../SillScene';
import { SKY, tempText, weatherAt } from '../../game/weather';
import { platform } from '../../platform';


export function SillView() {
  const coop = useStore((s) => s.coops?.find((c) => c.id === s.coopOn));
  return coop ? <CoopSill coop={coop} /> : <OwnSill />;
}

/** Время от времени одно из растений что-нибудь говорит. */
function useChatter(sillId: string) {
  useEffect(() => {
    const talk = () => {
      if (document.hidden || useStore.getState().sheet) return;
      const g = useStore.getState().game;
      const t = now();
      const list = g.plants.filter((p) => p.sill === sillId && p.stage >= 2);
      if (!list.length) return;
      const p = list[Math.floor(Math.random() * list.length)];
      const fl = useStore.getState().flash[p.id];
      if (fl && fl.until > Date.now()) return;
      say(p.id, chatter(p, t, ctxFor(g, p, t), weatherAt(g, t), Math.random()), 4500);
    };
    const first = setTimeout(talk, 6000);
    const i = setInterval(talk, 22000);
    return () => { clearTimeout(first); clearInterval(i); };
  }, [sillId]);
}

function OwnSill() {
  const g = useStore((s) => s.game);
  const arrange = useStore((s) => s.arrange);
  useEffect(() => () => setArrange(false), []);
  useChatter(g.activeSill);
  const t = now();
  const sill = g.sills.find((s) => s.id === g.activeSill) ?? g.sills[0];
  const tod = timeOfDay(t);
  const winter = isWinter(t);
  const decor = sill.decor.filter((d) => (g.owned[d] ?? 0) > 0);
  const neighbor = g.neighbor && t < g.neighbor.until;
  const ev = activeEvent(t);
  const evp = ev ? g.events?.[eventSeason(ev, t)] : undefined;
  const evReady = ev && evp ? ev.tiers.some((n, i) => evp.tokens >= n && (!evp.free.includes(i) || (evp.premium && !evp.prem.includes(i)))) : false;
  const w = weatherAt(g, t);

  const cellAt = (i: number) => {
    const p = plantAt(g, sill.id, i);
    if (p) return <Slot plant={p} sill={sill.id} slot={i} />;
    if (!placeOpen(g, sill.id, i)) {
      return (
        <motion.button whileTap={{ scale: 0.92 }} className="empty extra" onClick={() => openSheet({ kind: 'place', slot: i })}>
          <span>+</span>
          <small>новое место</small>
        </motion.button>
      );
    }
    return (
      <motion.button
        whileTap={{ scale: 0.92 }}
        className="empty"
        onClick={() => (sill.window ? openSheet({ kind: 'picker', slot: i, sill: sill.id }) : openSheet({ kind: 'window', sill: sill.id, then: 'picker', slot: i }))}
      >
        <span>+</span>
        <small>{zoneOfSlot(i) === 'glass' ? 'у стекла' : 'в глубине'}</small>
      </motion.button>
    );
  };

  // плитки справа от события: что сейчас важно
  const tiles: { key: string; cls: string; text: string; onClick?: () => void; disabled?: boolean }[] = [];
  if (g.pending.length) tiles.push({ key: 'pending', cls: 'ready', text: `🎁 Черенок от ${g.pending[0].from} ждёт места`, onClick: () => showGift({ ...g.pending[0], ok: true }) });
  const chest = firstChest(g, t);
  if (chest) tiles.push({ key: 'chest', cls: chest.ready ? 'ready' : '', text: `🎁 Сундучок · ${chest.ready ? 'открыть!' : fmt(chest.left)}`, onClick: claimFirstChest, disabled: !chest.ready });
  if (g.tutorial >= TUTORIAL_DONE && (g.orders?.list.length ?? 0) > 0) {
    const can = g.orders!.list.some((o) => canFulfil(g, o).ok);
    tiles.push({ key: 'orders', cls: 'orders' + (can ? ' ready' : ''), text: `📋 Соседи просят: ${g.orders!.list.length}${can ? ' ✓' : ''}`, onClick: () => openSheet({ kind: 'orders' }) });
  }
  if (g.tutorial >= TUTORIAL_DONE && !starterDone(g)) {
    const n = starterLeft(g, t).length;
    tiles.push({ key: 'starter', cls: n ? 'ready' : '', text: `🎁 Подарки новичка · ${n ? `забрать (${n})` : 'завтра'}`, onClick: () => openSheet({ kind: 'starter' }) });
  }
  const round = g.tutorial >= TUTORIAL_DONE ? roundInfo(g, t) : null;
  if (round) tiles.push({ key: 'round', cls: 'round' + (round.done ? ' done' : ''), text: `${round.label === 'утренний' ? '🌅' : '🌙'} Обход ${round.done ? '✓' : `${round.checked}/${round.total} · +15 🍃`}` });
  const shown = tiles.slice(0, ev ? 2 : 4);

  return (
    <div className="sillview fit">
      <div className="sillbar">
        <button className="chip win" onClick={() => openSheet({ kind: 'window', sill: sill.id })}>
          🪟 {sill.window ? WINDOWS[sill.window].short : 'Окно?'}
        </button>
        {platform().kind !== 'discord' && (
          <button className="chip" onClick={() => openSheet({ kind: 'weather' })} aria-label="Погода за окном">
            {w ? `${SKY[w.sky].icon} ${tempText(w.temp)}` : '🌦'}
          </button>
        )}
        {neighbor && <button className="chip" onClick={() => openSheet({ kind: 'neighbor' })}>👵 соседка</button>}
        {(g.owned.pot ?? 0) === 0 && <button className="chip alert" onClick={() => openSheet({ kind: 'pots' })} aria-label="Горшки">🪴 0</button>}
        {decor.some((d) => placeOf(d) === 'sill' || placeOf(d) === 'table') && (
          <button className={'chip arrange-chip' + (arrange ? ' on' : '')} onClick={() => setArrange(!arrange)}>{arrange ? '✓ Готово' : '🛋 Переставить'}</button>
        )}
      </div>
      {arrange && <p className="arrange-hint">Перетаскивай предметы и кота: по подоконнику или на столик</p>}

      {g.tutorial < TUTORIAL_DONE ? <Guide /> : (ev || shown.length > 0) && (
        <div className={'info-grid' + (ev ? '' : ' no-event')}>
          {ev && (
            <button className={`event-card theme-${ev.theme}`} onClick={() => openSheet({ kind: 'event' })}>
              <span className="ec-icon">{ev.token}</span>
              <b>{ev.title}</b>
              <small>ур. {tierOf(ev, evp?.tokens ?? 0)}/{ev.tiers.length} · {evp?.tokens ?? 0} {ev.token}</small>
              {evReady && <span className="eb-ready">Награда!</span>}
            </button>
          )}
          {shown.map((x) => (
            <button key={x.key} className={'tile ' + x.cls} onClick={x.onClick} disabled={x.disabled || !x.onClick}>{x.text}</button>
          ))}
        </div>
      )}

      <SceneFit hang={!!decor.includes('hangers')}>
        {(style) => (
          <SillScene
            style={style}
            decor={decor}
            tod={tod}
            winter={winter}
            sky={w?.sky}
            theme={ev?.theme}
            win={sill.window ?? 'E'}
            hangCell={cellAt}
            cell={cellAt}
            onCat={petCat}
            pos={sill.pos}
            off={sill.off}
            arrange={arrange}
            onItem={(id) => itemTap(sill.id, id)}
            onMove={(id, x, row) => moveItem(sill.id, id, x, row)}
          />
        )}
      </SceneFit>

      <FallingTokens />
      {g.cuttings.length > 0 && (
        <div className="tray compact">
          <button className="tray-pots" onClick={() => openSheet({ kind: 'pots' })}>🪴<small>{g.owned.pot ?? 0}</small></button>
          <div className="tray-list">
            {g.cuttings.map((c) => (
              <button key={c.id} className="cutting" onClick={() => openSheet({ kind: 'send', cutting: c.id })} aria-label={sp(c.sp).name}>
                <PlantArt sp={c.sp} form={c.form} hue={c.hue} stage={0} noPot className="mini" />
              </button>
            ))}
          </div>
        </div>
      )}
      <Toolbar sill={sill.id} />
    </div>
  );
}

/**
 * Подоконник занимает всё оставшееся место: высоту рядов считаем по размеру экрана,
 * чтобы главный экран не прокручивался.
 */
function SceneFit({ hang, children }: { hang: boolean; children: (style: CSSProperties) => ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [cellh, setCellh] = useState(150);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      const scene = el.querySelector<HTMLElement>('.scene');
      if (!scene) return;
      const cur = parseFloat(getComputedStyle(scene).getPropertyValue('--cellh')) || 150;
      // всё, кроме двух рядов (рамка, подоконник, столик, кашпо), не зависит от высоты ряда
      const overhead = scene.offsetHeight - 2 * cur;
      const next = Math.max(78, Math.min(200, Math.floor((el.clientHeight - 8 - overhead) / 2)));
      setCellh((c) => (Math.abs(c - next) > 1 ? next : c));
    };
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    fit();
    return () => ro.disconnect();
  }, [hang]);
  return <div className="scene-fit" ref={ref}>{children({ ['--cellh' as string]: `${cellh}px` })}</div>;
}

const TOOLS: [Tool, string, string][] = [
  ['look', '👆', 'Осмотр'],
  ['water', '💧', 'Лейка'],
  ['mist', '💦', 'Опрыскать'],
  ['feed', '🧪', 'Подкормка'],
  ['cut', '✂️', 'Черенок'],
];

function Toolbar({ sill }: { sill: string }) {
  const tool = useStore((s) => s.tool);
  const g = useStore((s) => s.game);
  const potted = g.plants.filter((p) => p.sill === sill && p.stage >= 2);
  if (!potted.length) return null;
  const thirsty = potted.filter((p) => p.moisture < 0.5).length;
  return (
    <div className="toolbar">
      <div className="tools">
        {TOOLS.map(([k, icon, label]) => (
          <button key={k} className={'tool' + (tool === k ? ' on' : '')} onClick={() => setTool(tool === k && k !== 'look' ? 'look' : k)} aria-pressed={tool === k}>
            <span>{icon}</span>
            <small>{k === 'feed' ? `${label} ${g.owned.feed ?? 0}` : label}</small>
          </button>
        ))}
      </div>
      {thirsty >= 2 && (
        <button className="water-all" onClick={() => waterAll(sill)}>💧 Полить всех, кто хочет пить ({thirsty})</button>
      )}
      {tool !== 'look' && <p className="tool-hint">
        {tool === 'water' && '💧 В руке лейка: тап по растению — полить. Тапни лейку ещё раз, чтобы убрать'}
        {tool === 'mist' && '💦 В руке опрыскиватель. Не все растения это любят! Тапни ещё раз, чтобы убрать'}
        {tool === 'feed' && '🧪 Тап — подкормить: сутки растёт в 1,5 раза быстрее. Тапни ещё раз, чтобы убрать'}
        {tool === 'cut' && '✂️ Тап по взрослому растению — взять черенок. Тапни ещё раз, чтобы убрать'}
      </p>}
    </div>
  );
}

/** Нажали на предмет: включить или выключить, а остальные — рассказать, что они делают. */
function itemTap(sillId: string, id: string) {
  if (SWITCHABLE.includes(id)) return switchItem(sillId, id);
  const it = ITEM_BY_ID[id];
  if (it) toast(`${it.icon} ${it.name}: ${it.desc}`);
}
