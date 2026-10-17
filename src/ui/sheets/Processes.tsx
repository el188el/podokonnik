import { diagnose, recoverHours } from '../../game/diagnose';
import { bloomBlockers, dryInHours, fmt, growthFactors, growthRate, tight, type Ctx } from '../../game/sim';
import type { GameState, Plant } from '../../game/types';
import { Emo, rich } from '../kit/rich';

const x = (m: number) => '×' + (Math.round(m * 100) / 100).toString().replace('.', ',');

/** «Что происходит»: из чего складывается рост, когда высохнет земля, почему падает здоровье и нет цветов. */
export function Processes({ g, p, t, ctx }: { g: GameState; p: Plant; t: number; ctx: Ctx }) {
  const factors = growthFactors(p, t, ctx);
  const rate = growthRate(p, t, ctx);
  const dry = dryInHours(p, t, ctx);
  const hurts = diagnose(g, p, t).filter((c) => c.hurts);
  const bloom = bloomBlockers(p, t, ctx);
  return (
    <div className="proc">
      <div className="proc-row">
        <span className="proc-ic"><Emo e="🌱" size={18} /></span>
        <div>
          <b>Рост{p.stage < 4 ? <> · {tight(p) ? 'стоит' : x(rate)}</> : <> · взрослое</>}</b>
          {p.stage < 4 && tight(p) && <p>Тесно в горшке — корням некуда расти. Пересади в горшок побольше.</p>}
          {p.stage < 4 && !tight(p) && (
            <>
              <p>{rate >= 1.05 ? 'Растёт быстрее обычного.' : rate <= 0.95 ? 'Растёт медленнее обычного.' : 'Растёт в обычном темпе.'}{ctx.newbie ? ' Бонус новичка ×3.' : ''}</p>
              {factors.length > 0 && (
                <div className="proc-chips">
                  {factors.map((f) => <span key={f.id} className={f.mul > 1 ? 'up' : 'down'}>{rich(f.label)} <b>{x(f.mul)}</b></span>)}
                </div>
              )}
            </>
          )}
          {p.stage === 4 && <p>Дальше не растёт, но может цвести и давать черенки.</p>}
        </div>
      </div>

      <div className="proc-row">
        <span className="proc-ic"><Emo e="💧" size={18} /></span>
        <div>
          <b>Вода · {Math.round(p.moisture * 100)}%</b>
          <p>
            {p.moisture > 1
              ? `Перелив: лишняя вода уйдёт примерно за ${fmt((p.moisture - 1) * (p.drain ? 6 : 24) * 3600e3)}${p.drain ? ' (дренаж помогает)' : ''}. Пока она стоит — корни задыхаются.`
              : p.moisture <= 0
                ? 'Земля сухая — корни сохнут. Полей!'
                : `Земля пересохнет примерно через ${fmt(dry * 3600e3)}. ${(ctx.temp ?? 22) > 28 ? 'В жару сохнет быстрее.' : (ctx.rh ?? 45) < 35 ? 'В сухом воздухе сохнет быстрее.' : (ctx.temp ?? 22) < 16 ? 'В прохладе сохнет медленнее.' : ''}`}
          </p>
        </div>
      </div>

      <div className="proc-row">
        <span className="proc-ic"><Emo e="❤" size={18} /></span>
        <div>
          <b>Здоровье · {Math.round(p.health)}%</b>
          <p>
            {hurts.length
              ? <>Теряет здоровье: {rich(hurts.map((c) => c.title.toLowerCase()).join(', '))}. Убери причину — и оно начнёт восстанавливаться.</>
              : p.health < 100
                ? <>Восстанавливается: +3% в час, полностью — через {fmt(recoverHours(p) * 3600e3)}.</>
                : 'Полностью здорово.'}
          </p>
        </div>
      </div>

      {bloom && (
        <div className="proc-row">
          <span className="proc-ic"><Emo e="🌸" size={18} /></span>
          <div>
            <b>Цветение{p.blooming ? ' · цветёт' : ''}</b>
            <p>{p.blooming ? 'Цветёт! Можно опылить другое цветущее растение этого вида.' : bloom.length ? <>Не цветёт: {rich(bloom.join(', '))}.</> : 'Всё готово — скоро зацветёт.'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
