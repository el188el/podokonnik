import { useEffect, useState } from 'react';
import { closeSheet, now, refreshWeather, setPlace, toast, useStore } from '../../game/store';
import { SKY, tempText, weatherAt, weatherTip } from '../../game/weather';
import { cityName, findCity, locate, type CityHit } from '../../net/weather';
import { Btn } from '../kit/kit';
import { Icon } from '../kit/icons';

/** Погода за окном: город по геолокации или поиском. */
export function WeatherSheet() {
  const g = useStore((s) => s.game);
  const place = g.settings.place;
  const w = weatherAt(g, now());
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<CityHit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const ws = useStore((s) => s.weatherState);
  // открыли, а свежей сводки нет — сразу спрашиваем
  useEffect(() => { if (place && !w) refreshWeather(true); }, [place?.city]); // eslint-disable-line react-hooks/exhaustive-deps

  const search = async () => {
    if (q.trim().length < 2) return;
    setBusy(true);
    try { setHits(await findCity(q)); } catch { toast('Не получилось найти город. Проверь интернет'); }
    setBusy(false);
  };
  const geo = async () => {
    setBusy(true);
    try {
      const { lat, lon } = await locate();
      await setPlace({ city: await cityName(lat, lon), lat, lon });
      toast('Погода за окном включена 🌦');
    } catch {
      toast('Не получилось узнать, где ты. Найди город поиском');
    }
    setBusy(false);
  };

  return (
    <div>
      <div className="gicon weather-ic"><Icon name={w ? w.sky : 'partly'} size={56} stroke={1.8} /></div>
      <h2 className="center">Погода за окном</h2>
      {place ? (
        <>
          <p className="center"><b>{place.city}</b>{w && <> · {SKY[w.sky].name}, {tempText(w.temp)}</>}</p>
          <p className="muted center small">
            {w ? weatherTip(w) : ws === 'error' ? 'Не получилось узнать погоду: нет связи с сервисом погоды. Проверь интернет и нажми «Обновить».' : 'Узнаём погоду…'}
          </p>
        </>
      ) : (
        <p className="muted center small">
          За окном будет та же погода, что у тебя в городе: дождь, снег, солнце. В пасмурный день у стекла нет прямого солнца,
          а в ясный светолюбивые растения растут быстрее.
        </p>
      )}
      <div className="lbl">{place ? 'Сменить город' : 'Где ты живёшь'}</div>
      <div className="city-search">
        <input className="inp" value={q} placeholder="Например, Казань" maxLength={40} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') search(); }} />
        <Btn small disabled={busy || q.trim().length < 2} onClick={search}>Найти</Btn>
      </div>
      {hits && hits.length === 0 && <p className="muted small">Ничего не нашли — попробуй написать иначе.</p>}
      {hits?.map((h) => (
        <button key={`${h.lat},${h.lon},${h.city}`} className="city-hit" onClick={async () => { setHits(null); setQ(''); await setPlace({ city: h.city, lat: h.lat, lon: h.lon }); toast(`Погода: ${h.city} 🌦`); }}>
          <b>{h.city}</b> <span className="muted small">{h.region}</span>
        </button>
      ))}
      <Btn disabled={busy} onClick={geo}><Icon name="pin" size={18} className="inl" /> Определить по геолокации</Btn>
      {place && <Btn kind="soft" disabled={ws === 'loading'} onClick={() => refreshWeather(true)}><Icon name="refresh" size={18} className="inl" /> {ws === 'loading' ? 'Обновляем…' : 'Обновить'}</Btn>}
      {place && <Btn kind="ghost" onClick={() => setPlace(null)}>Выключить погоду</Btn>}
      <p className="muted small center">Храним только город и координаты с точностью ~10 км. Погода — Open-Meteo.</p>
      <Btn kind="ghost" onClick={closeSheet}>Закрыть</Btn>
    </div>
  );
}
