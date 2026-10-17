import { clone } from './constants';
import { CAT_IDS } from './cat';
import { create } from 'zustand';
import * as api from '../net/api';
import { ADS_PER_DAY, showRewardedAd } from '../net/ads';
import { track } from '../net/track';
import { CONFIG, tgAppLink } from '../config';
import { fetchWeather } from '../net/weather';
import { compress, deletePhoto, savePhoto } from '../net/photos';
import { photoReward, pushPhoto } from './twins';
import type { Place } from './weather';
import { coopAct as coopActLocal, type CoopAction, type CoopResult } from './coop';
import { CONTEST_ENTRY_REWARD, CONTEST_VOTE_REWARD, weekKey } from './contest';
import { platform } from '../platform';
import { ACHIEVEMENTS, checkAchievements } from './achievements';
import { freshAgeMarks } from './age';
import { catText } from './cat';
import { CURES, cureFor, GUARD_MS, PROBLEMS } from './problems';
import { HEARTS_FOR_GIFT, canFulfil, neighborOf, orderGives, orderNeed, rollOrders } from './orders';
import { INVITE_LADDER } from './invites';
import { addMastery, type MasteryKind } from './mastery';
import { CARE_TASK_REWARD } from './calendar';
import { BOX_PRICE, rollBox, type BoxPrize } from './box';
import { SHELVES, shelfDone } from './album';
import { BOOST_COOLDOWN, BOOST_MS, BOOST_PER_DAY, D, FEED_MS, H, HANG_SLOTS, MAX_CUTTINGS, MIST_MS, NEIGHBOR_COOLDOWN, NEIGHBOR_FREE_DAYS, STAGE_NAME } from './constants';
import { giftLink, makeCode } from './gifts';
import { XP, levelPerks, levelReward, unlocksAt, xpToNext, SILL_UNLOCK } from './progression';
import { QUEST_BONUS, WEEKLY_CHEST, dayKey, bumpQuest, bumpWeekly, rollDay, rollWeek, streakReward, weeklyVisit } from './quests';
import { ITEM_BY_ID, ITEMS, placeOf, potIdOf, sellPrice } from './shop';
import { advance, badLight, bestZone, canCut, ctxFor, hasDecorOn, pour, WATER_REWARD_MS, WET_FULL, fmt, needSize, POT_SIZE_ITEM, POT_SIZE_NAME, potSizeOf, tight, hasLamp, neighborsOf, stageMarks, type SimEvent } from './sim';
import { activeEvent, EVENT_TOKENS, eventSeason, isEmptyReward, PREM_AT, tierOf, type GameEvent, type PassReward } from './events';
import { leavesMul, liveCutting, livePrice, setLive } from './liveops';
import { FORM_BY_ID, FORMS, PRODUCT_BY_ID, RARE_DROP, TIER_NAME, formsOf, pickForm, tierOfForm } from './products';
import { replayFriendWaters, type FriendWater } from './social';
import { SPECIES, sp } from './species';
import { DEEP_ROW, EXTRA_PLACES, GLASS_ROW, rowSlots, zoneOfSlot } from './layout';
import { BREED_COOLDOWN, canBreed, crossHue, hueOf } from './breeding';
import { FIRST_CHEST, FIRST_STEPS, FIRST_YOUNG_H, ROUND_REWARD, STARTER, dailyToday, firstChest, roundInfo, starterDone, starterLeft } from './onboarding';
import { childLine } from './lineage';
import { climateOf } from './climate';
import { loadCloud, loadLocal, newPlant, newState, pickNewer, saveCloud, saveLocal, switchLocal, upgrade } from './storage';
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
  | { kind: 'bloomed'; plant: string }
  | { kind: 'contest'; place: number; leaves: number }
  | { kind: 'plusGift'; code: string }
  | { kind: 'box'; prize: BoxPrize }
  | { kind: 'migrated' };

export interface AwayReport {
  ms: number;
  lines: { icon: string; text: string }[];
  gift?: { leaves: number; feed: number; boost: number }; // подарок за возвращение после долгого перерыва
}

/** После 3+ дней без игры — подарок: растения скучали. Чем дольше не было, тем щедрее (до недели). */
export const COMEBACK_DAYS = 3;
export function comebackGift(ms: number) {
  const days = Math.floor(ms / D);
  if (days < COMEBACK_DAYS) return undefined;
  return { leaves: Math.min(100, 20 + 10 * days), feed: 2, boost: days >= 7 ? 2 : 1 };
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
  | { kind: 'login' }
  | { kind: 'sills' }
  | { kind: 'postcard' }
  | { kind: 'repot'; plant: string }
  | { kind: 'timelapse'; plant: string }
  | { kind: 'climate' }
  | { kind: 'room' }
  | { kind: 'firststeps' }
  | { kind: 'share'; plant: string }
  | { kind: 'doctor'; sp?: string }
  | { kind: 'coop' }
  | { kind: 'album' }
  | { kind: 'name'; plant: string }
  | { kind: 'levels' }
  | { kind: 'place'; slot: number }
  | { kind: 'pots'; plant?: string }
  | { kind: 'orders' }
  | { kind: 'howto' }
  | { kind: 'inventory' }
  | { kind: 'achievements' }
  | { kind: 'todo' }
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
  useItem?: string;             // что взято из инвентаря (инструмент 'use')
  coops: api.CoopView[] | null; // общие подоконники (null — ещё не загружали)
  coopOn: number | null;        // открыт общий подоконник
  weatherState?: 'loading' | 'error'; // как идёт загрузка погоды
  arrange: boolean;             // режим перестановки декора
  banned?: boolean;             // аккаунт заблокирован
  live?: number;                // счётчик обновлений ивентов из панели (для перерисовки)
}

/** Инструмент в руке: что произойдёт по тапу на растение. */
export type Tool = 'water' | 'mist' | 'feed' | 'cut' | 'look' | 'use';

api.onServer({ live: (x) => applyLive(x), banned: () => useStore.setState({ banned: true }) });

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
  tool: 'look',
  coops: null,
  coopOn: null,
  arrange: false,
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
/** Взять предмет из инвентаря «в руку»: следующий тап по растению применит его. */
export const takeItem = (id: string) => set({ tool: 'use', useItem: id, sheet: null });

const haptic = (k: Parameters<ReturnType<typeof platform>['haptic']>[0]) => {
  if (get().game.settings.haptics) platform().haptic(k);
};

/** Изменить состояние игры: работаем с копией и потом сохраняем. */
function mut<T>(fn: (g: GameState, t: number) => T): T {
  const g: GameState = clone(get().game);
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
    givePerks(g, g.level);
    popup({ kind: 'level', level: g.level, reward, unlocks: unlocksAt(g.level) });
    track('level_up', { level: g.level });
  }
}

const WEEKLY_FROM_DAILY: Partial<Record<QuestKind, WeeklyKind>> = { water: 'water', plant: 'plant', gift: 'gift', cut: 'cut', mist: 'mist', feed: 'feed' };

/** Особые награды «Пути садовода» за уровень. */
function givePerks(g: GameState, level: number) {
  for (const p of levelPerks(level)) {
    if (p.leaves) g.leaves += p.leaves;
    if (p.feed) g.owned.feed = (g.owned.feed ?? 0) + p.feed;
    if (p.pots) g.owned.pot = (g.owned.pot ?? 0) + p.pots;
    if (p.item) {
      g.owned[p.item] = 1;
      // декор сразу ставим на текущий подоконник
      const sill = g.sills.find((s) => s.id === g.activeSill) ?? g.sills[0];
      if (ITEM_BY_ID[p.item]?.cat === 'decor' && sill && !g.sills.some((s) => s.decor.includes(p.item!))) {
        if (placeOf(p.item) === 'wallpaper') sill.decor = sill.decor.filter((d) => placeOf(d) !== 'wallpaper');
        sill.decor.push(p.item);
      }
    }
    if (p.form) {
      const f = FORM_BY_ID[p.form];
      if (f) { g.cuttings.push({ id: makeCode(8), sp: f.sp, form: f.id, at: Date.now() }); discover(g, f.sp); }
    }
  }
  g.perksTo = Math.max(g.perksTo ?? 0, level);
}

/** Награды за уже пройденные уровни (для тех, кто прокачался до «Пути садовода»). */
function catchUpPerks(g: GameState) {
  if (g.perksTo === undefined) g.perksTo = 1;
  if (g.perksTo >= g.level) return;
  for (let l = g.perksTo + 1; l <= g.level; l++) givePerks(g, l);
  toast(`🎁 Путь садовода: награды за уровни до ${g.level} уже у тебя!`);
}

function quest(g: GameState, kind: QuestKind, by = 1) {
  if (bumpQuest(g, kind, by).length) toast('Задание выполнено: забери награду 🎯');
  const w = WEEKLY_FROM_DAILY[kind];
  if (w) weekly(g, w, by);
}

