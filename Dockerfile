# Stage 1: Build API
FROM --platform=linux/amd64 node:22-alpine AS api-builder

WORKDIR /build

RUN apk add --no-cache python3 make g++

COPY api/package*.json ./
RUN npm ci

COPY api/ ./

# Stage 2: Build Web
FROM --platform=linux/amd64 node:22-alpine AS web-builder

WORKDIR /build

COPY web/package*.json ./
RUN npm ci

COPY web/ ./
RUN npm run build-only

# Stage 3: Production
FROM --platform=linux/amd64 node:22-alpine AS production

RUN apk add --no-cache tini caddy

WORKDIR /app

COPY --from=api-builder /build /app/api
COPY --from=web-builder /build/dist /app/web
COPY Caddyfile /app/
COPY entrypoint.sh /app/

RUN chmod +x /app/entrypoint.sh && mkdir -p /app/data

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/app/entrypoint.sh"]
