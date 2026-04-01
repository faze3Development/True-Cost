DC ?= docker compose
AIR ?= air
ENV_FILE ?= Server/.env

.PHONY: help dev run-backend-dev stack up down logs ps test

help:           ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

dev:            ## Start local dev stack (Postgres + Redis), then run API locally via air
	$(DC) up -d --wait postgres redis
	$(MAKE) run-backend-dev

run-backend-dev: ## Run API locally with air, loading Server/.env
ifeq ($(OS),Windows_NT)
	@powershell -ExecutionPolicy Bypass -Command "& { if (Test-Path '$(ENV_FILE)') { Get-Content '$(ENV_FILE)' | ForEach-Object { if ($$_ -match '^(?<k>[A-Za-z_][A-Za-z0-9_]*)=(?<v>.*)$$') { $$name = $$Matches.k; $$value = $$Matches.v; [Environment]::SetEnvironmentVariable($$name, $$value, 'Process') } } }; $(AIR) -c .air.toml }"
else
	@set -a; [ -f $(ENV_FILE) ] && . $(ENV_FILE); set +a; $(AIR) -c .air.toml
endif

stack:          ## Run full docker stack (api + worker + deps)
	$(DC) up -d --build --wait

up:             ## Alias for stack
	$(MAKE) stack

down:           ## Tear down local dev stack (containers + volumes)
	$(DC) down -v

logs:           ## Tail docker compose logs
	$(DC) logs -f

ps:             ## Show compose services
	$(DC) ps

test:           ## Run backend tests
	go test ./...
