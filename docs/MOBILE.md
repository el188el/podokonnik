# Android-приложение (RuStore, Google Play)

Приложение собирается из той же игры через Capacitor (`android/`, `capacitor.config.ts`).
Внутри: вход как гость (прогресс на сервере), локальные напоминания на телефоне
(«Хлорофитум хочет пить», полив настоящих растений), системное «Поделиться», вибрация.
Покупки за звёзды в приложении не работают — для магазинов нужна их собственная оплата
(RuStore Billing / Google Play Billing), это следующий шаг, когда приложение опубликуем.

## 1. APK для проверки на телефоне

GitHub → **Actions → «Android-приложение» → Run workflow**. Через ~5 минут в запуске
появится архив `podokonnik-debug-apk` — скачай, распакуй, установи `.apk` на Android
(разрешить установку из неизвестных источников).

## 2. Ключ подписи (один раз, хранить в надёжном месте!)

Без этого ключа нельзя будет выпускать обновления. На компьютере с Java:

```bash
keytool -genkeypair -v -keystore podokonnik.jks -alias podokonnik -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 podokonnik.jks > podokonnik.jks.b64     # на macOS: base64 -i podokonnik.jks
```

GitHub → Settings → Secrets and variables → Actions → **Secrets**:

| Имя | Значение |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | содержимое `podokonnik.jks.b64` |
| `ANDROID_KEYSTORE_PASSWORD` | пароль хранилища |
| `ANDROID_KEY_ALIAS` | `podokonnik` |
| `ANDROID_KEY_PASSWORD` | пароль ключа |

После этого тот же workflow дополнительно соберёт `podokonnik-release` с подписанными
`.aab` (для Google Play) и `.apk` (для RuStore).

## 3. Публикация

- **RuStore** (бесплатно): dev.rustore.ru → консоль разработчика → новое приложение →
  загрузить подписанный `.apk`, скриншоты, описание, иконку 512×512 (`public/icons/icon-512.png`).
- **Google Play** (разовый взнос $25): play.google.com/console → создать приложение →
  загрузить `.aab`. Для новых личных аккаунтов нужно закрытое тестирование: 12 тестировщиков 14 дней.

Пакет приложения: `ru.podokonnik.app` — после первой публикации его менять нельзя.