function mastery(g: GameState, spId: string, kind: MasteryKind) {
  for (const m of addMastery(g, spId, kind)) {
    g.leaves += m.leaves;
    addXp(g, m.xp);
    toast(`${m.icon} Мастерство «${sp(spId).name}»: ${m.name}! +${m.leaves} 🍃`);
    track('mastery', { sp: spId, star: m.name });
  }
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
/** Открыто ли место: четвёртые места — с уровня или после покупки, кашпо — если повешены. */
export function placeOpen(g: GameState, sill: string, slot: number) {
  if (HANG_SLOTS.includes(slot)) return !!g.sills.find((s) => s.id === sill)?.decor.includes('hangers') && (g.owned.hangers ?? 0) > 0;
  return !EXTRA_PLACES[slot] || (g.places ?? []).includes(slot);
}

export function freeSlot(g: GameState, sill = g.activeSill, prefer?: Zone) {
  const order = prefer ? [...rowSlots(prefer), ...rowSlots(prefer === 'glass' ? 'deep' : 'glass')] : [...GLASS_ROW, ...DEEP_ROW];
  for (const i of order) if (placeOpen(g, sill, i) && !plantAt(g, sill, i)) return i;
  return -1;
}

/** Купить четвёртое место в ряду раньше, чем оно откроется уровнем. */
export function buyPlace(slot: number) {
  mut((g) => {
    const x = EXTRA_PLACES[slot];
    if (!x || (g.places ?? []).includes(slot)) return;
    if (g.level < x.level) { toast(`За листики — с ${x.level} уровня. Или открой сразу за ${x.stars} ⭐`); return; }
    if (g.leaves < x.price) { toast(`Нужно ${x.price} 🍃`); return; }
    g.leaves -= x.price;
    g.places = [...(g.places ?? []), slot];
    track('place_buy', { slot });
    haptic('success');
    toast(`🪴 Открыто ${x.name} — на всех подоконниках!`);
  });
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
        mastery(g, p.sp, 'adult');
        if (!quiet) toast(`${s.name}: совсем взрослое! Можно взять черенок ✂️`);
      } else {
        addXp(g, XP.stage);
        if (!quiet) toast(`${s.name} подрос(ла): теперь «${STAGE_NAME[e.stage]}» 🌿`);
      }
      if (!quiet) { fx(p.id, 'grow'); haptic('success'); }
    } else if (e.kind === 'tight') {
      log(g, `${s.name}: тесно в горшке — пересади 🪴`, g.simAt);
      if (!quiet) { say(p.id, 'Мне тесно! Пересади меня 🪴', 5000); toast(`${s.name} переросло горшок: рост остановился. Пересади в горшок ${POT_SIZE_NAME[needSize(p.stage)]} 🪴`); }
    } else if (e.kind === 'wilt') {
      log(g, `${s.name} засохло и сбросило листья 🥀`, g.simAt);
      if (!quiet) { toast(`${s.name} засыхает и сбрасывает листья 🥀 Полей и поставь на свет`); haptic('error'); }
    } else if (e.kind === 'cat') {
      if (e.action !== 'grass' || !quiet) {
        const text = catText({ action: e.action, plant: e.plant }, p);
        log(g, text, g.simAt);
        if (!quiet && e.action !== 'grass') { toast(text); if (e.action === 'chew') fx(p.id, 'grow'); }
      }
    } else if (e.kind === 'problem') {
      const info = PROBLEMS[e.problem];
      log(g, `${s.name}: ${info.name.toLowerCase()}`, g.simAt);
      if (!quiet) { toast(`${info.icon} ${e.spread ? 'Перебралось на' : 'Беда у'} «${p.nick || s.name}»: ${info.name.toLowerCase()}! Загляни в карточку`); haptic('warning'); }
    } else if (e.kind === 'bloom') {
      if (!p.bloomedOnce && !quiet) popup({ kind: 'bloomed', plant: p.id }); // первое цветение — снять таймлапс
      g.stats.blooms += 1;
      p.bloomedOnce = true;
      if (!(g.bloomed ?? []).includes(p.sp)) g.bloomed = [...(g.bloomed ?? []), p.sp];
      weekly(g, 'bloom');
      mastery(g, p.sp, 'bloom');
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
    let r = await api.push(get().game, { keepalive, force });
    if (r.kind === 'conflict') {
      if (keepLocal(get().game, r.save)) {
        // на сервере наше же (или более старое) сохранение — свежие действия не теряем
        api.adoptVersion(r.save.version);
        r = await api.push(get().game, { keepalive });
        if (r.kind === 'conflict') adoptServer(r.save, 'Подтянули прогресс с другого устройства ☁️');
      } else adoptServer(r.save, 'Подтянули прогресс с другого устройства ☁️');
    }
    if (r.kind !== 'skip') applyInbox(r.inbox);
    syncPlus();
  } catch { /* нет сети — попробуем позже */ } finally {
    pushing = false;
  }
}

/**
 * Чьё сохранение оставить при расхождении версий. Своё — если на сервере сохранение
 * этого же устройства (ответ на прошлую отправку просто потерялся) или если здесь
 * играли позже, чем на другом устройстве.
 */
