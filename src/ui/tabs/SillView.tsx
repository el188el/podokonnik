import { AnimatePresence, motion } from 'framer-motion';
import type { GameState } from '../../game/types';
import { Icon, TONE, type IconName } from '../kit/icons';
import { activeEvent, eventSeason, tierOf } from '../../game/events';
import { canCut, isWinter, fmt } from '../../game/sim';
import { isPlus, now, openSheet, plantAt, setTab, setTool, showGift, USABLE, useStore, waterAll, type Tool } from '../../game/store';
import { CoopSill } from './CoopSill';
import { canFulfil } from '../../game/orders';
import { FallingTokens } from '../FallingTokens';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { chatter } from '../../game/mood';
import { ctxFor } from '../../game/sim';
import { claimFirstChest, moveItem, toggleDecor, petCat, placeOpen, say, setArrange, switchItem, SWITCHABLE, toast } from '../../game/store';
import { ITEMS, ITEM_BY_ID, placeOf } from '../../game/shop';
import { climateOf, tempWord } from '../../game/climate';
import { darkWall, roomVars } from '../../game/room';
import { zoneOfSlot } from '../../game/layout';
import { Slot, wantsTool } from '../Slot';
import { Guide } from '../Guide';
import { chestReady, firstChest, firstStepNow, roundInfo, starterDone, starterLeft } from '../../game/onboarding';
import { TUTORIAL_DONE } from '../../game/store';
import { SillScene, timeOfDay } from '../SillScene';
import { tempText, weatherAt } from '../../game/weather';
import { platform } from '../../platform';
import { Emo, rich } from '../kit/rich';
import { swipeDir, useRoomSwipe } from '../useRoomSwipe';


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


export type DayTile = { key: string; cls: string; text: string; onClick?: () => void; disabled?: boolean };

/** Дела на сегодня: подарки, просьбы соседей, обход… Сначала то, что можно забрать прямо сейчас. */
export function dayTiles(g: GameState, t: number): DayTile[] {
  const sill = g.sills.find((s) => s.id === g.activeSill) ?? g.sills[0];
  const tiles: DayTile[] = [];
  if (g.pending.length) tiles.push({ key: 'pending', cls: 'ready', text: `🎁 Черенок от ${g.pending[0].from} ждёт места`, onClick: () => showGift({ ...g.pending[0], ok: true }) });
  const step = g.tutorial >= TUTORIAL_DONE ? firstStepNow(g) : null;
  if (step) tiles.push({ key: 'steps', cls: 'steps' + (step.ready ? ' ready' : ''), text: step.ready ? `🧭 ${step.step.title} — забрать +${step.step.leaves} 🍃` : `🧭 ${step.step.icon} ${step.step.title}`, onClick: () => openSheet({ kind: 'firststeps' }) });
  const chest = firstChest(g, t);
  if (chest) tiles.push({ key: 'chest', cls: chest.ready ? 'ready' : '', text: `⏳ Подарок первого часа · ${chest.ready ? 'открыть!' : fmt(chest.left)}`, onClick: claimFirstChest, disabled: !chest.ready });
  if (g.tutorial >= TUTORIAL_DONE && (g.orders?.list.length ?? 0) > 0) {
    const can = g.orders!.list.some((o) => canFulfil(g, o).ok);
    tiles.push({ key: 'orders', cls: 'orders' + (can ? ' ready' : ''), text: `📋 Соседи просят: ${g.orders!.list.length}${can ? ' ✓' : ''}`, onClick: () => openSheet({ kind: 'orders' }) });
  }
  if (g.tutorial >= TUTORIAL_DONE) {
    const ready = chestReady(g, t);
    const n = starterDone(g) ? 0 : starterLeft(g, t).length;
    tiles.push({ key: 'starter', cls: ready ? 'ready' : '', text: `🎁 Сундучок · ${ready ? (n > 1 ? `забрать (${n})` : 'забрать!') : 'завтра'}`, onClick: () => openSheet({ kind: 'starter' }) });
  }
  const round = g.tutorial >= TUTORIAL_DONE ? roundInfo(g, t) : null;
  if (round) tiles.push({ key: 'round', cls: 'round' + (round.done ? ' done' : ''), text: `${round.label === 'утренний' ? '🌅' : '🌙'} Обход ${round.done ? '✓' : `${round.checked}/${round.total} · +15 🍃`}` });
  // сначала то, что можно забрать прямо сейчас (подарки, награды), потом остальное

  if (g.neighbor && t < g.neighbor.until) tiles.push({ key: 'neighbor', cls: '', text: `👵 Соседка поливает · ещё ${fmt(g.neighbor.until - t)}`, onClick: () => openSheet({ kind: 'neighbor' }) });
  if ((g.owned.pot ?? 0) === 0) tiles.push({ key: 'pots', cls: 'alert', text: '🪴 Горшки закончились', onClick: () => openSheet({ kind: 'pots' }) });
  void sill;
  return tiles.sort((x, y) => Number(/ready|alert/.test(y.cls)) - Number(/ready|alert/.test(x.cls)));
}

