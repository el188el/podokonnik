import { create } from 'zustand';
import * as api from '../net/api';
import { platform } from '../platform';
import { ACHIEVEMENTS, checkAchievements } from './achievements';
import { D, FEED_MS, H, MAX_CUTTINGS, MIST_MS, NEIGHBOR_COOLDOWN, NEIGHBOR_FREE_DAYS, SLOTS, STAGE_NAME } from './constants';
import { giftLink, makeCode } from './gifts';
import { XP, levelReward, unlocksAt, xpToNext, SILL_UNLOCK } from './progression';
import { QUEST_BONUS, bumpQuest, rollDay, streakReward } from './quests';
import { ITEM_BY_ID, ITEMS, potIdOf } from './shop';
import { advance, bestZone, canCut, cramped, ctxFor, hasLamp, lightBad, type SimEvent } from './sim';
import { activeEvent, EVENT_TOKENS, eventSeason, tierOf, type GameEvent, type PassReward } from './events';
import { FORM_BY_ID, FORMS, PRODUCT_BY_ID, RARE_DROP, formsOf } from './products';
import { replayFriendWaters, type FriendWater } from './social';
import { SPECIES, sp } from './species';
import { loadCloud, loadLocal, newPlant, newState, pickNewer, saveCloud, saveLocal, upgrade } from './storage';
import type { EventProgress, GameState, PendingGift, Plant, QuestKind, Twin, Zone } from './types';

// ─────────────────── UI-события: тосты, окна наград ───────────────────
export type Popup =
  | { kind: 'level'; level: number; reward: number; unlocks: string[] }
  | { kind: 'achievement'; id: string }
  | { kind: 'away'; report: AwayReport }
  | { kind: 'streak'; count: number; reward: number }
  | { kind: 'gift'; gift: PendingGift & { ok: boolean } }
  | { kind: 'thanks'; sp: string; from: string }
  | { kind: 'migrated' };

export interface AwayReport {
  ms: number;
  lines: { icon: string; text: string }[];
}

export type Sheet =
  | { kind: 'card'; plant: string }
  | { kind: 'picker'; slot: number; sill: string }
  | { kind: 'window'; sill: string; then?: 'picker'; slot?: number }
  | { kind: 'send'; cutting: string }
  | { kind: 'herb'; sp: string }
  | { kind: 'neighbor' }
  | { kind: 'install' }
  | { kind: 'visit'; id: string; name: string }
  | { kind: 'event' }
  | { kind: 'twins' }
  | null;

export type Tab = 'sill' | 'shop' | 'friends' | 'herbarium' | 'quests' | 'profile';

interface Toast { id: number; text: string }

interface Store {
  game: GameState;
  ready: boolean;
  tab: Tab;
  sheet: Sheet;
  popups: Popup[];
  toasts: Toast[];
  flash: Record<string, { text: string; until: number }>;
  fx: Record<string, { kind: 'water' | 'mist' | 'grow' | 'feed'; at: number }>;
}

const initial = newState(Date.now());
export const useStore = create<Store>(() => ({
  game: initial,
  ready: false,
  tab: 'sill',
  sheet: null,
  popups: [],
  toasts: [],
  flash: {},
  fx: {},
}));

const get = () => useStore.getState();
const set = useStore.setState;

export const now = () => Date.now() + api.serverSkew() + (get().game.offset || 0);
/** «Садовник+» активен (по сохранению или по данным сервера). */
export const isPlus = (g: GameState, t = now()) => Math.max(g.plusUntil ?? 0, api.serverPlusUntil()) > t;
const collectForm = (g: GameState, form?: string) => { if (form && !(g.forms ?? []).includes(form)) g.forms = [...(g.forms ?? []), form]; };

// ─────────────────── мелкие помощники ───────────────────
let toastId = 0;
export function toast(text: string) {
  const id = ++toastId;
  set((s) => ({ toasts: [...s.toasts.filter((x) => x.text !== text).slice(-1), { id, text }] }));
  setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 2800);
}

export function say(plantId: string, text: string, ms = 2400) {
  set((s) => ({ flash: { ...s.flash, [plantId]: { text, until: Date.now() + ms } } }));
}

function fx(plantId: string, kind: 'water' | 'mist' | 'grow' | 'feed') {
  set((s) => ({ fx: { ...s.fx, [plantId]: { kind, at: Date.now() } } }));
}

export const popup = (p: Popup) => set((s) => ({ popups: [...s.popups, p] }));
export const closePopup = () => set((s) => ({ popups: s.popups.slice(1) }));
export const openSheet = (sheet: Sheet) => set({ sheet });
export const closeSheet = () => set({ sheet: null });
export const setTab = (tab: Tab) => set({ tab, sheet: null });

const haptic = (k: Parameters<ReturnType<typeof platform>['haptic']>[0]) => {
  if (get().game.settings.haptics) platform().haptic(k);
};

/** Изменить состояние игры: работаем с копией и потом сохраняем. */
function mut<T>(fn: (g: GameState, t: number) => T): T {
  const g: GameState = structuredClone(get().game);
  const t = now();
  const r = fn(g, t);
  after(g);
  set({ game: g });
  scheduleSave();
  return r;
}

function addXp(g: GameState, n: number) {
  g.xp += n;
  while (g.xp >= xpToNext(g.level)) {
    g.xp -= xpToNext(g.level);
    g.level += 1;
    const reward = levelReward(g.level);
    g.leaves += reward;
    popup({ kind: 'level', level: g.level, reward, unlocks: unlocksAt(g.level) });
  }
}

function quest(g: GameState, kind: QuestKind, by = 1) {
  if (bumpQuest(g, kind, by).length) toast('Задание выполнено: забери награду 🎯');
}

function after(g: GameState) {
  for (const a of checkAchievements(g)) toast(`${a.icon} Достижение «${a.title}» +${a.reward} 🍃`);
}

