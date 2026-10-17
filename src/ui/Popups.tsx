import { potSizeOf } from '../game/sim';
import { motion } from 'framer-motion';
import { Lineage } from './sheets/PlantCard';
import type { PendingGift } from '../game/types';
import { NOTES } from '../game/constants';
import { STREAK_REWARDS } from '../game/quests';
import { approx } from '../game/sim';
import { sp } from '../game/species';
import { achievementById, type RewardLine, claimGift, claimGiftOnline, claimStreak, closePopup, freeSlot, openSheet, popup, toast, useStore } from '../game/store';
import { PlantArt } from './art/PlantArt';
import { Btn, Modal } from './kit/kit';
import { sharePlusGift, shareThanks } from './share';
import type { BoxPrize } from '../game/box';
import { FORM_BY_ID } from '../game/products';
import { ITEM_BY_ID, potIdOf } from '../game/shop';
import { DecorArt, hasDecorArt } from './art/DecorArt';
import { sharePlantStory } from './story';
import { AGE_MARKS, daysText } from '../game/age';
import { Emo, rich } from './kit/rich';

export function Popups() {
  const p = useStore((s) => s.popups[0]);
  const g = useStore((s) => s.game);
  return (
    <Modal open={!!p} onClose={closePopup}>
      {p?.kind === 'level' && (
        <div className="center">
          <motion.div className="gicon" initial={{ rotate: -20, scale: 0.5 }} animate={{ rotate: 0, scale: 1 }}><Emo e="⭐" /></motion.div>
          <h2>Уровень {p.level}!</h2>
          <p>Награда: <b>+{p.reward} <Emo e="🍃" /></b></p>
          {p.unlocks.length > 0 && <p className="muted">Открылось: {rich(p.unlocks.join(', '))}</p>}
          <Btn kind="primary" onClick={closePopup}>Ура!</Btn>
        </div>
      )}
      {p?.kind === 'achievement' && (() => {
        const a = achievementById(p.id);
        return (
          <div className="center">
            <motion.div className="gicon" initial={{ scale: 0.3 }} animate={{ scale: 1 }}>{rich(a.icon)}</motion.div>
            <p className="muted small">Достижение</p>
            <h2>{rich(a.title)}</h2>
            <p>{rich(a.text)}</p>
            <p><b>+{a.reward} <Emo e="🍃" /></b></p>
            <Btn kind="primary" onClick={closePopup}>Отлично</Btn>
          </div>
        );
      })()}
      {p?.kind === 'away' && (
        <div>
          <h2 className="center">Пока тебя не было</h2>
          <p className="muted center">Прошло {rich(approx(p.report.ms))}</p>
          {p.report.gift && (
            <motion.div className="comeback" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <span className="cb-icon"><Emo e="🎁" /></span>
              <div><b>Растения скучали — с возвращением!</b><small>+{p.report.gift.leaves} <Emo e="🍃" /> · <Emo e="🧪" /> ×{p.report.gift.feed} · <Emo e="⚡" /> ×{p.report.gift.boost}</small></div>
            </motion.div>
          )}
          <ul className="away">
            {p.report.lines.map((l, i) => (
              <motion.li key={i} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.08 }}>
                <span>{rich(l.icon)}</span> {rich(l.text)}
              </motion.li>
            ))}
          </ul>
          <Btn kind="primary" onClick={closePopup}>К подоконнику</Btn>
        </div>
      )}
      {p?.kind === 'streak' && (
        <div className="center">
          <div className="gicon"><Emo e="🔥" /></div>
          <h2>{p.count} {rich(p.count === 1 ? 'день' : 'дня подряд')}!</h2>
          <p className="muted">Заходи каждый день — награда растёт. На 7-й день — подкормки в подарок.</p>
          <div className="streak-row">
            {STREAK_REWARDS.map((r, i) => {
              const day = ((p.count - 1) % 7) + 1;
              return (
                <div key={i} className={'sday' + (i + 1 < day ? ' done' : i + 1 === day ? ' today' : '')}>
                  <small>{i + 1}</small>
                  <b>{r}</b>
                </div>
              );
            })}
          </div>
          <Btn kind="gold" onClick={() => { claimStreak(); closePopup(); }}>Забрать +{p.reward} <Emo e="🍃" /></Btn>
        </div>
      )}
      {p?.kind === 'gift' && <GiftCard gift={p.gift} full={freeSlotsTotal(g) === 0} />}
      {p?.kind === 'thanks' && (
        <div className="center">
          <div className="gicon"><Emo e="🌱" /></div>
          <h2>Черенок в стакане!</h2>
          <p className="muted">Налей воды, и через 2 минуты он пустит корни. {rich(p.from)} будет рад(а) спасибо!</p>
          <Btn kind="primary" onClick={() => { shareThanks(p.sp); closePopup(); }}>Сказать спасибо <Emo e="🌱" /></Btn>
          <Btn kind="ghost" onClick={closePopup}>На подоконник</Btn>
        </div>
      )}
      {p?.kind === 'age' && (() => {
        const pl = g.plants.find((x) => x.id === p.plant);
        const m = AGE_MARKS.find((x) => x.days === p.days)!;
        if (!pl) return <Btn kind="primary" onClick={closePopup}>Ок</Btn>;
        const name = pl.nick || sp(pl.sp).name;
        return (
          <div className="center">
            <motion.div className={'postcard big2' + (m.frame ? ' gold-frame' : '')} initial={{ scale: 0.6, rotate: -8 }} animate={{ scale: 1, rotate: 0 }}>
              <PlantArt sp={pl.sp} form={pl.form} hue={pl.hue} stage={pl.stage} seed={pl.id} pot={pl.pot} size={potSizeOf(pl)} shape={pl.shape} blooming={pl.blooming} />
            </motion.div>
            <h2>{rich(m.icon)} {rich(name)}: {rich(daysText(p.days))} вместе!</h2>
            <p className="muted">{rich(m.frame ? 'Настоящий долгожитель — теперь у него золотая рамка на подоконнике.' : 'Целый месяц заботы — растение это чувствует.')}</p>
            <p><b>+{m.reward} <Emo e="🍃" /></b></p>
            <Btn kind="gold" onClick={() => { closePopup(); openSheet({ kind: 'timelapse', plant: pl.id }); }}><Emo e="🎬" /> Видео: как оно росло</Btn>
            <Btn onClick={() => { sharePlantStory(pl, `${daysText(p.days)} вместе`, name, 'age'); closePopup(); }}>Похвастаться фото <Emo e="📸" /></Btn>
            <Btn kind="ghost" onClick={closePopup}>Ура!</Btn>
          </div>
        );
      })()}
      {p?.kind === 'bloomed' && (() => {
        const pl = g.plants.find((x) => x.id === p.plant);
        if (!pl) return <Btn kind="primary" onClick={closePopup}>Ок</Btn>;
        return (
          <div className="center">
            <motion.div className="postcard big2" initial={{ scale: 0.6, rotate: 8 }} animate={{ scale: 1, rotate: 0 }}>
              <PlantArt sp={pl.sp} form={pl.form} hue={pl.hue} stage={pl.stage} seed={pl.id} pot={pl.pot} size={potSizeOf(pl)} shape={pl.shape} blooming />
            </motion.div>
            <h2><Emo e="🌸" /> {rich(pl.nick || sp(pl.sp).name)} впервые зацвело!</h2>
            <p className="muted">Сними таймлапс — весь путь от черенка до цветов за 10 секунд.</p>
            <Btn kind="gold" onClick={() => { closePopup(); openSheet({ kind: 'timelapse', plant: pl.id }); }}><Emo e="🎬" /> Снять таймлапс</Btn>
            <Btn kind="ghost" onClick={closePopup}>Потом</Btn>
          </div>
        );
      })()}
      {p?.kind === 'plusGift' && (
        <div className="center">
          <div className="gicon"><Emo e="🎁" /></div>
          <h2>Подарок готов!</h2>
          <p>Отправь ссылку другу — по ней он получит месяц «Садовник+» <Emo e="🌟" /></p>
          <Btn kind="gold" onClick={async () => { await sharePlusGift(p.code); closePopup(); }}>Отправить другу</Btn>
          <Btn kind="ghost" onClick={closePopup}>Позже (ссылка будет в магазине)</Btn>
        </div>
      )}
      {p?.kind === 'box' && <BoxReveal prize={p.prize} />}
      {p?.kind === 'reward' && <RewardReveal title={p.title} sub={p.sub} lines={p.lines} />}
      {p?.kind === 'contest' && (
        <div className="center">
          <motion.div className="gicon" initial={{ scale: 0.3, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}>{rich(['🥇', '🥈', '🥉'][p.place - 1] ?? '🏆')}</motion.div>
          <h2>{p.place} место в конкурсе!</h2>
          <p>Твой подоконник понравился игрокам больше других. Приз: <b>+{p.leaves} <Emo e="🍃" /></b></p>
          <Btn kind="primary" onClick={closePopup}>Ура!</Btn>
        </div>
      )}
      {p?.kind === 'migrated' && (
        <div className="center">
          <div className="gicon"><Emo e="🏡" /></div>
          <h2>Новый Подоконник!</h2>
          <p>Мы переехали в большую версию игры. Все твои растения на месте, а за верность — <b>+100 <Emo e="🍃" /></b>.</p>
          <p className="muted small">Теперь есть уровни, магазин, гербарий на 18 видов, задания, соседка и многое другое.</p>
          <Btn kind="primary" onClick={closePopup}>Посмотреть</Btn>
        </div>
      )}
    </Modal>
  );
}

