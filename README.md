# OfferBy

A buy/sell marketplace with counter-offer negotiation.

Buyers can make offers, sellers can counter or accept. Back and forth until someone says yes.

## Stack

- **API**: Hono, Kysely, PostgreSQL
- **Web**: Vue 3, Vite

## Quick Start

Requires Docker and Node.js 20+.

```bash
make dev
```

This starts PostgreSQL, runs migrations, seeds test users, and launches both servers.

- API: http://localhost:3000
- Web: http://localhost:5173

## Test Users

All passwords are `password123`.

| Email | Role |
|-------|------|
| seller@test.com | Seller |
| buyer1@test.com | Buyer |
| buyer2@test.com | Buyer |

## Commands

```bash
make dev      # Start everything
make stop     # Stop servers
make clean    # Stop servers and remove database
```
