# 👑 RoyalX — Telegram Bot & Web App (Mini App)

Полноценный Telegram Бот с интерактивным Web App (Mini App) для казино/сервиса **RoyalX**, работающий на `localhost` с Express и Node.js.

---

## 📁 Структура проекта

- `public/index.html` — Одностраничное интерактивное Web App приложение (подключен Telegram Mini App SDK, табы "Главная", "Акции", "Кабинет", интеграция юзера из Telegram, промокоды, баланс, Haptic feedback, поиск).
- `server.js` — Локальный веб-сервер Express (порт 3000) и логика Telegram-бота (polling, команда `/start`, привязка кнопки меню).
- `.env` — Файл конфигурации для токена и URL-адреса.
- `package.json` — Зависимости и скрипты запуска.

---

## 🚀 Быстрый запуск на localhost

### 1. Установка зависимостей
Откройте терминал в папке проекта и выполните:
```bash
npm install
```

### 2. Настройка бота в Telegram (BotFather)
1. Откройте Telegram и найдите бота [@BotFather](https://t.me/BotFather).
2. Напишите команду `/newbot` и создайте нового бота (получите токен вида `123456789:ABCdefGHI...`).
3. Откройте файл `.env` в проекте и вставьте ваш токен:
   ```env
   BOT_TOKEN=ВАШ_ТОКЕН_ОТ_BOTFATHER
   PORT=3000
   WEBAPP_URL=http://localhost:3000
   ```

### 3. Запуск сервера и бота
Выполните команду:
```bash
npm start
```
Сервер запустится по адресу: `http://localhost:3000`

---

## 🔐 Проброс HTTPS для работы внутри смартфона Telegram (Опционально)

Официальное приложение Telegram (особенно на смартфонах Android/iOS) требует **HTTPS** для открытия Web App. 

Для вывода вашего `localhost:3000` в интернет с бесплатным HTTPS вы можете использовать **Localtunnel** или **Ngrok**:

### Вариант 1: Использование `npx localtunnel` (Быстрый способ)
В новом окне терминала запустите:
```bash
npx localtunnel --port 3000
```
Вы получите ссылку вида: `https://your-app-name.loca.lt`

Укажите эту ссылку в вашем `.env`:
```env
WEBAPP_URL=https://your-app-name.loca.lt
```

### Вариант 2: Использование Ngrok
```bash
ngrok http 3000
```
Скопируйте `https://...ngrok-free.app` в `.env` в параметр `WEBAPP_URL`.

---

## ⚙️ Настройка Web App кнопки в @BotFather

Для того чтобы у бота появилась постоянная синяя кнопка **"Open App"** рядом со строкой ввода:
1. В чате с [@BotFather](https://t.me/BotFather) отправьте команду `/mybots`.
2. Выберите вашего бота -> **Bot Settings** -> **Menu Button** -> **Configure menu button**.
3. Отправьте ваш `WEBAPP_URL` (например: `https://your-app-name.loca.lt` или `http://localhost:3000`).
4. Введите название кнопки: **RoyalX**.

---

## 🎮 Возможности Web App
- 📱 **Адаптивный дизайн**: Оформление под стиль RoyalX (Dark glassmorphism, фирменный зеленый neon `#00efaa`).
- 👤 **Интеграция с Telegram**: Автоматическое отображение аватара, имени, юзернейма и ID пользователя через Telegram Mini App SDK.
- ⚡ **Табы**: Мгновенный переход между разделами без перезагрузки страницы (*Главная*, *Акции*, *Кабинет*).
- 🎁 **Промокоды**: Введите промокод `ROYAL100`, `START`, `ROYALX` или `VIP2026` на вкладке *Акции* для получения бонусного баланса!
- 📳 **Haptic Feedback**: Виброотклик при кликах по кнопкам и переключениях вкладок на мобильных устройствах.

---

## 🛡️ Авторизация (Без JWT)

В проекте реализована безопасная система сессионной авторизации **без использования JWT**:
1. **Opaque Session Tokens**: Каждому авторизованному клиенту выдаётся криптографически стойкий случайный токен сессии (формат `sess_<64 hex chars>`), генерируемый через `crypto.randomBytes(32)`.
2. **Сессионное хранилище**: Токены сохраняются в таблице `sessions` в базе данных (Supabase) и локально кэшируются. Срок жизни сессии — 30 дней.
3. **Хранение паролей**: Пароли веб-пользователей хэшируются с использованием стойкого алгоритма **PBKDF2** (SHA-512, 10 000 итераций) с уникальной 16-байтной солью (`salt:hash`).
4. **Telegram WebApp HMAC**: При открытии в Telegram Mini App подлинность данных проверяется по HMAC-SHA256 подписи ключом `WebAppData` бота в соответствии со спецификацией Telegram.
5. **Методы авторизации в UI**:
   - Автоматический вход через Telegram WebApp SDK (`x-telegram-init-data`).
   - Модальное окно авторизации в Кабинете: Вход по логину и паролю, Регистрация нового аккаунта, Быстрый вход (Dev Login) для администратора/разработчика.
   - Завершение сессии (Logout) с немедленным отзывом токена из базы данных.

---

## 🗄️ Интеграция с Supabase

Все схемы базы данных перенесены из существующего `server_db.json` и `crash_history.json` в реляционный SQL PostgreSQL.

### 1. Таблицы в Supabase (`supabase_schema.sql`):
- `users`: Пользователи, балансы, пароли, статистика оборота, выигрышей, рефералы, RTP, статус бана.
- `sessions`: Не-JWT сессионные токены (`token`, `user_id`, `user_agent`, `created_at`, `expires_at`).
- `invoices`: Заявки на пополнение через CryptoBot, xRocket, TRC-20, TON.
- `withdrawals`: Заявки на вывод средств, статусы одобрения, ссылки на чеки.
- `promocodes`: Промокоды, лимиты использований, процентные и фиксированные бонусы.
- `app_settings`: Настройки кошельков, казна, список ID администраторов, использованные tx hash.
- `crash_history`: История раундов коэффициентов игры Crash 24/7.

### 2. Подключение к Supabase:
1. Зайдите в [Supabase Dashboard](https://supabase.com/dashboard) и создайте проект.
2. В разделе **SQL Editor** выполните скрипт из файла [supabase_schema.sql](file:///Users/donhuyon/Downloads/package-lock/supabase_schema.sql).
3. Скопируйте ваши **Project URL** и **anon/service_role API Key** в файл `.env`:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-supabase-key
   ```
4. Для переноса всех существующих данных из JSON запустите скрипт миграции:
   ```bash
   node scripts/migrate_to_supabase.js
   ```

> 💡 **Graceful Fallback**: Если параметры `SUPABASE_URL` и `SUPABASE_KEY` не указаны в `.env`, сервер продолжает бесперебойно работать на локальной базе `server_db.json`.

---

## 🧪 Запуск тестов

Для проверки авторизации, работы сессий, прав администратора и схем данных:
```bash
# Тесты алгоритмов PBKDF2, HMAC, сессий и DDL схем:
node scripts/test_auth_and_supabase.js

# Интеграционные тесты Express API эндпоинтов:
node scripts/test_server_api.js
```

