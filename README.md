# GamePlaza.site — партнёрская витрина цифровых товаров

SEO-оптимизированный каталог-витрина с автоматическим импортом товаров из
**Digiseller** и **Plati.market**. Сайт **не принимает платежи** — пользователь
направляется на торговую площадку по партнёрской ссылке с параметром
`ai=XXXXX` (или `partner_id=XXXXX`), а владелец сайта получает комиссию за
продажу через партнёрскую программу.

## Стек

- **Next.js 15** (App Router, SSR, `output: "standalone"`)
- **PostgreSQL 16** + **Prisma**
- **Redis 7**
- **Nginx** + **certbot** (HTTPS Let's Encrypt)
- **node-cron** worker для автосинхронизации товаров
- Локализация **ru / en / uk / de** через `next-intl`
- Полностью **независим от Lovable** — Docker Compose, открытый исходный код,
  работает на любом VPS в РФ или за рубежом.

## Что есть

- Каталог с фильтрами (категория, платформа, издатель, регион), сортировкой,
  пагинацией, поиском.
- Карточка товара с галереей, описанием, рейтингом, отзывами и кнопкой
  «Купить на торговой площадке» (открывает редирект-трекер с партнёрским
  параметром).
- Динамический `sitemap.xml`, `robots.txt`, JSON-LD `Product` для SEO.
- Партнёрский редирект `/api/go/:productId` — пишет клик в `AffiliateClick`,
  собирает партнёрскую ссылку через шаблон, делает 302.
- Админка `/admin` (логин/пароль): дашборд, товары (скрыть/показать),
  категории, аналитика (просмотры, клики, источники трафика), настройки
  (`affiliateId`, источники, интервал, SEO).
- Worker-сервис: каждые `SYNC_INTERVAL_MINUTES` (или значение из админки)
  идёт в API Digiseller/Plati, делает upsert товаров.

## Что НЕ реализуется (по требованиям)

- Корзина, оформление заказа, выдача ключей, возвраты, эквайринг.
- Никаких ЮKassa / СБП / Stripe / PayPal. Платежи целиком на стороне Plati/Digiseller.

## Установка

### 1. Подготовка сервера

Нужен Docker и Docker Compose v2.

```bash
git clone <ваш-github-репозиторий> gameplaza
cd gameplaza
cp .env.example .env
nano .env   # см. ниже
```

### 2. Минимально необходимые переменные `.env`

```
POSTGRES_PASSWORD=...               # любой длинный пароль
AUTH_SECRET=...                     # openssl rand -hex 32
IP_HASH_SALT=...                    # любая случайная строка
ADMIN_EMAIL=admin@gameplaza.site
ADMIN_PASSWORD=...                  # пароль первого админа
DEFAULT_AFFILIATE_ID=               # ваш ID партнёра (можно изменить в админке)
NEXT_PUBLIC_SITE_URL=https://gameplaza.site

# Хотя бы один источник:
DIGISELLER_SELLER_ID=...
DIGISELLER_API_KEY=...
# и/или
PLATI_SELLER_ID=...
PLATI_API_KEY=...
```

### 3. Запуск

```bash
docker compose up -d --build
```

Контейнер `app` сам выполнит миграции (`prisma migrate deploy`) и при
пустой таблице `User` создаст администратора из `ADMIN_EMAIL/ADMIN_PASSWORD`.

### 4. HTTPS

После того как DNS указывает на сервер, выпустите сертификат:

```bash
./scripts/init-letsencrypt.sh gameplaza.site admin@gameplaza.site
```

После выпуска nginx начнёт отдавать сайт по 443.

### 5. Первая синхронизация

Войдите в админку (`/admin`), при необходимости поправьте партнёрский ID и
шаблоны ссылок в разделе **Настройки**, затем на дашборде нажмите
**Синхронизировать товары сейчас**. Дальше воркер будет делать это
автоматически по интервалу.

## Партнёрские ссылки

Шаблон по умолчанию:

- Plati: `{base}{sep}ai={affiliateId}`
- Digiseller: `{base}{sep}partner_id={affiliateId}`

Переменные:
- `{base}` — оригинальный URL товара у площадки (`Product.affiliateUrl`).
- `{sep}` — `?` или `&` в зависимости от того, есть ли уже параметры.
- `{affiliateId}` — ваш партнёрский ID.

Шаблоны меняются в админке без редеплоя.

## Обновление

```bash
git pull
docker compose up -d --build
```

Миграции и пересборка standalone-бандла произойдут автоматически.

## Резервное копирование

`scripts/backup.sh` собирает дамп PostgreSQL, файлы `public/uploads/` и
текущий `.env` + `docker-compose.yml` в один tar.gz, хранит 14 последних
копий в `./backups/`.

Добавьте в `crontab -e`:

```
0 3 * * * cd /opt/gameplaza && ./scripts/backup.sh >> ./backups/backup.log 2>&1
```

Восстановление: `./scripts/restore.sh ./backups/<имя>.tar.gz`.

## Структура

```
app/
  [locale]/            публичные страницы (главная, каталог, товар, категория, поиск)
  admin/               защищённая админка
  api/go/[productId]/  партнёрский редирект-трекер
  api/search/          JSON для автокомплита
  api/health/          health-check (Postgres+Redis)
  sitemap.xml, robots.txt
components/            переиспользуемые UI компоненты
lib/
  prisma.ts, redis.ts  клиенты
  auth.ts              JWT-сессия админа + первичная инициализация
  settings.ts          key-value настройки (партнёрский ID, источники, SEO)
  analytics.ts         трекинг просмотров/кликов
  importers/           Digiseller / Plati + общий sync
worker/                cron-сервис автосинхронизации
prisma/schema.prisma   схема БД
docker/nginx/          конфиги nginx
scripts/               backup / restore / init-letsencrypt
```

## Полная независимость

Проект не использует API/SDK/хостинг Lovable. После клонирования вы можете
удалить аккаунт Lovable — код, БД, сайт, домен остаются у вас.
