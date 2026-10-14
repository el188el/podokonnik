// Вход через Telegram в браузере, на Android и в Discord: бот спрашивает
// подтверждение, а мы ждём ответа. После входа подоконник один на всех устройствах.

import { useEffect, useRef, useState } from 'react';
import { closeSheet, finishLogin } from '../../game/store';
import * as api from '../../net/api';
import { platform } from '../../platform';
import { Btn } from '../kit/kit';

export function LoginSheet() {
  const [state, setState] = useState<'start' | 'wait' | 'expired' | 'error'>('start');
  const req = useRef<{ code: string; url: string } | null>(null);
  const alive = useRef(true);

  useEffect(() => () => { alive.current = false; }, []);

  const begin = async () => {
    const r = await api.loginStart();
    if (!r) { setState('error'); return; }
    req.current = r;
    setState('wait');
    platform().openLink(r.url);
    poll(r.code);
  };

  const poll = async (code: string) => {
    const until = Date.now() + 10 * 60e3;
    while (alive.current && Date.now() < until) {
      const r = await api.loginPoll(code);
      if (!alive.current) return;
      if (r.status === 'ok') { finishLogin(r); return; }
      if (r.status === 'expired') { setState('expired'); return; }
      await new Promise((ok) => setTimeout(ok, 2000));
    }
    if (alive.current) setState('expired');
  };

  return (
    <div className="login-sheet center">
      <div className="gicon">🔐</div>
      <h2>Вход через Telegram</h2>
      {state === 'start' && (
        <>
          <p>Один подоконник везде: в Telegram, в браузере, на Android и в Discord. Растения, листики и покупки — общие.</p>
          <p className="muted small">Откроется бот игры. Нажми там «Запустить», а потом «Да, войти» — и возвращайся сюда.</p>
          <Btn kind="primary" onClick={begin}>✈️ Войти через Telegram</Btn>
        </>
      )}
      {state === 'wait' && (
        <>
          <p>Ждём подтверждения в Telegram…</p>
          <div className="spinner" />
          <p className="muted small">Нажми в боте «Да, войти». Если бот не открылся:</p>
          <Btn onClick={() => req.current && platform().openLink(req.current.url)}>Открыть бота ещё раз</Btn>
        </>
      )}
      {state === 'expired' && (
        <>
          <p>Время на подтверждение вышло или вход отменили.</p>
          <Btn kind="primary" onClick={() => { setState('start'); }}>Попробовать ещё раз</Btn>
        </>
      )}
      {state === 'error' && (
        <>
          <p>Не получилось связаться с сервером. Проверь интернет и попробуй ещё раз.</p>
          <Btn kind="primary" onClick={begin}>Ещё раз</Btn>
        </>
      )}
      <Btn kind="ghost" onClick={closeSheet}>Закрыть</Btn>
    </div>
  );
}
