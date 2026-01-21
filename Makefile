.PHONY: dev setup db migrate seed api web clean install stop deploy setup-fly logs ssh secrets

FLY_APP := offerby

dev: install setup
	@cd api && npm run dev &
	@until curl -s http://localhost:3000/api/health > /dev/null 2>&1; do sleep 1; done
	cd web && npm run dev

install:
	@test -d api/node_modules || (cd api && npm install)
	@test -d web/node_modules || (cd web && npm install)
	@test -f api/.env || cp api/.env.example api/.env

setup: db migrate seed

db:
	@docker compose up -d
	@until docker compose exec -T db pg_isready -U postgres > /dev/null 2>&1; do sleep 1; done

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

clean: stop
	docker compose down -v

setup-fly:
	fly apps create $(FLY_APP) || true
	fly volumes create offerby_data --region syd --size 1 -a $(FLY_APP) -y || true

deploy:
	fly deploy --local-only

logs:
	fly logs -a $(FLY_APP)

ssh:
	fly ssh console -a $(FLY_APP)

secrets:
	@echo "fly secrets set JWT_SECRET=\$$(openssl rand -base64 32) -a $(FLY_APP)"
