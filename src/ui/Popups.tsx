import { motion } from 'framer-motion';
import type { PendingGift } from '../game/types';
import { NOTES } from '../game/constants';
import { STREAK_REWARDS } from '../game/quests';
import { approx } from '../game/sim';
import { sp } from '../game/species';
import { achievementById, claimGift, claimGiftOnline, claimStreak, closePopup, freeSlot, popup, toast, useStore } from '../game/store';
import { PlantArt } from './art/PlantArt';
import { Btn, Modal } from './kit/kit';
import { shareThanks } from './share';
import { sharePlantStory } from './story';
import { AGE_MARKS, daysText } from '../game/age';

export function Popups() {
  const p = useStore((s) => s.popups[0]);
  const g = useStore((s) => s.game);
  return (
    <Modal open={!!p} onClose={closePopup}>
      {p?.kind === 'level' && (
        <div className="center">
          <motion.div className="gicon" initial={{ rotate: -20, scale: 0.5 }} animate={{ rotate: 0, scale: 1 }}>⭐</motion.div>
          <h2>Уровень {p.level}!</h2>
          <p>Награда: <b>+{p.reward} 🍃</b></p>
          {p.unlocks.length > 0 && <p className="muted">Открылось: {p.unlocks.join(', ')}</p>}
          <Btn kind="primary" onClick={closePopup}>Ура!</Btn>
        </div>
      )}
      {p?.kind === 'achievement' && (() => {
        const a = achievementById(p.id);
        return (
          <div className="center">
            <motion.div className="gicon" initial={{ scale: 0.3 }} animate={{ scale: 1 }}>{a.icon}</motion.div>
            <p className="muted small">Достижение</p>
            <h2>{a.title}</h2>
            <p>{a.text}</p>
            <p><b>+{a.reward} 🍃</b></p>
            <Btn kind="primary" onClick={closePopup}>Отлично</Btn>
          </div>
        );
      })()}
      {p?.kind === 'away' && (
        <div>
          <h2 className="center">Пока тебя не было</h2>
          <p className="muted center">Прошло {approx(p.report.ms)}</p>
          <ul className="away">
            {p.report.lines.map((l, i) => (
              <motion.li key={i} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.08 }}>
                <span>{l.icon}</span> {l.text}
              </motion.li>
            ))}
          </ul>
          <Btn kind="primary" onClick={closePopup}>К подоконнику</Btn>
        </div>
      )}
      {p?.kind === 'streak' && (
        <div className="center">
          <div className="gicon">🔥</div>
          <h2>{p.count} {p.count === 1 ? 'день' : 'дня подряд'}!</h2>
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
          <Btn kind="gold" onClick={() => { claimStreak(); closePopup(); }}>Забрать +{p.reward} 🍃</Btn>
        </div>
      )}
      {p?.kind === 'gift' && <GiftCard gift={p.gift} full={freeSlotsTotal(g) === 0} />}
      {p?.kind === 'thanks' && (
        <div className="center">
          <div className="gicon">🌱</div>
          <h2>Черенок в стакане!</h2>
          <p className="muted">Налей воды, и через 2 минуты он пустит корни. {p.from} будет рад(а) спасибо!</p>
          <Btn kind="primary" onClick={() => { shareThanks(p.sp); closePopup(); }}>Сказать спасибо 🌱</Btn>
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
              <PlantArt sp={pl.sp} form={pl.form} hue={pl.hue} stage={pl.stage} seed={pl.id} pot={pl.pot} bigPot={pl.bigPot} blooming={pl.blooming} />
            </motion.div>
            <h2>{m.icon} {name}: {daysText(p.days)} вместе!</h2>
            <p className="muted">{m.frame ? 'Настоящий долгожитель — теперь у него золотая рамка на подоконнике.' : 'Целый месяц заботы — растение это чувствует.'}</p>
            <p><b>+{m.reward} 🍃</b></p>
            <Btn kind="gold" onClick={() => { sharePlantStory(pl, `${daysText(p.days)} вместе`, name, 'age'); closePopup(); }}>Похвастаться 📸</Btn>
            <Btn kind="ghost" onClick={closePopup}>Ура!</Btn>
          </div>
        );
      })()}
      {p?.kind === 'contest' && (
        <div className="center">
          <motion.div className="gicon" initial={{ scale: 0.3, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}>{['🥇', '🥈', '🥉'][p.place - 1] ?? '🏆'}</motion.div>
          <h2>{p.place} место в конкурсе!</h2>
          <p>Твой подоконник понравился игрокам больше других. Приз: <b>+{p.leaves} 🍃</b></p>
          <Btn kind="primary" onClick={closePopup}>Ура!</Btn>
        </div>
      )}
      {p?.kind === 'migrated' && (
        <div className="center">
          <div className="gicon">🏡</div>
          <h2>Новый Подоконник!</h2>
          <p>Мы переехали в большую версию игры. Все твои растения на месте, а за верность — <b>+100 🍃</b>.</p>
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
        <div className="gicon">🍃</div>
        <h2>Черенок потерялся в пути</h2>
        <p className="muted">Ссылка повредилась по дороге. Попроси прислать её ещё раз.</p>
        <Btn kind="primary" onClick={closePopup}>На подоконник</Btn>
      </div>
    );
  }
  if (g.received.includes(gift.code)) {
    return (
      <div className="center">
        <div className="gicon">🌿</div>
        <h2>Этот черенок уже у тебя</h2>
        <p className="muted">Одну ссылку можно забрать только один раз.</p>
        <Btn kind="primary" onClick={closePopup}>На подоконник</Btn>
      </div>
    );
  }
  if (g.sent.some((x) => x.code === gift.code)) {
    return (
      <div className="center">
        <div className="gicon">💌</div>
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
      <h2>{gift.from} дарит тебе черенок {s.gen}</h2>
      {NOTES[gift.note] && <p className="note">«{NOTES[gift.note]}»</p>}
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
          🎁 Забрать
        </Btn>
      )}
    </div>
  );
}