const findPlant = (g: GameState, id: string) => g.plants.find((p) => p.id === id);
export const plantAt = (g: GameState, sill: string, slot: number) => g.plants.find((p) => p.sill === sill && p.slot === slot);
export function freeSlot(g: GameState, sill = g.activeSill) {
  for (let i = 0; i < SLOTS; i++) if (!plantAt(g, sill, i)) return i;
  return -1;
}
function anyFreeSlot(g: GameState): { sill: string; slot: number } | null {
  const order = [g.activeSill, ...g.sills.map((s) => s.id).filter((id) => id !== g.activeSill)];
  for (const sill of order) {
    const slot = freeSlot(g, sill);
    if (slot >= 0) return { sill, slot };
  }
  return null;
}
const discover = (g: GameState, id: string) => { if (!g.discovered.includes(id)) g.discovered.push(id); };
const log = (g: GameState, text: string, t: number) => { g.log = [{ at: t, text }, ...g.log].slice(0, 50); };

// ─────────────────── обработка событий симуляции ───────────────────
function handleEvents(g: GameState, ev: SimEvent[], quiet: boolean) {
  for (const e of ev) {
    const p = findPlant(g, e.plant);
    if (!p) continue;
    const s = sp(p.sp);
    if (e.kind === 'roots') {
      addXp(g, XP.root);
      if (!quiet) { toast(`${s.name} пустил(а) корни! Посади в горшок 🪴`); haptic('success'); fx(p.id, 'grow'); }
    } else if (e.kind === 'stage') {
      if (e.stage === 4) {
        addXp(g, XP.adult);
        g.stats.adults += 1;
        if (!g.grownAdult.includes(p.sp)) g.grownAdult.push(p.sp);
        discover(g, p.sp);
        if (!quiet) toast(`${s.name}: совсем взрослое! Можно взять черенок ✂️`);
      } else {
        addXp(g, XP.stage);
        if (!quiet) toast(`${s.name} подрос(ла): теперь «${STAGE_NAME[e.stage]}» 🌿`);
      }
      if (!quiet) { fx(p.id, 'grow'); haptic('success'); }
    } else if (e.kind === 'wilt') {
      log(g, `${s.name} засохло и сбросило листья 🥀`, g.simAt);
      if (!quiet) { toast(`${s.name} засыхает и сбрасывает листья 🥀 Полей и поставь на свет`); haptic('error'); }
    } else if (e.kind === 'bloom') {
      g.stats.blooms += 1;
      p.bloomedOnce = true;
      addXp(g, XP.bloom);
      if (!quiet) { toast(`${s.name} зацвело! 🌸`); haptic('success'); }
    }
  }
  for (const p of g.plants) {
    if (p.lowestHealth === 0 && p.health >= 100) {
      g.stats.rescues += 1;
      p.lowestHealth = 100;
      toast(`${sp(p.sp).name} снова полно сил. Ты спас(ла) его! 🚑`);
    }
  }
}

// ─────────────────── жизненный цикл ───────────────────
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let cloudTimer: ReturnType<typeof setTimeout> | null = null;
let lastCloud = 0;

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 800);
}

export function saveNow() {
  const g = get().game;
  g.lastSeen = now();
  const savedAt = saveLocal(g);
  schedulePush();
  const cloud = platform().cloud;
  if (!cloud) return;
  const wait = Math.max(0, 15e3 - (Date.now() - lastCloud));
  if (cloudTimer) clearTimeout(cloudTimer);
  cloudTimer = setTimeout(() => {
    lastCloud = Date.now();
    saveCloud(cloud, get().game, savedAt).catch(() => {});
  }, wait);
}

// ─────────────────── сервер ───────────────────
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let lastPush = 0;
let pushing = false;

function schedulePush() {
  if (!api.online()) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => pushNow(), Math.max(4e3, 15e3 - (Date.now() - lastPush)));
}

/** Отправить сохранение на сервер. keepalive — когда игру сворачивают. */
export async function pushNow(keepalive = false, force?: number) {
  if (!api.online() || pushing || !get().ready) return;
  pushing = true;
  lastPush = Date.now();
  try {
    const r = await api.push(get().game, { keepalive, force });
    if (r.kind === 'conflict') adoptServer(r.save, 'Подтянули прогресс с другого устройства ☁️');
    if (r.kind !== 'skip') applyInbox(r.inbox);
    syncPlus();
  } catch { /* нет сети — попробуем позже */ } finally {
    pushing = false;
  }
}

const score = (g: GameState) => g.level * 1e6 + g.xp + g.plants.length * 10 + g.stats.waters;

function adoptServer(save: api.ServerSave, message?: string) {
  const g = upgrade(save.state, Date.now());
  api.adoptVersion(save.version);
  const ev = advance(g, now());
  handleEvents(g, ev, true);
  set({ game: g });
  saveLocal(g);
  if (message) toast(message);
}

/** Поливы друзей, пришедшие при входе, уже учтены в симуляции в свои моменты времени. */
const replayed = new Set<number>();

function friendWaters(g: GameState, items: api.InboxItem[]): FriendWater[] {
  const seen = new Set(g.inboxSeen ?? []);
  return items
    .filter((i) => i.kind === 'friend_water' && !seen.has(i.id))
    .map((i) => {
      replayed.add(i.id);
      return { plantId: String(i.payload.plantId), at: Number(i.payload.at) || Date.now(), name: String(i.payload.name ?? 'Друг') };
    });
}

