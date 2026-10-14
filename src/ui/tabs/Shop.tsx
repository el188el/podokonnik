import { useState } from 'react';
import { SILL_UNLOCK } from '../../game/progression';
import { ITEMS, potIdOf, type ShopCat } from '../../game/shop';
import { DIFFICULTY_LABEL, SPECIES } from '../../game/species';
import { FORM_BY_ID, PRODUCTS } from '../../game/products';
import { fmt } from '../../game/sim';
import { activeEvent } from '../../game/events';
import { adsLeft, boxReady, buyItem, buySpecies, buyStars, isPlus, now, openBox, openSheet, unlockSill, useStore, watchAd } from '../../game/store';
import { BOX_PRICE } from '../../game/box';
import { sharePlusGift } from '../share';
import { adsAvailable } from '../../net/ads';
import { tgAppLink } from '../../config';
import { platform } from '../../platform';
import { PlantArt } from '../art/PlantArt';
import { DecorArt, hasDecorArt } from '../art/DecorArt';
import { Btn, Leaves } from '../kit/kit';

type Cat = 'plants' | ShopCat | 'sills' | 'stars';
const CATS: [Cat, string][] = [
  ['stars', '⭐ Звёзды'],
  ['plants', '🌱 Черенки'],
  ['pots', '🪴 Горшки'],
  ['decor', '🖼 Декор'],
  ['care', '🧪 Уход'],
  ['packs', '🎁 Наборы'],
  ['sills', '🪟 Окна'],
];