function OwnSill() {
  const g = useStore((s) => s.game);
  const toolNow = useStore((s) => s.tool);
  const arrange = useStore((s) => s.arrange);
  useEffect(() => () => setArrange(false), []);
  useChatter(g.activeSill);
  const t = now();
  const sill = g.sills.find((s) => s.id === g.activeSill) ?? g.sills[0];
  const tod = timeOfDay(t);
  const winter = isWinter(t);
  const decor = sill.decor.filter((d) => (g.owned[d] ?? 0) > 0);
  // весь купленный декор, который можно поставить или убрать (кашпо и обои — в профиле)
  const stash = ITEMS.filter((it) => it.cat === 'decor' && !it.consumable && it.place && it.place !== 'spot' && it.place !== 'wallpaper' && (g.owned[it.id] ?? 0) > 0).map((it) => it.id);
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
        <small>{rich(zoneOfSlot(i) === 'glass' ? 'у стекла' : 'в глубине')}</small>
      </motion.button>
    );
  };

  const tiles = dayTiles(g, t);
  const shown = tiles.slice(0, 2);
  const more = tiles.length - shown.length;
  const swipe = useRoomSwipe();
  const clim = climateOf(g, sill, t);
  const climBad = clim.draft || clim.bugs || clim.temp < 16 || clim.temp > 29 || clim.rh < 30;

  return (
    <div className="sillview fit" {...swipe}>
      {arrange && (
        <div className="arrange-bar">
          <span>Перетаскивай предметы и котиков, <Emo e="✕" /> — убрать</span>
          <button className="linkish" onClick={() => openSheet({ kind: 'room' })}><Emo e="🎨" /> Цвета</button>
          <button className="btn small primary" onClick={() => setArrange(false)}>Готово</button>
        </div>
      )}
      {arrange && (
        <div className="stash" aria-label="Твой декор">
          {stash.map((id) => {
            const here = sill.decor.includes(id);
            return (
              <button key={id} className={'stash-item' + (here ? ' on' : '')} onClick={() => toggleDecor(sill.id, id)} title={ITEM_BY_ID[id]?.name}>
                <span>{rich(ITEM_BY_ID[id]?.icon)}</span><small>{rich(here ? 'убрать' : 'поставить')}</small>
              </button>
            );
          })}
        </div>
      )}

      {g.tutorial < TUTORIAL_DONE ? <Guide /> : !arrange && toolNow !== 'look' && g.plants.some((p) => p.sill === sill.id && p.stage >= 2) ? <ToolTip sill={sill.id} /> : !arrange && (
        <div className="info-strip">
          {platform().kind !== 'discord' && (
            <button className={'strip-clim' + (climBad ? ' alert' : '')} onClick={() => openSheet({ kind: 'climate' })} aria-label="Погода и климат в комнате">
              <span><Icon name={w ? w.sky : 'thermo'} size={24} tone={w && (w.sky === 'clear' || w.sky === 'partly') ? '#e8a325' : '#5f7f9a'} /></span>
              <span className="sc-text"><b>{rich(w ? tempText(w.temp) : `${Math.round(clim.temp)}°`)}</b><small>{rich(climBad ? 'неуютно' : 'дома ' + tempWord(clim.temp))}</small></span>
            </button>
          )}
          {ev && (
            <button className={`strip-event theme-${ev.theme}`} onClick={() => openSheet({ kind: 'event' })}>
              <span className="se-icon">{rich(ev.token)}</span>
              <span className="se-text"><b>{rich(ev.title)}</b><small>ур. {tierOf(ev, evp?.tokens ?? 0)}/{ev.tiers.length}</small></span>
              {evReady && <i className="se-dot" />}
            </button>
          )}
          {shown.map((x) => (
            <button key={x.key} className={'tile ' + x.cls} onClick={x.onClick} disabled={x.disabled || !x.onClick}>{rich(x.text)}</button>
          ))}
          {more > 0 && <button className="tile more" onClick={() => openSheet({ kind: 'todo' })} aria-label={`Ещё дела: ${more}`}>+{more}</button>}
        </div>
      )}

      <motion.div className="room-slide" key={sill.id} initial={swipeDir.v ? { x: swipeDir.v * 60, opacity: 0 } : false} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.25 }}>
      <SceneFit hang={!!decor.includes('hangers')}>
        {(style) => (
          <SillScene
            style={{ ...style, ...roomVars(decor.some((d) => placeOf(d) === 'wallpaper') ? { ...sill.colors, wall: undefined } : sill.colors) } as CSSProperties}
            className={darkWall(sill.colors?.wall) ? 'dark-wall' : ''}
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
            catColors={g.catColors}
            onHide={(id) => toggleDecor(sill.id, id)}
            vent={sill.vent}
            curtains={sill.curtains}
            draft={climateOf(g, sill, t).draft}
            arrange={arrange}
            onItem={(id) => itemTap(sill.id, id)}
            onMove={(id, x, row) => moveItem(sill.id, id, x, row)}
          />
        )}
      </SceneFit>
      </motion.div>

      <FallingTokens />
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
      const next = Math.max(58, Math.min(200, Math.floor((el.clientHeight - 8 - overhead) / 2)));
      setCellh((c) => (Math.abs(c - next) > 1 ? next : c));
    };
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    fit();
    return () => ro.disconnect();
  }, [hang]);
  return <div className="scene-fit" ref={ref}>{rich(children({ ['--cellh' as string]: `${cellh}px` }))}</div>;
}

