# GamePlaza.site — партнёрская витрина цифровых товаров
# Makefile для одной команды запуска

.PHONY: install up down logs backup certs status

install:
	@echo "=== GamePlaza.site install ==="
	cp -n .env.example .env || true
	@echo "Отредактируй .env, затем запусти: make up"

up:
	docker compose up -d --build
	@echo "Приложение: http://localhost (через nginx)"
	@echo "Прямой доступ: http://localhost:3000"
	@echo "Админка: /admin"

down:
	docker compose down

logs:
	docker compose logs -f app worker nginx

backup:
	./scripts/backup.sh

certs:
	@echo "DOMAIN=gameplaza.site EMAIL=admin@gameplaza.site make issue-certs"

issue-certs:
	@test -n "$(DOMAIN)" || (echo "Укажи DOMAIN=..."; exit 1)
	@test -n "$(EMAIL)" || (echo "Укажи EMAIL=..."; exit 1)
	DOMAIN=$(DOMAIN) EMAIL=$(EMAIL) ./scripts/init-letsencrypt.sh

status:
	docker compose ps
