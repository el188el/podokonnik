import { motion } from 'framer-motion';
import { SLOTS, WINDOWS, ZONE_NAME } from '../../game/constants';
import { isWinter, seasonName, fmt } from '../../game/sim';
import { sp } from '../../game/species';
import { now, openSheet, plantAt, setActiveSill, showGift, useStore } from '../../game/store';
import type { GameState } from '../../game/types';
import { PlantArt } from '../art/PlantArt';
import { Slot } from '../Slot';

function timeOfDay(t: number) {
  const h = new Date(t).getHours();
  return h >= 7 && h < 17 ? 'day' : h >= 17 && h < 21 ? 'eve' : h >= 5 && h < 7 ? 'dawn' : 'night';
}

function hint(g: GameState, t: number): string {
  const here = g.plants.filter((p) => p.sill === g.activeSill);
  if (!g.plants.length && !g.cuttings.length) return 'Тапни по свободному месту и выбери первое растение';
  if (!here.length) return 'Здесь пока пусто. Посади черенок из запаса или купи в магазине';
  const p = here.find((x) => x.stage <= 1) ?? here[0];
  if (p.stage === 0 && !p.rootStart) return 'Тапни по стакану, чтобы налить воды 💧';
  if (p.stage === 0) return 'Черенок пускает корни. Это совсем недолго ⏳';
  if (p.stage === 1) return 'Корни есть! Тапни, чтобы посадить в горшок 🪴';
  if (g.stats.waters < 2) return 'Тап — полить. Долгий тап — карточка растения';
  if (g.stats.waters < 6) return 'Зажми горшок и потяни: вверх — к стеклу, вниз — в глубину, вбок — на другое место';
  const thirsty = here.filter((x) => x.stage >= 2 && x.moisture < 0.25).length;
  if (thirsty) return `Хотят пить: ${thirsty} 💧`;
  if (g.neighbor && t < g.neighbor.until) return `👵 Соседка поливает ещё ${fmt(g.neighbor.until - t)}`;
  return `${seasonName(t)[0].toUpperCase() + seasonName(t).slice(1)} за окном. Растениям хорошо 🌿`;
}

const DECOR_ICON: Record<string, string> = { cat: '🐈', radio: '📻', vase: '🏺', books: '📚', lamp: '💡' };

export function SillView() {
  const g = useStore((s) => s.game);
  const t = now();
  const sill = g.sills.find((s) => s.id === g.activeSill) ?? g.sills[0];
  const tod = timeOfDay(t);
  const winter = isWinter(t);
  const decor = sill.decor.filter((d) => (g.owned[d] ?? 0) > 0);
  const neighbor = g.neighbor && t < g.neighbor.until;

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
      </div>
      <p className="hint">{hint(g, t)}</p>

      {g.pending.length > 0 && (
        <button className="pending" onClick={() => showGift({ ...g.pending[0], ok: true })}>
          🎁 Черенок {sp(g.pending[0].sp).gen} от {g.pending[0].from} ждёт свободного места
        </button>
      )}

      <div className={`stage tod-${tod}${winter ? ' winter' : ''}`} data-win={sill.window ?? 'E'}>
        <div className="sky">
          <div className="sun" />
          <div className="cloud c1" />
          <div className="cloud c2" />
          {winter && <div className="snow" />}
          {decor.includes('garland') && <div className="garland" />}
        </div>
        {decor.includes('tulle') && (
          <>
            <div className="tulle left" />
            <div className="tulle right" />
          </>
        )}
        <div className="scroller">
          {Array.from({ length: SLOTS }, (_, i) => {
            const p = plantAt(g, sill.id, i);
            return (
              <div className="col" data-slot={i} key={i}>
                <div className="cell glass" data-zone="glass">
                  {p && p.zone === 'glass' && <Slot plant={p} sill={sill.id} slot={i} />}
                  {!p && (
                    <motion.button whileTap={{ scale: 0.92 }} className="empty" onClick={() => (sill.window ? openSheet({ kind: 'picker', slot: i, sill: sill.id }) : openSheet({ kind: 'window', sill: sill.id, then: 'picker', slot: i }))}>
                      <span>+</span>
                      <small>свободно</small>
                    </motion.button>
                  )}
                </div>
                <div className="cell deep" data-zone="deep">
                  {p && p.zone === 'deep' && <Slot plant={p} sill={sill.id} slot={i} />}
                </div>
              </div>
            );
          })}
          {decor.some((d) => DECOR_ICON[d]) && (
            <div className="col decor">
              <div className="cell glass">
                <div className="decor-items">
                  {decor.filter((d) => ['cat', 'radio', 'lamp'].includes(d)).map((d) => (
                    <span key={d} className={'decor-' + d}>{DECOR_ICON[d]}</span>
                  ))}
                </div>
              </div>
              <div className="cell deep">
                <div className="decor-items">
                  {decor.filter((d) => ['vase', 'books'].includes(d)).map((d) => (
                    <span key={d} className={'decor-' + d}>{DECOR_ICON[d]}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="legend">☀️ Верхний ряд — {ZONE_NAME.glass} · 🛋 нижний — {ZONE_NAME.deep}</p>

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
