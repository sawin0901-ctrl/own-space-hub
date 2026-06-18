#!/usr/bin/env bash
# Первичный выпуск сертификата Let's Encrypt.
# Использование: DOMAIN=example.ru EMAIL=admin@example.ru ./scripts/init-letsencrypt.sh
set -euo pipefail
: "${DOMAIN:?Задайте DOMAIN}"
: "${EMAIL:?Задайте EMAIL}"

docker compose up -d nginx
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  --email "$EMAIL" --agree-tos --no-eff-email \
  -d "$DOMAIN"

echo "[certbot] Сертификат выпущен. Раскомментируйте HTTPS-блок в docker/nginx/conf.d/app.conf и выполните: docker compose restart nginx"