function applyInbox(items: api.InboxItem[]) {
  if (!items.length) return;
  const ids = items.map((i) => i.id);
  mut((g) => {
    const seen = new Set(g.inboxSeen ?? []);
    for (const it of items) {
      if (seen.has(it.id)) continue;
      seen.add(it.id);
      const name = String(it.payload.name ?? 'Друг');
      if (it.kind === 'gift_claimed') {
        g.leaves += 10;
        toast(`🎁 ${name} забрал(а) твой черенок ${sp(String(it.payload.sp)).gen}! +10 🍃`);
      } else if (it.kind === 'referral') {
        g.leaves += 50;
        toast(`👯 ${name} пришёл(ла) по твоему приглашению! +50 🍃`);
      } else if (it.kind === 'welcome') {
        g.leaves += 30;
        toast('🎉 Тебя пригласил друг — держи +30 🍃 на первые черенки');
      } else if (it.kind === 'friend_added') {
        toast(`👋 ${name} теперь твой друг — загляните друг к другу в гости`);
      } else if (it.kind === 'friend_water') {
        const p = g.plants.find((x) => x.id === String(it.payload.plantId));
        if (!replayed.has(it.id) && p && p.stage >= 2 && p.moisture < 1) {
          p.moisture = 1;
          p.dryFor = 0;
          fx(p.id, 'water');
        }
        toast(`💧 ${name} полил(а) твой ${sp(String(it.payload.sp ?? p?.sp)).name.toLowerCase()}`);
      } else if (it.kind === 'purchase') {
        const pr = PRODUCT_BY_ID[String(it.payload.product)];
        if (pr?.kind === 'leaves') {
          g.leaves += Number(it.payload.leaves) || pr.leaves || 0;
          toast(`🍃 +${pr.leaves} листиков. Спасибо за поддержку!`);
        } else if (pr?.kind === 'form') {
          const f = FORM_BY_ID[String(it.payload.form)];
          if (f) {
            g.cuttings.push({ id: makeCode(8), sp: f.sp, form: f.id, at: Date.now() });
            toast(`✨ Черенок «${f.name}» в запасе — поставь в воду или подари!`);
          }
        } else if (pr?.kind === 'pass') {
          const e = activeEvent(now());
          if (e) {
            eventProgress(g, e, now()).premium = true;
            toast(`${e.token} Сезонный пропуск «${e.title}» открыт — забирай награды!`);
          }
        } else if (pr?.kind === 'plus') {
          g.plusUntil = Math.max(g.plusUntil ?? 0, Number(it.payload.plusUntil) || 0);
          g.owned.pot_gold = 1;
          toast('🌟 «Садовник+» включён! Золотой горшок уже в коллекции');
        }
        haptic('success');
      } else if (it.kind === 'tester') {
        grantTester(g, now());
      } else if (it.kind === 'water_reward') {
        const r = Number(it.payload.reward) || 0;
        g.leaves += r;
        eventToken(g, 'friendWater', now());
        toast(`Спасибо от ${String(it.payload.host ?? 'друга')}: +${r} 🍃`);
      }
    }
    g.inboxSeen = [...seen].slice(-100);
  });
  api.inboxAck(ids);
}

function syncPlus() {
  const sp = api.serverPlusUntil();
  if (sp > (get().game.plusUntil ?? 0)) mut((g) => { g.plusUntil = sp; });
}

/** Купить за звёзды: счёт → окно оплаты Telegram → покупка приходит с сервера. */
export async function buyStars(productId: string): Promise<boolean> {
  const pf = platform();
  if (pf.kind !== 'telegram' || !api.loggedIn()) {
    toast('Покупки за звёзды доступны в Telegram-версии игры ⭐');
    return false;
  }
  try {
    const link = await api.payInvoice(productId);
    const st = await pf.pay(link);
    if (st === 'paid' || st === 'pending') {
      toast(st === 'paid' ? 'Оплата прошла! Покупка уже в пути ✨' : 'Ждём подтверждения оплаты…');
      for (const ms of [1500, 4000, 9000, 20000]) setTimeout(() => pushNow(), ms);
      return true;
    }
    if (st === 'failed') toast('Оплата не прошла. Звёзды не списаны');
    return false;
  } catch {
    toast('Не получилось открыть оплату. Проверь интернет');
    return false;
  }
}

/** Вход на сервер при запуске: выбираем, чей прогресс свежее — устройства или сервера. */
async function connect(local: GameState): Promise<{ state: GameState; force?: number; inbox: api.InboxItem[] } | null> {
  if (!api.online()) return null;
  try {
    const { save, inbox } = await api.login(local.name);
    if (!save?.state || !Array.isArray(save.state.plants)) return { state: local, inbox };
    const known = api.knownVersion();
    if (known === 0) {
      if (score(save.state) >= score(local)) {
        api.adoptVersion(save.version);
        return { state: upgrade(save.state, Date.now()), inbox };
      }
      return { state: local, force: save.version, inbox };
    }
    if (save.version > known) {
      api.adoptVersion(save.version);
      return { state: upgrade(save.state, Date.now()), inbox };
    }
    return { state: local, inbox };
  } catch {
    return null;
  }
}

export async function boot() {
  const t0 = Date.now();
  const local = loadLocal(t0);
  let g = local.state;
  const cloud = platform().cloud;
  if (cloud) g = pickNewer(local, await loadCloud(cloud), t0);
  const server = await connect(g);
  if (server) g = server.state;
  const user = platform().user;
  if (user && !g.name) g.name = user.name.split(' ')[0].slice(0, 24);

  const t = Date.now() + api.serverSkew() + (g.offset || 0);
  const before = new Map(g.plants.map((p) => [p.id, { stage: p.stage, health: p.health }]));
  const away = t - (g.lastSeen || t);
  const waters = server ? friendWaters(g, server.inbox) : [];
  const ev = replayFriendWaters(g, waters, t);
  handleEvents(g, ev, true);

  const fresh = rollDay(g, t, isPlus(g, t));
  set({ game: g, ready: true });

  if (local.migrated) popup({ kind: 'migrated' });
  if (away > H && g.plants.length) {
    const report = awayReport(g, ev, before, away);
    for (const w of waters) {
      const p = g.plants.find((x) => x.id === w.plantId);
      if (p) report.lines.unshift({ icon: '💧', text: `${w.name} полил(а) ${sp(p.sp).acc} — спасибо другу!` });
    }
    popup({ kind: 'away', report });
  }
  if (fresh && g.streak.claimedDay !== g.streak.day && g.plants.length) popup({ kind: 'streak', count: g.streak.count, reward: streakReward(g.streak.count) * (isPlus(g) ? 2 : 1) });
  after(g);
  scheduleSave();
  if (server) {
    if (server.force !== undefined || api.knownVersion() === 0) pushNow(false, server.force);
    applyInbox(server.inbox);
    syncPlus();
  }
}

