// Таймлапс растения: собираем видео и показываем, потом — отправить или в сторис.

import { useEffect, useRef, useState } from 'react';
import { sp } from '../../game/species';
import { closeSheet, now, toast, useStore } from '../../game/store';
import * as api from '../../net/api';
import { track } from '../../net/track';
import { platform } from '../../platform';
import { Bar, Btn } from '../kit/kit';
import { gameLink } from '../share';
import { timelapse, videoType, type Timelapse } from '../timelapse';
import { Emo, rich } from '../kit/rich';

const toDataUrl = (b: Blob) => new Promise<string>((ok, fail) => {
  const r = new FileReader();
  r.onload = () => ok(String(r.result));
  r.onerror = () => fail(r.error);
  r.readAsDataURL(b);
});

export function TimelapseSheet({ id }: { id: string }) {
  const p = useStore((s) => s.game.plants.find((x) => x.id === id));
  const [prog, setProg] = useState(0);
  const [res, setRes] = useState<Timelapse | null>(null);
  const [url, setUrl] = useState('');
  const [fail, setFail] = useState(!videoType());
  const started = useRef(false);
  useEffect(() => {
    if (!p || started.current || fail) return;
    started.current = true;
    timelapse(p, now(), setProg).then((r) => {
      if (!r) { setFail(true); return; }
      setRes(r);
      setUrl(URL.createObjectURL(r.blob));
      track('timelapse', { sp: p.sp, days: r.days });
    }).catch(() => setFail(true));
  }, [p, fail]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  if (!p) return null;
  const name = p.nick || sp(p.sp).name;
  const text = `${name}: ${res?.days ?? ''} дней от черенка 🌱 Мой подоконник`;
  const ext = res?.type === 'video/mp4' ? 'mp4' : 'webm';

  const send = async () => {
    if (!res) return;
    const file = new File([res.blob], `podokonnik-${name}.${ext}`, { type: res.type });
    const r = await platform().share({ text, url: gameLink(), files: [file] });
    if (r === 'copied') toast('Ссылка скопирована — видео сохрани кнопкой ниже 📋');
  };
  const story = async () => {
    if (!res) return;
    const pf = platform();
    if (!pf.story || !api.loggedIn() || res.type !== 'video/mp4') return send();
    try {
      toast('Готовим сторис…');
      const { url: pub } = await api.storyUpload(await toDataUrl(res.blob));
      if (!pf.story(pub, `${text} ${gameLink()}`)) await send();
    } catch { await send(); }
  };
  const save = () => {
    if (!res) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `podokonnik-${name}.${ext}`;
    a.click();
  };

  return (
    <div className="timelapse-sheet">
      <h2><Emo e="🎬" /> Таймлапс: {rich(name)}</h2>
      {fail ? (
        <p className="muted">Это устройство не умеет записывать видео в игре. Попробуй в Telegram на телефоне или в Chrome.</p>
      ) : !res ? (
        <>
          <p className="muted small">Собираем видео — от черенка до сегодняшнего дня…</p>
          <Bar value={prog} color="#4caf6a" label={`${Math.round(prog * 100)}%`} />
        </>
      ) : (
        <>
          <video className="tl-video" src={url} autoPlay loop muted playsInline />
          <div className="actions">
            <Btn kind="primary" onClick={story}><Emo e="📲" /> В сторис</Btn>
            <Btn onClick={send}><Emo e="✉️" /> Отправить</Btn>
          </div>
          <button className="linkish small" onClick={save}><Emo e="⬇️" /> Сохранить видео</button>
        </>
      )}
      <Btn kind="ghost" onClick={closeSheet}>Закрыть</Btn>
    </div>
  );
}
