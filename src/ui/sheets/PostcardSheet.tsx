// Открытка с подоконника: игрок пишет пару слов, видит открытку и отправляет её.

import { useEffect, useState } from 'react';
import { closeSheet } from '../../game/store';
import { Btn } from '../kit/kit';
import { postcardCard, shareCard, sharePostcard } from '../story';

const WISHES = ['Растём потихоньку 🌿', 'Зацвело — смотри какая красота!', 'Скучаю, приезжай в гости', 'С праздником! Пусть всё цветёт'];

export function PostcardSheet() {
  const [text, setText] = useState(WISHES[0]);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState('');
  useEffect(() => {
    let alive = true;
    const id = setTimeout(async () => {
      const b = await postcardCard(text);
      if (!alive) return;
      setBlob(b);
      setUrl((old) => { if (old) URL.revokeObjectURL(old); return b ? URL.createObjectURL(b) : ''; });
    }, 300);
    return () => { alive = false; clearTimeout(id); };
  }, [text]);
  return (
    <div className="postcard-sheet">
      <h2>💌 Открытка с подоконника</h2>
      <div className="pc-preview">{url ? <img src={url} alt="Открытка" /> : <div className="spinner" />}</div>
      <input className="inp" value={text} maxLength={60} onChange={(e) => setText(e.target.value)} placeholder="Пара слов на обороте" />
      <div className="chips">
        {WISHES.map((w) => <button key={w} className={'chip' + (w === text ? ' on' : '')} onClick={() => setText(w)}>{w}</button>)}
      </div>
      <div className="actions">
        <Btn kind="primary" disabled={!blob} onClick={() => sharePostcard(blob)}>✉️ Отправить</Btn>
        <Btn disabled={!blob} onClick={() => shareCard(blob, 'Привет с моего подоконника! 🪴', 'postcard')}>📲 В сторис</Btn>
      </div>
      <Btn kind="ghost" onClick={closeSheet}>Закрыть</Btn>
    </div>
  );
}
