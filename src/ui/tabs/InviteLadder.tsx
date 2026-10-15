import { useEffect, useState } from 'react';
import { INVITE_LADDER } from '../../game/invites';
import { claimInvite, useStore } from '../../game/store';
import * as api from '../../net/api';
import { Btn } from '../kit/kit';
import { shareInvite } from '../share';
import { Icon, Money } from '../kit/icons';
import { rich } from '../kit/rich';

/** Лестница приглашений: друзья приходят по ссылке — награды растут. */
export function InviteLadder() {
  const claimed = useStore((s) => s.game.invites) ?? [];
  const [inv, setInv] = useState<{ joined: number; active: number } | null>(null);
  useEffect(() => { if (api.loggedIn()) api.invites().then(setInv).catch(() => {}); }, []);
  const active = inv?.active ?? 0;
  const next = INVITE_LADDER.find((s) => active < s.n);
  return (
    <section className="panel invite">
      <div className="inv-head">
        <span className="inv-ic"><Icon name="friends" size={24} /></span>
        <div>
          <h3>Позови друзей</h3>
          <p>Другу <Money n={30} plus size={13} /> на старт, тебе — <Money n={50} plus size={13} /> и награды ниже</p>
        </div>
      </div>
      <div className="inv-steps">
        {INVITE_LADDER.map((s) => {
          const got = claimed.includes(s.n);
          const ready = active >= s.n && !got;
          return (
            <button key={s.n} className={'inv-step' + (got ? ' got' : ready ? ' ready' : active >= s.n ? '' : ' todo')} disabled={!ready} onClick={() => claimInvite(s.n, active)}>
              <span className="inv-n">{got ? <Icon name="check" size={14} /> : s.n}</span>
              <span className="inv-art">{rich(s.icon)}</span>
              <b>{rich(s.title)}</b>
              <small>{rich(s.text)}</small>
              {ready && <i className="inv-get">Забрать</i>}
            </button>
          );
        })}
      </div>
      <p className="inv-note">Друг засчитывается на 2 уровне.{inv && <> Пришли: {inv.joined}, засчитано: {active}.</>}</p>
      <Btn kind="primary" onClick={shareInvite}>{rich(next ? `Пригласить друга · ещё ${next.n - active} до награды` : 'Пригласить ещё')}</Btn>
    </section>
  );
}