function freeSlotsTotal(g: ReturnType<typeof useStore.getState>['game']) {
  return g.sills.reduce((n, s) => n + (freeSlot(g, s.id) >= 0 ? 1 : 0), 0);
}

function GiftCard({ gift, full }: { gift: PendingGift & { ok: boolean }; full: boolean }) {
  const g = useStore((s) => s.game);
  if (!gift.ok) {
    return (
      <div className="center">
        <div className="gicon"><Emo e="🍃" /></div>
        <h2>Черенок потерялся в пути</h2>
        <p className="muted">Ссылка повредилась по дороге. Попроси прислать её ещё раз.</p>
        <Btn kind="primary" onClick={closePopup}>На подоконник</Btn>
      </div>
    );
  }
  if (g.received.includes(gift.code)) {
    return (
      <div className="center">
        <div className="gicon"><Emo e="🌿" /></div>
        <h2>Этот черенок уже у тебя</h2>
        <p className="muted">Одну ссылку можно забрать только один раз.</p>
        <Btn kind="primary" onClick={closePopup}>На подоконник</Btn>
      </div>
    );
  }
  if (g.sent.some((x) => x.code === gift.code)) {
    return (
      <div className="center">
        <div className="gicon"><Emo e="💌" /></div>
        <h2>Это твой подарок</h2>
        <p className="muted">Отправь ссылку другу — он заберёт черенок к себе.</p>
        <Btn kind="primary" onClick={closePopup}>Понятно</Btn>
      </div>
    );
  }
  const s = sp(gift.sp);
  return (
    <div className="center">
      <motion.div className="postcard big2" initial={{ rotate: -6, y: 20 }} animate={{ rotate: 0, y: 0 }}>
        <PlantArt sp={gift.sp} form={gift.form} hue={gift.hue} stage={0} />
      </motion.div>
      <h2>{rich(gift.from)} дарит тебе черенок {rich(s.gen)}</h2>
      {NOTES[gift.note] && <p className="note">«{rich(NOTES[gift.note])}»</p>}
      {gift.line?.length ? <Lineage line={gift.line} title="🌳 У черенка есть родословная" /> : null}
      {full ? (
        <>
          <div className="soon">Подоконник занят. Освободи место — подарок подождёт.</div>
          <Btn kind="primary" onClick={() => { claimGift(gift); closePopup(); }}>Понятно</Btn>
        </>
      ) : (
        <Btn
          kind="gold"
          onClick={async () => {
            const r = await claimGiftOnline(gift);
            closePopup();
            if (r === 'ok') popup({ kind: 'thanks', sp: gift.sp, from: gift.from });
            else if (r === 'taken') toast('Этот черенок уже забрал кто-то другой 🍃 Попроси у друга новый!');
            else if (r === 'own') toast('Это твой собственный подарок — отправь ссылку другу 💌');
          }}
        >
          <Emo e="🎁" /> Забрать
        </Btn>
      )}
    </div>
  );
}


