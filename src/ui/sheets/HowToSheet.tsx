// «Как играть» — шпаргалка простыми словами, по карточке на каждое правило.

import { closeSheet } from '../../game/store';
import { Icon, TONE, type IconName } from '../kit/icons';
import { Btn } from '../kit/kit';

const RULES: [IconName, string, string, string][] = [
  ['sill', TONE.leaf, 'Вырасти цветок', 'Поставь черенок в стакан с водой. Когда появятся корешки — посади его в горшок.'],
  ['water', TONE.water, 'Поливай вовремя', 'Под горшком — полоска воды. Стала красной — пора поливать. Синяя — пить не хочет.'],
  ['chat', '#d0578f', 'Слушай цветы', 'Пузырь над цветком подскажет, что ему нужно: пить, света или горшок побольше.'],
  ['boost', TONE.boost, 'Бери инструмент', 'Выбери инструмент внизу и нажми на цветок. В «Уходе» — полить, опрыскать или полить всех сразу. Кому нужно — те светятся.'],
  ['quests', '#e0685a', 'Выполняй задания', 'Каждый день — новые задания. За них дают листики.'],
  ['leaf', TONE.leaf, 'Трать листики', 'В магазине за листики — горшки, новые черенки и украшения для комнаты.'],
  ['friends', '#3b8fd6', 'Играй с друзьями', 'Дари черенки, поливай цветы друзей и выращивайте общий подоконник.'],
];

export function HowToSheet() {
  return (
    <div className="howto">
      <h2 className="center">Как играть</h2>
      <p className="muted center small">Шпаргалка садовода — всё самое главное</p>
      <ol className="howto-list">
        {RULES.map(([icon, tone, title, text], i) => (
          <li key={i}>
            <span className="howto-ic" style={{ color: tone, background: tone + '1f' }}><Icon name={icon} size={26} /></span>
            <span><b>{title}</b><small>{text}</small></span>
          </li>
        ))}
      </ol>
      <Btn kind="primary" onClick={closeSheet}>Всё понятно!</Btn>
    </div>
  );
}
