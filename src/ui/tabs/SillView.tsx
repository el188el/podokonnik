import { motion } from 'framer-motion';
import { WINDOWS } from '../../game/constants';
import { activeEvent, eventSeason, tierOf } from '../../game/events';
import { isWinter, seasonName, fmt } from '../../game/sim';
import { sp } from '../../game/species';
import { now, openSheet, plantAt, setActiveSill, setTool, showGift, useStore, waterAll, type Tool } from '../../game/store';
import type { GameState } from '../../game/types';
import { PlantArt } from '../art/PlantArt';
import { Slot } from '../Slot';
import { Guide } from '../Guide';
import { roundInfo, starterDone, starterLeft } from '../../game/onboarding';
import { TUTORIAL_DONE } from '../../game/store';
import { SillScene, timeOfDay } from '../SillScene';


function hint(g: GameState, t: number): string {
  const here = g.plants.filter((p) => p.sill === g.activeSill);
  if (!g.plants.length && !g.cuttings.length) return 'Тапни по свободному месту и выбери первое растение';
  if (!here.length) return 'Здесь пока пусто. Посади черенок из запаса или купи в магазине';
  const p = here.find((x) => x.stage <= 1) ?? here[0];
  if (p.stage === 0 && !p.rootStart) return 'Тапни по стакану, чтобы налить воды 💧';
  if (p.stage === 0) return 'Черенок пускает корни. Это совсем недолго ⏳';
  if (p.stage === 1) return 'Корни есть! Тапни, чтобы посадить в горшок 🪴';
  if (g.stats.waters < 6) return 'Верхний ряд — у стекла, нижний — в глубине. Зажми горшок и перетащи, чтобы поменять место';
  const thirsty = here.filter((x) => x.stage >= 2 && x.moisture < 0.25).length;
  if (thirsty) return `Хотят пить: ${thirsty} 💧`;
  if (g.neighbor && t < g.neighbor.until) return `👵 Соседка поливает ещё ${fmt(g.neighbor.until - t)}`;
  return `${seasonName(t)[0].toUpperCase() + seasonName(t).slice(1)} за окном. Растениям хорошо 🌿`;
}