/** Картинка награды: предмет, горшок, растение или значок. */
function RewardArt({ l, big }: { l: RewardLine; big?: boolean }) {
  if (l.plant) return <PlantArt sp={l.plant.sp} form={l.plant.form} hue={l.plant.hue} stage={big ? 4 : 2} seed="reward" blooming className="mini" />;
  if (l.item && (l.item === 'pot' || l.item.startsWith('pot'))) return <PlantArt sp="chlorophytum" stage={2} pot={l.item === 'pot' ? 'terracotta' : potIdOf(l.item)} seed="reward" className="mini" potView />;
  if (l.item && hasDecorArt(l.item)) return <DecorArt id={l.item} scale={big ? 2 : 1} />;
  return <Emo e={l.icon ?? ITEM_BY_ID[l.item ?? '']?.icon ?? '🎁'} size={big ? 64 : 26} />;
}

/** Окно награды: большая картинка с лучами, название и всё, что получено. */
function RewardReveal({ title, sub, lines }: { title: string; sub?: string; lines: RewardLine[] }) {
  const main = lines.find((l) => l.plant || l.item) ?? lines[0];
  return (
    <div className="center reward-pop">
      {sub && <p className="muted small">{rich(sub)}</p>}
      <div className="rw-hero">
        <i className="rw-rays" aria-hidden />
        <motion.div className="rw-hero-art" initial={{ scale: 0.3, rotate: -15 }} animate={{ scale: [0.3, 1.15, 1], rotate: [-15, 6, 0] }} transition={{ duration: 0.6 }}>
          {main && <RewardArt l={main} big />}
        </motion.div>
      </div>
      <h2>{rich(title)}</h2>
      {lines.length > 0 && (
        <div className={"rw-list" + (lines.length > 3 ? " many" : "")}>
          {lines.map((l, i) => (
            <motion.div key={i} className="rw-chip" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 + i * 0.08 }}>
              <span className="rw-chip-art"><RewardArt l={l} /></span>
              <span>{rich(l.text)}</span>
            </motion.div>
          ))}
        </div>
      )}
      <Btn kind="primary" onClick={closePopup}>Забрать!</Btn>
    </div>
  );
}

