// Климат комнаты: температура и влажность воздуха, форточка, шторы и приборы.

import { climateOf, coldLimit, rhWord, tempWord, zoneTemp } from '../../game/climate';
import { ITEM_BY_ID } from '../../game/shop';
import { sp } from '../../game/species';
import { buyItem, now, openSheet, switchItem, toggleCurtains, toggleVent, useStore } from '../../game/store';
import { WINDOWS } from '../../game/constants';
import { SKY, weatherAt } from '../../game/weather';
import { tempText } from '../../game/weather';
import { Btn } from '../kit/kit';
import { Emo, rich } from '../kit/rich';

const DEVICES = ['heater', 'humidifier', 'fan', 'hygrometer', 'net'];

export function ClimateSheet() {
  const g = useStore((s) => s.game);
  const t = now();
  const sill = g.sills.find((s) => s.id === g.activeSill) ?? g.sills[0];
  const c = climateOf(g, sill, t);
  const meter = sill.decor.includes('hygrometer') && (g.owned.hygrometer ?? 0) > 0;
  const has = (id: string) => sill.decor.includes(id) && (g.owned[id] ?? 0) > 0;
  const isOn = (id: string) => has(id) && !sill.off?.includes(id);
  const here = g.plants.filter((p) => p.sill === sill.id && p.stage >= 2);

  // кому сейчас неуютно
  const warn: string[] = [];
  for (const p of here) {
    const name = p.nick || sp(p.sp).name;
    const tz = zoneTemp(c, p.zone);
    if (tz < coldLimit(p.sp)) warn.push(`🥶 ${name}: холодно (${Math.round(tz)}° у ${p.zone === 'glass' ? 'стекла' : 'столика'})`);
    else if (tz > 30) warn.push(`🥵 ${name}: жарко`);
    if (sp(p.sp).mist === 'love' && c.rh < 35) warn.push(`🏜 ${name}: сухой воздух — любит влажность`);
  }
  if (c.bugs) warn.unshift('🦟 Форточка открыта без москитной сетки — налетят тля и мошки');
  if (c.draft) warn.unshift('💨 Сквозняк: у стекла холодно');

  return (
    <div className="climate-sheet">
      <h2><Emo e="🌡" /> Климат: {rich(sill.name)}</h2>
      <div className="clim-readings">
        <div className="clim-big"><span><Emo e="🌡" /></span><b>{rich(meter ? `${Math.round(c.temp)}°` : tempWord(c.temp))}</b><small>в комнате</small></div>
        <div className="clim-big"><span><Emo e="💧" /></span><b>{rich(meter ? `${c.rh}%` : rhWord(c.rh))}</b><small>влажность</small></div>
        <div className="clim-big"><span><Emo e="🏙" /></span><b>{rich(tempText(c.out))}</b><small>на улице</small></div>
      </div>
      <div className="clim-links">
        <button className="chip" onClick={() => openSheet({ kind: 'weather' })}>{rich((() => { const w = weatherAt(g, t); return w ? `${SKY[w.sky].icon} Погода за окном` : '🌦 Погода за окном'; })())}</button>
        <button className="chip" onClick={() => openSheet({ kind: 'window', sill: sill.id })}><Emo e="🧭" /> Окно: {rich(sill.window ? WINDOWS[sill.window].short : 'выбрать')}</button>
      </div>
      {!meter && <p className="muted small center">Точные цифры покажет термогигрометр.</p>}
      <p className="small muted center">{rich(c.heating ? 'Идёт отопление: батареи греют, но сушат воздух.' : 'Отопления нет — температура зависит от улицы.')} Комфорт: 18–26°, влажность 40–60%.</p>
      {warn.length > 0 && <div className="clim-warn">{warn.slice(0, 5).map((w) => <span key={w}>{rich(w)}</span>)}</div>}

      <h3>Окно</h3>
      <div className="clim-row">
        <div><b><Emo e="🪟" /> Форточка</b><small>{rich(sill.vent ? 'Открыта: свежий воздух и влажнее, но уличная температура и сквозняк' : 'Закрыта')}</small></div>
        <button className={'switch' + (sill.vent ? ' on' : '')} onClick={() => toggleVent(sill.id)} aria-pressed={!!sill.vent}><i /></button>
      </div>
      <div className="clim-row">
        <div><b><Emo e="🎐" /> Шторы</b><small>{rich(has('curtains') ? (sill.curtains ? 'Задёрнуты: свет мягче' : 'Раздвинуты') : ITEM_BY_ID.curtains.desc)}</small></div>
        {has('curtains') ? (
          <button className={'switch' + (sill.curtains ? ' on' : '')} onClick={() => toggleCurtains(sill.id)} aria-pressed={!!sill.curtains}><i /></button>
        ) : <Btn small kind="gold" onClick={() => buyItem('curtains')}>{ITEM_BY_ID.curtains.price} <Emo e="🍃" /></Btn>}
      </div>

      <h3>Приборы</h3>
      {DEVICES.map((id) => {
        const it = ITEM_BY_ID[id];
        const switchable = id !== 'hygrometer' && id !== 'net';
        const locked = it.level && g.level < it.level;
        return (
          <div className="clim-row" key={id}>
            <div><b>{rich(it.icon)} {rich(it.name)}</b><small>{rich(has(id) ? (switchable ? (isOn(id) ? 'Включён' : 'Выключен') : 'Установлен') : it.desc)}</small></div>
            {has(id) ? (
              switchable ? <button className={'switch' + (isOn(id) ? ' on' : '')} onClick={() => switchItem(sill.id, id)} aria-pressed={isOn(id)}><i /></button> : <span className="clim-ok"><Emo e="✓" /></span>
            ) : (g.owned[id] ?? 0) > 0 ? (
              <span className="muted small">на другом окне</span>
            ) : locked ? <span className="muted small">с {it.level} ур.</span> : <Btn small kind="gold" onClick={() => buyItem(id)}>{it.price} <Emo e="🍃" /></Btn>}
          </div>
        );
      })}
    </div>
  );
}
