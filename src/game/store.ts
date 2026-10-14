import { create } from 'zustand';
import * as api from '../net/api';
import { ADS_PER_DAY, showRewardedAd } from '../net/ads';
import { track } from '../net/track';
import { fetchWeather } from '../net/weather';
import { compress, deletePhoto, savePhoto } from '../net/photos';
import { photoReward, pushPhoto } from './twins';
import type { Place } from './weather';
import type { CoopAction, CoopResult } from './coop';
import { CONTEST_ENTRY_REWARD, CONTEST_VOTE_REWARD, weekKey } from './contest';
import { platform } from '../platform';
import { ACHIEVEMENTS, checkAchievements } from './achievements';
import { freshAgeMarks } from './age';
import { CARE_TASK_REWARD } from './calendar';
import { SHELVES, shelfDone } from './album';
import { D, FEED_MS, H, HANG_SLOTS, MAX_CUTTINGS, MIST_MS, NEIGHBOR_COOLDOWN, NEIGHBOR_FREE_DAYS, SLOTS, STAGE_NAME } from './constants';
import { giftLink, makeCode } from './gifts';
import { XP, levelReward, unlocksAt, xpToNext, SILL_UNLOCK } from './progression';
import { QUEST_BONUS, WEEKLY_CHEST, bumpQuest, bumpWeekly, rollDay, rollWeek, streakReward, weeklyVisit } from './quests';
import { ITEM_BY_ID, ITEMS, placeOf, potIdOf } from './shop';
import { advance, badLight, bestZone, canCut, cramped, ctxFor, hasLamp, type SimEvent } from './sim';
import { activeEvent, EVENT_TOKENS, eventSeason, tierOf, type GameEvent, type PassReward } from './events';
import { FORM_BY_ID, FORMS, PRODUCT_BY_ID, RARE_DROP, formsOf } from './products';
import { replayFriendWaters, type FriendWater } from './social';
import { SPECIES, sp } from './species';
import { rowSlots, zoneOfSlot } from './layout';
import { BREED_COOLDOWN, canBreed, crossHue, hueOf } from './breeding';
import { ROUND_REWARD, STARTER, roundInfo, starterLeft } from './onboarding';
import { loadCloud, loadLocal, newPlant, newState, pickNewer, saveCloud, saveLocal, upgrade } from './storage';
import type { Cutting, EventProgress, GameState, PendingGift, Plant, QuestKind, Twin, WeeklyKind, Zone } from './types';

// ─────────────────── UI-события: тосты, окна наград ───────────────────
export type Popup =
  | { kind: 'level'; level: number; reward: number; unlocks: string[] }
  | { kind: 'achievement'; id: string }
  | { kind: 'away'; report: AwayReport }
  | { kind: 'streak'; count: number; reward: number }
  | { kind: 'gift'; gift: PendingGift & { ok: boolean } }
  | { kind: 'thanks'; sp: string; from: string }
  | { kind: 'age'; plant: string; days: number }
  | { kind: 'contest'; place: number; leaves: number }
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
  | { kind: 'starter' }
  | { kind: 'twins' }
  | { kind: 'weather' }
  | { kind: 'doctor'; sp?: string }
  | { kind: 'coop' }
  | { kind: 'album' }
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
  tool: Tool;
  coops: api.CoopView[] | null; // общие подоконники (null — ещё не загружали)
  coopOn: number | null;        // открыт общий подоконник
}

/** Инструмент в руке: что произойдёт по тапу на растение. */
export type Tool = 'water' | 'mist' | 'feed' | 'cut' | 'look';

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
  tool: 'water',
  coops: null,
  coopOn: null,
}));

const get = () => useStore.getState();
const set = useStore.setState;

export const now = () => Date.now() + api.serverSkew() + (get().game.offset || 0);
/** «Садовник+» активен (по сохранению или по данным сервера). */
export const isPlus = (g: GameState, t = now()) => Math.max(g.plusUntil ?? 0, api.serverPlusUntil()) > t;
const collectHue = (g: GameState, spId: string, hue?: string) => {
  if (!hue) return;
  const list = g.hues?.[spId] ?? [];
  if (!list.includes(hue)) g.hues = { ...(g.hues ?? {}), [spId]: [...list, hue] };
};
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
export const setTab = (tab: Tab) => { set({ tab, sheet: null }); track('tab_open', { tab }); };
export const setTool = (tool: Tool) => set({ tool });

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
    track('level_up', { level: g.level });
  }
}

const WEEKLY_FROM_DAILY: Partial<Record<QuestKind, WeeklyKind>> = { water: 'water', plant: 'plant', gift: 'gift', cut: 'cut', mist: 'mist', feed: 'feed' };

function quest(g: GameState, kind: QuestKind, by = 1) {
  if (bumpQuest(g, kind, by).length) toast('Задание выполнено: забери награду 🎯');
  const w = WEEKLY_FROM_DAILY[kind];
  if (w) weekly(g, w, by);
}

function weekly(g: GameState, kind: WeeklyKind, by = 1) {
  if (bumpWeekly(g, kind, by).length) toast('🏆 Большое задание недели выполнено! Забери награду');
}