function awayReport(g: GameState, ev: SimEvent[], before: Map<string, { stage: number; health: number }>, ms: number): AwayReport {
  const lines: AwayReport['lines'] = [];
  for (const p of g.plants) {
    const b = before.get(p.id);
    if (!b) continue;
    const s = sp(p.sp);
    if (p.stage > b.stage) lines.push({ icon: '🌱', text: `${s.name}: ${STAGE_NAME[b.stage]} → ${STAGE_NAME[p.stage]}` });
    if (ev.some((e) => e.kind === 'wilt' && e.plant === p.id)) lines.push({ icon: '🥀', text: `${s.name} засохло без воды и сбросило листья` });
    else if (p.moisture <= 0 && p.stage >= 2) lines.push({ icon: '💧', text: `${s.name} очень хочет пить` });
    if (ev.some((e) => e.kind === 'bloom' && e.plant === p.id)) lines.push({ icon: '🌸', text: `${s.name} зацвело` });
  }
  const watered = new Set(ev.filter((e) => e.kind === 'neighbor').map((e) => e.plant)).size;
  if (watered) lines.unshift({ icon: '👵', text: `Соседка поливала растения (${watered})` });
  if (!lines.length) lines.push({ icon: '🌿', text: 'Всё спокойно, растения ждали тебя' });
  return { ms, lines };
}

export function tick() {
  const st = get();
  if (!st.ready) return;
  const t = now();
  const g: GameState = structuredClone(st.game);
  const ev = advance(g, t);
  handleEvents(g, ev, false);
  if (rollDay(g, t, isPlus(g, t)) && g.plants.length && g.streak.claimedDay !== g.streak.day) {
    popup({ kind: 'streak', count: g.streak.count, reward: streakReward(g.streak.count) * (isPlus(g) ? 2 : 1) });
  }
  after(g);
  set({ game: g });
  if (ev.length) scheduleSave();
}

// ─────────────────── действия игрока ───────────────────
export function chooseWindow(sillId: string, side: 'N' | 'E' | 'S' | 'W') {
  mut((g, t) => {
    const sill = g.sills.find((s) => s.id === sillId);
    if (!sill) return;
    const first = !sill.window;
    sill.window = side;
    if (!first) {
      const bad = g.plants.filter((p) => p.sill === sillId && lightBad(p, sill, t, hasLamp(g, sill))).length;
      toast(bad ? 'Проверь растения с пузырями: им теперь не тот свет' : 'Всем растениям свет подходит 🌿');
    }
  });
}

/** Поставить черенок в стакан на подоконник. */
export function placeCutting(spId: string, sill: string, slot: number, extra: Partial<Plant> = {}) {
  return mut((g, t) => {
    if (plantAt(g, sill, slot)) return null;
    const sl = g.sills.find((s) => s.id === sill)!;
    const first = g.plants.length === 0 && g.stats.planted === 0;
    const p = newPlant({ sp: spId, sill, slot, zone: bestZone(spId, sl, t, hasLamp(g, sl)), quick: first || extra.quick, ...extra }, t);
    g.plants.push(p);
    discover(g, spId);
    return p.id;
  });
}

export type WaterResult = 'rooting' | 'glass' | 'enough' | 'watered' | 'over';

export function water(plantId: string, insist = false): WaterResult | null {
  return mut((g, t) => {
    const p = findPlant(g, plantId);
    if (!p) return null;
    if (p.stage === 0 && !p.rootStart) {
      p.rootStart = t;
      fx(p.id, 'water');
      haptic('light');
      say(p.id, 'Буль-буль 💧', 1500);
      return 'rooting';
    }
    if (p.stage <= 1) {
      say(p.id, p.stage === 1 ? 'Посади меня в горшок 🪴' : 'В стакане хватает воды');
      return 'glass';
    }
    if (p.moisture > 0.5 && !insist) {
      say(p.id, p.moisture > 1 ? 'Я и так мокрое 😵' : 'Мне уже хватит 💧');
      haptic('warning');
      return 'enough';
    }
    if (p.moisture > 0.5 && insist) {
      p.moisture = 1.4;
      say(p.id, 'Ой, перелили! 😵', 2600);
      haptic('error');
      toast(sp(p.sp).overwater === 'sensitive' ? `${sp(p.sp).name} не любит перелив — корни могут загнить` : 'Перелили. Дай земле просохнуть');
      return 'over';
    }
    const helpful = p.moisture < 0.5;
    p.moisture = 1;
    p.dryFor = 0;
    g.stats.waters += 1;
    const hour = new Date(t).getHours();
    if (hour >= 0 && hour < 5) g.stats.nightWater += 1;
    if (helpful) { addXp(g, XP.water); quest(g, 'water'); eventToken(g, 'water', t); }
    fx(p.id, 'water');
    haptic('light');
    return 'watered';
  });
}

export function plantInPot(plantId: string) {
  mut((g, t) => {
    const p = findPlant(g, plantId);
    if (!p || p.stage !== 1) return;
    p.stage = 2;
    p.plantedAt = t;
    p.growth = 0;
    p.moisture = 1;
    p.health = 100;
    g.stats.planted += 1;
    addXp(g, XP.plant);
    eventToken(g, 'plant', t);
    quest(g, 'plant');
    fx(p.id, 'grow');
    haptic('success');
    toast(`${sp(p.sp).name} в горшке! Поливай, когда подсохнет 💧`);
  });
}

