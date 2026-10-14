// Настройки сборки. Задаются переменными окружения VITE_* (см. .env.example).

const env = import.meta.env;

export const CONFIG = {
  /** Публичный адрес веб-версии (с завершающим слэшем). */
  siteUrl: (env.VITE_SITE_URL as string | undefined) || 'https://el188el.github.io/podokonnik/',
  /** Имя бота без @, например podokonnik_bot. Без него подарки идут веб-ссылкой. */
  tgBot: (env.VITE_TG_BOT as string | undefined) || '',
  /** Короткое имя Mini App из BotFather (/newapp), например game. */
  tgApp: (env.VITE_TG_APP as string | undefined) || '',
};

export const tgAppLink = (startParam?: string) => {
  if (!CONFIG.tgBot) return '';
  const base = CONFIG.tgApp ? `https://t.me/${CONFIG.tgBot}/${CONFIG.tgApp}` : `https://t.me/${CONFIG.tgBot}`;
  if (!startParam) return base;
  return CONFIG.tgApp ? `${base}?startapp=${startParam}` : `${base}?start=${startParam}`;
};
