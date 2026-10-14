import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { PublicView } from '../../game/social';
import { closeSheet, pushNow, toast } from '../../game/store';
import * as api from '../../net/api';
import { track } from '../../net/track';
import { platform } from '../../platform';
import { PlantArt } from '../art/PlantArt';
import { Btn } from '../kit/kit';
import { layoutRows } from '../../game/layout';
import { SillScene, timeOfDay } from '../SillScene';


/** Подоконник друга: смотреть и поливать тех, кто хочет пить. */
export function Visit({ id, name }: { id: string; name: string }) {
  const [view, setView] = useState<PublicView | null>(null);
  const [left, setLeft] = useState(0);
  const [sill, setSill] = useState('');
  const [state, setState] = useState<'loading' | 'ok' | 'empty' | 'error'>('loading');
  const [drops, setDrops] = useState<Record<string, number>>({});

  useEffect(() => {
    api.visit(id)
      .then((r) => {
        if (!r.view) return setState('empty');
        setView(r.view);
        setLeft(r.watersLeft);
        setSill(r.view.sills[0]?.id ?? 'room');
        setState('ok');
      })
      .catch(() => setState('error'));
  }, [id]);

  async function pour(plantId: string) {
    if (!view) return;
    if (left <= 0) return toast('На сегодня ты уже хорошо помог(ла) 🌿 Приходи завтра');
    setDrops((d) => ({ ...d, [plantId]: Date.now() }));
    platform().haptic('light');
    setView({ ...view, plants: view.plants.map((p) => (p.id === plantId ? { ...p, thirsty: false } : p)) });
    try {
      const r = await api.visitWater(id, plantId);
      if (r.status === 'ok') {
        track('friend_water', {});
        setLeft(r.watersLeft ?? left - 1);
        toast(`💧 Полито! ${view.name} будет рад(а)`);
        pushNow(); // заодно заберём награду +5 🍃
      } else if (r.status === 'limit') {
        setLeft(0);
        toast('На сегодня лимит поливов в гостях исчерпан');
      } else toast('Земля и так влажная 🙂');
    } catch {
      toast('Не получилось полить — нет связи');
    }
  }

  if (state === 'loading') return <div className="center"><div className="gicon">🚪</div><p className="muted">Идём в гости…</p></div>;
  if (state === 'error') return <div className="center"><div className="gicon">🔌</div><p className="muted">Не получилось зайти. Проверь интернет.</p><Btn kind="ghost" onClick={closeSheet}>Закрыть</Btn></div>;
  if (state === 'empty' || !view) return <div className="center"><div className="gicon">🪟</div><p className="muted">{name}: подоконник пока пустой.</p><Btn kind="ghost" onClick={closeSheet}>Закрыть</Btn></div>;

  const here = view.plants.filter((p) => p.sill === sill);
  const thirsty = here.filter((p) => p.thirsty).length;
  const s = view.sills.find((x) => x.id === sill) ?? view.sills[0];
  const rows = layoutRows(here);
  return (
    <div className="visit">
      <h2>В гостях: {view.name}</h2>
      <p className="muted small">
        ⭐ {view.level} · {view.neighbor ? '👵 за растениями присматривает соседка' : thirsty ? `хотят пить: ${thirsty}. Тапни, чтобы полить` : 'все политы 🌿'}
        {left > 0 && !view.neighbor && ` · можно полить ещё ${left}`}
      </p>
      {view.sills.length > 1 && (
        <div className="chips">
          {view.sills.map((x) => (
            <button key={x.id} className={'chip' + (x.id === sill ? ' on' : '')} onClick={() => setSill(x.id)}>{x.name}</button>
          ))}
        </div>
      )}
      <SillScene
        className="guest-scene"
        decor={s?.decor ?? []}
        tod={timeOfDay(Date.now())}
        win={s?.window ?? 'E'}
        cell={(slot) => {
          const p = (slot < 3 ? rows.glass : rows.deep)[slot % 3];
          if (!p) return null;
          return (
            <button className={'slot guest' + (p.sad ? ' sad' : '')} onClick={() => (p.thirsty ? pour(p.id) : toast(p.stage < 2 ? 'Черенок пускает корни в стакане 🌱' : 'Ему хорошо, поливать не нужно 🌿'))}>
              {p.thirsty && !view.neighbor && <div className="bubble">Хочу пить 💧</div>}
              <div className="art">
                <PlantArt sp={p.sp} form={p.form} stage={p.stage} seed={p.id} pot={p.pot} bigPot={p.bigPot} blooming={p.blooming} className="plant-svg" />
              </div>
              {drops[p.id] && (
                <div className="fx" key={drops[p.id]}>
                  {[0, 1, 2, 3, 4].map((k) => <span key={k} className="drop" style={{ left: 22 + k * 17, animationDelay: k * 0.07 + 's' }}>💧</span>)}
                </div>
              )}
            </button>
          );
        }}
      />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Btn kind="ghost" onClick={closeSheet}>Вернуться домой</Btn>
      </motion.div>
    </div>
  );
}
