FROM --platform=linux/amd64 node:22-alpine AS api-builder

WORKDIR /build

COPY api/package*.json ./
RUN npm ci

COPY api/ ./
RUN npm run build && npm prune --production

FROM --platform=linux/amd64 node:22-alpine AS web-builder

WORKDIR /build

COPY web/package*.json ./
RUN npm ci

COPY web/ ./
ENV VITE_API_URL=""
RUN npm run build-only

FROM --platform=linux/amd64 node:22-alpine AS production

RUN apk add --no-cache tini caddy

WORKDIR /app

COPY --from=api-builder /build/dist /app/api/dist
COPY --from=api-builder /build/db/migrations /app/api/dist/migrations
COPY --from=api-builder /build/node_modules /app/api/node_modules
COPY --from=web-builder /build/dist /app/web
COPY Caddyfile /app/
COPY entrypoint.sh /app/

RUN chmod +x /app/entrypoint.sh && mkdir -p /app/data

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/app/entrypoint.sh"]