export function move(plantId: string, zone: Zone) {
  mut((g, t) => {
    const p = findPlant(g, plantId);
    if (!p || p.zone === zone) return;
    const ctx = ctxFor(g, p, t);
    const wasBad = !!lightBad(p, ctx.sill, t, ctx.lamp);
    p.zone = zone;
    const bad = lightBad(p, ctx.sill, t, ctx.lamp);
    if (!bad) p.badLightFor = 0;
    if (wasBad && !bad) quest(g, 'fixLight');
    haptic('select');
    if (p.stage < 2) toast(zone === 'glass' ? 'Переставлено к стеклу ☀️' : 'Переставлено в глубину комнаты 🛋');
    else toast(bad === 'hot' ? 'Тут жарко на солнце 🥵' : bad === 'dark' ? 'Тут темновато 🌥' : `Переставлено ${zone === 'glass' ? 'к стеклу ☀️' : 'в глубину 🛋'} Тут ему хорошо`);
  });
}

/** Переставить горшок в другое место (обмен местами). */
export function swap(plantId: string, sill: string, slot: number) {
  mut((g) => {
    const p = findPlant(g, plantId);
    if (!p) return;
    const other = plantAt(g, sill, slot);
    if (other === p) return;
    if (other) { other.slot = p.slot; other.sill = p.sill; }
    p.slot = slot;
    p.sill = sill;
    haptic('select');
  });
}

export function mist(plantId: string) {
  return mut((g, t) => {
    const p = findPlant(g, plantId);
    if (!p || p.stage < 2) return false;
    const s = sp(p.sp);
    if (s.mist === 'no') {
      p.health = Math.max(5, p.health - 10);
      say(p.id, 'Ай! Пятна на листьях 😣');
      haptic('error');
      toast(s.mistTip);
      return false;
    }
    if (s.mist === 'ok') { toast(s.mistTip); return false; }
    const fresh = !(p.mistUntil && t < p.mistUntil);
    p.mistUntil = t + MIST_MS;
    g.stats.mists += 1;
    if (fresh) { addXp(g, XP.mist); quest(g, 'mist'); eventToken(g, 'mist', t); }
    fx(p.id, 'mist');
    say(p.id, 'Спасибо! 😊');
    haptic('light');
    toast(`${s.name} радуется! 12 ч растёт быстрее 💦`);
    return true;
  });
}

export function feed(plantId: string) {
  mut((g, t) => {
    const p = findPlant(g, plantId);
    if (!p || p.stage < 2) return;
    if ((g.owned.feed ?? 0) <= 0) {
      if (g.leaves < ITEM_BY_ID.feed.price) { toast('Не хватает листиков на подкормку 🍃'); return; }
      g.leaves -= ITEM_BY_ID.feed.price;
    } else g.owned.feed -= 1;
    p.feedUntil = Math.max(t, p.feedUntil ?? 0) + FEED_MS;
    addXp(g, XP.feed);
    quest(g, 'feed');
    fx(p.id, 'feed');
    toast('Подкормлено! Сутки растёт в 1,5 раза быстрее 🧪');
  });
}

export function repot(plantId: string) {
  mut((g, t) => {
    const p = findPlant(g, plantId);
    if (!p || !cramped(p, t)) return;
    if ((g.owned.potL ?? 0) <= 0) {
      if (g.leaves < ITEM_BY_ID.potL.price) { toast('Нужен большой горшок: загляни в магазин 🪴'); return; }
      g.leaves -= ITEM_BY_ID.potL.price;
    } else g.owned.potL -= 1;
    p.bigPot = true;
    p.repottedAt = t;
    g.stats.repots += 1;
    addXp(g, XP.repot);
    quest(g, 'repot');
    fx(p.id, 'grow');
    toast('Пересажено! В просторном горшке черенки отрастают быстрее 🪴');
  });
}

export function takeCutting(plantId: string) {
  return mut((g, t) => {
    const p = findPlant(g, plantId);
    if (!p || !canCut(p, t)) return null;
    if (g.cuttings.length >= MAX_CUTTINGS) { toast('В стаканах на кухне уже 10 черенков — подари или посади их'); return null; }
    p.lastCut = t;
    // черенок редкой формы остаётся редким; у обычного растения — маленький шанс на сюрприз
    let form = p.form;
    const options = formsOf(p.sp);
    if (!form && options.length && Math.random() < RARE_DROP) {
      form = options[Math.floor(Math.random() * options.length)].id;
      toast(`✨ Редкость! Черенок оказался формой «${FORM_BY_ID[form].name}»`);
    }
    const c = { id: makeCode(8), sp: p.sp, at: t, fromPlant: p.id, ...(form ? { form } : {}) };
    g.cuttings.push(c);
    g.stats.cuts += 1;
    addXp(g, XP.cut);
    eventToken(g, 'cut', t);
    quest(g, 'cut');
    haptic('success');
    return c.id;
  });
}

export function plantCutting(cuttingId: string, sill?: string, slot?: number) {
  mut((g, t) => {
    const c = g.cuttings.find((x) => x.id === cuttingId);
    if (!c) return;
    const place = sill !== undefined && slot !== undefined && !plantAt(g, sill, slot) ? { sill, slot } : anyFreeSlot(g);
    if (!place) { toast('Все места заняты. Освободи горшок или открой новый подоконник'); return; }
    const sl = g.sills.find((s) => s.id === place.sill)!;
    g.cuttings = g.cuttings.filter((x) => x.id !== cuttingId);
    g.plants.push(newPlant({ sp: c.sp, form: c.form, sill: place.sill, slot: place.slot, zone: bestZone(c.sp, sl, t, hasLamp(g, sl)) }, t));
    collectForm(g, c.form);
    g.activeSill = place.sill;
    discover(g, c.sp);
    toast('Черенок в стакане. Налей воды — и он пустит корни 💧');
  });
}

