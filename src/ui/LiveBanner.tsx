// Баннер ивентов из панели (×2 листиков, быстрый рост, скидка, черенок дня)
// и экран заблокированного аккаунта.
import { useEffect, useState } from 'react';
import { liveActive, liveCutting, type LiveEvent } from '../game/liveops';
import { FORM_BY_ID } from '../game/products';
import { fmt } from '../game/sim';
import { claimLiveCutting, now, setTab, useStore } from '../game/store';
import { CONFIG } from '../config';
import { platform } from '../platform';
import { Btn } from './kit/kit';
import { Emo, rich } from './kit/rich';

const ICON: Record<LiveEvent['kind'], string> = { leaves2x: '🍃', growth: '🌱', discount: '💸', cutting: '✨' };

function text(e: LiveEvent) {
  if (e.kind === 'leaves2x') return '×2 листиков за задания и серию';
  if (e.kind === 'growth') return `Растения растут ×${e.mult ?? 1} быстрее`;
  if (e.kind === 'discount') return `Скидка ${e.pct ?? 0}% в магазине`;
  const f = e.form ? FORM_BY_ID[e.form] : undefined;
  return f ? `Редкий черенок дня: ${f.name}` : 'Редкий черенок дня';
}

export function LiveBanner() {
  const g = useStore((s) => s.game);
  useStore((s) => s.live);
  const [, tick] = useState(0);
  useEffect(() => { const i = setInterval(() => tick((x) => x + 1), 30e3); return () => clearInterval(i); }, []);
  const t = now();
  const list = liveActive(t);
  if (!list.length) return null;
  const gift = liveCutting(t, g.liveClaimed);
  return (
    <div className="live-banner">
      {list.map((e) => (
        <div key={e.id} className="live-row">
          <span className="live-ic"><Emo e={ICON[e.kind]} /></span>
          <span className="live-tx">
            <b>{rich(e.title || text(e))}</b>
            <small>{rich(e.title ? `${text(e)} · ещё ${fmt(e.ends - t)}` : `ещё ${fmt(e.ends - t)}`)}</small>
          </span>
          {e.kind === 'cutting' && gift?.id === e.id && <Btn small kind="gold" onClick={claimLiveCutting}>Забрать</Btn>}
          {e.kind === 'discount' && <Btn small onClick={() => setTab('shop')}>В магазин</Btn>}
        </div>
      ))}
    </div>
  );
}

export function BanScreen() {
  const pf = platform();
  return (
    <div className="ban-screen">
      <div className="ban-card">
        <div className="ban-ic"><Emo e="🔒" /></div>
        <h2>Аккаунт заблокирован</h2>
        <p>Похоже, с этим подоконником что-то не так, и мы временно закрыли к нему доступ.</p>
        <p>Если это ошибка — напиши в поддержку, мы разберёмся и ответим в боте.</p>
        {CONFIG.tgBot && <Btn kind="primary" onClick={() => pf.openLink(`https://t.me/${CONFIG.tgBot}`)}><Emo e="💌" /> Написать в поддержку</Btn>}
      </div>
    </div>
  );
}