function rollWeekly(g: GameState, t: number) {
  rollWeek(g, t);
  if (weeklyVisit(g, t).length) toast('🏆 Большое задание недели выполнено! Забери награду');
}

function after(g: GameState) {
  for (const a of checkAchievements(g)) toast(`${a.icon} Достижение «${a.title}» +${a.reward} 🍃`);
}

const findPlant = (g: GameState, id: string) => g.plants.find((p) => p.id === id);
export const plantAt = (g: GameState, sill: string, slot: number) => g.plants.find((p) => p.sill === sill && p.slot === slot);
export function freeSlot(g: GameState, sill = g.activeSill, prefer?: Zone) {
  const order = prefer ? [...rowSlots(prefer), ...rowSlots(prefer === 'glass' ? 'deep' : 'glass')] : Array.from({ length: SLOTS }, (_, i) => i);
  for (const i of order) if (!plantAt(g, sill, i)) return i;
  return -1;
}
function anyFreeSlot(g: GameState, spId?: string, t = now()): { sill: string; slot: number } | null {
  const order = [g.activeSill, ...g.sills.map((s) => s.id).filter((id) => id !== g.activeSill)];
  for (const sill of order) {
    const sl = g.sills.find((s) => s.id === sill)!;
    const slot = freeSlot(g, sill, spId ? bestZone(spId, sl, t, hasLamp(g, sl)) : undefined);
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
        weekly(g, 'adult');
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
      if (!(g.bloomed ?? []).includes(p.sp)) g.bloomed = [...(g.bloomed ?? []), p.sp];
      weekly(g, 'bloom');
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

/** Дни рождения растений: 7, 30, 100, 365 дней — награда и праздник. */
function checkAges(g: GameState, t: number) {
  for (const p of g.plants) {
    const fresh = freshAgeMarks(p, t);
    if (!fresh.length) continue;
    const reward = fresh.reduce((n, m) => n + m.reward, 0);
    g.leaves += reward;
    const top = fresh[fresh.length - 1];
    log(g, `${p.nick || sp(p.sp).name}: ${top.title.toLowerCase()} ${top.icon}`, t);
    if (top.days >= 30) popup({ kind: 'age', plant: p.id, days: top.days });
    else toast(`${top.icon} ${p.nick || sp(p.sp).name}: ${top.title.toLowerCase()}! +${reward} 🍃`);
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
  if (platform().kind === 'native') import('../platform/native').then((m) => m.scheduleReminders(get().game, now())).catch(() => {});
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
      } else if (it.kind === 'swap_got' || it.kind === 'swap_return') {
        const spId = String(it.payload.sp);
        if (sp(spId).id === spId) {
          const form = it.payload.form ? String(it.payload.form) : undefined;
          const hue = it.payload.hue ? String(it.payload.hue) : undefined;
          g.cuttings.push({ id: makeCode(8), sp: spId, at: Date.now(), ...(form ? { form } : {}), ...(hue ? { hue } : {}) });
          discover(g, spId);
          toast(it.kind === 'swap_return' ? `Черенок ${sp(spId).gen} вернулся с барахолки` : `🔄 ${String(it.payload.from ?? 'Садовник')}: черенок ${sp(spId).gen} пришёл по обмену!`);
        }
      } else if (it.kind === 'contest_win') {
        const leaves = Number(it.payload.leaves) || 0;
        g.leaves += leaves;
        popup({ kind: 'contest', place: Number(it.payload.place) || 1, leaves });
        haptic('success');
      } else if (it.kind === 'coop_join') {
        toast(`💞 ${name} присоединил(ась) к подоконнику «${String(it.payload.sill ?? '')}»`);
        setTimeout(loadCoops, 300);
      } else if (it.kind === 'tester') {
        grantTester(g, now());
      } else if (it.kind === 'water_reward') {
        const r = Number(it.payload.reward) || 0;
        g.leaves += r;
        eventToken(g, 'friendWater', now());
        weekly(g, 'friendWater');
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
    track('purchase_open', { product: productId });
    const link = await api.payInvoice(productId);
    const st = await pf.pay(link);
    track('purchase_result', { product: productId, status: st });
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
  checkAges(g, t);
  rollWeekly(g, t);
  if (fresh && g.streak.claimedDay !== g.streak.day && g.plants.length) popup({ kind: 'streak', count: g.streak.count, reward: streakReward(g.streak.count) * (isPlus(g) ? 2 : 1) });
  after(g);
  scheduleSave();
  if (server) {
    if (server.force !== undefined || api.knownVersion() === 0) pushNow(false, server.force);
    applyInbox(server.inbox);
    syncPlus();
    loadCoops();
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
  checkAges(g, t);
  rollWeekly(g, t);
  if (rollDay(g, t, isPlus(g, t)) && g.plants.length && g.streak.claimedDay !== g.streak.day) {
    popup({ kind: 'streak', count: g.streak.count, reward: streakReward(g.streak.count) * (isPlus(g) ? 2 : 1) });
  }
  after(g);
  set({ game: g });
  if (ev.length) scheduleSave();
  refreshWeather();
}

// ─────────────────── погода за окном ───────────────────
let weatherTry = 0;

/** Обновить погоду раз в 30 минут (после ошибки — не чаще раза в 5 минут). */
export async function refreshWeather(force = false) {
  const g = get().game;
  const place = g.settings.place;
  if (!place || !navigator.onLine) return;
  const t = now();
  if (!force && ((g.weather && t - g.weather.at < 30 * 60e3) || Date.now() - weatherTry < 5 * 60e3)) return;
  weatherTry = Date.now();
  try {
    const w = await fetchWeather(place, t);
    if (get().game.settings.place !== place) return;
    mut((g) => { g.weather = w; });
  } catch { /* нет сети — попробуем позже */ }
}

export function setPlace(place: Place | null) {
  mut((g) => {
    g.settings.place = place;
    delete g.weather;
  });
  track('weather', { on: !!place });
  if (place) return refreshWeather(true);
}

// ─────────────────── действия игрока ───────────────────
export function chooseWindow(sillId: string, side: 'N' | 'E' | 'S' | 'W') {
  mut((g, t) => {
    const sill = g.sills.find((s) => s.id === sillId);
    if (!sill) return;
    const first = !sill.window;
    sill.window = side;
    if (!first) {
      const bad = g.plants.filter((p) => p.sill === sillId && badLight(p, t, ctxFor(g, p, t))).length;
      toast(bad ? 'Проверь растения с пузырями: им теперь не тот свет' : 'Всем растениям свет подходит 🌿');
    }
  });
}

/** Поставить черенок в стакан на подоконник. */
export function placeCutting(spId: string, sill: string, slot: number, extra: Partial<Plant> = {}) {
  return mut((g, t) => {
    if (plantAt(g, sill, slot)) return null;
    const first = g.plants.length === 0 && g.stats.planted === 0;
    const p = newPlant({ sp: spId, sill, slot, zone: zoneOfSlot(slot), quick: first || extra.quick, ...extra }, t);
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
    track('plant_in_pot', { sp: p.sp, n: g.stats.planted });
    addXp(g, XP.plant);
    eventToken(g, 'plant', t);
    quest(g, 'plant');
    fx(p.id, 'grow');
    haptic('success');
    toast(`${sp(p.sp).name} в горшке! Поливай, когда подсохнет 💧`);
  });
}

/** Сообщить про свет после перестановки и засчитать задание «переставь к свету». */
function lightAfterMove(g: GameState, p: Plant, wasBad: boolean, t: number, quiet = false) {
  const ctx = ctxFor(g, p, t);
  const bad = badLight(p, t, ctx);
  if (!bad) p.badLightFor = 0;
  if (wasBad && !bad) quest(g, 'fixLight');
  if (quiet) return;
  if (p.stage < 2) toast(p.zone === 'glass' ? 'Переставлено к стеклу ☀️' : 'Переставлено в глубину комнаты 🛋');
  else toast(bad === 'hot' ? `${sp(p.sp).name}: тут жарко на солнце 🥵` : bad === 'dark' ? `${sp(p.sp).name}: тут темновато 🌥` : `${sp(p.sp).name}: ${p.zone === 'glass' ? 'у стекла ☀️' : 'в глубине 🛋'} — тут хорошо`);
}

const isBad = (g: GameState, p: Plant, t: number) => { const c = ctxFor(g, p, t); return !!badLight(p, t, c); };

/** Переставить в другой ряд: на свободное место, а если его нет — поменяться с соседом. */
export function move(plantId: string, zone: Zone) {
  const g0 = get().game;
  const p0 = findPlant(g0, plantId);
  if (!p0 || p0.zone === zone) return;
  const free = rowSlots(zone).find((s) => !plantAt(g0, p0.sill, s));
  swap(plantId, p0.sill, free ?? rowSlots(zone)[0]);
}

/** Переставить на место slot (если оно занято — растения меняются местами). */
export function swap(plantId: string, sill: string, slot: number) {
  mut((g, t) => {
    const p = findPlant(g, plantId);
    if (!p) return;
    const other = plantAt(g, sill, slot);
    if (other === p) return;
    const pBad = isBad(g, p, t);
    const oBad = other ? isBad(g, other, t) : false;
    if (other) { other.slot = p.slot; other.sill = p.sill; other.zone = zoneOfSlot(other.slot); }
    p.slot = slot;
    p.sill = sill;
    const zoneChanged = p.zone !== zoneOfSlot(slot);
    p.zone = zoneOfSlot(slot);
    haptic('select');
    if (zoneChanged) lightAfterMove(g, p, pBad, t);
    if (other && other.zone !== p.zone) lightAfterMove(g, other, oBad, t, true);
  });
}

export function mist(plantId: string, insist = true) {
  return mut((g, t) => {
    const p = findPlant(g, plantId);
    if (!p || p.stage < 2) return false;
    const s = sp(p.sp);
    if (s.mist === 'no' && !insist) {
      say(p.id, 'Меня нельзя опрыскивать! 🙅', 2600);
      haptic('warning');
      return false;
    }
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

export function feed(plantId: string): boolean {
  return mut((g, t) => {
    const p = findPlant(g, plantId);
    if (!p || p.stage < 2) return false;
    if ((g.owned.feed ?? 0) <= 0) {
      if (g.leaves < ITEM_BY_ID.feed.price) { toast('Не хватает листиков на подкормку 🍃'); return false; }
      g.leaves -= ITEM_BY_ID.feed.price;
    } else g.owned.feed -= 1;
    p.feedUntil = Math.max(t, p.feedUntil ?? 0) + FEED_MS;
    addXp(g, XP.feed);
    quest(g, 'feed');
    fx(p.id, 'feed');
    toast('Подкормлено! Сутки растёт в 1,5 раза быстрее 🧪');
    return true;
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
    const c = { id: makeCode(8), sp: p.sp, at: t, fromPlant: p.id, ...(form ? { form } : {}), ...(p.hue ? { hue: p.hue } : {}) };
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
    const place = sill !== undefined && slot !== undefined && !plantAt(g, sill, slot) ? { sill, slot } : anyFreeSlot(g, c.sp, t);
    if (!place) { toast('Все места заняты. Освободи горшок или открой новый подоконник'); return; }
    g.cuttings = g.cuttings.filter((x) => x.id !== cuttingId);
    g.plants.push(newPlant({ sp: c.sp, form: c.form, hue: c.hue, sill: place.sill, slot: place.slot, zone: zoneOfSlot(place.slot) }, t));
    collectHue(g, c.sp, c.hue);
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
    const gift: PendingGift = { sp: c.sp, from, note, code: makeCode(), ...(c.form ? { form: c.form } : {}), ...(c.hue ? { hue: c.hue } : {}) };
    g.cuttings = g.cuttings.filter((x) => x.id !== cuttingId);
    g.sent.push({ code: gift.code, sp: c.sp, at: t });
    g.stats.giftsSent += 1;
    track('gift_sent', { sp: c.sp });
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
    const place = anyFreeSlot(g, gift.sp, t);
    if (!place) {
      if (!g.pending.some((x) => x.code === gift.code)) g.pending.push(gift);
      return 'full';
    }
    collectHue(g, gift.sp, gift.hue);
    const p = newPlant({ sp: gift.sp, form: gift.form, hue: gift.hue, sill: place.sill, slot: place.slot, zone: zoneOfSlot(place.slot), quick: true, from: { name: gift.from, note: gift.note, code: gift.code }, claimedAt: t }, t);
    collectForm(g, gift.form);
    g.plants.push(p);
    g.received.push(gift.code);
    g.pending = g.pending.filter((x) => x.code !== gift.code);
    g.stats.giftsGot += 1;
    track('gift_claimed', { sp: gift.sp });
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
    if (it.eventOnly) { toast(it.album ? 'Этот предмет — награда за полную полку альбома' : 'Этот предмет — награда сезонного пропуска'); return false; }
    if (it.level && g.level < it.level) { toast(`Откроется на ${it.level} уровне`); return false; }
    if (it.months && !it.months.includes(new Date(t).getMonth() + 1)) { toast('Этот товар бывает только в сезон'); return false; }
    if (!it.consumable && (g.owned[id] ?? 0) > 0) { toast('Уже есть 🙂'); return false; }
    if (g.leaves < it.price) { toast('Не хватает листиков 🍃'); haptic('warning'); return false; }
    g.leaves -= it.price;
    const ids = it.pack ?? [id];
    for (const x of ids) g.owned[x] = (g.owned[x] ?? 0) + 1;
    g.stats.bought += 1;
    track('buy_item', { item: id });
    quest(g, 'buy');
    haptic('success');
    if (it.cat === 'decor' || it.pack) {
      const sill = g.sills.find((s) => s.id === g.activeSill)!;
      for (const x of ids) {
        if (ITEM_BY_ID[x]?.cat !== 'decor' || sill.decor.includes(x)) continue;
        if (placeOf(x) === 'wallpaper') sill.decor = sill.decor.filter((d) => placeOf(d) !== 'wallpaper');
        sill.decor.push(x);
      }
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
    // подвесные кашпо нельзя снять, пока в них растут растения
    const holder = g.sills.find((s) => s.decor.includes(id));
    if (placeOf(id) === 'spot' && holder && g.plants.some((p) => p.sill === holder.id && HANG_SLOTS.includes(p.slot))) {
      toast('Сначала пересади растения из подвесных кашпо');
      return;
    }
    if (sill.decor.includes(id)) sill.decor = sill.decor.filter((x) => x !== id);
    else {
      for (const other of g.sills) other.decor = other.decor.filter((x) => x !== id);
      // обои — одни на подоконник
      if (placeOf(id) === 'wallpaper') sill.decor = sill.decor.filter((x) => placeOf(x) !== 'wallpaper');
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

export function claimWeekly(id: string) {
  mut((g) => {
    const q = g.weekly?.list.find((x) => x.id === id);
    if (!q || q.claimed || q.progress < q.target) return;
    q.claimed = true;
    g.leaves += q.reward * (isPlus(g) ? 2 : 1);
    addXp(g, XP.quest * 3);
    track('weekly_claim', { kind: q.kind });
    haptic('success');
    toast(`🏆 +${q.reward * (isPlus(g) ? 2 : 1)} 🍃`);
  });
}

/** Сундук недели: все три больших задания — листики и редкий черенок. */
export function claimWeeklyChest() {
  mut((g, t) => {
    const w = g.weekly;
    if (!w || w.chest || !w.list.length || !w.list.every((q) => q.claimed)) return;
    w.chest = true;
    g.leaves += WEEKLY_CHEST;
    const pool = FORMS.filter((f) => !f.event);
    const f = pool[Math.floor(Math.random() * pool.length)];
    if (f && g.cuttings.length < MAX_CUTTINGS) {
      g.cuttings.push({ id: makeCode(8), sp: f.sp, form: f.id, at: t });
      discover(g, f.sp);
      toast(`🎁 Сундук недели: +${WEEKLY_CHEST} 🍃 и редкий черенок «${f.name}»!`);
    } else {
      g.leaves += 100;
      toast(`🎁 Сундук недели: +${WEEKLY_CHEST + 100} 🍃`);
    }
    haptic('success');
  });
}

/** Забрать награду за полную полку альбома. */
export function claimShelf(id: string) {
  mut((g) => {
    const s = SHELVES.find((x) => x.id === id);
    if (!s || !shelfDone(g, s) || (g.shelves ?? []).includes(id)) return;
    g.shelves = [...(g.shelves ?? []), id];
    g.leaves += s.reward.leaves;
    g.owned[s.reward.item] = 1;
    track('shelf', { id });
    haptic('success');
    toast(`${s.icon} Полка «${s.title}» собрана! +${s.reward.leaves} 🍃 и ${ITEM_BY_ID[s.reward.item]?.icon} ${ITEM_BY_ID[s.reward.item]?.name}`);
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
        g.plants.push(newPlant({ sp: s.id, sill: sill.id, slot, zone: zoneOfSlot(slot), stage: 2, rootStart: t, plantedAt: t, moisture: 1 }, t));
        discover(g, s.id);
      }
    });
  },
  rich() { mut((g) => { g.leaves += 1000; addXp(g, 500); }); },
  /** Состарить все растения на 30 дней — проверить бейджи долгожителей. */
  older() {
    mut((g, t) => { for (const p of g.plants) p.createdAt -= 30 * D; checkAges(g, t); });
  },
  decor() {
    mut((g) => {
      const sill = g.sills.find((s) => s.id === g.activeSill)!;
      for (const it of ITEMS) if (it.cat === 'decor') g.owned[it.id] = 1;
      sill.decor = ['tulle', 'feeder', 'cat', 'radio', 'matryoshka', 'pickles', 'tea', 'books', 'piggy', 'vase', 'carpet', 'clock', 'calendar'];
    });
  },
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
    track('event_claim', { event: e.id, tier: i + 1, premium });
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
    track('twin_add', { sp: spId });
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
  const tw = get().game.twins?.find((x) => x.id === id);
  for (const ph of tw?.photos ?? []) deletePhoto(ph.id);
  mut((g) => { g.twins = (g.twins ?? []).filter((x) => x.id !== id); });
}

/** Сфотографировать настоящее растение: снимок ложится на устройство, в игру — отметка. */
export async function addTwinPhoto(id: string, file: Blob): Promise<boolean> {
  try {
    const blob = await compress(file);
    const photoId = 'ph_' + makeCode(10);
    await savePhoto(photoId, blob);
    mut((g, t) => {
      const tw = g.twins?.find((x) => x.id === id);
      if (!tw) return;
      const reward = photoReward(tw, t);
      const dropped = pushPhoto(tw, photoId, t);
      if (dropped) deletePhoto(dropped);
      g.leaves += reward;
      track('twin_photo', { n: tw.photos!.length });
      toast(tw.photos!.length === 1 ? `📷 Первое фото! Через месяц сравним, как подрос${reward ? ` · +${reward} 🍃` : ''}` : reward ? `📷 Новое фото — смотри «было/стало»! +${reward} 🍃` : '📷 Фото сохранено');
    });
    return true;
  } catch {
    toast('Не получилось сохранить фото');
    return false;
  }
}

/** Засчитать консультацию «доктора» (для достижения). */
export function countDoctor() {
  mut((g) => { g.stats.doctor = (g.stats.doctor ?? 0) + 1; });
  track('doctor');
}

export function removeTwinPhoto(id: string, photoId: string) {
  deletePhoto(photoId);
  mut((g) => {
    const tw = g.twins?.find((x) => x.id === id);
    if (tw) tw.photos = (tw.photos ?? []).filter((p) => p.id !== photoId);
  });
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

/** Полить всех на подоконнике, у кого подсохла земля. */
export function waterAll(sillId: string) {
  const ids = get().game.plants.filter((p) => p.sill === sillId && p.stage >= 2 && p.moisture < 0.5).map((p) => p.id);
  for (const id of ids) water(id);
  if (ids.length) toast(`💧 Полито растений: ${ids.length}`);
  return ids.length;
}

// ─────────────────── ролики за награду ───────────────────
export function adsLeft(g: GameState, t = now()) {
  const day = new Date(t).toDateString();
  return g.ads?.day === day ? Math.max(0, ADS_PER_DAY - g.ads.count) : ADS_PER_DAY;
}

/** Посмотреть ролик за награду: листики или мгновенные корни у черенка. */
export async function watchAd(reward: { kind: 'leaves' } | { kind: 'root'; plant: string }) {
  if (adsLeft(get().game) <= 0) { toast('На сегодня ролики закончились — приходи завтра 🌙'); return false; }
  track('ad_open', { reward: reward.kind });
  const ok = await showRewardedAd();
  if (!ok) { toast('Ролик не досмотрен — награды нет'); return false; }
  track('ad_watched', { reward: reward.kind });
  mut((g, t) => {
    const day = new Date(t).toDateString();
    g.ads = g.ads?.day === day ? { day, count: g.ads.count + 1 } : { day, count: 1 };
    if (reward.kind === 'leaves') {
      g.leaves += 20;
      toast('Спасибо, что посмотрел(а)! +20 🍃');
    } else {
      const p = findPlant(g, reward.plant);
      if (p && p.stage === 0) {
        p.rootStart = t - 24 * H;
        toast('🌱 Корни выросли мгновенно!');
      }
    }
  });
  return true;
}

// ─────────────────── обучение с Валентиной Петровной ───────────────────
export const TUTORIAL_DONE = 99;

export function setTutorial(step: number) {
  mut((g) => {
    if (g.tutorial >= TUTORIAL_DONE || step <= g.tutorial) return;
    g.tutorial = step;
  });
}

export function finishTutorial(reward: boolean) {
  mut((g) => {
    if (g.tutorial >= TUTORIAL_DONE) return;
    g.tutorial = TUTORIAL_DONE;
    track('tutorial_done', { reward });
    if (reward) {
      g.leaves += 50;
      g.owned.pot_white = 1;
      haptic('success');
      toast('Подарок на новоселье: +50 🍃 и горшок «Белая керамика» 🤍');
    }
  });
}

// ─────────────────── подарки новичка ───────────────────
export function claimStarter(i: number) {
  mut((g, t) => {
    if (!starterLeft(g, t).includes(i)) return;
    const r = STARTER[i];
    g.starter = { claimed: [...(g.starter?.claimed ?? []), i] };
    if (r.leaves) g.leaves += r.leaves;
    if (r.feed) g.owned.feed = (g.owned.feed ?? 0) + r.feed;
    if (r.item) {
      g.owned[r.item] = 1;
      if (ITEM_BY_ID[r.item]?.cat === 'decor') {
        const sill = g.sills.find((s) => s.id === g.activeSill)!;
        if (!sill.decor.includes(r.item)) sill.decor.push(r.item);
      }
    }
    if (r.cutting) {
      g.cuttings.push({ id: makeCode(8), sp: r.cutting, at: t, ...(r.form ? { form: r.form } : {}) });
      discover(g, r.cutting);
    }
    track('starter_claim', { day: i + 1 });
    haptic('success');
    toast(`🎁 День ${i + 1}: ${r.title}`);
  });
}

// ─────────────────── обход подоконника ───────────────────
/** Заглянули к растению — засчитать в текущий обход. */
export function checkRound(plantId: string) {
  const g0 = get().game;
  const info = roundInfo(g0, now());
  if (!info || info.done) return;
  const p0 = findPlant(g0, plantId);
  if (!p0 || p0.stage < 2) return;
  if (g0.round?.key === info.key && g0.round.checked.includes(plantId)) return;
  mut((g, t) => {
    const ri = roundInfo(g, t);
    if (!ri) return;
    if (g.round?.key !== ri.key) g.round = { key: ri.key, checked: [], done: false };
    g.round.checked.push(plantId);
    const after = roundInfo(g, t)!;
    if (after.checked >= after.total) {
      g.round.done = true;
      g.leaves += ROUND_REWARD;
      addXp(g, 5);
      eventToken(g, 'water', t);
      track('round_done', { part: ri.label });
      haptic('success');
      toast(`${ri.label === 'утренний' ? '🌅 Утренний' : '🌙 Вечерний'} обход завершён! +${ROUND_REWARD} 🍃`);
    }
  });
}

// ─────────────────── гибридизация ───────────────────
/** Цветущие растения того же вида, с которыми можно скрестить. */
export function breedPartners(g: GameState, plantId: string, t = now()) {
  const p = findPlant(g, plantId);
  if (!p || !p.blooming || !canBreed(p.sp)) return [];
  return g.plants.filter((x) => x.id !== p.id && x.sp === p.sp && x.blooming && !(x.pollinatedAt && t - x.pollinatedAt < BREED_COOLDOWN));
}

/** Опылить: кисточкой переносим пыльцу — получаем семечко с новым цветом. */
export function pollinate(aId: string, bId: string) {
  return mut((g, t) => {
    const a = findPlant(g, aId), b = findPlant(g, bId);
    if (!a || !b || a.sp !== b.sp || !a.blooming || !b.blooming) return null;
    if ([a, b].some((x) => x.pollinatedAt && t - x.pollinatedAt < BREED_COOLDOWN)) { toast('Цветы ещё отдыхают после опыления — завтра'); return null; }
    if (g.cuttings.length >= MAX_CUTTINGS + 5) { toast('Запас переполнен — посади или подари что-нибудь'); return null; }
    const ha = a.hue ?? hueOf(a.sp)!.id, hb = b.hue ?? hueOf(b.sp)!.id;
    const hue = crossHue(a.sp, ha, hb, Math.random, g.hues?.[a.sp] ?? []);
    a.pollinatedAt = t;
    b.pollinatedAt = t;
    const isNew = !(g.hues?.[a.sp] ?? []).includes(hue) && hue !== hueOf(a.sp)!.id;
    g.cuttings.push({ id: makeCode(8), sp: a.sp, hue, seed: true, at: t });
    g.stats.hybrids = (g.stats.hybrids ?? 0) + 1;
    addXp(g, 10);
    track('pollinate', { sp: a.sp, hue, rare: !!hueOf(a.sp, hue)?.rare });
    haptic('success');
    const h = hueOf(a.sp, hue)!;
    toast(`${h.rare ? '🌈 Редкость!' : '🐝'} Семечко: ${sp(a.sp).name.toLowerCase()} ${h.name}${isNew ? ' — новый цвет в коллекции!' : ''}`);
    return hue;
  });
}

// ─────────────────── барахолка ───────────────────
const refOf = (c: Cutting) => ({ sp: c.sp, ...(c.form ? { form: c.form } : {}), ...(c.hue ? { hue: c.hue } : {}) });

function takeCuttingOut(id: string): Cutting | null {
  const c = get().game.cuttings.find((x) => x.id === id) ?? null;
  if (c) mut((g) => { g.cuttings = g.cuttings.filter((x) => x.id !== id); });
  return c;
}
function putCuttingBack(c: Cutting) {
  mut((g) => { if (!g.cuttings.some((x) => x.id === c.id)) g.cuttings.push(c); });
}

/** Выставить черенок на барахолку. Пока объявление висит, черенок хранится на сервере. */
export async function listSwap(cuttingId: string, wants: string[], note = '') {
  const c = takeCuttingOut(cuttingId);
  if (!c) return false;
  try {
    await api.swapCreate({ ...refOf(c), wants, note });
    track('swap_list', { sp: c.sp });
    toast('Черенок на барахолке! Как только кто-то обменяет — он придёт тебе 🔄');
    pushNow();
    return true;
  } catch (e) {
    putCuttingBack(c);
    toast(String((e as Error).message) === 'too_many' ? 'Можно выставить не больше 3 черенков одновременно' : 'Не получилось выставить — проверь интернет');
    return false;
  }
}

/** Обменять свой черенок на чужое объявление. */
export async function takeSwap(offerId: number, cuttingId: string) {
  const c = takeCuttingOut(cuttingId);
  if (!c) return false;
  try {
    const r = await api.swapTake(offerId, refOf(c));
    if (r.status === 'ok') {
      track('swap_take', { sp: c.sp });
      haptic('success');
      toast('🔄 Обмен состоялся! Новый черенок уже в пути');
      setTimeout(() => pushNow(), 600);
      return true;
    }
    putCuttingBack(c);
    toast('Этот черенок уже обменяли — выбери другой');
    return false;
  } catch (e) {
    putCuttingBack(c);
    toast(String((e as Error).message) === 'not_wanted' ? 'Хозяин хочет взамен другой вид' : 'Не получилось обменять — проверь интернет');
    return false;
  }
}

export async function cancelSwap(id: number) {
  try {
    await api.swapCancel(id);
    toast('Объявление снято, черенок вернётся в запас');
    setTimeout(() => pushNow(), 600);
  } catch {
    toast('Не получилось снять объявление');
  }
}

// ─────────────────── совместный подоконник ───────────────────
const putCoop = (c: api.CoopView) => set((s) => ({ coops: [...(s.coops ?? []).filter((x) => x.id !== c.id), c].sort((a, b) => a.id - b.id) }));

export async function loadCoops() {
  if (!api.loggedIn()) return;
  try {
    const { coops } = await api.coopList();
    set((s) => ({ coops, coopOn: coops.some((c) => c.id === s.coopOn) ? s.coopOn : null }));
  } catch { /* нет сети */ }
}

export const showCoop = (id: number | null) => set({ coopOn: id, sheet: null });

export async function createCoop(name: string, window: string) {
  try {
    const { coop } = await api.coopCreate(name, window);
    putCoop(coop);
    showCoop(coop.id);
    track('coop_create');
    toast('💞 Общий подоконник готов! Пригласи того, с кем будете ухаживать');
    return true;
  } catch (e) {
    toast(String(e).includes('too_many') ? 'Можно состоять максимум в двух общих подоконниках' : 'Не получилось создать. Проверь интернет');
    return false;
  }
}

export async function joinCoop(code: string) {
  if (!api.loggedIn()) { toast('Общий подоконник работает, когда есть интернет'); return false; }
  try {
    const r = await api.coopJoin(code);
    if (r.status === 'ok' && r.coop) {
      putCoop(r.coop);
      setTab('sill');
      showCoop(r.coop.id);
      track('coop_join');
      toast(`💞 Ты теперь ухаживаешь за «${r.coop.state.name}» вместе с ${r.coop.members.filter((m) => m.id !== api.playerId()).map((m) => m.name).join(', ') || 'друзьями'}`);
      return true;
    }
    toast(r.status === 'full' ? 'На этом подоконнике уже 4 садовника' : r.status === 'too_many' ? 'Можно состоять максимум в двух общих подоконниках' : 'Приглашение не найдено — попроси ссылку ещё раз');
  } catch {
    toast('Не получилось присоединиться. Проверь интернет');
  }
  return false;
}

export async function leaveCoop(id: number) {
  try {
    await api.coopLeave(id);
    set((s) => ({ coops: (s.coops ?? []).filter((c) => c.id !== id), coopOn: s.coopOn === id ? null : s.coopOn }));
  } catch { toast('Не получилось. Проверь интернет'); }
}

const COOP_FAIL: Record<string, string> = {
  gone: 'Этого растения уже нет — кто-то успел раньше',
  enough: 'Земля ещё влажная. Тапни ещё раз, если всё равно хочешь полить',
  busy: 'Место уже занято',
  no_mist: 'Это растение не опрыскивают',
  not_ready: 'Пока рано',
  bad: 'Так нельзя',
};

/** Действие на общем подоконнике. cuttingId — какой черенок из запаса посадить. */
export async function coopDo(id: number, action: CoopAction, cuttingId?: string): Promise<CoopResult | null> {
  if (action.kind === 'cut' && get().game.cuttings.length >= MAX_CUTTINGS) {
    toast('В стаканах на кухне уже 10 черенков — подари или посади их');
    return null;
  }
  try {
    const r = await api.coopAct(id, action);
    if (r.coop) putCoop(r.coop);
    const res = r.result;
    if (!res.ok) {
      if (!(res.reason === 'enough' && action.kind === 'water' && action.insist)) toast(COOP_FAIL[res.reason] ?? 'Не получилось');
      return res;
    }
    mut((g, t) => {
      if (res.effect === 'watered') {
        g.stats.waters += 1;
        addXp(g, XP.water);
        quest(g, 'water');
        eventToken(g, 'water', t);
        haptic('light');
      } else if (res.effect === 'misted') {
        addXp(g, XP.mist);
        quest(g, 'mist');
        haptic('light');
      } else if (res.effect === 'potted') {
        g.stats.planted += 1;
        addXp(g, XP.plant);
        quest(g, 'plant');
        haptic('success');
      } else if (res.effect === 'planted' && cuttingId) {
        g.cuttings = g.cuttings.filter((c) => c.id !== cuttingId);
      } else if (res.effect === 'cut' && res.cutting) {
        g.cuttings.push({ id: makeCode(8), at: t, ...res.cutting });
        g.stats.cuts += 1;
        addXp(g, XP.cut);
        quest(g, 'cut');
        if (res.cutting.form) toast(`✨ Редкость! Черенок оказался формой «${FORM_BY_ID[res.cutting.form]?.name}»`);
        else toast('✂️ Черенок у тебя в запасе');
        haptic('success');
      }
    });
    return res;
  } catch {
    toast('Нет связи с общим подоконником. Попробуй ещё раз');
    return null;
  }
}

export const coopInviteCode = (c: api.CoopView) => 'c' + c.code;

// ─────────────────── подоконник недели ───────────────────
function contestWeek(g: GameState, t: number) {
  const week = weekKey(t);
  if (g.contest?.week !== week) g.contest = { week, entered: false, votes: 0 };
  return g.contest;
}

/** Выставить подоконник на конкурс (снимок делает сервер по последнему сохранению). */
export async function enterContest(sillId: string): Promise<boolean> {
  try {
    await pushNow(false);
    const r = await api.contestEnter(sillId);
    if (r.status === 'empty') { toast('На этом подоконнике пока пусто — посади что-нибудь 🌱'); return false; }
    mut((g, t) => {
      const c = contestWeek(g, t);
      if (!c.entered) {
        c.entered = true;
        g.leaves += CONTEST_ENTRY_REWARD;
        toast(`🏆 Подоконник участвует в конкурсе! +${CONTEST_ENTRY_REWARD} 🍃`);
      } else toast('📸 Снимок подоконника обновлён');
    });
    track('contest_enter');
    return true;
  } catch {
    toast('Не получилось. Проверь интернет');
    return false;
  }
}

export async function voteContest(target: string): Promise<boolean> {
  try {
    const r = await api.contestVote(target);
    if (r.status !== 'ok') {
      toast(r.status === 'limit' ? 'Все 3 голоса этой недели отданы 💌' : r.status === 'dup' ? 'Ты уже голосовал(а) за этот подоконник' : 'Голос не засчитан');
      return false;
    }
    mut((g, t) => {
      const c = contestWeek(g, t);
      c.votes += 1;
      g.leaves += CONTEST_VOTE_REWARD;
    });
    haptic('light');
    toast(`❤️ Голос отдан! +${CONTEST_VOTE_REWARD} 🍃`);
    return true;
  } catch {
    toast('Не получилось. Проверь интернет');
    return false;
  }
}

// ─────────────────── календарь ухода ───────────────────
export const monthKey = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth() + 1}`; };

/** Отметить сезонное дело для настоящих растений: +5 🍃 один раз. */
export function doCareTask(key: string) {
  mut((g, t) => {
    const m = monthKey(t);
    if (g.calendar?.month !== m) g.calendar = { month: m, done: [] };
    if (g.calendar.done.includes(key)) return;
    g.calendar.done.push(key);
    g.leaves += CARE_TASK_REWARD;
    haptic('light');
    toast(`📅 Отмечено! +${CARE_TASK_REWARD} 🍃`);
  });
}