export function giftCutting(cuttingId: string, from: string, note: number) {
  const r = mut((g, t) => {
    const c = g.cuttings.find((x) => x.id === cuttingId);
    if (!c) return null;
    g.name = from;
    const gift: PendingGift = { sp: c.sp, from, note, code: makeCode(), ...(c.form ? { form: c.form } : {}) };
    g.cuttings = g.cuttings.filter((x) => x.id !== cuttingId);
    g.sent.push({ code: gift.code, sp: c.sp, at: t });
    g.stats.giftsSent += 1;
    addXp(g, XP.giftSent);
    eventToken(g, 'gift', t);
    quest(g, 'gift');
    return { gift, link: giftLink(gift) };
  });
  if (r) api.giftCreate(r.gift);
  return r;
}

export function removePlant(plantId: string) {
  mut((g) => { g.plants = g.plants.filter((p) => p.id !== plantId); });
  closeSheet();
}

export function renamePlant(plantId: string, nick: string) {
  mut((g) => { const p = findPlant(g, plantId); if (p) p.nick = nick.trim().slice(0, 20) || undefined; });
}

export function setPot(plantId: string, pot: string) {
  mut((g) => { const p = findPlant(g, plantId); if (p && (pot === 'terracotta' || g.owned['pot_' + pot])) p.pot = pot; });
}

// ─────────────────── подарки: получение ───────────────────
export function showGift(gift: PendingGift & { ok: boolean }) {
  popup({ kind: 'gift', gift });
}

/** Забрать подарок с проверкой на сервере: одну ссылку забирает только один человек. */
export async function claimGiftOnline(gift: PendingGift): Promise<'ok' | 'dup' | 'full' | 'taken' | 'own'> {
  const g = get().game;
  if (g.received.includes(gift.code)) return 'dup';
  const st = await api.giftClaim(gift);
  if (st === 'taken' || st === 'own') return st;
  return claimGift(gift);
}

export function claimGift(gift: PendingGift): 'ok' | 'dup' | 'full' {
  return mut((g, t) => {
    if (g.received.includes(gift.code) || g.sent.some((s) => s.code === gift.code)) return 'dup';
    const place = anyFreeSlot(g);
    if (!place) {
      if (!g.pending.some((x) => x.code === gift.code)) g.pending.push(gift);
      return 'full';
    }
    const sl = g.sills.find((s) => s.id === place.sill)!;
    const p = newPlant({ sp: gift.sp, form: gift.form, sill: place.sill, slot: place.slot, zone: bestZone(gift.sp, sl, t, hasLamp(g, sl)), quick: true, from: { name: gift.from, note: gift.note, code: gift.code }, claimedAt: t }, t);
    collectForm(g, gift.form);
    g.plants.push(p);
    g.received.push(gift.code);
    g.pending = g.pending.filter((x) => x.code !== gift.code);
    g.stats.giftsGot += 1;
    g.activeSill = place.sill;
    discover(g, gift.sp);
    addXp(g, XP.giftGot);
    return 'ok';
  });
}

// ─────────────────── магазин ───────────────────
export function buyItem(id: string) {
  return mut((g, t) => {
    const it = ITEM_BY_ID[id];
    if (!it) return false;
    if (it.eventOnly) { toast('Этот предмет — награда сезонного пропуска'); return false; }
    if (it.level && g.level < it.level) { toast(`Откроется на ${it.level} уровне`); return false; }
    if (it.months && !it.months.includes(new Date(t).getMonth() + 1)) { toast('Этот товар бывает только в сезон'); return false; }
    if (!it.consumable && (g.owned[id] ?? 0) > 0) { toast('Уже есть 🙂'); return false; }
    if (g.leaves < it.price) { toast('Не хватает листиков 🍃'); haptic('warning'); return false; }
    g.leaves -= it.price;
    const ids = it.pack ?? [id];
    for (const x of ids) g.owned[x] = (g.owned[x] ?? 0) + 1;
    g.stats.bought += 1;
    quest(g, 'buy');
    haptic('success');
    if (it.cat === 'decor' || it.pack) {
      const sill = g.sills.find((s) => s.id === g.activeSill)!;
      for (const x of ids) if (ITEM_BY_ID[x]?.cat === 'decor' && !sill.decor.includes(x)) sill.decor.push(x);
    }
    toast(`Куплено: ${it.name} ${it.icon}`);
    return true;
  });
}

export function buySpecies(spId: string) {
  return mut((g, t) => {
    const s = sp(spId);
    if (g.level < s.unlockLevel) { toast(`Откроется на ${s.unlockLevel} уровне`); return false; }
    if (g.leaves < s.price) { toast('Не хватает листиков 🍃'); haptic('warning'); return false; }
    if (g.cuttings.length >= MAX_CUTTINGS) { toast('Слишком много черенков в запасе'); return false; }
    g.leaves -= s.price;
    g.cuttings.push({ id: makeCode(8), sp: spId, at: t });
    g.stats.bought += 1;
    discover(g, spId);
    quest(g, 'buy');
    haptic('success');
    toast(`Черенок ${s.gen} ждёт в разделе «Черенки» ✂️`);
    return true;
  });
}

export function toggleDecor(sillId: string, id: string) {
  mut((g) => {
    const sill = g.sills.find((s) => s.id === sillId);
    if (!sill || !(g.owned[id] > 0)) return;
    if (sill.decor.includes(id)) sill.decor = sill.decor.filter((x) => x !== id);
    else {
      for (const other of g.sills) other.decor = other.decor.filter((x) => x !== id);
      sill.decor.push(id);
    }
  });
}

export const ownsPot = (g: GameState, pot: string) => pot === 'terracotta' || (pot === 'gold' ? isPlus(g) : (g.owned['pot_' + pot] ?? 0) > 0);
export { potIdOf };

