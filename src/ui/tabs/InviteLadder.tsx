import { useEffect, useState } from 'react';
import { INVITE_LADDER } from '../../game/invites';
import { claimInvite, useStore } from '../../game/store';
import * as api from '../../net/api';
import { Btn } from '../kit/kit';
import { shareInvite } from '../share';

/** Лестница приглашений: друзья приходят по ссылке — награды растут. */
export function InviteLadder() {
  const claimed = useStore((s) => s.game.invites) ?? [];
  const [inv, setInv] = useState<{ joined: number; active: number } | null>(null);
  useEffect(() => { if (api.loggedIn()) api.invites().then(setInv).catch(() => {}); }, []);
  const active = inv?.active ?? 0;
  const next = INVITE_LADDER.find((s) => active < s.n);
  return (
    <section className="panel invite">
      <h3>👯 Позови друзей — забери награды</h3>
      <p className="muted small">
        Друг получит +30 🍃 на старт, а ты — +50 🍃 сразу и награды лестницы. Друг засчитывается, когда дорастёт до 2 уровня.
        {inv && <> Пришли по ссылке: <b>{inv.joined}</b>, засчитано: <b>{active}</b>.</>}
      </p>
      <div className="ladder">
        {INVITE_LADDER.map((s) => {
          const got = claimed.includes(s.n);
          const ready = active >= s.n && !got;
          return (
            <div key={s.n} className={'ladder-step' + (got ? ' got' : ready ? ' ready' : '')}>
              <span className="ladder-n">{got ? '✓' : s.n}</span>
              <div className="ladder-body">
                <b>{s.icon} {s.title}</b>
                <span className="small muted">{s.n} {s.n === 1 ? 'друг' : s.n < 5 ? 'друга' : 'друзей'} · {s.text}</span>
              </div>
              {ready && <Btn small kind="gold" onClick={() => claimInvite(s.n, active)}>Забрать</Btn>}
            </div>
          );
        })}
      </div>
      <Btn kind="gold" onClick={shareInvite}>{next ? `Пригласить друга · до «${next.title}» ещё ${next.n - active}` : 'Пригласить ещё'}</Btn>
    </section>
  );
}
