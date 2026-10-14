// Настройки сборки. Задаются переменными окружения VITE_* (см. .env.example).

const env = import.meta.env;

export const CONFIG = {
  /** Публичный адрес веб-версии (с завершающим слэшем). */
  siteUrl: (env.VITE_SITE_URL as string | undefined) || 'https://el188el.github.io/podokonnik/',
  /** Имя бота без @, например podokonnik_bot. Без него подарки идут веб-ссылкой. */
  tgBot: (env.VITE_TG_BOT as string | undefined) || '',
  /** Короткое имя Mini App из BotFather (/newapp), например game. */
  tgApp: (env.VITE_TG_APP as string | undefined) || '',
  /** Адрес серверных функций Supabase: https://<ref>.supabase.co/functions/v1. Без него игра работает офлайн. */
  apiUrl: ((env.VITE_API_URL as string | undefined) || '').replace(/\/$/, ''),
  /** Номер рекламного блока Adsgram (ролики за награду в Telegram). */
  adsBlock: (env.VITE_ADSGRAM_BLOCK as string | undefined) || '',
  /** Client ID приложения Discord (для Discord Activity). */
  discordClientId: (env.VITE_DISCORD_CLIENT_ID as string | undefined) || '',
  /** Telegram-канал игры (имя без @): советы по растениям и итоги конкурса. */
  channel: ((env.VITE_TG_CHANNEL as string | undefined) || '').replace(/^@/, ''),
};

/** Внутри Discord Activity все запросы идут через прокси Discord (URL Mapping «/sb»). */
export function useDiscordProxy() {
  if (CONFIG.apiUrl) CONFIG.apiUrl = '/.proxy/sb';
}

export const tgAppLink = (startParam?: string) => {
  if (!CONFIG.tgBot) return '';
  const base = CONFIG.tgApp ? `https://t.me/${CONFIG.tgBot}/${CONFIG.tgApp}` : `https://t.me/${CONFIG.tgBot}`;
  if (!startParam) return base;
  return CONFIG.tgApp ? `${base}?startapp=${startParam}` : `${base}?start=${startParam}`;
};