export function unlockSill(id: string) {
  return mut((g) => {
    const u = SILL_UNLOCK[id];
    if (!u || g.sills.some((s) => s.id === id)) return false;
    if (g.level < u.level) { toast(`Откроется на ${u.level} уровне`); return false; }
    if (g.leaves < u.price) { toast('Не хватает листиков 🍃'); return false; }
    g.leaves -= u.price;
    g.sills.push({ id, name: id === 'kitchen' ? 'Кухня' : 'Балкон', window: null, decor: [] });
    g.activeSill = id;
    toast('Новый подоконник! Выбери, куда смотрит окно 🪟');
    return true;
  });
}

export function setActiveSill(id: string) {
  mut((g) => { g.activeSill = id; });
}

// ─────────────────── соседка ───────────────────
export function startNeighbor(days: number, paid: boolean) {
  return mut((g, t) => {
    const active = g.neighbor && t < g.neighbor.until;
    if (paid) {
      if ((g.owned.neighbor7 ?? 0) > 0) g.owned.neighbor7 -= 1;
      else if (g.leaves >= ITEM_BY_ID.neighbor7.price) g.leaves -= ITEM_BY_ID.neighbor7.price;
      else { toast('Не хватает листиков 🍃'); return false; }
      const from = active ? g.neighbor!.until : t;
      g.neighbor = { until: from + 7 * D, cooldownUntil: Math.max(g.neighbor?.cooldownUntil ?? 0, from + 7 * D) };
    } else {
      const plus = isPlus(g, t);
      if (!plus && g.neighbor && t < g.neighbor.cooldownUntil) { toast('Соседка уже выручала недавно'); return false; }
      const d = plus ? Math.min(days, 7) : Math.min(days, NEIGHBOR_FREE_DAYS);
      g.neighbor = { until: t + d * D, cooldownUntil: plus ? t + d * D : t + d * D + NEIGHBOR_COOLDOWN };
    }
    g.stats.neighbor += 1;
    for (const p of g.plants) if (p.stage >= 2 && p.moisture < 1) p.moisture = 1;
    toast('Соседка Валентина Петровна присмотрит за растениями 👵');
    return true;
  });
}

export function stopNeighbor() {
  mut((g, t) => { if (g.neighbor) g.neighbor.until = Math.min(g.neighbor.until, t); });
}

// ─────────────────── награды ───────────────────
export function claimStreak() {
  mut((g) => {
    if (g.streak.claimedDay === g.streak.day) return;
    g.streak.claimedDay = g.streak.day;
    const r = streakReward(g.streak.count) * (isPlus(g) ? 2 : 1);
    g.leaves += r;
    if (g.streak.count % 7 === 0) g.owned.feed = (g.owned.feed ?? 0) + 2;
  });
}

export function claimQuest(id: string) {
  mut((g) => {
    const q = g.quests.list.find((x) => x.id === id);
    if (!q || q.claimed || q.progress < q.target) return;
    q.claimed = true;
    g.leaves += q.reward * (isPlus(g) ? 2 : 1);
    g.stats.questsDone += 1;
    addXp(g, XP.quest);
    eventToken(g, 'quest', now());
    haptic('success');
  });
}

export function claimQuestBonus() {
  mut((g) => {
    if (g.quests.bonusClaimed || !g.quests.list.every((q) => q.claimed)) return;
    g.quests.bonusClaimed = true;
    g.leaves += QUEST_BONUS * (isPlus(g) ? 2 : 1);
    g.owned.feed = (g.owned.feed ?? 0) + 1;
    haptic('success');
    toast(`Все задания дня! +${QUEST_BONUS} 🍃 и подкормка 🧪`);
  });
}

export function visitHerbarium() {
  mut((g) => { quest(g, 'visitHerbarium'); });
}

export function setName(name: string) {
  mut((g) => { g.name = name.trim().slice(0, 24); });
}

export function setSetting<K extends keyof GameState['settings']>(k: K, v: GameState['settings'][K]) {
  mut((g) => { g.settings[k] = v; });
}

// ─────────────────── отладка (?debug) ───────────────────
export const debug = {
  skip(ms: number) {
    set((s) => ({ game: { ...s.game, offset: (s.game.offset || 0) + ms } }));
    tick();
    scheduleSave();
  },
  adult() {
    mut((g, t) => {
      for (const p of g.plants) {
        if (p.stage < 2) { p.rootStart = t - 3600e3; p.stage = 2; p.plantedAt = t; }
        const [a, b] = sp(p.sp).stageHours;
        p.growth = a + b + 0.1;
        p.stage = 4;
        p.adultAt = p.adultAt ?? t;
        p.moisture = 1;
        p.health = 100;
        if (!g.grownAdult.includes(p.sp)) g.grownAdult.push(p.sp);
      }
    });
  },
  cramp() {
    mut((g, t) => { for (const p of g.plants) if (p.stage === 4) p.adultAt = t - sp(p.sp).repotDays * D - 1000; });
  },
  fill() {
    mut((g, t) => {
      const sill = g.sills.find((s) => s.id === g.activeSill)!;
      let i = 0;
      for (let slot = 0; slot < SLOTS; slot++) {
        if (plantAt(g, sill.id, slot)) continue;
        const s = SPECIES[(i++ + slot) % SPECIES.length];
        g.plants.push(newPlant({ sp: s.id, sill: sill.id, slot, zone: bestZone(s.id, sill, t, false), stage: 2, rootStart: t, plantedAt: t, moisture: 1 }, t));
        discover(g, s.id);
      }
    });
  },
  rich() { mut((g) => { g.leaves += 1000; addXp(g, 500); }); },
  reset() {
    localStorage.removeItem('podokonnik-v2');
    set({ game: newState(Date.now()), popups: [], sheet: null });
    scheduleSave();
  },
};

