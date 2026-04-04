.PHONY: dev

.PHONY: dev-worker

.PHONY: bootstrap-admin

dev:
	@echo "Starting True-Cost API in Development Mode..."
	go run ./cmd/api

dev-worker:
	@echo "Starting True-Cost worker in Development Mode..."
	go run .

bootstrap-admin:
	@echo "Usage: make bootstrap-admin EMAIL=admin@example.com SECRET=your_secret"
	powershell -ExecutionPolicy Bypass -File scripts/bootstrap-admin.ps1 -Email "$(EMAIL)" -Secret "$(SECRET)"
