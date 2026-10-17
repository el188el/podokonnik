// Прослойка платформы: игра не знает, где она запущена — в Telegram,
// в браузере, в Discord или в нативном приложении (Capacitor).
// Всё платформенное — здесь, поэтому новые платформы добавляются без
// переписывания игры.

export type PlatformKind = 'telegram' | 'web' | 'discord' | 'native';
export type Haptic = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'select';
export type ShareResult = 'shared' | 'copied' | 'cancel' | 'fail';

export interface PlatformUser {
  id: string;
  name: string;
  username?: string;
  photo?: string;
}

export interface CloudStore {
  get(keys: string[]): Promise<Record<string, string>>;
  set(key: string, value: string): Promise<void>;
  remove(keys: string[]): Promise<void>;
}

export interface Platform {
  kind: PlatformKind;
  user: PlatformUser | null;
  /** Параметр запуска: подарок, реферал и т. п. */
  startParam: string | null;
  /** Строка initData Telegram — пригодится серверу для проверки подписи. */
  initData: string;
  haptic(kind: Haptic): void;
  share(o: { text: string; url: string; files?: File[] }): Promise<ShareResult>;
  openLink(url: string): void;
  setBack(handler: (() => void) | null): void;
  setColors(header: string, bg: string): void;
  cloud: CloudStore | null;
  /** Оплата счёта (Telegram Stars). В браузере недоступна. */
  pay(url: string): Promise<PayResult>;
  /** Код входа Discord (обменивается на сервере). */
  authCode?: string;
  /** Вызывается после входа на сервер (Discord: авторизовать SDK токеном). */
  afterLogin?(r: { discordToken?: string }): void;
  /** Позвать друзей в игру средствами платформы (Discord: окно приглашения). */
  invite?(): Promise<boolean>;
  /** Опубликовать сторис (Telegram 7.8+): картинка по публичной ссылке. */
  story?(mediaUrl: string, text: string): boolean;
}

export type PayResult = 'paid' | 'cancelled' | 'failed' | 'pending' | 'unsupported';

// ─────────────────── общие помощники ───────────────────
export async function copyText(t: string) {
  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch { /* старые браузеры */ }
  try {
    const a = document.createElement('textarea');
    a.value = t;
    a.style.position = 'fixed';
    a.style.opacity = '0';
    document.body.appendChild(a);
    a.select();
    const ok = document.execCommand('copy');
    a.remove();
    return ok;
  } catch {
    return false;
  }
}

async function webShare(o: { text: string; url: string; files?: File[] }): Promise<ShareResult> {
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  try {
    if (o.files?.length && nav.canShare?.({ files: o.files })) {
      await navigator.share({ files: o.files, text: `${o.text}\n${o.url}` });
      return 'shared';
    }
    if (navigator.share) {
      await navigator.share({ text: `${o.text}\n${o.url}` }); // текст первым, потом ссылка
      return 'shared';
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return 'cancel';
  }
  return (await copyText(`${o.text}\n${o.url}`)) ? 'copied' : 'fail';
}

// ─────────────────── Telegram ───────────────────
interface TgWebApp {
  initData: string;
  initDataUnsafe: { user?: { id: number; first_name: string; last_name?: string; username?: string; photo_url?: string }; start_param?: string };
  version: string;
  ready(): void;
  expand(): void;
  disableVerticalSwipes?(): void;
  isVersionAtLeast(v: string): boolean;
  setHeaderColor(c: string): void;
  setBackgroundColor(c: string): void;
  setBottomBarColor?(c: string): void;
  openLink(u: string): void;
  openTelegramLink(u: string): void;
  openInvoice?(url: string, cb: (status: string) => void): void;
  shareToStory?(mediaUrl: string, params?: { text?: string }): void;
  HapticFeedback: { impactOccurred(s: string): void; notificationOccurred(s: string): void; selectionChanged(): void };
  BackButton: { show(): void; hide(): void; onClick(f: () => void): void; offClick(f: () => void): void };
  CloudStorage: {
    getItems(keys: string[], cb: (err: unknown, v: Record<string, string>) => void): void;
    setItem(k: string, v: string, cb: (err: unknown) => void): void;
    removeItems(keys: string[], cb: (err: unknown) => void): void;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp: TgWebApp };
    Capacitor?: { isNativePlatform?: () => boolean };
  }
}

export const launchedInTelegram = () => /tgWebApp/.test(location.hash + location.search);

export function loadTelegramScript(): Promise<void> {
  return new Promise((ok) => {
    const s = document.createElement('script');
    s.src = 'https://telegram.org/js/telegram-web-app.js';
    s.onload = () => ok();
    s.onerror = () => ok();
    document.head.appendChild(s);
    setTimeout(ok, 4000);
  });
}

