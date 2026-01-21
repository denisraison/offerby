.PHONY: dev setup db migrate seed api web clean install stop deploy setup-fly logs ssh secrets

FLY_APP := offerby

# =============================================================================
# Development
# =============================================================================

dev: install setup
	@echo "Starting API server..."
	@cd api && npm run dev &
	@echo "Waiting for API to be healthy..."
	@until curl -s http://localhost:3000/api/health > /dev/null 2>&1; do sleep 1; done
	@echo "API healthy, starting web..."
	cd web && npm run dev

install:
	@test -d api/node_modules || (echo "Installing API dependencies..." && cd api && npm install)
	@test -d web/node_modules || (echo "Installing web dependencies..." && cd web && npm install)
	@test -f api/.env || cp api/.env.example api/.env

setup: db migrate seed

db:
	@docker compose up -d
	@echo "Waiting for PostgreSQL..."
	@until docker compose exec -T db pg_isready -U postgres > /dev/null 2>&1; do sleep 1; done
	@echo "PostgreSQL ready"

migrate:
	cd api && npm run migrate

seed:
	cd api && npm run seed

api:
	cd api && npm run dev

web:
	cd web && npm run dev

stop:
	@-pkill -f "tsx watch src/index.ts" 2>/dev/null || true
	@-pkill -f "vite" 2>/dev/null || true
	@echo "Stopped API and web servers"

clean: stop
	docker compose down -v
	@echo "Removed Docker containers and volumes"

# =============================================================================
# Fly.io Deployment
# =============================================================================

setup-fly:
	@echo "Creating Fly app..."
	fly apps create $(FLY_APP) || true
	@echo "Creating volume for data..."
	fly volumes create offerby_data --region syd --size 1 -a $(FLY_APP) -y || true
	@echo "Setup complete. Set secrets with 'make secrets' then deploy with 'make deploy'"

deploy:
	fly deploy --local-only

logs:
	fly logs -a $(FLY_APP)

ssh:
	fly ssh console -a $(FLY_APP)

secrets:
	@echo "Set your JWT_SECRET:"
	@echo "  fly secrets set JWT_SECRET=your-secret-here -a $(FLY_APP)"
	@echo ""
	@echo "Generate a secure secret with:"
	@echo "  openssl rand -base64 32"
