.PHONY: dev

.PHONY: bootstrap-admin

dev:
	@echo "Starting True-Cost Server in Development Mode..."
	go run main.go

bootstrap-admin:
	@echo "Usage: make bootstrap-admin EMAIL=admin@example.com SECRET=your_secret"
	powershell -ExecutionPolicy Bypass -File scripts/bootstrap-admin.ps1 -Email "$(EMAIL)" -Secret "$(SECRET)"
