# План: партнёрская витрина GamePlaza.site

Кардинально меняем модель: убираем всё, что связано с приёмом платежей и заказами, делаем SEO-оптимизированный каталог-витрину, который перенаправляет пользователя на Digiseller/Plati с партнёрским параметром `ai=XXXXX`.

## Что удаляем из текущего каркаса

- `app/api/webhooks/digiseller/` — вебхуки оплаты больше не нужны.
- `lib/payments/*` — абстракция PaymentProvider, адаптер Digiseller-оплаты.
- В Prisma-схеме: модели `Order`, `OrderItem`, `Payment` и связанные поля.
- В `.env.example`: ключи `DIGISELLER_API_KEY`, `DIGISELLER_SELLER_ID` (оплата), `WEBHOOK_SECRET`.
- В переводах: строки про оформление заказа/оплату.

## Новая модель данных (Prisma + PostgreSQL)

```text
Product
  id, externalId (id у площадки), source (DIGISELLER|PLATI)
  slug (для SEO), title, description (HTML/MD)
  price, currency, oldPrice?
  image (главное), gallery (string[])
  rating, reviewsCount
  sellerName, sellerUrl
  platform, publisher, region, genre[]
  categoryId -> Category
  affiliateUrl (исходный URL товара у площадки, без ai=)
  isActive, createdAt, updatedAt, lastSyncedAt

Category
  id, slug, name, parentId?, sortOrder, seoTitle, seoDescription

Review (опционально — кешируем с площадки)
  id, productId, author, rating, text, createdAt

Setting (key/value админки)
  affiliateId, syncIntervalMinutes, sources (json),
  seoSiteTitle, seoSiteDescription, seoDefaultOg,
  banners (json)

ProductView
  id, productId, ipHash, userAgent, referer, createdAt

AffiliateClick
  id, productId, ipHash, userAgent, referer, createdAt

User (только админы)
  id, email, passwordHash, role (ADMIN)
```

## Структура страниц (Next.js App Router, i18n)

```text
app/[locale]/
  page.tsx                       — главная (популярные/новинки/категории)
  catalog/page.tsx               — каталог с фильтрами и поиском
  category/[slug]/page.tsx       — страница категории (SEO)
  product/[slug]/page.tsx        — карточка товара (SEO, JSON-LD)
  search/page.tsx                — результаты поиска
  sitemap.xml / robots.txt       — динамические

app/api/
  go/[productId]/route.ts        — редирект-трекер: пишет AffiliateClick,
                                   собирает партнёрскую ссылку с ai=XXXXX,
                                   302 редирект на площадку
  search/route.ts                — JSON для автокомплита

app/admin/                       — защищённая зона
  login/page.tsx
  page.tsx                       — дашборд (статистика)
  products/page.tsx              — список + ручной "Обновить сейчас"
  categories/page.tsx
  settings/page.tsx              — affiliateId, источники, интервал, SEO, баннеры
  analytics/page.tsx             — просмотры/клики/топ товаров
```

## Импорт товаров (Digiseller / Plati)

`lib/importers/` — общий интерфейс `ProductImporter`:
```text
fetchProducts(opts): Promise<NormalizedProduct[]>
fetchProduct(externalId): Promise<NormalizedProduct>
```

Реализации:
- `digiseller.ts` — REST API Digiseller (категории/товары/описания/картинки).
- `plati.ts` — публичный API Plati / XML-выгрузка.

Запуск синка:
- Cron внутри Docker-контейнера (`node-cron` в отдельном процессе или
  отдельный сервис `worker` в `docker-compose.yml`).
- Интервал берётся из `Setting.syncIntervalMinutes`.
- Кнопка "Синхронизировать сейчас" в админке (POST на server action).
- Идемпотентный upsert по `(source, externalId)`; деактивация исчезнувших.

## Формирование партнёрской ссылки

