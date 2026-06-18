# Магазин цифровых товаров

Самодостаточный интернет-магазин цифровых товаров на Next.js. Полностью независим от внешних SaaS: всё работает в Docker Compose на любом Linux-сервере (Ubuntu 22.04+, Debian 12+, российские VPS).

## Стек

- **Next.js 15** (App Router, standalone build)
- **PostgreSQL 16** + **Prisma**
- **Redis 7**
- **Nginx** (reverse proxy) + **Let's Encrypt** (certbot)
- **next-intl** (ru / en / uk / de)
- **Docker Compose**

## Структура

```
app/                  — Next.js App Router (страницы и API-роуты)
  [locale]/           — локализованные страницы
  api/health          — health-check (Postgres + Redis)
  api/webhooks/...    — вебхуки платёжных систем
lib/                  — Prisma, Redis, абстракция платежей
messages/             — переводы (ru/en/uk/de)
prisma/schema.prisma  — схема БД и миграции
docker/nginx/         — конфиг Nginx
scripts/              — backup/restore/letsencrypt
docker-compose.yml
Dockerfile
.env.example
```

## Установка

### Требования
- Docker 24+ и Docker Compose v2
- Открытые порты 80 и 443 (для Nginx + Let's Encrypt)

### Шаги

```bash
git clone <ваш-репозиторий> shop && cd shop
cp .env.example .env
# Отредактируйте .env: пароли БД, домен, ключи Digiseller
docker compose build
docker compose up -d
# Применить миграции (выполняется автоматически при старте app,
# но первый раз можно вручную):
docker compose exec app npx prisma migrate deploy
```

Сайт будет доступен на `http://<ip-сервера>/`.

### HTTPS (Let's Encrypt)

```bash
DOMAIN=example.ru EMAIL=admin@example.ru ./scripts/init-letsencrypt.sh
# затем раскомментируйте HTTPS-блок в docker/nginx/conf.d/app.conf
docker compose restart nginx
```

Поддерживаются `.ru`-домены, IPv4 и IPv6 (если сервер сконфигурирован).

## Обновление

```bash
cd /path/to/shop
git pull
docker compose build app
docker compose up -d app
# Миграции применятся автоматически при запуске.
```

Откат — `git checkout <предыдущий-тег> && docker compose up -d --build app`.

## Резервное копирование

Бэкапятся БД, конфиги и загруженные файлы.

```bash
./scripts/backup.sh
```

Автоматизация через cron (ежедневно в 03:30):

```cron
30 3 * * * cd /path/to/shop && ./scripts/backup.sh >> /var/log/shop-backup.log 2>&1
```

Восстановление БД:

```bash
./scripts/restore.sh backups/db_YYYYMMDD_HHMMSS.sql.gz
```

## Платежи

- **Digiseller** — реализован (создание счёта через `oplata.info`, вебхук с проверкой MD5-подписи в `app/api/webhooks/digiseller/route.ts`).
- **ЮKassa**, **СБП**, **карты РФ** — добавляются как новые адаптеры в `lib/payments/` по интерфейсу `PaymentProvider`. Слот для секретов уже зарезервирован в `.env.example`.

Чтобы добавить нового провайдера:
1. Создайте `lib/payments/<name>.ts` с реализацией `PaymentProvider`.
2. Зарегистрируйте его в `lib/payments/provider.ts`.
3. Добавьте вебхук `app/api/webhooks/<name>/route.ts` с обязательной проверкой подписи.

## Локализация

Языки: `ru` (по умолчанию), `en`, `uk`, `de`. Файлы переводов — `messages/*.json`. Добавление нового языка:
1. Создайте `messages/<code>.json`.
2. Добавьте код в `locales` в `i18n.ts`.

## Независимость

Проект не использует:
- API/SDK/хостинг Lovable
- зарубежные SaaS как обязательные зависимости

Все используемые технологии — open source. Аккаунт Lovable можно удалить — проект продолжит работать.

## Передача проекта

Артефакты:
- Исходный код (этот репозиторий)
- `docker-compose.yml`, `Dockerfile`
- SQL-миграции (Prisma): `prisma/migrations/` создаётся командой `npx prisma migrate dev --name init`
- Инструкции: установки, обновления, резервного копирования (этот README)

## Лицензия

MIT (или выберите свою).
