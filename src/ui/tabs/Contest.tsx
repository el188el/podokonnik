// Конкурс «Подоконник недели»: выставь свой подоконник и отдай 3 сердечка лучшим.

import { useCallback, useEffect, useState } from 'react';
import { layoutRows } from '../../game/layout';
import { fmt } from '../../game/sim';
import { CONTEST_ENTRY_REWARD, CONTEST_PRIZES, CONTEST_VOTE_REWARD } from '../../game/contest';
import { enterContest, now, useStore, voteContest } from '../../game/store';
import * as api from '../../net/api';
import { PlantArt } from '../art/PlantArt';
import { Btn } from '../kit/kit';
import { SillScene } from '../SillScene';

const MEDAL = ['🥇', '🥈', '🥉'];

/** Уменьшенный снимок чужого подоконника. */
export function ShotScene({ shot }: { shot: api.ContestEntry['shot'] }) {
  const rows = layoutRows(shot.plants);
  return (
    <div className="shot">
      <SillScene
        className="guest-scene"
        decor={shot.sill.decor ?? []}
        tod="day"
        win={shot.sill.window ?? 'E'}
        cell={(slot) => {
          const p = (slot < 3 ? rows.glass : rows.deep)[slot % 3];
          if (!p) return null;
          return (
            <div className="slot guest">
              <div className="art">
                <PlantArt sp={p.sp} form={p.form} hue={p.hue} stage={p.stage} seed={p.id} pot={p.pot} bigPot={p.bigPot} blooming={p.blooming} className="plant-svg" />
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}

export function Contest() {
  const g = useStore((s) => s.game);
  const [data, setData] = useState<api.ContestData | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { api.contest().then((d) => { setData(d); setError(false); }).catch(() => setError(true)); }, []);
  useEffect(() => { load(); }, [load]);

  if (error) return <section className="panel"><p className="muted">Не получилось загрузить конкурс. Проверь интернет.</p></section>;
  if (!data) return <section className="panel"><p className="muted">Загружаем…</p></section>;
  const left = data.votesMax - data.votes.length;
  const sill = g.sills.find((s) => s.id === g.activeSill) ?? g.sills[0];
  const place = data.mine ? [data.mine, ...data.entries].sort((a, b) => b.votes - a.votes).findIndex((e) => e.id === data.mine!.id) + 1 : 0;

  return (
    <div>
      <section className="panel contest-head">
        <h3>🏆 Подоконник недели</h3>
        <p><b>Тема: {data.theme.title}</b><br /><span className="muted small">{data.theme.hint}</span></p>
        <p className="muted small">
          Итоги через {fmt(data.endsAt - now())} · участников: {data.total} · призы {CONTEST_PRIZES.map((p, i) => `${MEDAL[i]} ${p}`).join(' ')} 🍃
        </p>
        {data.mine ? (
          <>
            <p className="small">Твой подоконник участвует: ❤️ {data.mine.votes}{place ? ` · ${place} место` : ''}</p>
            <Btn small kind="soft" disabled={busy} onClick={async () => { setBusy(true); await enterContest(sill.id); load(); setBusy(false); }}>📸 Обновить снимок «{sill.name}»</Btn>
          </>
        ) : (
          <Btn kind="gold" disabled={busy} onClick={async () => { setBusy(true); await enterContest(sill.id); load(); setBusy(false); }}>
            Участвовать подоконником «{sill.name}» · +{CONTEST_ENTRY_REWARD} 🍃
          </Btn>
        )}
        <p className="muted small">Голосов у тебя: {left} из {data.votesMax} · за каждый +{CONTEST_VOTE_REWARD} 🍃</p>
      </section>

      {data.last.top.length > 0 && (
        <section className="panel">
          <h3>Победители прошлой недели · {data.last.theme.title}</h3>
          <div className="podium">
            {data.last.top.map((e, i) => (
              <div key={e.id} className="podium-item">
                <ShotScene shot={e.shot} />
                <b>{MEDAL[i]} {e.shot.name}</b>
                <span className="muted small">❤️ {e.votes}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="panel">
        <h3>Подоконники участников</h3>
        {data.entries.length === 0 && <p className="muted">Пока никто не участвует. Будь первым — и позови друзей голосовать!</p>}
        {data.entries.map((e) => {
          const voted = data.votes.includes(e.id);
          return (
            <div key={e.id} className="entry">
              <ShotScene shot={e.shot} />
              <div className="entry-foot">
                <span><b>{e.shot.name}</b> <span className="muted small">⭐ {e.shot.level}{e.friend ? ' · друг' : ''}</span></span>
                <Btn small kind={voted ? 'soft' : 'gold'} disabled={voted || left <= 0} onClick={async () => { if (await voteContest(e.id)) load(); }}>
                  {voted ? "❤️" : "🤍"} {e.votes}
                </Btn>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
