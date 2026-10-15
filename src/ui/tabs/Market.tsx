// Барахолка: игроки обмениваются черенками. Выставь свой и укажи, что хочешь взамен.

import { useCallback, useEffect, useState } from 'react';
import { hueOf } from '../../game/breeding';
import { FORM_BY_ID } from '../../game/products';
import { SPECIES, sp } from '../../game/species';
import { cancelSwap, listSwap, takeSwap, useStore } from '../../game/store';
import type { Cutting } from '../../game/types';
import * as api from '../../net/api';
import { PlantArt } from '../art/PlantArt';
import { Btn } from '../kit/kit';
import { Icon, TONE } from '../kit/icons';
import { Emo, rich } from '../kit/rich';

const label = (c: { sp: string; form?: string | null; hue?: string | null }) =>
  c.form && FORM_BY_ID[c.form] ? `✨ ${FORM_BY_ID[c.form].name}` : `${sp(c.sp).name}${c.hue ? ' · ' + (hueOf(c.sp, c.hue)?.name ?? '') : ''}`;

export function Market() {
  const g = useStore((s) => s.game);
  const [data, setData] = useState<{ market: api.SwapOffer[]; mine: api.MySwap[] } | null>(null);
  const [error, setError] = useState(false);
  const [listing, setListing] = useState(false);
  const [onlyMine, setOnlyMine] = useState(false);
  const [offerFor, setOfferFor] = useState<number | null>(null);

  const load = useCallback(() => {
    api.swaps().then((d) => { setData(d); setError(false); }).catch(() => setError(true));
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 45e3); return () => clearInterval(t); }, [load]);

  const fits = (o: api.SwapOffer) => g.cuttings.filter((c) => !o.wants.length || o.wants.includes(c.sp));
  const market = (data?.market ?? []).filter((o) => !onlyMine || fits(o).length > 0);
  const open = (data?.mine ?? []).filter((m) => !m.taken);

  return (
    <div>
      <section className="panel">
        <h3 className="ih3"><Icon name="market" size={20} tone={TONE.share} />Барахолка черенков</h3>
        <p className="muted small">Меняйся черенками с другими садоводами: выставь свой и укажи, что хочешь взамен. Так быстрее собрать коллекцию и редкие цвета.</p>
        {listing ? (
          <ListForm cuttings={g.cuttings} onDone={() => { setListing(false); setTimeout(load, 800); }} />
        ) : (
          <Btn kind="primary" disabled={!g.cuttings.length || open.length >= 3} onClick={() => setListing(true)}>
            {rich(!g.cuttings.length ? 'Нет черенков в запасе' : open.length >= 3 ? 'Уже выставлено 3 черенка' : '➕ Выставить черенок')}
          </Btn>
        )}
      </section>

      {(data?.mine.length ?? 0) > 0 && (
        <section className="panel">
          <h3>Мои объявления</h3>
          {data!.mine.map((m) => (
            <div key={m.id} className="swap mine">
              <PlantArt sp={m.sp} form={m.form ?? undefined} hue={m.hue ?? undefined} stage={4} seed={"m" + m.id} blooming noPot className="mini" />
              <div className="swap-body">
                <b>{rich(label(m))}</b>
                {m.taken ? (
                  <span className="small ok-text"><Emo e="✓" /> Обменяли на {rich(m.given ? label(m.given) : 'черенок')}</span>
                ) : (
                  <span className="muted small">Ждёт обмена · хочу: {rich(m.wants.length ? m.wants.map((w) => sp(w).name).join(', ') : 'любой')}</span>
                )}
              </div>
              {!m.taken && <Btn small kind="ghost" onClick={async () => { await cancelSwap(m.id); load(); }}>Снять</Btn>}
            </div>
          ))}
        </section>
      )}

      <section className="panel">
        <div className="market-head">
          <h3>Предложения</h3>
          <label className="toggle small"><input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} /> могу обменять</label>
        </div>
        {error && <p className="muted">Не получилось загрузить барахолку. Попробуем ещё раз.</p>}
        {!data && !error && <p className="muted">Загружаем…</p>}
        {data && market.length === 0 && <p className="muted">Пока пусто. Выстави свой черенок первым — и приглашай друзей!</p>}
        {market.map((o) => {
          const mine = fits(o);
          return (
            <div key={o.id} className="swap">
              <PlantArt sp={o.sp} form={o.form ?? undefined} hue={o.hue ?? undefined} stage={4} seed={'s' + o.id} blooming noPot className="mini" />
              <div className="swap-body">
                <b>{rich(label(o))}</b>
                <span className="muted small">от {rich(o.owner)} · <Icon name="star" size={12} className="inl" /> {o.level}</span>
                <span className="small">хочет: {rich(o.wants.length ? o.wants.map((w) => sp(w).name).join(', ') : 'любой черенок')}</span>
                {offerFor === o.id && (
                  <div className="give-pick">
                    {mine.map((c) => (
                      <button key={c.id} className="cutting" onClick={async () => { setOfferFor(null); if (await takeSwap(o.id, c.id)) setTimeout(load, 800); }}>
                        <PlantArt sp={c.sp} form={c.form} hue={c.hue} stage={0} noPot className="mini" />
                        <span>{rich(label(c))}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {offerFor !== o.id && (
                <Btn small kind={mine.length ? 'gold' : 'soft'} disabled={!mine.length} onClick={() => setOfferFor(o.id)}>
                  {rich(mine.length ? 'Обменять' : 'Нет нужного')}
                </Btn>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}

function ListForm({ cuttings, onDone }: { cuttings: Cutting[]; onDone: () => void }) {
  const [pick, setPick] = useState<string>(cuttings[0]?.id ?? '');
  const [wants, setWants] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const toggle = (id: string) => setWants((w) => (w.includes(id) ? w.filter((x) => x !== id) : w.length < 3 ? [...w, id] : w));
  return (
    <div className="list-form">
      <div className="lbl">Какой черенок отдаёшь</div>
      <div className="tray-list">
        {cuttings.map((c) => (
          <button key={c.id} className={'cutting' + (pick === c.id ? ' on' : '')} onClick={() => setPick(c.id)}>
            <PlantArt sp={c.sp} form={c.form} hue={c.hue} stage={0} noPot className="mini" />
            <span>{rich(label(c))}</span>
          </button>
        ))}
      </div>
      <div className="lbl">Что хочешь взамен (до 3, или ничего — любой)</div>
      <div className="chips">
        {SPECIES.map((s) => (
          <button key={s.id} className={'chip' + (wants.includes(s.id) ? ' on' : '')} onClick={() => toggle(s.id)}>{rich(s.name)}</button>
        ))}
      </div>
      <Btn kind="primary" disabled={!pick || busy} onClick={async () => { setBusy(true); await listSwap(pick, wants); setBusy(false); onDone(); }}>Выставить</Btn>
      <Btn kind="ghost" onClick={onDone}>Отмена</Btn>
    </div>
  );
}