function telegram(tg: TgWebApp): Platform {
  tg.ready();
  tg.expand();
  if (tg.isVersionAtLeast('7.7')) tg.disableVerticalSwipes?.();
  const u = tg.initDataUnsafe.user;
  let back: (() => void) | null = null;
  const onBack = () => back?.();
  tg.BackButton.onClick(onBack);
  const cloudOk = tg.isVersionAtLeast('6.9');
  return {
    kind: 'telegram',
    user: u ? { id: 'tg' + u.id, name: [u.first_name, u.last_name].filter(Boolean).join(' '), username: u.username, photo: u.photo_url } : null,
    startParam: tg.initDataUnsafe.start_param ?? new URLSearchParams(location.search).get('tgWebAppStartParam') ?? new URLSearchParams(location.search).get('g'),
    initData: tg.initData,
    haptic(k) {
      try {
        if (k === 'success' || k === 'warning' || k === 'error') tg.HapticFeedback.notificationOccurred(k);
        else if (k === 'select') tg.HapticFeedback.selectionChanged();
        else tg.HapticFeedback.impactOccurred(k);
      } catch { /* старый клиент */ }
    },
    async share({ text, url }) {
      // Telegram ставит параметр url первым — поэтому кладём туда всё сообщение: сначала текст, потом ссылка
      tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(`${text}\n${url}`)}`);
      return 'shared';
    },
    story(mediaUrl, text) {
      if (!tg.isVersionAtLeast('7.8') || !tg.shareToStory) return false;
      try {
        tg.shareToStory(mediaUrl, { text: text.slice(0, 200) });
        return true;
      } catch {
        return false;
      }
    },
    openLink(url) {
      if (/^https:\/\/t\.me\//.test(url)) tg.openTelegramLink(url);
      else tg.openLink(url);
    },
    setBack(h) {
      back = h;
      if (h) tg.BackButton.show();
      else tg.BackButton.hide();
    },
    setColors(header, bg) {
      try {
        tg.setHeaderColor(header);
        tg.setBackgroundColor(bg);
        tg.setBottomBarColor?.(bg);
      } catch { /* старый клиент */ }
    },
    pay(url) {
      return new Promise((ok) => {
        if (!tg.openInvoice) return ok('unsupported');
        tg.openInvoice(url, (st) => ok((['paid', 'cancelled', 'failed', 'pending'].includes(st) ? st : 'failed') as PayResult));
      });
    },
    cloud: cloudOk
      ? {
          get: (keys) => new Promise((ok, no) => tg.CloudStorage.getItems(keys, (e, v) => (e ? no(e) : ok(v ?? {})))),
          set: (k, v) => new Promise((ok, no) => tg.CloudStorage.setItem(k, v, (e) => (e ? no(e) : ok()))),
          remove: (keys) => new Promise((ok, no) => tg.CloudStorage.removeItems(keys, (e) => (e ? no(e) : ok()))),
        }
      : null,
  };
}

// ─────────────────── Веб / Discord / нативное ───────────────────
export function web(kind: PlatformKind): Platform {
  const q = new URLSearchParams(location.search);
  return {
    kind,
    user: null,
    startParam: q.get('g') || q.get('start') || null,
    initData: '',
    haptic(k) {
      const ms = k === 'heavy' || k === 'error' ? 30 : k === 'select' ? 5 : 12;
      navigator.vibrate?.(ms);
    },
    share: webShare,
    openLink(url) {
      window.open(url, '_blank', 'noopener');
    },
    setBack() { /* в браузере есть своя кнопка «назад» */ },
    pay: async () => 'unsupported',
    setColors(header) {
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', header);
    },
    cloud: null,
  };
}

let current: Platform | null = null;
export const setPlatform = (p: Platform) => { current = p; };
export const inDiscord = () => {
  const q = new URLSearchParams(location.search);
  return q.has('frame_id') && q.has('instance_id');
};
export const inNative = () => !!window.Capacitor?.isNativePlatform?.();

export function initPlatform(): Platform {
  if (current) return current;
  const tg = window.Telegram?.WebApp;
  const q = new URLSearchParams(location.search);
  if (tg && tg.initData) current = telegram(tg);
  // Discord Activity запускается в iframe с frame_id; SDK подключим, когда будет client_id приложения.
  else if (q.has('frame_id') && q.has('instance_id')) current = web('discord'); // настоящий — в initDiscord()
  else if (window.Capacitor?.isNativePlatform?.()) current = web('native');
  else current = web('web');
  return current;
}

export const platform = () => current ?? initPlatform();