export function Shop() {
  const g = useStore((s) => s.game);
  const [cat, setCat] = useState<Cat>('plants');
  const month = new Date(now()).getMonth() + 1;
  return (
    <div className="tab">
      <div className="tab-head">
        <h1>Магазин</h1>
        <Leaves n={g.leaves} />
      </div>
      <div className={'box-card' + (boxReady(g) ? ' ready' : '')}>
        <span className="box-icon">🎁</span>
        <div>
          <b>Ящик-сюрприз</b>
          <span className="muted small">Раз в день: листики, подкормки, горшки, декор — и шанс на редкий черенок ✨</span>
        </div>
        <Btn small kind={boxReady(g) ? 'gold' : 'soft'} disabled={!boxReady(g) || g.leaves < BOX_PRICE} onClick={openBox}>
          {boxReady(g) ? `${BOX_PRICE} 🍃` : 'завтра'}
        </Btn>
      </div>
      <div className="chips scroll">
        {CATS.map(([k, v]) => (
          <button key={k} className={'chip' + (cat === k ? ' on' : '')} onClick={() => setCat(k)}>{v}</button>
        ))}
      </div>

      {cat === 'plants' && (
        <>
          <p className="muted small">Черенок попадёт в запас. Поставь его в воду на свободное место или подари другу.</p>
          {[1, 2, 3].map((d) => (
            <section key={d}>
              <h3>{DIFFICULTY_LABEL[d]}</h3>
              <div className="grid">
                {SPECIES.filter((s) => s.difficulty === d).map((s) => {
                  const locked = g.level < s.unlockLevel;
                  return (
                    <div key={s.id} className={'shop-item' + (locked ? ' locked' : '')}>
                      <PlantArt sp={s.id} stage={4} seed="shop" className={locked ? 'unknown' : ''} />
                      <b>{s.name}</b>
                      <span className="muted small">{s.folk ?? s.speed}</span>
                      {locked ? (
                        <Btn small disabled>🔒 {s.unlockLevel} ур.</Btn>
                      ) : (
                        <Btn small kind="primary" disabled={g.leaves < s.price} onClick={() => buySpecies(s.id)}>{s.price} 🍃</Btn>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </>
      )}

      {cat === 'pots' && (
        <p className="muted small">Под каждое растение нужен свой горшок — как в жизни. А дизайн (цвет и узор) покупается один раз и остаётся навсегда: выбирай его в карточке растения.</p>
      )}
      {cat !== 'plants' && cat !== 'sills' && (
        <div className="list">
          {ITEMS.filter((i) => i.cat === cat && (!i.eventOnly || (g.owned[i.id] ?? 0) > 0)).map((it) => {
            const owned = (g.owned[it.id] ?? 0) > 0 && !it.consumable;
            const lockLevel = it.level && g.level < it.level;
            const offSeason = it.months && !it.months.includes(month);
            return (
              <div key={it.id} className="row-item">
                <div className="ricon">
                  {it.gives || it.id === 'pot' ? <span className="pot-stack">🪴{it.count ? `×${it.count}` : ''}</span> : it.cat === 'pots' ? <PlantArt sp="chlorophytum" stage={2} pot={potIdOf(it.id)} seed="pot" /> : hasDecorArt(it.id) ? <DecorArt id={it.id} scale={1.5} className="shop-decor" /> : it.icon}
                </div>
                <div className="rtext">
                  <b>{it.name}</b>
                  <span className="muted small">{it.desc}</span>
                  {it.consumable && (g.owned[it.id] ?? 0) > 0 && <span className="small">В запасе: {g.owned[it.id]}</span>}
                </div>
                {owned ? (
                  <span className="owned">✓ есть</span>
                ) : lockLevel ? (
                  <Btn small disabled>🔒 {it.level} ур.</Btn>
                ) : offSeason ? (
                  <Btn small disabled>не сезон</Btn>
                ) : (
                  <Btn small kind="primary" disabled={g.leaves < it.price} onClick={() => buyItem(it.id)}>{it.price} 🍃</Btn>
                )}
              </div>
            );
          })}
        </div>
      )}

      {cat === 'sills' && (
        <div className="list">
          {Object.entries(SILL_UNLOCK).filter(([id]) => id !== 'room').map(([id, u]) => {
            const has = g.sills.some((s) => s.id === id);
            return (
              <div key={id} className="row-item">
                <div className="ricon">{u.icon}</div>
                <div className="rtext">
                  <b>{u.name}</b>
                  <span className="muted small">{u.desc} Ещё 6–8 мест для растений.</span>
                </div>
                {has ? <span className="owned">✓ есть</span> : g.level < u.level ? <Btn small disabled>🔒 {u.level} ур.</Btn> : (
                  <Btn small kind="primary" disabled={g.leaves < u.price} onClick={() => unlockSill(id)}>{u.price} 🍃</Btn>
                )}
              </div>
            );
          })}
        </div>
      )}

      {cat === 'stars' && <StarsShop />}
    </div>
  );
}

function StarsShop() {
  const g = useStore((s) => s.game);
  const [busy, setBusy] = useState('');
  const t = now();
  const plus = isPlus(g, t);
  const inTg = platform().kind === 'telegram';
  const buy = async (id: string) => {
    setBusy(id);
    await buyStars(id);
    setBusy('');
  };
  const plusP = PRODUCTS.find((p) => p.kind === 'plus')!;
  return (
    <div className="stars-shop">
      {!inTg && (
        <div className="soon">
          ⭐ Покупки за Telegram Stars доступны в Telegram-версии игры.
          {tgAppLink() && <Btn small kind="primary" onClick={() => platform().openLink(tgAppLink())}>Открыть в Telegram</Btn>}
        </div>
      )}

      {!g.starterPack && (
        <div className="plus-card starter-pack">
          <div className="plus-head">🎁 <b>Стартовый пакет</b> <span className="sale">−65%</span></div>
          <div className="starter-row">
            <PlantArt sp="monstera" form="albo" stage={3} seed="pack" pot="khokhloma" />
            <ul>
              <li>✨ Редкий черенок «Монстера Альбо»</li>
              <li>❤️ Горшок «Хохлома»</li>
              <li>🍃 300 листиков</li>
            </ul>
          </div>
          <Btn kind="gold" disabled={busy === 'starter'} onClick={() => buy('starter')}>Забрать · 49 ⭐ · один раз</Btn>
        </div>
      )}

      <div className="plus-card">
        <div className="plus-head">🌟 <b>Садовник+</b>{plus && <span className="owned">активен ещё {fmt(Math.max(g.plusUntil ?? 0, t) - t)}</span>}</div>
        <ul>
          <li>×2 листиков за задания и серию заходов</li>
          <li>👵 Соседка поливает до 7 дней в любое время</li>
          <li>🔥 Серия не сгорает, если пропустить один день</li>
          <li>🪙 Золотой горшок и 🌟 у имени у друзей</li>
        </ul>
        <Btn kind="gold" disabled={busy === 'plus'} onClick={() => buy('plus')}>
          {plus ? 'Продлить' : 'Подключить'} · {plusP.stars} ⭐ в месяц
        </Btn>
        <p className="muted small center">Продлевается раз в 30 дней, отменить можно в любой момент в настройках Telegram.</p>
        <Btn kind="soft" disabled={busy === 'plus_gift'} onClick={() => buy('plus_gift')}>🎁 Подарить месяц другу · 99 ⭐</Btn>
        {(g.plusGifts ?? []).map((x) => (
          <div key={x.code} className="gift-code">
            <span className="small">🎁 Подарок «Садовник+» {x.sent ? '· ссылка отправлена' : '· ждёт отправки'}</span>
            <Btn small kind={x.sent ? 'ghost' : 'primary'} onClick={() => sharePlusGift(x.code)}>{x.sent ? 'Ещё раз' : 'Отправить'}</Btn>
          </div>
        ))}
      </div>

      {activeEvent(t) && (
        <div className="plus-card pass-card">
          <b>{activeEvent(t)!.token} Сезонный пропуск «{activeEvent(t)!.title}»</b>
          <p className="small">Платная ветка наград ивента: эксклюзивный горшок, декор и редкая форма.</p>
          <Btn kind="gold" onClick={() => openSheet({ kind: 'event' })}>Посмотреть награды</Btn>
        </div>
      )}

      <h3>✨ Редкие формы</h3>
      <p className="muted small">Черенок попадёт в запас. Его можно вырастить или подарить — и у друга будет такая же редкость. Иногда редкая форма выпадает и из обычного черенка!</p>
      <div className="grid">
        {PRODUCTS.filter((p) => p.kind === 'form').map((p) => {
          const f = FORM_BY_ID[p.form!];
          const has = (g.forms ?? []).includes(f.id);
          return (
            <div key={p.id} className="shop-item rare">
              <PlantArt sp={f.sp} form={f.id} stage={4} seed="rare" blooming />
              <b>{f.name}</b>
              <span className="muted small">{has ? '✓ в коллекции' : f.desc}</span>
              <Btn small kind="gold" disabled={busy === p.id} onClick={() => buy(p.id)}>{p.stars} ⭐</Btn>
            </div>
          );
        })}
      </div>

      {adsAvailable() && (
        <div className="row-item ad-row">
          <div className="ricon">🎬</div>
          <div className="rtext"><b>Ролик за награду</b><span className="muted small">Короткое видео — и +20 🍃. Осталось сегодня: {adsLeft(g)}</span></div>
          <Btn small kind="primary" disabled={adsLeft(g) <= 0 || busy === 'ad'} onClick={async () => { setBusy('ad'); await watchAd({ kind: 'leaves' }); setBusy(''); }}>Смотреть</Btn>
        </div>
      )}

      <h3>⚡ Стимуляторы роста</h3>
      <div className="list">
        {PRODUCTS.filter((p) => p.kind === 'boost').map((p) => (
          <div key={p.id} className="row-item">
            <div className="ricon">⚡</div>
            <div className="rtext"><b>{p.title}</b><span className="muted small">{p.desc}{(g.owned.boost ?? 0) > 0 ? ` В запасе: ${g.owned.boost}.` : ''}</span></div>
            <Btn small kind="gold" disabled={busy === p.id} onClick={() => buy(p.id)}>{p.stars} ⭐</Btn>
          </div>
        ))}
      </div>
      <p className="muted small center">Одному растению — раз в неделю, всего 3 в день: запас не сгорает.</p>

      <h3>🍃 Листики</h3>
      <div className="list">
        {PRODUCTS.filter((p) => p.kind === 'leaves').map((p) => (
          <div key={p.id} className="row-item">
            <div className="ricon">🍃</div>
            <div className="rtext"><b>{p.title}</b><span className="muted small">{p.desc}</span></div>
            <Btn small kind="gold" disabled={busy === p.id} onClick={() => buy(p.id)}>{p.stars} ⭐</Btn>
          </div>
        ))}
      </div>
      <p className="muted small center">Растения никогда не погибают из-за того, что ты ничего не купил(а). Покупки — только приятные бонусы 🌿 Условия: /terms в боте.</p>
    </div>
  );
}
