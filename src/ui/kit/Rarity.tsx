import { rarityOf } from '../../game/rarity';

/** Значок редкости: «Редкий», «Очень редкий», «Легендарный», «Редкий цвет»… Обычным — ничего. */
export function Rarity({ x, short }: { x: { sp: string; form?: string; hue?: string }; short?: boolean }) {
  const r = rarityOf(x);
  if (!r) return null;
  return <i className={'tier t' + r.tier} title={r.label}>{short ? '✦'.repeat(r.tier) : r.label}</i>;
}
