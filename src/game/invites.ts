// Лестница приглашений: чем больше друзей пришло по твоей ссылке, тем ценнее награды.
// Друг засчитывается, когда дорос до 2 уровня — так ссылка работает на живых игроков.

import type { PassReward } from './events';

export interface InviteStep {
  n: number;
  icon: string;
  title: string;
  reward: PassReward;
  text: string;
}

export const INVITE_LADDER: InviteStep[] = [
  { n: 1, icon: '🌱', title: 'Первый друг', reward: { leaves: 100, pots: 3 }, text: '100 🍃 и 3 горшка' },
  { n: 3, icon: '✨', title: 'Своя компания', reward: { form: 'chimera' }, text: 'редкая «Фиалка Химера»' },
  { n: 5, icon: '🧙', title: 'Садовое товарищество', reward: { item: 'gnome' }, text: 'садовый гном — только за друзей' },
  { n: 10, icon: '👑', title: 'Душа подъезда', reward: { form: 'albo', leaves: 500 }, text: '«Монстера Альбо» и 500 🍃' },
  { n: 25, icon: '🏆', title: 'Народный садовод', reward: { leaves: 1500, feed: 10 }, text: '1500 🍃 и 10 подкормок' },
];

export const inviteReady = (claimed: number[], active: number) => INVITE_LADDER.filter((s) => active >= s.n && !claimed.includes(s.n));