export const achievementById = (id: string) => ACHIEVEMENTS.find((a) => a.id === id)!;
export { H, D };

export function setShowoffDone(plantId: string) {
  mut((g) => { const p = findPlant(g, plantId); if (p) p.showoffDone = true; });
}

// ─────────────────── ивенты и сезонный пропуск ───────────────────
export function eventProgress(g: GameState, e: GameEvent, t: number): EventProgress {
  const key = eventSeason(e, t);
  g.events = g.events ?? {};
  return (g.events[key] ??= { tokens: 0, free: [], prem: [], premium: false });
}

/** Начислить валюту текущего ивента за действие. */
function eventToken(g: GameState, kind: keyof typeof EVENT_TOKENS, t: number) {
  const e = activeEvent(t);
  if (!e) return;
  const st = eventProgress(g, e, t);
  const before = tierOf(e, st.tokens);
  st.tokens += EVENT_TOKENS[kind];
  if (tierOf(e, st.tokens) > before) toast(`${e.token} Новый уровень пропуска «${e.title}» — забери награду!`);
}

export function addEventTokens(kind: keyof typeof EVENT_TOKENS) {
  mut((g, t) => eventToken(g, kind, t));
}

function giveReward(g: GameState, r: PassReward, t: number) {
  if (r.leaves) g.leaves += r.leaves;
  if (r.feed) g.owned.feed = (g.owned.feed ?? 0) + r.feed;
  if (r.item) {
    g.owned[r.item] = 1;
    const it = ITEM_BY_ID[r.item];
    if (it?.cat === 'decor') {
      const sill = g.sills.find((s) => s.id === g.activeSill)!;
      if (!sill.decor.includes(r.item)) sill.decor.push(r.item);
    }
  }
  if (r.form) {
    const f = FORM_BY_ID[r.form];
    if (f) g.cuttings.push({ id: makeCode(8), sp: f.sp, form: f.id, at: t });
  }
}

export const rewardText = (r: PassReward) =>
  r.leaves ? `+${r.leaves} 🍃` : r.feed ? `🧪 ×${r.feed}` : r.item ? `${ITEM_BY_ID[r.item]?.icon ?? '🎁'} ${ITEM_BY_ID[r.item]?.name ?? ''}` : r.form ? `✨ ${FORM_BY_ID[r.form]?.name}` : '';

export function claimTier(i: number, premium: boolean) {
  mut((g, t) => {
    const e = activeEvent(t);
    if (!e) return;
    const st = eventProgress(g, e, t);
    if (st.tokens < e.tiers[i]) return;
    const list = premium ? st.prem : st.free;
    if (list.includes(i) || (premium && !st.premium)) return;
    list.push(i);
    const r = (premium ? e.premium : e.free)[i];
    giveReward(g, r, t);
    haptic('success');
    toast(`Награда: ${rewardText(r)}`);
  });
}

// ─────────────────── двойники настоящих растений ───────────────────
export function addTwin(spId: string, nick: string, every: number) {
  mut((g, t) => {
    g.twins = [...(g.twins ?? []), { id: makeCode(8), sp: spId, nick: nick.trim().slice(0, 20) || sp(spId).name, every: Math.max(1, Math.min(30, every)), createdAt: t, waters: 0, streak: 0, notify: true }];
    discover(g, spId);
    toast('Двойник создан! Отмечай полив настоящего растения — и он будет расти здесь 🏠');
  });
}

export function waterTwin(id: string) {
  mut((g, t) => {
    const tw = g.twins?.find((x) => x.id === id);
    if (!tw) return;
    const early = tw.lastWater && t - tw.lastWater < tw.every * D * 0.5;
    const onTime = !tw.lastWater || t <= tw.lastWater + (tw.every + 1) * D;
    tw.streak = onTime ? tw.streak + 1 : 1;
    tw.lastWater = t;
    tw.waters += 1;
    haptic('light');
    if (early) {
      toast('Записали полив. Награда — когда подойдёт срок 🙂');
      return;
    }
    g.leaves += 3;
    addXp(g, 5);
    eventToken(g, 'twin', t);
    toast(`💧 ${tw.nick} полит(а) по-настоящему! +3 🍃${tw.streak > 1 ? ` · серия ${tw.streak}` : ''}`);
  });
}

export function updateTwin(id: string, patch: Partial<Pick<Twin, 'nick' | 'every' | 'notify'>>) {
  mut((g) => {
    const tw = g.twins?.find((x) => x.id === id);
    if (tw) Object.assign(tw, patch);
  });
}

export function removeTwin(id: string) {
  mut((g) => { g.twins = (g.twins ?? []).filter((x) => x.id !== id); });
}

// ─────────────────── тестовая выдача всех привилегий ───────────────────
function grantTester(g: GameState, t: number) {
  g.leaves += 5000;
  while (g.level < 12) {
    g.level += 1;
  }
  g.xp = 0;
  g.plusUntil = Math.max(g.plusUntil ?? 0, t + 365 * D);
  for (const it of ITEMS) g.owned[it.id] = it.consumable ? (g.owned[it.id] ?? 0) + 10 : 1;
  g.owned.pot_gold = 1;
  for (const id of ['kitchen', 'balcony']) {
    if (!g.sills.some((s) => s.id === id)) g.sills.push({ id, name: id === 'kitchen' ? 'Кухня' : 'Балкон', window: null, decor: [] });
  }
  for (const f of FORMS) g.cuttings.push({ id: makeCode(8), sp: f.sp, form: f.id, at: t });
  const e = activeEvent(t);
  if (e) {
    const st = eventProgress(g, e, t);
    st.premium = true;
    st.tokens = Math.max(st.tokens, e.tiers[e.tiers.length - 1]);
  }
  toast('🧪 Тестовый режим: Садовник+ на год, 5000 🍃, 12 уровень, весь декор, все редкие формы и пропуск ивента');
}