const TOOLS: [Tool, IconName, string][] = [
  ['look', 'look', 'Осмотр'],
  ['water', 'water', 'Уход'],
  ['use', 'bag', 'Инвентарь'],
  ['cut', 'cut', 'Черенок'],
];

/** Подсказка над инструментами: что делать, когда инструмент в руке. */
const TOOL_TIP: Partial<Record<Tool, [IconName, string, string]>> = {
  water: ['water', 'Нажми на цветок', 'Пить никто не хочет'],
  mist: ['mist', 'Нажми на цветок', 'Опрыскивать некого'],
  feed: ['feed', 'Нажми на цветок', 'Подкормка не нужна'],
  cut: ['cut', 'Нажми на цветок', 'Черенков пока нет'],
};

function Toolbar({ sill }: { sill: string }) {
  const tool = useStore((s) => s.tool);
  const g = useStore((s) => s.game);
  const [care, setCare] = useState(false);
  const useItem = useStore((s) => s.useItem);
  const potted = g.plants.filter((p) => p.sill === sill && p.stage >= 2);
  if (!potted.length) return null;
  const cuts = potted.filter((p) => canCut(p, now())).length;
  const thirsty = potted.filter((p) => p.moisture < 0.5).length;
  const plus = isPlus(g);
  const careOn = tool === 'water' || tool === 'mist';
  const usable = USABLE.reduce((n, id) => n + (g.owned[id] ?? 0), 0);
  const careIcon: IconName = tool === 'mist' ? 'mist' : 'water';
  // «Уход» — меню из трёх: полить, опрыскать или полить всех (Садовник+)
  const pick = (k: 'water' | 'mist' | 'all') => {
    setCare(false);
    if (k === 'all') {
      if (!plus) { toast('👑 «Полить всех» — с подпиской Садовник+'); setTab('shop'); return; }
      waterAll(sill);
      return;
    }
    setTool(k);
  };
  return (
    <div className="toolbar">
      <AnimatePresence>
        {care && (
          <motion.div className="care-menu" initial={{ opacity: 0, y: 10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.96 }}>
            <button className={tool === 'water' ? 'on' : ''} onClick={() => pick('water')}><Icon name="water" size={26} tone={TONE.water} /><span>Полить</span></button>
            <button className={tool === 'mist' ? 'on' : ''} onClick={() => pick('mist')}><Icon name="mist" size={26} tone={TONE.mist} /><span>Опрыскать</span></button>
            <button className={plus ? '' : 'locked'} onClick={() => pick('all')}>
              <Icon name={plus ? 'waterAll' : 'crown'} size={26} tone={plus ? TONE.water : '#ffc35a'} />
              <span>Всем{thirsty ? ` · ${thirsty}` : ''}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="tools">
        {TOOLS.map(([k, icon, label]) => {
          const isCare = k === 'water';
          const on = isCare ? careOn : tool === k;
          const ic = isCare ? careIcon : icon;
          const inHand = k === 'use' && tool === 'use' && useItem ? ITEM_BY_ID[useItem] : null;
          return (
            <button key={k} className={'tool' + (on ? ' on' : '')} aria-pressed={on} aria-expanded={isCare ? care : undefined}
              onClick={() => {
                if (isCare) { setCare(!care); return; }
                setCare(false);
                if (k === 'use') { if (tool === 'use') setTool('look'); else openSheet({ kind: 'inventory' }); return; }
                setTool(tool === k && k !== 'look' ? 'look' : k);
              }}>
              <span>{inHand ? <Emo e={inHand.icon} size={24} /> : <Icon name={ic} size={24} tone={k === 'use' ? '#c98a4b' : TONE[ic as keyof typeof TONE]} />}</span>
              <small>{isCare && careOn ? (tool === 'mist' ? 'Опрыскать' : 'Полить') : inHand ? rich(inHand.name.split(' ')[0]) : rich(label)}</small>
              {k === 'use' && !inHand && usable > 0 && <i className="tool-badge">{usable}</i>}
              {inHand && <i className="tool-badge">{g.owned[useItem!] ?? 0}</i>}
              {k === 'cut' && cuts > 0 && <i className="tool-badge ready">{cuts}</i>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Пока инструмент в руке — сверху подсказка (вместо полоски дел), чтобы не закрывать цветы. */
function ToolTip({ sill }: { sill: string }) {
  const tool = useStore((s) => s.tool);
  const useItem = useStore((s) => s.useItem);
  const g = useStore((s) => s.game);
  const potted = g.plants.filter((p) => p.sill === sill && p.stage >= 2);
  const fits = tool === 'look' ? 0 : potted.filter((p) => wantsTool(tool, p, now())).length;
  return (
    <div className="tool-tip-wrap">
      <AnimatePresence>
        {tool === 'use' && useItem && ITEM_BY_ID[useItem] && (
          <motion.div key={'use' + useItem} className="tool-tip want-use" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
            <Emo e={ITEM_BY_ID[useItem].icon} size={18} />
            <span>{fits ? `${ITEM_BY_ID[useItem].name}: нажми на цветок` : `${ITEM_BY_ID[useItem].name} сейчас никому не нужно`}</span>
            {fits > 0 && <b className="tt-n" aria-label={`подсвечено: ${fits}`}>{fits}</b>}
            <button onClick={() => setTool('look')} aria-label="Убрать из руки"><Icon name="close" size={16} /></button>
          </motion.div>
        )}
        {tool !== 'look' && TOOL_TIP[tool] && (
          <motion.div key={tool} className={"tool-tip want-" + tool} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
            <Icon name={TOOL_TIP[tool][0]} size={18} tone={TONE[TOOL_TIP[tool][0] as keyof typeof TONE]} />
            <span>{fits ? TOOL_TIP[tool][1] : TOOL_TIP[tool][2]}</span>
            {fits > 0 && <b className="tt-n" aria-label={`подсвечено: ${fits}`}>{fits}</b>}
            <button onClick={() => setTool('look')} aria-label="Убрать инструмент"><Icon name="close" size={16} /></button>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
  );
}

/** Нажали на предмет: включить или выключить, а остальные — рассказать, что они делают. */
function itemTap(sillId: string, id: string) {
  if (SWITCHABLE.includes(id)) return switchItem(sillId, id);
  const it = ITEM_BY_ID[id];
  if (it) toast(`${it.icon} ${it.name}: ${it.desc}`);
}