function keepLocal(local: GameState, save: api.ServerSave) {
  const mine = (local.lastSeen ?? 0);
  const theirs = Number(save.state?.lastSeen) || 0;
  if (save.device && save.device === api.deviceId()) return mine >= theirs;
  return mine > theirs + 60e3;
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
      } else if (it.kind === 'chat_water') {
        const n = Number(it.payload.leaves) || 0;
        g.leaves += n;
        toast(`🪴 Ты полил(а) «${String(it.payload.name ?? 'растение чата')}» в чате: +${n} 🍃`);
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
          const n = Number(it.payload.leaves) || pr.leaves || 0;
          g.leaves += n;
          toast(it.payload.note ? `🎁 ${String(it.payload.note)}: +${n} 🍃` : `🍃 +${n} листиков. Спасибо за поддержку!`);
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
            toast(it.payload.note ? `🎁 ${String(it.payload.note)}: сезонный пропуск «${e.title}» открыт!` : `${e.token} Сезонный пропуск «${e.title}» открыт — забирай награды!`);
          }
        } else if (pr?.kind === 'plus') {
          g.plusUntil = Math.max(g.plusUntil ?? 0, Number(it.payload.plusUntil) || 0);
          g.owned.pot_gold = 1;
          toast('🌟 «Садовник+» включён! Золотой горшок уже в коллекции');
        } else if (pr?.kind === 'boost') {
          const n = Number(it.payload.count) || pr.count || 0;
          g.owned.boost = (g.owned.boost ?? 0) + n;
          toast(`⚡ +${n} стимуляторов роста. Спасибо за поддержку!`);
        } else if (pr?.kind === 'place' && pr.slot) {
          if (!(g.places ?? []).includes(pr.slot)) g.places = [...(g.places ?? []), pr.slot];
          toast('🪴 Новое место открыто на всех подоконниках!');
        } else if (pr?.kind === 'starter') {
          g.starterPack = true;
          g.leaves += pr.leaves ?? 0;
          if (pr.item) g.owned[pr.item] = 1;
          const f = pr.form ? FORM_BY_ID[pr.form] : undefined;
          if (f) { g.cuttings.push({ id: makeCode(8), sp: f.sp, form: f.id, at: Date.now() }); discover(g, f.sp); }
          toast('🎁 Стартовый пакет: редкий черенок, горшок и 300 🍃 — уже у тебя!');
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
      } else if (it.kind === 'plus_gift') {
        const code = String(it.payload.code ?? '');
        if (code && !(g.plusGifts ?? []).some((x) => x.code === code)) g.plusGifts = [...(g.plusGifts ?? []), { code, at: Date.now() }];
        popup({ kind: 'plusGift', code });
        haptic('success');
      } else if (it.kind === 'contest_win') {
        const leaves = Number(it.payload.leaves) || 0;
        g.leaves += leaves;
        popup({ kind: 'contest', place: Number(it.payload.place) || 1, leaves });
        haptic('success');
      } else if (it.kind === 'coop_join') {
        toast(`💞 ${name} присоединил(ась) к подоконнику «${String(it.payload.sill ?? '')}»`);
        setTimeout(loadCoops, 300);
      } else if (it.kind === 'admin_gift') {
        adminGift(g, it.payload);
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

/** Подарок из панели или по промокоду: листики, пропуск, «Садовник+», черенок, предмет — с подписью. */
function adminGift(g: GameState, x: Record<string, unknown>) {
  const got: string[] = [];
  const leaves = Math.max(0, Math.min(100000, Math.round(Number(x.leaves) || 0)));
  if (leaves) { g.leaves += leaves; got.push(`+${leaves} 🍃`); }
  if (x.pass) {
    const e = activeEvent(now());
    if (e) { eventProgress(g, e, now()).premium = true; got.push(`пропуск «${e.title}»`); }
  }
  const plusUntil = Number(x.plusUntil) || 0;
  if (plusUntil > Date.now()) {
    g.plusUntil = Math.max(g.plusUntil ?? 0, plusUntil);
    g.owned.pot_gold = 1;
    got.push(`«Садовник+» на ${Number(x.plusDays) || Math.ceil((plusUntil - Date.now()) / D)} дн.`);
  }
  const f = x.form ? FORM_BY_ID[String(x.form)] : undefined;
  const spId = !f && x.sp ? String(x.sp) : '';
  if (f) {
    g.cuttings.push({ id: makeCode(8), sp: f.sp, form: f.id, at: Date.now() });
    discover(g, f.sp);
    got.push(`черенок «${f.name}»`);
  } else if (spId && sp(spId).id === spId) {
    g.cuttings.push({ id: makeCode(8), sp: spId, at: Date.now() });
    discover(g, spId);
    got.push(`черенок ${sp(spId).gen}`);
  }
  const item = x.item ? ITEM_BY_ID[String(x.item)] : undefined;
  if (item) {
    const n = Math.max(1, Math.min(99, Math.round(Number(x.count) || 1)));
    const id = item.gives ?? item.id;
    g.owned[id] = (g.owned[id] ?? 0) + (item.consumable || item.gives ? n * (item.count ?? 1) : 1);
    got.push(`${item.icon} ${item.name}${n > 1 ? ` ×${n}` : ''}`);
  }
  const note = String(x.note ?? '').slice(0, 80) || 'Подарок';
  toast(`🎁 ${note}${got.length ? ': ' + got.join(', ') : ''}`);
  haptic('success');
}

/** Ивенты из панели: обновить список и перерисовать (баннер, цены). */
function applyLive(raw: unknown) {
  if (raw === undefined) return;
  setLive(raw);
  useStore.setState((s) => ({ live: (s.live ?? 0) + 1 }));
}

/** Забрать редкий черенок дня из ивента. */
export function claimLiveCutting() {
  mut((g, t) => {
    const e = liveCutting(t, g.liveClaimed);
    const f = e?.form ? FORM_BY_ID[e.form] : undefined;
    if (!e || !f) return;
    if (g.cuttings.length >= MAX_CUTTINGS) { toast('Слишком много черенков в запасе'); return; }
    g.liveClaimed = [...(g.liveClaimed ?? []), e.id].slice(-50);
    g.cuttings.push({ id: makeCode(8), sp: f.sp, form: f.id, at: t });
    discover(g, f.sp);
    track('live_cutting', { form: f.id });
    haptic('success');
    toast(`✨ Черенок «${f.name}» в запасе — поставь в воду!`);
  });
}

/** Промокод: сервер проверяет и кладёт награду во входящие. */
export async function redeemPromo(code: string): Promise<string> {
  if (!api.loggedIn()) return 'Промокоды работают, когда есть интернет';
  const r = await api.promoRedeem(code).catch(() => null);
  if (!r) return 'Не получилось проверить код. Попробуй ещё раз';
  if (r.status === 'ok') {
    applyInbox(r.inbox ?? []);
    track('promo', { code: code.toUpperCase() });
    return '';
  }
  return ({ not_found: 'Такого кода нет', expired: 'Срок действия кода закончился', used_up: 'Код уже закончился', already: 'Ты уже активировал(а) этот код', bad_code: 'Проверь, правильно ли введён код' } as Record<string, string>)[r.status] ?? 'Код не подошёл';
}

/** Сообщение в поддержку из игры: становится обращением, ответ придёт от бота. */
export async function sendSupport(text: string): Promise<boolean> {
  const r = await api.supportSend(text).catch(() => null);
  if (r) track('support', {});
  return !!r;
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
    const { save, inbox, switched } = await api.login(local.name);
    if (switched) {
      // на устройстве лежал прогресс другого аккаунта — его не берём
      const me = platform().user?.id;
      switchLocal('p' + switched, me ?? 'p' + api.playerId());
      local = loadLocal(Date.now()).state;
      if (!local.name) local.name = platform().user?.name.split(' ')[0].slice(0, 24) ?? '';
    }
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
      if (keepLocal(local, save)) return { state: local, force: save.version, inbox };
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
  const sw = api.accountSwitch();
  if (sw) switchLocal(sw.from, sw.to);
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
    report.gift = comebackGift(away);
    if (report.gift) {
      g.leaves += report.gift.leaves;
      g.owned.feed = (g.owned.feed ?? 0) + report.gift.feed;
      g.owned.boost = (g.owned.boost ?? 0) + report.gift.boost;
      track('comeback', { days: Math.floor(away / D) });
    }
    popup({ kind: 'away', report });
  }
  checkAges(g, t);
  rollWeekly(g, t);
  catchUpPerks(g);
  rollOrders(g, t);
  if (fresh && g.streak.claimedDay !== g.streak.day && g.plants.length) popup({ kind: 'streak', count: g.streak.count, reward: streakReward(g.streak.count) * (isPlus(g) ? 2 : 1) * leavesMul(now()) });
  after(g);
  scheduleSave();
  if (server) {
    if (server.force !== undefined || api.knownVersion() === 0) pushNow(false, server.force);
    applyInbox(server.inbox);
    syncPlus();
    loadCoops();
    // ивенты из панели могут начаться, пока игра открыта
    setInterval(() => { if (document.visibilityState === 'visible') api.liveRefresh(); }, 10 * 60e3);
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
    for (const e of ev) if (e.kind === 'problem' && e.plant === p.id) lines.push({ icon: PROBLEMS[e.problem].icon, text: `${s.name}: ${PROBLEMS[e.problem].name.toLowerCase()}${e.spread ? ' — перебралось от соседа' : ''}` });
    for (const e of ev) if (e.kind === 'cat' && e.plant === p.id && e.action !== 'grass') lines.push({ icon: '🐈', text: catText({ action: e.action, plant: e.plant }, p).replace(/^🐈 /, '') });
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
  const g: GameState = clone(st.game);
  const ev = advance(g, t);
  handleEvents(g, ev, false);
  const helped = [...new Set(ev.filter((e) => e.kind === 'neighbor').map((e) => (e as { plant: string }).plant))];
  if (helped.length && document.visibilityState === 'visible') {
    const names = helped.map((id) => g.plants.find((p) => p.id === id)).filter(Boolean).map((p) => p!.nick || sp(p!.sp).name);
    toast(`👵 Соседка полила: ${names.slice(0, 3).join(', ')}${names.length > 3 ? ` и ещё ${names.length - 3}` : ''}`);
  }
  checkAges(g, t);
  rollWeekly(g, t);
  if (rollOrders(g, t) && (g.orders?.list.length ?? 0) > 0 && document.visibilityState === 'visible') toast('📋 Соседи оставили записку на доске объявлений');
  if (rollDay(g, t, isPlus(g, t)) && g.plants.length && g.streak.claimedDay !== g.streak.day) {
    popup({ kind: 'streak', count: g.streak.count, reward: streakReward(g.streak.count) * (isPlus(g) ? 2 : 1) * leavesMul(now()) });
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
  if (!place || get().weatherState === 'loading') return;
  const t = now();
  if (!force && ((g.weather && t - g.weather.at < 30 * 60e3) || Date.now() - weatherTry < 5 * 60e3)) return;
  weatherTry = Date.now();
  set({ weatherState: 'loading' });
  try {
    const w = await fetchWeather(place, t);
    if (get().game.settings.place !== place) return;
    mut((g) => { g.weather = w; });
    set({ weatherState: undefined });
  } catch {
    set({ weatherState: 'error' }); // нет сети — попробуем позже
  }
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
    if (plantAt(g, sill, slot) || !placeOpen(g, sill, slot)) return null;
    const first = g.plants.length === 0 && g.stats.planted === 0;
    const p = newPlant({ sp: spId, sill, slot, zone: zoneOfSlot(slot), quick: first || extra.quick, ...extra }, t);
    g.plants.push(p);
    discover(g, spId);
    return p.id;
  });
}

export type WaterResult = 'rooting' | 'glass' | 'enough' | 'watered' | 'topped' | 'over';

/**
 * Полить. Подсохшую землю — до 100%, влажную — подлить до краёв: это безопасно.
 * Если земля уже мокрая (90%+), сначала предупредим: вода уйдёт в поддон (перелив).
 * Опыт и задания — за полив, но не чаще раза в 3 часа на растение.
 */
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
    if (p.moisture >= WET_FULL) {
      if ((g.owned.meter ?? 0) > 0) {
        say(p.id, `📟 ${Math.round(p.moisture * 100)}% — мокро`, 2200);
        toast('📟 Влагомер: земля мокрая — лишняя вода уйдёт в поддон. Полей, когда подсохнет');
        haptic('warning');
        return 'enough';
      }
      if (!insist) {
        say(p.id, p.moisture > 1 ? 'Я и так мокрое 😵' : 'Я ещё мокрое 💧', 2200);
        haptic('warning');
        return 'enough';
      }
    }
    const r = pour(p);
    if (r === 'over') {
      say(p.id, 'Ой, вода в поддоне! 😵', 2600);
      haptic('error');
      toast(sp(p.sp).overwater === 'sensitive' ? `${sp(p.sp).name} не любит перелив — слей воду из поддона, иначе корни загниют` : 'Вода ушла в поддон. Слей её или дай земле просохнуть');
      return 'over';
    }
    g.stats.waters += 1;
    const hour = new Date(t).getHours();
    if (hour >= 0 && hour < 5) g.stats.nightWater += 1;
    if (!p.wateredAt || t - p.wateredAt >= WATER_REWARD_MS) { addXp(g, XP.water); quest(g, 'water'); eventToken(g, 'water', t); }
    p.wateredAt = t;
    if (r === 'topped') say(p.id, 'Подлили до краёв 💧', 1800);
    fx(p.id, 'water');
    haptic('light');
    return r;
  });
}

/** Горшков в запасе (каждому растению нужен свой). */
export const potsLeft = (g: GameState) => g.owned.pot ?? 0;