function BoxReveal({ prize }: { prize: BoxPrize }) {
  const f = prize.kind === 'form' ? FORM_BY_ID[prize.id] : undefined;
  const it = prize.kind === 'item' ? ITEM_BY_ID[prize.id] : undefined;
  return (
    <div className="center">
      <motion.div className="gicon" initial={{ scale: 0.4, rotate: -25 }} animate={{ scale: [0.4, 1.25, 1], rotate: [-25, 10, 0] }} transition={{ duration: 0.7 }}>
        {rich(prize.kind === 'leaves' ? '🍃' : prize.kind === 'feed' ? '🧪' : prize.kind === 'pots' ? '🪴' : it ? it.icon : '✨')}
      </motion.div>
      <p className="muted small">В ящике-сюрпризе…</p>
      {f && (
        <div className="postcard big2 gold-frame"><PlantArt sp={f.sp} form={f.id} stage={0} /></div>
      )}
      <h2>
        {rich(prize.kind === 'leaves' && `+${prize.n} листиков`)}
        {rich(prize.kind === 'feed' && `Подкормка ×${prize.n}`)}
        {rich(prize.kind === 'pots' && `Горшки ×${prize.n}`)}
        {rich(it && it.name)}
        {rich(f && `Редкий черенок «${f.name}»!`)}
      </h2>
      {it && <p className="muted">{rich(it.desc)} Уже в коллекции.</p>}
      {f && <p className="muted">Он в запасе — поставь в воду или подари.</p>}
      <Btn kind="primary" onClick={closePopup}>Здорово!</Btn>
    </div>
  );
}