Server-side в `/api/go/[productId]`:
1. Лог `AffiliateClick` (асинхронно, не блокирует).
2. Берёт `Product.affiliateUrl` и `Setting.affiliateId`.
3. Добавляет `?ai=XXXXX` либо `&ai=XXXXX` корректно через `URL`.
4. `302` на итоговую ссылку.

В карточке товара кнопка "Купить на торговой площадке" указывает на
`/api/go/{productId}` с `rel="nofollow sponsored"`, `target="_blank"`.

## Поиск и фильтры

- Полнотекст: PostgreSQL `tsvector` (русский+английский) по
  `title + description + publisher + platform`.
- Фильтры: категория, платформа, издатель, регион активации, диапазон цен,
  сортировка (популярность/цена/рейтинг/новизна).
- Кеш популярных запросов в Redis (TTL 5 мин).

## SEO

- Динамические `generateMetadata` для каждой страницы (title, description, OG, canonical).
- JSON-LD `Product` + `AggregateRating` + `Offer` (с `url` на партнёрку).
- Динамический `sitemap.xml` (категории + товары), `robots.txt`.
- ЧПУ через `slug`, hreflang для ru/en/uk/de.
- Серверный рендер всех публичных страниц.

## Админка

- Auth: email+пароль (bcrypt), сессия в httpOnly cookie (JWT).
- Роль `ADMIN` обязательна, middleware охраняет `/admin/*` и server actions.
- Настройки: `affiliateId`, источники импорта (вкл/выкл, креды), интервал,
  SEO-дефолты, баннеры (изображение+ссылка+позиция).
- Управление товарами: список, фильтры, скрыть/показать, ручной ресинк.
- Аналитика: графики по дням, топ товаров/категорий, источники (referer/UTM).

## Аналитика

Серверные эндпоинты пишут в `ProductView` и `AffiliateClick`. На страницах
вью пишется через маленький beacon на `/api/track/view`. Никаких внешних
аналитик по умолчанию (требование РФ-friendly стэка).

## Инфраструктура (остаётся прежней)

- Docker Compose: `app` (Next.js standalone), `worker` (cron-импортер),
  `postgres`, `redis`, `nginx`, `certbot`.
- Бэкапы `scripts/backup.sh` уже есть — добавим выгрузку загруженных
  баннеров.
- README обновим: убираем главу про оплату, добавляем главу про
  «Партнёрский ID», источники, синхронизацию, админку.

## Порядок реализации (на эту итерацию — каркас, без бизнес-полировки)

1. Чистка: удаляем платёжные модули, схему заказов, переменные.
2. Новая Prisma-схема + миграция.
3. `lib/importers/` интерфейс + заглушки `digiseller`/`plati`
   (фактические запросы заполняем по докам, оставляем TODO там,
   где нужны реальные креды).
4. Public-страницы: главная, каталог, карточка, категория, поиск, sitemap.
5. `/api/go/[productId]` редирект-трекер.
6. Админка: auth, settings, products, analytics (минимум).
7. Worker-сервис в docker-compose с cron.
8. Обновлённый README (установка, партнёрский ID, синк, бэкапы).

## Что нужно от вас перед стартом

1. **Площадки в MVP**: только Plati, только Digiseller, или обе сразу?
2. **Партнёрский параметр**: точная схема — у Plati это `?ai=ID`, у
   Digiseller партнёрка обычно через `partner_id` / отдельную ссылку
   `oplata.info/asp/pay_wm.asp?id_d=...&id_p=...`. Подтвердите формат,
   который вам нужен, либо разрешите вынести шаблон ссылки в настройки
   на источник (например, `urlTemplate: "{base}?ai={affiliateId}"`).
3. **Языки витрины**: оставляем все 4 (ru/en/uk/de) или сейчас только ru?
4. **Админка**: достаточно одного супер-админа из переменных окружения
   на старте, или сразу полноценная таблица пользователей с приглашениями?

После ответов начну реализацию.