export function plantInPot(plantId: string) {
  const g0 = get().game;
  const p0 = findPlant(g0, plantId);
  if (p0?.stage === 1 && potsLeft(g0) <= 0) {
    openSheet({ kind: 'pots', plant: plantId });
    return;
  }
  mut((g, t) => {
    const p = findPlant(g, plantId);
    if (!p || p.stage !== 1 || potsLeft(g) <= 0) return;
    g.owned.pot = potsLeft(g) - 1;
    const first = g.stats.planted === 0;
    p.stage = 2;
    p.potSize = 1;
    p.plantedAt = t;
    // первая победа: самое первое растение подрастёт уже через 10 минут
    p.growth = first ? Math.max(0, stageMarks(p.sp)[0] - FIRST_YOUNG_H) : 0;
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
  // имя для растения: именованное жалко бросать
  const g = get().game;
  const p = findPlant(g, plantId);
  if (p && p.stage === 2 && !p.nick && g.tutorial >= TUTORIAL_DONE && !get().sheet) setTimeout(() => openSheet({ kind: 'name', plant: plantId }), 900);
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
  const free = rowSlots(zone).find((s) => placeOpen(g0, p0.sill, s) && !plantAt(g0, p0.sill, s));
  swap(plantId, p0.sill, free ?? rowSlots(zone)[0]);
}

/** Переставить на место slot (если оно занято — растения меняются местами). */
export function swap(plantId: string, sill: string, slot: number) {
  mut((g, t) => {
    const p = findPlant(g, plantId);
    if (!p) return;
    if (!placeOpen(g, sill, slot)) { toast('Это место ещё закрыто 🔒'); return; }
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
    // опрыскивать можно всех, но тех, кого мочить нельзя, — с последствиями (сперва предупредим)
    if (s.mist === 'no' && !insist) {
      say(p.id, 'Меня лучше не опрыскивать! 🙅', 2600);
      haptic('warning');
      return false;
    }
    fx(p.id, 'mist');
    g.stats.mists += 1;
    if (s.mist === 'no') {
      p.wetLeaves = t;
      say(p.id, 'Ой, листья мокрые! Протри меня 😣', 4000);
      haptic('error');
      toast(`💧 ${s.name}: на мокрых листьях появятся пятна и плесень. Протри салфеткой${hasDecorOn(g, g.sills.find((x) => x.id === p.sill) ?? g.sills[0], 'fan') ? ' — или вентилятор высушит за полчаса' : ' или включи вентилятор'}`);
      return true;
    }
    // засчитываем опрыскивание, если с прошлого раза прошло 3 часа (раньше — только когда эффект кончился)
    const fresh = !p.mistedAt || t - p.mistedAt >= WATER_REWARD_MS;
    p.mistUntil = t + (s.mist === 'love' ? MIST_MS : MIST_MS / 2);
    p.mistedAt = t;
    if (fresh) {
      addXp(g, XP.mist);
      eventToken(g, 'mist', t);
      // дневное задание — про любителей влажного воздуха, недельное — про любое опрыскивание
      if (s.mist === 'love') quest(g, 'mist');
      else weekly(g, 'mist');
    }
    say(p.id, s.mist === 'love' ? 'Спасибо! 😊' : 'Освежилось 🌿');
    haptic('light');
    // влажность мешает клещу
    if (p.problem?.kind === 'mite') p.problem.sev = Math.max(0.1, p.problem.sev - 0.15);
    // брызги летят на соседей: тех, кого нельзя мочить, придётся протереть
    const splashed = neighborsOf(g, p).filter((n) => n.stage >= 2 && sp(n.sp).mist === 'no');
    for (const n of splashed) {
      n.wetLeaves = t;
      say(n.id, 'Брр, брызги! Протри меня 💧', 2600);
    }
    if (splashed.length) toast(`💦 Брызги попали на ${splashed.map((n) => sp(n.sp).acc).join(' и ')} — протри листья салфеткой или переставь подальше`);
    else toast(s.mist === 'love' ? `${s.name} радуется! 12 ч растёт быстрее 💦` : `${s.name} освежилось — 6 ч растёт быстрее 💦`);
    return true;
  });
}

/** Протереть мокрые листья салфеткой — пятен не будет. */
export function wipeLeaves(plantId: string) {
  mut((g) => {
    const p = findPlant(g, plantId);
    if (!p?.wetLeaves) return;
    p.wetLeaves = undefined;
    say(p.id, 'Сухо и чисто, спасибо! 🧻', 2400);
    haptic('success');
  });
}

export function feed(plantId: string): boolean {
  return mut((g, t) => {
    const p = findPlant(g, plantId);
    if (!p || p.stage < 2) return false;
    if (p.feedUntil && t < p.feedUntil) {
      toast(`🧪 Подкормка ещё действует ${fmt(p.feedUntil - t)}. Перекорм обжигает корни — подожди`);
      say(p.id, 'Я сытое 🙂', 1800);
      return false;
    }
    if ((g.owned.feed ?? 0) <= 0) {
      if (g.leaves < ITEM_BY_ID.feed.price) { toast('Не хватает листиков на подкормку 🍃'); return false; }
      g.leaves -= ITEM_BY_ID.feed.price;
    } else g.owned.feed -= 1;
    p.feedUntil = t + FEED_MS;
    addXp(g, XP.feed);
    quest(g, 'feed');
    fx(p.id, 'feed');
    toast('Подкормлено! Сутки растёт в 1,5 раза быстрее 🧪');
    return true;
  });
}

/** Сколько горшков размера size (1 S … 4 XL) в запасе. */
export const potsOf = (g: GameState, size: number) => g.owned[POT_SIZE_ITEM[size]] ?? 0;

/** Пересадить в горшок побольше. По умолчанию — в тот, что нужен по возрасту. */
export function repot(plantId: string, careful = false, size?: number) {
  mut((g, t) => {
    const p = findPlant(g, plantId);
    if (!p || p.stage < 2) return;
    const cur = potSizeOf(p);
    const to = size ?? Math.max(cur + 1, needSize(p.stage));
    if (to <= cur || to > 4) return;
    const item = POT_SIZE_ITEM[to];
    if (potsOf(g, to) <= 0) {
      if (g.leaves < ITEM_BY_ID[item].price) { toast(`Нужен горшок ${POT_SIZE_NAME[to]}: загляни в магазин 🪴`); return; }
      g.leaves -= ITEM_BY_ID[item].price;
    } else g.owned[item] -= 1;
    const wasTight = tight(p);
    p.potSize = to;
    p.bigPot = to >= 4;
    p.repottedAt = t;
    g.owned[POT_SIZE_ITEM[cur]] = potsOf(g, cur) + 1; // старый горшок освободился
    if (wasTight && !tight(p)) say(p.id, 'Ура, простор! Расту дальше 🌿', 4000);
    g.stats.repots += 1;
    addXp(g, XP.repot);
    quest(g, 'repot');
    fx(p.id, 'grow');
    if (careful) {
      p.health = Math.min(100, p.health + 10);
      g.leaves += 10;
      toast('Идеальная пересадка — корни целы! +10 🍃 и здоровье ❤️');
    } else toast(to >= 4 ? 'Пересажено в XL! В просторе черенки отрастают быстрее 🪴' : `Пересажено в горшок ${POT_SIZE_NAME[to]} — растём дальше 🪴`);
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
      form = pickForm(options, Math.random)!.id;
      const tier = tierOfForm(FORM_BY_ID[form]);
      toast(tier === 3 ? `🏆 Легенда! Черенок оказался формой «${FORM_BY_ID[form].name}»` : `✨ ${TIER_NAME[tier]}! Черенок оказался формой «${FORM_BY_ID[form].name}»`);
    }
    const c = { id: makeCode(8), sp: p.sp, at: t, fromPlant: p.id, line: childLine(p, g.name, t), ...(form ? { form } : {}), ...(p.hue ? { hue: p.hue } : {}) };
    g.cuttings.push(c);
    g.stats.cuts += 1;
    mastery(g, p.sp, 'cut');
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
    const place = sill !== undefined && slot !== undefined && !plantAt(g, sill, slot) && placeOpen(g, sill, slot) ? { sill, slot } : anyFreeSlot(g, c.sp, t);
    if (!place) { toast('Все места заняты. Освободи горшок или открой новый подоконник'); return; }
    g.cuttings = g.cuttings.filter((x) => x.id !== cuttingId);
    g.plants.push(newPlant({ sp: c.sp, form: c.form, hue: c.hue, sill: place.sill, slot: place.slot, zone: zoneOfSlot(place.slot), ...(c.line ? { line: c.line } : {}) }, t));
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
    // подпись дарителя: если черенок срезан до того, как игрок назвался, — ставим имя сейчас
    const line = c.line?.map((a, i, arr) => (i === arr.length - 1 && a.n === 'Садовник' && from ? { ...a, n: from.slice(0, 24) } : a));
    const gift: PendingGift = { sp: c.sp, from, note, code: makeCode(), ...(c.form ? { form: c.form } : {}), ...(c.hue ? { hue: c.hue } : {}), ...(line?.length ? { line } : {}) };
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
  mut((g) => {
    const p = findPlant(g, plantId);
    if (p && p.stage >= 2) { const sz = potSizeOf(p); g.owned[POT_SIZE_ITEM[sz]] = potsOf(g, sz) + 1; } // горшок освободился
    g.plants = g.plants.filter((x) => x.id !== plantId);
  });
  closeSheet();
}

export function renamePlant(plantId: string, nick: string) {
  mut((g) => {
    const p = findPlant(g, plantId);
    if (!p) return;
    const fresh = !p.named && !!nick.trim();
    p.nick = nick.trim().slice(0, 20) || undefined;
    if (fresh) {
      p.named = true;
      g.leaves += NAME_REWARD;
      toast(`${p.nick} — отличное имя! +${NAME_REWARD} 🍃`);
    }
  });
}

const NAME_REWARD = 5;

export function setPot(plantId: string, pot: string) {
  mut((g) => { const p = findPlant(g, plantId); if (p && ownsPot(g, pot)) p.pot = pot; });
}

export const ownsShape = (g: GameState, shape: string) => shape === 'classic' || (g.owned['shape_' + shape] ?? 0) > 0;
export function setPotShape(plantId: string, shape: string) {
  mut((g) => { const p = findPlant(g, plantId); if (p && ownsShape(g, shape)) { p.shape = shape === 'classic' ? undefined : shape; haptic('select'); } });
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
    const p = newPlant({ sp: gift.sp, form: gift.form, hue: gift.hue, sill: place.sill, slot: place.slot, zone: zoneOfSlot(place.slot), quick: true, from: { name: gift.from, note: gift.note, code: gift.code }, ...(gift.line ? { line: gift.line } : {}), claimedAt: t }, t);
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
    const sillNow = g.sills.find((s) => s.id === g.activeSill);
    // ещё один экземпляр — в эту комнату (в другой уже стоит)
    const extra = perRoom(id) && (g.owned[id] ?? 0) > 0 && !!sillNow && !sillNow.decor.includes(id) && freeCopies(g, id) <= 0;
    if (!it.consumable && (g.owned[id] ?? 0) > 0 && !extra) {
      if (perRoom(id) && freeCopies(g, id) > 0) toast('Есть свободный — поставь его в «Переставить предметы»');
      else toast('Уже есть 🙂');
      return false;
    }
    if (it.needs && !(g.owned[it.needs] ?? 0)) { toast(`Сначала — ${ITEM_BY_ID[it.needs]?.name ?? 'предыдущий товар'}`); return false; }
    const price = livePrice(it.price, t);
    if (g.leaves < price) { toast('Не хватает листиков 🍃'); haptic('warning'); return false; }
    g.leaves -= price;
    const ids = it.pack ?? [id];
    if (it.gives) g.owned[it.gives] = (g.owned[it.gives] ?? 0) + (it.count ?? 1);
    else for (const x of ids) g.owned[x] = (g.owned[x] ?? 0) + 1;
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

/** Продать один экземпляр предмета: сначала свободный, иначе — тот, что стоит в этой комнате. */
export function sellItem(id: string) {
  return mut((g) => {
    const it = ITEM_BY_ID[id];
    const price = sellPrice(id);
    if (!it || !price || !(g.owned[id] ?? 0)) return false;
    if (freeCopies(g, id) <= 0) {
      const from = placedIn(g, id).sort((a) => (a.id === g.activeSill ? -1 : 1))[0];
      if (from) {
        from.decor = from.decor.filter((d) => d !== id);
        if (from.pos) delete from.pos[id];
        if (from.off) from.off = from.off.filter((d) => d !== id);
      }
    }
    g.owned[id] -= 1;
    if (g.owned[id] <= 0) delete g.owned[id];
    g.leaves += price;
    g.stats.sold = (g.stats.sold ?? 0) + price;
    track('sell_item', { item: id });
    haptic('success');
    toast(`Продано: ${it.name} · +${price} 🍃`);
    return true;
  });
}

export function buySpecies(spId: string) {
  return mut((g, t) => {
    const s = sp(spId);
    if (g.level < s.unlockLevel) { toast(`Откроется на ${s.unlockLevel} уровне`); return false; }
    const price = livePrice(s.price, t);
    if (g.leaves < price) { toast('Не хватает листиков 🍃'); haptic('warning'); return false; }
    if (g.cuttings.length >= MAX_CUTTINGS) { toast('Слишком много черенков в запасе'); return false; }
    g.leaves -= price;
    g.cuttings.push({ id: makeCode(8), sp: spId, at: t });
    g.stats.bought += 1;
    discover(g, spId);
    quest(g, 'buy');
    haptic('success');
    toast(`Черенок ${s.gen} ждёт в разделе «Черенки» ✂️`);
    return true;
  });
}

// ─────────── предметы по комнатам: сколько куплено и где стоят ───────────
const ROAMING = ['cat', 'cat2', 'cat3']; // котики ходят за хозяином — их не покупают в каждую комнату
/** Предмет покупается в каждую комнату отдельно (декор и приборы). */
export const perRoom = (id: string) => {
  const it = ITEM_BY_ID[id];
  return !!it && it.cat === 'decor' && !it.consumable && !it.eventOnly && !it.album && !ROAMING.includes(id);
};
export const placedIn = (g: GameState, id: string) => g.sills.filter((s) => s.decor.includes(id));
/** Сколько экземпляров лежит без дела (куплено, но не стоит ни в одной комнате). */
export const freeCopies = (g: GameState, id: string) => Math.max(0, (g.owned[id] ?? 0) - placedIn(g, id).length);

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
      // есть свободный экземпляр — просто ставим; нет — переносим из другой комнаты
      if (!perRoom(id) || freeCopies(g, id) <= 0) {
        const from = g.sills.find((o) => o.id !== sill.id && o.decor.includes(id));
        for (const other of g.sills) other.decor = other.decor.filter((x) => x !== id);
        if (from && perRoom(id)) toast(`Перенесли из «${from.name}». Чтобы стоял в обеих комнатах — купи ещё один в магазине`);
      }
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
    g.sills.push({ id, name: u.name, window: null, decor: [] });
    g.activeSill = id;
    toast('Новый подоконник! Выбери, куда смотрит окно 🪟');
    return true;
  });
}

/** Когда котик ушёл в другую комнату: там он «входит» с края, а не появляется сразу. */
export const catTrip = { at: 0 };

export function setActiveSill(id: string) {
  mut((g) => {
    if (g.activeSill === id) return;
    const from = g.sills.find((s) => s.id === g.activeSill);
    const to = g.sills.find((s) => s.id === id);
    g.activeSill = id;
    if (!from || !to) return;
    // котики ходят за хозяином: переносим их (и лежанку не трогаем — она висит на окне)
    const cats = from.decor.filter((d) => CAT_IDS.includes(d));
    if (!cats.length) return;
    from.decor = from.decor.filter((d) => !CAT_IDS.includes(d));
    to.decor = [...to.decor.filter((d) => !CAT_IDS.includes(d)), ...cats];
    if (to.pos) for (const c of cats) delete to.pos[c];
    catTrip.at = Date.now();
  });
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
    const r = streakReward(g.streak.count) * (isPlus(g) ? 2 : 1) * leavesMul(now());
    g.leaves += r;
    if (g.streak.count % 7 === 0) g.owned.feed = (g.owned.feed ?? 0) + 2;
  });
}

