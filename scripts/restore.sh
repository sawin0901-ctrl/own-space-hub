#!/usr/bin/env bash
# Восстановление БД из бэкапа.
# Пример: ./scripts/restore.sh backups/db_20260101_000000.sql.gz
set -euo pipefail
FILE="${1:?Укажите путь к .sql.gz файлу}"
gunzip -c "$FILE" | docker compose exec -T postgres \
  psql -U "${POSTGRES_USER:-shop}" -d "${POSTGRES_DB:-shop}"
echo "[restore] Восстановление завершено."
