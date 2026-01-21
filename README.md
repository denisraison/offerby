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

## Architecture

### Layers

```
Routes → Services → Repositories → Database
```

**Routes** handle HTTP. Validate input, call a service, return JSON. No business logic.

**Services** contain business logic. They don't know about HTTP, Hono, or request/response. Pure functions that take data and return data.

**Repositories** are the only things that touch the database. Raw Kysely queries, no business rules.

### Dependency injection

No framework. Just factory functions.

```typescript
// Each service declares exactly what it needs
export const createProductService = (deps: {
  products: ProductsRepository
  offers: OffersRepository
}) => ({
  getProductDetails: (id: number, userId: number) => { ... }
})

// Wire it up at startup
const services = createServices(repositories)
app.use('*', repositoriesMiddleware(repositories))

// Routes pull from context
const { product } = c.get('services')
```

Services don't know where their dependencies come from. In production they get real Postgres. In tests they get PGlite. Same code, different database.

This is the entire point. We can test real SQL, real transactions, real constraint violations without mocking anything. The service code has no idea it's being tested.

## Testing

I follow [Google's test size taxonomy](https://testing.googleblog.com/2010/12/test-sizes.html) rather than the traditional unit/integration/e2e labels. Test size is defined by the resources required to run:

| Size | Constraints |
|------|-------------|
| Small | Single process, no I/O, no blocking calls |
| Medium | Single machine, can use localhost network |
| Large | No constraints, can span machines |

The traditional distinction between "unit tests" (with mocks) and "integration tests" (with real dependencies) optimises for the wrong thing. What actually matters for a fast, reliable test suite is speed and determinism.

By using [PGlite](https://github.com/electric-sql/pglite) (an in-process PostgreSQL), all our tests run in a single process with real SQL execution. This gives us real database behaviour without mocking, fast execution with no network I/O, and deterministic results with in-memory storage.

```bash
cd api && npm test
```

## Tradeoffs

This is a 2-day coding challenge. I optimised for demonstrating architecture and core logic, not 100% production hardening yet :(

**No rate limiting.** The auth endpoints are wide open. I'd add this in prod but it's noise for a code review I think...

**Minimal password requirements.** Just `min(6)`. Real systems need complexity rules, breach checking. Not the interesting part of this exercise.

**JWT_SECRET validated at runtime, not startup.** The server boots fine without it and only fails when someone logs in. Should fail fast. Easy fix, just didn't prioritise it.

**Local file uploads.** Images go to `./uploads/`. Works for demo, won't scale. Would use S3 or similar.

They're my conscious scope cuts. The architecture, testing approach, and business logic are the things worth evaluating I would think.