export function claimQuest(id: string) {
  mut((g) => {
    const q = g.quests.list.find((x) => x.id === id);
    if (!q || q.claimed || q.progress < q.target) return;
    q.claimed = true;
    g.leaves += q.reward * (isPlus(g) ? 2 : 1) * leavesMul(now());
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
    g.leaves += QUEST_BONUS * (isPlus(g) ? 2 : 1) * leavesMul(now());
    g.owned.feed = (g.owned.feed ?? 0) + 1;
    haptic('success');
    toast(`Все задания дня! +${QUEST_BONUS * (isPlus(g) ? 2 : 1) * leavesMul(now())} 🍃 и подкормка 🧪`);
  });
}

export function claimWeekly(id: string) {
  mut((g) => {
    const q = g.weekly?.list.find((x) => x.id === id);
    if (!q || q.claimed || q.progress < q.target) return;
    q.claimed = true;
    g.leaves += q.reward * (isPlus(g) ? 2 : 1) * leavesMul(now());
    addXp(g, XP.quest * 3);
    track('weekly_claim', { kind: q.kind });
    haptic('success');
    toast(`🏆 +${q.reward * (isPlus(g) ? 2 : 1) * leavesMul(now())} 🍃`);
  });
}

/** Сундук недели: все три больших задания — листики и редкий черенок. */
export function claimWeeklyChest() {
  mut((g, t) => {
    const w = g.weekly;
    if (!w || w.chest || !w.list.length || !w.list.every((q) => q.claimed)) return;
    w.chest = true;
    g.leaves += WEEKLY_CHEST;
    g.owned.pot = potsLeft(g) + 3;
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
  mut((g) => { quest(g, 'visitHerbarium'); g.stats.herbarium = (g.stats.herbarium ?? 0) + 1; });
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
      for (const slot of [...GLASS_ROW, ...DEEP_ROW]) {
        if (plantAt(g, sill.id, slot) || !placeOpen(g, sill.id, slot)) continue;
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
  const st = (g.events[key] ??= { tokens: 0, free: [], prem: [], premium: false, layout: 2 });
  if (!st.layout) {
    // раньше эксклюзив был на уровнях 2, 10, 20, 28 и 30; теперь его больше и он на других уровнях.
    // Забранными оставляем уровни, где награда не поменялась, — новые эксклюзивы можно забрать
    const was = new Set(st.prem);
    const oldEx = [1, 9, 19, 27, 29];
    const newEx = Object.values(PREM_AT) as number[];
    st.prem = [
      ...st.prem.filter((i) => !oldEx.includes(i) && !newEx.includes(i)),
      ...(was.has(PREM_AT.pot) ? [PREM_AT.pot] : []),
      ...([9, 19, 27].some((i) => was.has(i)) ? [PREM_AT.decor] : []),
      ...(was.has(PREM_AT.form) ? [PREM_AT.form] : []),
    ];
    st.layout = 2;
  }
  return st;
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

/** Сколько падающих жетонов можно поймать за день. */
export const CATCH_DAY_LIMIT = 25;
export const catchesLeft = (g: GameState, t = now()) => (g.caught?.day === dayKey(t) ? Math.max(0, CATCH_DAY_LIMIT - g.caught.n) : CATCH_DAY_LIMIT);

/** Поймать падающий жетон сезона: +1 жетон и +1 опыт. */
export function catchToken(): boolean {
  return mut((g, t) => {
    if (!activeEvent(t) || catchesLeft(g, t) <= 0) return false;
    const day = dayKey(t);
    g.caught = g.caught?.day === day ? { day, n: g.caught.n + 1 } : { day, n: 1 };
    g.stats.caughtAll = (g.stats.caughtAll ?? 0) + 1;
    eventToken(g, 'catch', t);
    addXp(g, 1);
    haptic('light');
    return true;
  });
}

export function addEventTokens(kind: keyof typeof EVENT_TOKENS) {
  mut((g, t) => eventToken(g, kind, t));
}

function giveReward(g: GameState, r: PassReward, t: number) {
  if (r.leaves) g.leaves += r.leaves;
  if (r.feed) g.owned.feed = (g.owned.feed ?? 0) + r.feed;
  if (r.pots) g.owned.pot = (g.owned.pot ?? 0) + r.pots;
  if (r.boost) g.owned.boost = (g.owned.boost ?? 0) + r.boost;
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
  if (r.hue) {
    g.cuttings.push({ id: makeCode(8), sp: r.hue.sp, hue: r.hue.hue, at: t });
    const got = g.hues?.[r.hue.sp] ?? [];
    if (!got.includes(r.hue.hue)) g.hues = { ...(g.hues ?? {}), [r.hue.sp]: [...got, r.hue.hue] };
    discover(g, r.hue.sp);
  }
  if (r.title && !(g.titles ?? []).includes(r.title)) {
    g.titles = [...(g.titles ?? []), r.title];
    g.title = r.title;
  }
}

export const rewardText = (r: PassReward) =>
  r.leaves ? `+${r.leaves} 🍃` : r.pots ? `🪴 ×${r.pots}` : r.boost ? `⚡ ×${r.boost}` : r.feed ? `🧪 ×${r.feed}` : r.item ? `${ITEM_BY_ID[r.item]?.icon ?? '🎁'} ${ITEM_BY_ID[r.item]?.name ?? ''}`
    : r.form ? `✨ ${FORM_BY_ID[r.form]?.name}` : r.hue ? `🌸 ${sp(r.hue.sp).name} ${hueOf(r.hue.sp, r.hue.hue)?.name ?? ''}` : r.title ? `🏅 Звание «${r.title}»` : '';

/** Выбрать звание сезона для профиля. */
export function setTitle(x: string) {
  mut((g) => { if ((g.titles ?? []).includes(x)) g.title = x; });
}

export function claimTier(i: number, premium: boolean) {
  mut((g, t) => {
    const e = activeEvent(t);
    if (!e) return;
    const st = eventProgress(g, e, t);
    if (st.tokens < e.tiers[i]) return;
    const list = premium ? st.prem : st.free;
    if (list.includes(i) || (premium && !st.premium)) return;
    const r0 = (premium ? e.premium : e.free)[i];
    if (isEmptyReward(r0)) return;
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
    if (!g.sills.some((s) => s.id === id)) g.sills.push({ id, name: SILL_UNLOCK[id].name, window: null, decor: [] });
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
  if (!isPlus(get().game)) { toast('👑 «Полить всех» — с подпиской Садовник+'); return 0; }
  const ids = get().game.plants.filter((p) => p.sill === sillId && p.stage >= 2 && p.moisture < WET_FULL).map((p) => p.id);
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
      setTimeout(() => { if (!get().sheet) openSheet({ kind: 'howto' }); }, 1600); // шпаргалка — сразу после обучения
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

let coopPending = 0; // действия, ответ на которые ещё не пришёл: опрос не должен затирать их

export async function loadCoops() {
  if (!api.loggedIn()) return;
  try {
    const { coops } = await api.coopList();
    if (coopPending) return;
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
  if (action.kind === 'pot') {
    if (potsLeft(get().game) <= 0) { openSheet({ kind: 'pots' }); return null; }
  }
  // сразу показываем результат у себя (те же правила, что на сервере), а сервер потом подтверждает
  const prev = get().coops?.find((c) => c.id === id);
  let instant = false;
  if (prev && action.kind !== 'cut') {
    const st = clone(prev.state);
    const me = prev.members.find((m) => m.id === api.playerId())?.name ?? 'Садовник';
    if (coopActLocal(st, action, me, now(), 'local-' + makeCode(6)).ok) {
      putCoop({ ...prev, state: st });
      instant = true;
      haptic('light');
    }
  }
  coopPending++;
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
        if (!instant) haptic('light');
      } else if (res.effect === 'misted') {
        addXp(g, XP.mist);
        quest(g, 'mist');
        if (!instant) haptic('light');
      } else if (res.effect === 'potted') {
        g.owned.pot = Math.max(0, potsLeft(g) - 1);
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
    if (instant && prev) putCoop(prev); // не дошло до сервера — откатываем
    toast('Нет связи с общим подоконником. Попробуй ещё раз');
    return null;
  } finally {
    coopPending--;
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

// ─────────────────── ящик-сюрприз и подарочная подписка ───────────────────
export const boxReady = (g: GameState, t = now()) => g.box !== dayKey(t);

export function openBox() {
  mut((g, t) => {
    if (!boxReady(g, t)) { toast('Ящик-сюрприз открывается раз в день — приходи завтра 🎁'); return; }
    if (g.leaves < BOX_PRICE) { toast(`Нужно ${BOX_PRICE} 🍃`); return; }
    g.leaves -= BOX_PRICE;
    g.box = dayKey(t);
    const prize = rollBox(g, Math.random);
    if (prize.kind === 'leaves') g.leaves += prize.n;
    else if (prize.kind === 'feed') g.owned.feed = (g.owned.feed ?? 0) + prize.n;
    else if (prize.kind === 'pots') g.owned.pot = potsLeft(g) + prize.n;
    else if (prize.kind === 'item') g.owned[prize.id] = 1;
    else if (prize.kind === 'form') {
      const f = FORM_BY_ID[prize.id];
      if (g.cuttings.length < MAX_CUTTINGS) { g.cuttings.push({ id: makeCode(8), sp: f.sp, form: f.id, at: t }); discover(g, f.sp); }
      else g.leaves += 150;
    }
    track('box', { prize: prize.kind });
    haptic(prize.kind === 'form' ? 'success' : 'light');
    popup({ kind: 'box', prize });
  });
}

export const plusGiftLink = (code: string) => tgAppLink('p' + code) || `${CONFIG.siteUrl}?start=p${code}`;

export function markPlusGiftSent(code: string) {
  mut((g) => { const x = g.plusGifts?.find((y) => y.code === code); if (x) x.sent = true; });
}

export async function claimPlusGift(code: string) {
  try {
    const r = await api.plusClaim(code);
    if (r.status === 'ok') {
      track('plus_gift_claim');
      toast(`🌟 ${r.from ?? 'Друг'} подарил(а) тебе месяц «Садовник+»!`);
      pushNow();
    } else {
      toast(r.status === 'own' ? 'Это твой подарок — отправь ссылку другу 🎁' : r.status === 'dup' ? 'Этот подарок уже у тебя 🌟' : r.status === 'taken' ? 'Этот подарок уже кто-то забрал' : 'Подарок не найден');
    }
  } catch {
    toast('Не получилось забрать подарок. Проверь интернет');
  }
}

/** Сундучок первого часа. */
export function claimFirstChest() {
  mut((g, t) => {
    const c = firstChest(g, t);
    if (!c?.ready) return;
    g.firstChest = true;
    g.leaves += FIRST_CHEST.leaves;
    g.owned.feed = (g.owned.feed ?? 0) + FIRST_CHEST.feed;
    g.owned[FIRST_CHEST.item] = 1;
    track('first_chest');
    haptic('success');
    toast(`⏳ Подарок первого часа: +${FIRST_CHEST.leaves} 🍃, подкормка ×${FIRST_CHEST.feed} и белый горшок!`);
  });
}

// ─────────────────── горшки ───────────────────
/** Купить горшки и (если ждёт черенок) сразу посадить. */
export function buyPots(itemId: string, plantId?: string) {
  if (!buyItem(itemId)) return;
  if (plantId) plantInPot(plantId);
}

/** Выручка Валентины Петровны: раз в день старый горшок бесплатно, если листиков не хватает. */
export const grannyPotReady = (g: GameState, t = now()) => g.grannyPot !== dayKey(t) && g.leaves < (ITEM_BY_ID.pot?.price ?? 10);

export function takeGrannyPot(plantId?: string) {
  mut((g, t) => {
    if (!grannyPotReady(g, t)) return;
    g.grannyPot = dayKey(t);
    g.owned.pot = potsLeft(g) + 1;
    toast('👵 Валентина Петровна отдала старый горшок с антресолей');
  });
  if (plantId) plantInPot(plantId);
}

// ─────────────────── лестница приглашений ───────────────────
export function claimInvite(n: number, active: number) {
  mut((g, t) => {
    const step = INVITE_LADDER.find((s) => s.n === n);
    if (!step || active < n || (g.invites ?? []).includes(n)) return;
    g.invites = [...(g.invites ?? []), n];
    giveReward(g, step.reward, t);
    track('invite_reward', { n });
    haptic('success');
    toast(`${step.icon} «${step.title}»: ${step.text}!`);
  });
}

// ─────────────────── заказы соседей ───────────────────
/** Отказаться от просьбы: записка снимается, новая появится через час. */
export function declineOrder(id: string) {
  mut((g, t) => {
    const board = g.orders;
    if (!board) return;
    const o = board.list.find((x) => x.id === id);
    if (!o) return;
    board.list = board.list.filter((x) => x.id !== id);
    board.next = Math.min(Math.max(board.next, t), t + H);
    toast(`${neighborOf(o.who).name} не обидится 🙂 Новая записка — через час`);
  });
}
export function fulfilOrder(id: string) {
  mut((g, t) => {
    const board = g.orders;
    const o = board?.list.find((x) => x.id === id);
    if (!board || !o) return;
    const can = canFulfil(g, o);
    if (!can.ok) { toast(`Пока не выйдет: ${orderNeed(o)} — ${sp(o.sp).name.toLowerCase()}`); return; }
    if (can.cuttings?.length) g.cuttings = g.cuttings.filter((c) => !can.cuttings!.includes(c.id));
    board.list = board.list.filter((x) => x.id !== id);
    board.done += 1;
    g.leaves += o.reward;
    addXp(g, o.xp);
    const n = neighborOf(o.who);
    const hearts = (board.hearts[o.who] ?? 0) + 1;
    board.hearts[o.who] = hearts;
    eventToken(g, 'quest', t);
    if (orderGives(o)) weekly(g, 'gift');
    track('order_done', { kind: o.kind });
    haptic('success');
    if (hearts === HEARTS_FOR_GIFT) {
      if (n.gift.item) {
        g.owned[n.gift.item] = 1;
        const sill = g.sills.find((s) => s.id === g.activeSill);
        if (sill && ITEM_BY_ID[n.gift.item]?.cat === 'decor' && !g.sills.some((s) => s.decor.includes(n.gift.item!))) sill.decor.push(n.gift.item);
      }
      if (n.gift.leaves) g.leaves += n.gift.leaves;
      toast(`${n.icon} ${n.name} в восторге и дарит тебе: ${n.gift.text}! ❤️`);
    } else toast(`${n.icon} ${n.name}: «Спасибо, золотце!» +${o.reward} 🍃 ❤️ ${Math.min(hearts, HEARTS_FOR_GIFT)}/${HEARTS_FOR_GIFT}`);
  });
}

// ─────────────────── лечение ───────────────────
/** Обработать растение средством. Если средства нет — купить за листики. */
export function treat(plantId: string, cure: string) {
  return mut((g, t) => {
    const p = findPlant(g, plantId);
    const pr = p?.problem;
    if (!p || !pr || !CURES[cure]?.includes(pr.kind)) return false;
    if ((g.owned[cure] ?? 0) <= 0) {
      const price = ITEM_BY_ID[cure]?.price ?? 0;
      if (g.leaves < price) { toast(`Нужно ${price} 🍃`); return false; }
      g.leaves -= price;
    } else g.owned[cure] -= 1;
    const info = PROBLEMS[pr.kind];
    // гниль лечится, только если не продолжать заливать
    if (pr.kind === 'rot' && p.moisture > 1) p.moisture = 1;
    if (cure === 'soil') { p.moisture = 0.6; p.wetFor = 0; }
    p.problem = undefined;
    p.guardUntil = t + GUARD_MS;
    g.stats.cured = (g.stats.cured ?? 0) + 1;
    addXp(g, 15);
    fx(p.id, 'grow');
    haptic('success');
    say(p.id, 'Спасибо, полегчало! 😮‍💨', 2400);
    toast(`${ITEM_BY_ID[cure]?.icon ?? '💊'} Вылечено: ${info.name.toLowerCase()}! Неделю растение под защитой`);
    track('cure', { kind: pr.kind });
    return true;
  });
}

// ─────────────────── кот Барсик ───────────────────
/** Погладить кота: раз в день — немного листиков и хорошее настроение. */
export function petCat() {
  mut((g, t) => {
    const day = dayKey(t);
    if (g.catPet === day) { toast('🐈 Мрр… Барсик уже доволен. Приходи завтра'); return; }
    g.catPet = day;
    g.leaves += 5;
    addXp(g, 2);
    haptic('light');
    toast('🐈 Мррр! Барсик доволен. +5 🍃');
  });
}

// ─────────────────── перелив ───────────────────
/** Слить воду из поддона: земле становится чуть легче. Бесплатно. */
export function drainTray(plantId: string) {
  mut((g) => {
    const p = findPlant(g, plantId);
    if (!p || p.moisture <= 1) return;
    p.moisture = Math.max(1, p.moisture - 0.25);
    fx(p.id, 'water');
    haptic('light');
    say(p.id, 'Фух, полегче 😮‍💨', 1800);
  });
}

/** Пересадить в сухую свежую землю — без проблемы, просто от перелива. */
export function freshSoil(plantId: string) {
  mut((g) => {
    const p = findPlant(g, plantId);
    if (!p || p.stage < 2) return;
    if (p.problem && CURES.soil.includes(p.problem.kind)) return void treat(plantId, 'soil');
    if (!payItem(g, 'soil')) return;
    p.moisture = 0.6;
    p.wetFor = 0;
    p.health = Math.max(0, p.health - 3); // пересадка — небольшой стресс
    fx(p.id, 'grow');
    haptic('success');
    say(p.id, 'Сухо и свежо! 🌱', 2000);
    toast('🟫 Пересажено в свежий грунт — перелив больше не страшен');
  });
}

/** Насыпать керамзит: навсегда в этом горшке. */
export function addDrain(plantId: string) {
  mut((g) => {
    const p = findPlant(g, plantId);
    if (!p || p.stage < 2 || p.drain) return;
    if (!payItem(g, 'drain')) return;
    p.drain = true;
    haptic('success');
    toast('🪨 Дренаж готов: лишняя вода будет уходить быстро');
  });
}

/** Взять предмет из запаса или купить за листики. */
function payItem(g: GameState, id: string): boolean {
  if ((g.owned[id] ?? 0) > 0) { g.owned[id] -= 1; return true; }
  const price = ITEM_BY_ID[id]?.price ?? 0;
  if (g.leaves < price) { toast(`Нужно ${price} 🍃`); haptic('warning'); return false; }
  g.leaves -= price;
  return true;
}

/** Что из инвентаря применяется к растению — и как. */
export const USABLE = ['feed', 'boost', 'soap', 'acaricide', 'traps', 'fungicide', 'soil', 'drain'];

/** Пригодится ли этому растению предмет из инвентаря (для подсветки). */
export function itemFits(g: GameState, id: string, p: Plant, t: number): boolean {
  if (p.stage < 2) return false;
  if (id === 'feed') return !(p.feedUntil && t < p.feedUntil) && p.stage < 4;
  if (id === 'boost') return !boostBlock(g, p, t);
  if (id === 'drain') return !p.drain;
  if (id === 'soil') return p.moisture > 1 || (!!p.problem && CURES.soil.includes(p.problem.kind));
  return !!p.problem && (CURES[id] ?? []).includes(p.problem.kind);
}

/** Применить предмет из инвентаря к растению. Кончился — инструмент возвращается к «Осмотру». */
export function applyItem(plantId: string, id: string) {
  const g = get().game;
  const p = g.plants.find((x) => x.id === plantId);
  if (!p || p.stage < 2) return false;
  let ok: unknown = false;
  if (id === 'feed') ok = feed(plantId);
  else if (id === 'boost') ok = boostPlant(plantId);
  else if (id === 'drain') { if (p.drain) toast('🪨 Дренаж здесь уже есть'); else { addDrain(plantId); ok = true; } }
  else if (id === 'soil') { freshSoil(plantId); ok = true; }
  else if (CURES[id]) {
    if (!p.problem) toast(`${ITEM_BY_ID[id]?.icon ?? '💊'} Растение здорово — лечить нечего`);
    else if (!CURES[id].includes(p.problem.kind)) toast(`${ITEM_BY_ID[id]?.name} не поможет: тут ${PROBLEMS[p.problem.kind].name.toLowerCase()}. Нужно: ${cureFor(p.problem.kind).map((c) => ITEM_BY_ID[c]?.name).join(' или ')}`);
    else ok = treat(plantId, id);
  }
  if ((get().game.owned[id] ?? 0) <= 0) set({ tool: 'look', useItem: undefined });
  return !!ok;
}

// ─────────────────── стимулятор роста ───────────────────
export type BoostBlock = 'adult' | 'sick' | 'cooldown' | 'daily' | 'level' | null;

/** Почему сейчас нельзя дать стимулятор (или null — можно). */
export function boostBlock(g: GameState, p: Plant, t: number): BoostBlock {
  if (g.level < (ITEM_BY_ID.boost.level ?? 0)) return 'level';
  if (p.stage < 2 || p.stage >= 4) return 'adult';
  if (p.problem || p.health < 60) return 'sick';
  if (p.boostAt && t - p.boostAt < BOOST_COOLDOWN) return 'cooldown';
  if (g.boosts?.day === dayKey(t) && g.boosts.n >= BOOST_PER_DAY) return 'daily';
  return null;
}

export function boostPlant(plantId: string) {
  return mut((g, t) => {
    const p = findPlant(g, plantId);
    if (!p) return false;
    const why = boostBlock(g, p, t);
    if (why === 'level') { toast(`Стимулятор откроется на ${ITEM_BY_ID.boost.level} уровне`); return false; }
    if (why === 'adult') { toast(p.stage >= 4 ? 'Взрослому стимулятор не нужен — он уже вырос 🌿' : 'Сначала посади в горшок'); return false; }
    if (why === 'sick') { toast('Сначала вылечи: больному растению стимулятор только навредит'); return false; }
    if (why === 'cooldown') { toast(`⚡ Снова можно через ${fmt(p.boostAt! + BOOST_COOLDOWN - t)} — иначе растение истощится`); return false; }
    if (why === 'daily') { toast(`⚡ Сегодня уже ${BOOST_PER_DAY} стимулятора — хватит. Завтра можно снова`); return false; }
    if (!payItem(g, 'boost')) return false;
    const day = dayKey(t);
    g.boosts = { day, n: (g.boosts?.day === day ? g.boosts.n : 0) + 1 };
    p.boostAt = t;
    p.boostUntil = t + BOOST_MS;
    addXp(g, 3);
    fx(p.id, 'feed');
    haptic('success');
    say(p.id, 'Расту-у-у! ⚡', 2000);
    toast('⚡ Стимулятор: сутки растёт вдвое быстрее');
    track('boost', { sp: p.sp });
    return true;
  });
}

// ─────────────────── начать сначала ───────────────────
/** Новая игра на этом аккаунте. Подписка «Садовник+» и купленные места сохраняются. */
export function startOver() {
  const old = get().game;
  const t = now();
  const g = newState(t);
  g.name = old.name;
  g.settings = old.settings;
  g.plusUntil = old.plusUntil;
  g.places = old.places;
  g.starterPack = old.starterPack;
  g.plusGifts = old.plusGifts;
  g.inboxSeen = old.inboxSeen;
  g.tutorial = 99;
  set({ game: g, popups: [], sheet: null });
  track('start_over', {});
  saveNow();
  toast('🌱 Чистый подоконник. Всё сначала!');
}

// ─────────────────── один аккаунт на всех платформах ───────────────────
/**
 * Вход через Telegram подтверждён. Если в аккаунте Telegram уже есть подоконник —
 * открываем его (здешний гостевой прогресс откладываем). Если нет — переносим туда здешний.
 */
export function finishLogin(r: Extract<api.LoginPoll, { status: 'ok' }>) {
  if (r.from) {
    try { localStorage.setItem(`podokonnik-v2:p${r.from}`, localStorage.getItem('podokonnik-v2') ?? ''); } catch { /* ignore */ }
  }
  const acc = api.linkedAccount();
  if (r.save?.state && Array.isArray(r.save.state.plants)) {
    adoptServer(r.save);
  } else {
    pushNow(false, 0);
  }
  applyInbox(r.inbox);
  closeSheet();
  haptic('success');
  toast(`✅ Вошли через Telegram${acc ? ` как ${acc.username ? '@' + acc.username : acc.name}` : ''}. Подоконник один на всех устройствах`);
  track('login_telegram', { platform: platform().kind });
}

export async function logoutTelegram() {
  await api.logout();
  location.reload(); // при входе гостем игра сама отложит прогресс аккаунта и достанет гостевой
}

// ─────────────────── живой декор: включить, переставить ───────────────────
const SWITCH_TEXT: Record<string, [string, string]> = {
  lamp: ['💜 Фитолампа включена: +1 к свету и +15% к росту у окна', '🌑 Фитолампа выключена'],
  lamp_table: ['💜 Настольная фитолампа: +1 к свету и +15% к росту на столике', '🌑 Настольная фитолампа выключена'],
  radio: ['📻 Радио играет — растения растут чуть быстрее', '📻 Радио выключено'],
  candle: ['🕯️ Свеча зажжена', '🕯️ Свеча задута'],
  lantern: ['🏮 Фонарик горит', '🏮 Фонарик погас'],
  humidifier: ['💨 Увлажнитель работает: +22% к влажности', '💨 Увлажнитель выключен'],
  heater: ['♨️ Обогреватель греет: +4°', '♨️ Обогреватель выключен'],
  fan: ['🌀 Вентилятор крутится: прохладнее и свежее', '🌀 Вентилятор выключен'],
  garland: ['✨ Гирлянда горит', '✨ Гирлянда выключена'],
};
export const SWITCHABLE = Object.keys(SWITCH_TEXT);

/** Включить или выключить предмет (лампа, радио, свеча…). */
export function switchItem(sillId: string, id: string) {
  mut((g) => {
    const sill = g.sills.find((s) => s.id === sillId);
    if (!sill || !SWITCH_TEXT[id]) return;
    const off = new Set(sill.off ?? []);
    if (off.has(id)) off.delete(id); else off.add(id);
    sill.off = [...off];
    haptic('select');
    toast(SWITCH_TEXT[id][off.has(id) ? 1 : 0]);
  });
}

/** Переставить предмет: место в ряду (0…1) и ряд. */
export function moveItem(sillId: string, id: string, x: number, row?: 'sill' | 'table') {
  mut((g) => {
    const sill = g.sills.find((s) => s.id === sillId);
    if (!sill) return;
    sill.pos = { ...(sill.pos ?? {}), [id]: { x: Math.max(0.02, Math.min(0.98, x)), ...(row ? { row } : {}) } };
  });
}

/** Режим перестановки декора. */
export const setArrange = (on: boolean) => set({ arrange: on });

// ─────────────────── климат: форточка и шторы ───────────────────
export function toggleVent(sillId: string) {
  mut((g, t) => {
    const sill = g.sills.find((s) => s.id === sillId);
    if (!sill) return;
    sill.vent = !sill.vent;
    haptic('select');
    const c = climateOf(g, sill, t);
    toast(sill.vent ? `🪟 Форточка открыта: на улице ${c.out > 0 ? '+' : ''}${c.out}°${c.draft ? ' — у стекла сквозняк!' : ''}${c.bugs ? ' Без сетки налетят насекомые' : ''}` : '🪟 Форточка закрыта');
  });
}

export function toggleCurtains(sillId: string) {
  mut((g) => {
    const sill = g.sills.find((s) => s.id === sillId);
    if (!sill || !(g.owned.curtains ?? 0) || !sill.decor.includes('curtains')) return;
    sill.curtains = !sill.curtains;
    haptic('select');
    toast(sill.curtains ? '🎐 Шторы задёрнуты: света у стекла меньше' : '🎐 Шторы раздвинуты');
  });
}

// ─────────────────── цвета комнаты ───────────────────
export function setRoomColor(sillId: string, part: 'wall' | 'table' | 'sill', id: string) {
  mut((g) => {
    const sill = g.sills.find((s) => s.id === sillId);
    if (!sill) return;
    sill.colors = { ...(sill.colors ?? {}), [part]: id };
    // свой цвет стен вместо обоев: обои снимаем (остаются в коллекции)
    if (part === 'wall') sill.decor = sill.decor.filter((d) => placeOf(d) !== 'wallpaper');
    haptic('select');
  });
}

// ─────────────────── первые шаги ───────────────────
export function claimFirstStep(i: number) {
  mut((g) => {
    const st = FIRST_STEPS[i];
    if (!st || (g.firstSteps ?? []).includes(i) || !st.done(g)) return;
    g.firstSteps = [...(g.firstSteps ?? []), i];
    g.leaves += st.leaves;
    if (st.feed) g.owned.feed = (g.owned.feed ?? 0) + st.feed;
    if (st.boost) g.owned.boost = (g.owned.boost ?? 0) + st.boost;
    if (st.pots) g.owned.pot = (g.owned.pot ?? 0) + st.pots;
    addXp(g, 10);
    haptic('success');
    const extra = [st.feed ? `🧪 ×${st.feed}` : '', st.boost ? `⚡ ×${st.boost}` : '', st.pots ? `🪴 ×${st.pots}` : ''].filter(Boolean).join(' ');
    toast(`${st.icon} «${st.title}» — готово! +${st.leaves} 🍃 ${extra}`.trim());
    track('first_step', { i });
  });
}

/** Открытку отправили — для «Первых шагов». */
export function notePostcard() {
  mut((g) => { g.stats.postcards = (g.stats.postcards ?? 0) + 1; });
}

// ─────────────────── ежедневный сундучок ───────────────────
export function claimDaily() {
  mut((g, t) => {
    if (!starterDone(g) || g.daily === dayKey(t)) return;
    const d = dailyToday(t);
    g.daily = dayKey(t);
    if (d.leaves) g.leaves += d.leaves;
    if (d.feed) g.owned.feed = (g.owned.feed ?? 0) + d.feed;
    if (d.pots) g.owned.pot = (g.owned.pot ?? 0) + d.pots;
    if (d.boost) g.owned.boost = (g.owned.boost ?? 0) + d.boost;
    haptic('success');
    toast(`🎁 Сундучок: ${d.title}! Завтра — новый`);
    track('daily_chest', {});
  });
}

// ─────────────────── котики ───────────────────
export function setCatColor(id: string, color: string) {
  mut((g) => { g.catColors = { ...(g.catColors ?? {}), [id]: color }; haptic('select'); });
}
