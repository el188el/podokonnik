import { useState } from 'react';
import { WINDOWS } from '../../game/constants';
import { xpToNext } from '../../game/progression';
import { ITEM_BY_ID, DECOR_IDS } from '../../game/shop';
import { fmt } from '../../game/sim';
import { ageDays } from '../../game/age';
import { isPlus, now, openSheet, setName, setSetting, toggleDecor, useStore } from '../../game/store';
import { platform } from '../../platform';
import { CONFIG } from '../../config';
import { online, sendSettings } from '../../net/api';
import { Bar, Btn, Leaves } from '../kit/kit';

export function Profile() {
  const g = useStore((s) => s.game);
  const [name, setN] = useState(g.name);
  const t = now();
  const neighbor = g.neighbor && t < g.neighbor.until;
  const pf = platform();
  const stats: [string, number][] = [
    ['💧 Поливов', g.stats.waters],
    ['🪴 Посажено', g.stats.planted],
    ['🌿 Выращено взрослых', g.stats.adults],
    ['✂️ Черенков', g.stats.cuts],
    ['🎁 Подарено', g.stats.giftsSent],
    ['💌 Получено', g.stats.giftsGot],
    ['🌸 Цветений', g.stats.blooms],
    ['🚑 Спасено', g.stats.rescues],
    ['🎂 Старейшее растение, дней', Math.max(0, ...g.plants.map((p) => ageDays(p, t)))],
  ];
  return (
    <div className="tab">
      <div className="tab-head">
        <h1>Профиль</h1>
        <Leaves n={g.leaves} />
      </div>

      <section className="panel">
        <label className="lbl" htmlFor="nm">Как тебя зовут</label>
        <input id="nm" className="inp" maxLength={24} value={name} placeholder="Имя для подарков" onChange={(e) => setN(e.target.value)} onBlur={() => setName(name)} />
        <p className="lvl">⭐ Уровень {g.level}{isPlus(g) && <span className="plus-badge"> · 🌟 Садовник+</span>}</p>
        <Bar value={g.xp / xpToNext(g.level)} label={`${g.xp}/${xpToNext(g.level)} опыта`} />
      </section>


      <section className="panel">
        <h3>🏠 Настоящие растения</h3>
        <p className="muted small">Двойники твоих домашних цветов: бот напомнит о поливе, а двойник подрастёт.</p>
        <Btn onClick={() => openSheet({ kind: 'twins' })}>Открыть ({(g.twins ?? []).length})</Btn>
      </section>

      <section className="panel">
        <h3>👵 Соседка польёт</h3>
        <p className="muted small">{neighbor ? `Поливает ещё ${fmt(g.neighbor!.until - t)}` : 'Уезжаешь? Растения не засохнут.'}</p>
        <Btn onClick={() => openSheet({ kind: 'neighbor' })}>{neighbor ? 'Управлять' : 'Попросить соседку'}</Btn>
      </section>

      <section className="panel">
        <h3>🪟 Подоконники и декор</h3>
        {g.sills.map((s) => (
          <div key={s.id} className="sill-set">
            <div className="sill-head">
              <b>{s.name}</b>
              <button className="chip" onClick={() => openSheet({ kind: 'window', sill: s.id })}>
                Окно: {s.window ? WINDOWS[s.window].short : 'не выбрано'}
              </button>
            </div>
            <div className="chips">
              {DECOR_IDS.filter((d) => (g.owned[d] ?? 0) > 0).map((d) => (
                <button key={d} className={'chip' + (s.decor.includes(d) ? ' on' : '')} onClick={() => toggleDecor(s.id, d)}>
                  {ITEM_BY_ID[d].icon} {ITEM_BY_ID[d].name}
                </button>
              ))}
              {!DECOR_IDS.some((d) => (g.owned[d] ?? 0) > 0) && <span className="muted small">Декор продаётся в магазине.</span>}
            </div>
          </div>
        ))}
      </section>

      <section className="panel">
        <h3>📊 Статистика</h3>
        <div className="stats">
          {stats.map(([k, v]) => (
            <div key={k}><span>{k}</span><b>{v}</b></div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h3>⚙️ Настройки</h3>
        <label className="toggle">
          <input type="checkbox" checked={g.settings.haptics} onChange={(e) => setSetting('haptics', e.target.checked)} /> Вибрация
        </label>
        {pf.kind === 'telegram' && online() && (
          <label className="toggle">
            <input type="checkbox" checked={g.settings.notify !== false} onChange={(e) => { setSetting('notify', e.target.checked); sendSettings({ notify: e.target.checked }); }} /> Напоминания от бота
          </label>
        )}
        {CONFIG.channel && <Btn onClick={() => pf.openLink(`https://t.me/${CONFIG.channel}`)}>📢 Канал игры: советы по растениям</Btn>}
        {pf.kind !== 'discord' && <Btn onClick={() => openSheet({ kind: 'weather' })}>🌦 Погода за окном: {g.settings.place ? g.settings.place.city : 'выключена'}</Btn>}
        {pf.kind === 'web' && <Btn onClick={() => openSheet({ kind: 'install' })}>📲 Добавить на главный экран</Btn>}
        <p className="muted small">
          {online() ? 'Прогресс сохраняется на сервере и доступен на всех устройствах.' : pf.kind === 'telegram' ? 'Прогресс сохраняется в облаке Telegram и доступен на всех устройствах.' : 'Прогресс сохраняется в этом браузере.'}
        </p>
      </section>
    </div>
  );
}
