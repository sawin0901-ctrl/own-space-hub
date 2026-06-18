#!/usr/bin/env bash
# Резервное копирование PostgreSQL, конфигов и загруженных файлов.
# Запуск: ./scripts/backup.sh   (рекомендуется через cron, см. README)
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
STAMP="$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "[backup] PostgreSQL → $BACKUP_DIR/db_$STAMP.sql.gz"
docker compose exec -T postgres \
  pg_dump -U "${POSTGRES_USER:-shop}" "${POSTGRES_DB:-shop}" \
  | gzip > "$BACKUP_DIR/db_$STAMP.sql.gz"

echo "[backup] Загруженные файлы → $BACKUP_DIR/uploads_$STAMP.tar.gz"
docker run --rm -v "$(basename "$PWD")_uploads":/data -v "$PWD/$BACKUP_DIR":/backup alpine \
  tar czf "/backup/uploads_$STAMP.tar.gz" -C /data . || true

echo "[backup] Конфигурации → $BACKUP_DIR/config_$STAMP.tar.gz"
tar czf "$BACKUP_DIR/config_$STAMP.tar.gz" \
  .env docker-compose.yml docker/ prisma/

# Ротация: храним последние 14 бэкапов каждой группы
ls -1t "$BACKUP_DIR"/db_*.sql.gz     2>/dev/null | tail -n +15 | xargs -r rm --
ls -1t "$BACKUP_DIR"/uploads_*.tar.gz 2>/dev/null | tail -n +15 | xargs -r rm --
ls -1t "$BACKUP_DIR"/config_*.tar.gz 2>/dev/null | tail -n +15 | xargs -r rm --

echo "[backup] Готово."