export function SillView() {
  const g = useStore((s) => s.game);
  const t = now();
  const sill = g.sills.find((s) => s.id === g.activeSill) ?? g.sills[0];
  const tod = timeOfDay(t);
  const winter = isWinter(t);
  const decor = sill.decor.filter((d) => (g.owned[d] ?? 0) > 0);
  const neighbor = g.neighbor && t < g.neighbor.until;
  const ev = activeEvent(t);
  const evp = ev ? g.events?.[eventSeason(ev, t)] : undefined;
  const evReady = ev && evp ? ev.tiers.some((n, i) => evp.tokens >= n && (!evp.free.includes(i) || (evp.premium && !evp.prem.includes(i)))) : false;
  const twinsDue = (g.twins ?? []).filter((x) => !x.lastWater || t >= x.lastWater + x.every * 86400e3).length;

  return (
    <div className="sillview">
      <div className="sillbar">
        {g.sills.length > 1 && (
          <div className="chips">
            {g.sills.map((s) => (
              <button key={s.id} className={'chip' + (s.id === sill.id ? ' on' : '')} onClick={() => setActiveSill(s.id)}>
                {s.name}
              </button>
            ))}
          </div>
        )}
        <button className="chip win" onClick={() => openSheet({ kind: 'window', sill: sill.id })}>
          🪟 {sill.window ? WINDOWS[sill.window].short : 'Окно?'}
        </button>
        {neighbor && <button className="chip" onClick={() => openSheet({ kind: 'neighbor' })}>👵 соседка</button>}
        <button className={'chip' + (twinsDue ? ' alert' : '')} onClick={() => openSheet({ kind: 'twins' })}>🏠 Настоящие{twinsDue ? ` 💧${twinsDue}` : ''}</button>
      </div>
      {ev && (
        <button className={`event-banner theme-${ev.theme}`} onClick={() => openSheet({ kind: 'event' })}>
          <span className="eb-icon">{ev.token}</span>
          <span className="eb-text"><b>{ev.title}</b><small>уровень {tierOf(ev, evp?.tokens ?? 0)}/{ev.tiers.length} · {evp?.tokens ?? 0} {ev.token}</small></span>
          {evReady ? <span className="eb-ready">Награда!</span> : <span className="eb-go">›</span>}
        </button>
      )}
      {g.tutorial < TUTORIAL_DONE ? <Guide /> : <p className="hint">{hint(g, t)}</p>}

      {g.tutorial >= TUTORIAL_DONE && !starterDone(g) && (
        <button className={'mini-banner starter-banner' + (starterLeft(g, t).length ? ' ready' : '')} onClick={() => openSheet({ kind: 'starter' })}>
          🎁 Подарки новичка · {starterLeft(g, t).length ? `забрать (${starterLeft(g, t).length})` : 'завтра новый'}
        </button>
      )}
      {(() => {
        const r = roundInfo(g, t);
        if (!r || g.tutorial < TUTORIAL_DONE) return null;
        return (
          <div className={'mini-banner round-banner' + (r.done ? ' done' : '')}>
            {r.label === 'утренний' ? '🌅' : '🌙'} {r.done ? `${r.label[0].toUpperCase() + r.label.slice(1)} обход сделан ✓` : `${r.label[0].toUpperCase() + r.label.slice(1)} обход: загляни к каждому растению ${r.checked}/${r.total} · +15 🍃`}
          </div>
        );
      })()}

      {g.pending.length > 0 && (
        <button className="pending" onClick={() => showGift({ ...g.pending[0], ok: true })}>
          🎁 Черенок {sp(g.pending[0].sp).gen} от {g.pending[0].from} ждёт свободного места
        </button>
      )}

      <SillScene
        decor={decor}
        tod={tod}
        winter={winter}
        theme={ev?.theme}
        win={sill.window ?? 'E'}
        cell={(i) => {
          const p = plantAt(g, sill.id, i);
          if (p) return <Slot plant={p} sill={sill.id} slot={i} />;
          return (
            <motion.button
              whileTap={{ scale: 0.92 }}
              className="empty"
              onClick={() => (sill.window ? openSheet({ kind: 'picker', slot: i, sill: sill.id }) : openSheet({ kind: 'window', sill: sill.id, then: 'picker', slot: i }))}
            >
              <span>+</span>
              <small>{i < 3 ? 'у стекла' : 'в глубине'}</small>
            </motion.button>
          );
        }}
      />

      <Toolbar sill={sill.id} />


      {g.cuttings.length > 0 && (
        <div className="tray">
          <div className="tray-title">✂️ Черенки в запасе</div>
          <div className="tray-list">
            {g.cuttings.map((c) => (
              <button key={c.id} className="cutting" onClick={() => openSheet({ kind: 'send', cutting: c.id })}>
                <PlantArt sp={c.sp} form={c.form} stage={0} noPot className="mini" />
                <span>{sp(c.sp).name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const TOOLS: [Tool, string, string][] = [
  ['water', '💧', 'Лейка'],
  ['mist', '💦', 'Опрыскать'],
  ['feed', '🧪', 'Подкормка'],
  ['cut', '✂️', 'Черенок'],
  ['look', '🔍', 'Осмотр'],
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
          <button key={k} className={'tool' + (tool === k ? ' on' : '')} onClick={() => setTool(k)} aria-pressed={tool === k}>
            <span>{icon}</span>
            <small>{k === 'feed' ? `${label} ${g.owned.feed ?? 0}` : label}</small>
          </button>
        ))}
      </div>
      {thirsty >= 2 && (
        <button className="water-all" onClick={() => waterAll(sill)}>💧 Полить всех, кто хочет пить ({thirsty})</button>
      )}
      <p className="tool-hint">
        {tool === 'water' && 'Тап — полить. Долгий тап — карточка, потяни — переставить'}
        {tool === 'mist' && 'Тап — опрыскать. Не все растения это любят!'}
        {tool === 'feed' && 'Тап — подкормить: сутки растёт в 1,5 раза быстрее'}
        {tool === 'cut' && 'Тап по взрослому растению — взять черенок'}
        {tool === 'look' && 'Тап — открыть карточку растения'}
      </p>
    </div>
  );
}
