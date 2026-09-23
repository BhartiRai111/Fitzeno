# Fitzeno API

The backend for the Fitzeno gym management platform — a NestJS 12 service on
PostgreSQL via Prisma, built to sit behind the existing Next.js frontend in
`../src`.

**Status:** foundation only. This phase establishes the architecture,
database, configuration, and shared request/response infrastructure that
every future business module (members, classes, bookings, payments, ...)
will build on. No business endpoints exist yet — see
[What's here / What's not](#whats-here--whats-not) below.

## Stack

- **Framework:** NestJS 12 (Express platform), ESM/NodeNext throughout
- **Language:** TypeScript 6
- **Database:** PostgreSQL 16
- **ORM:** Prisma 7 (the `prisma-client` generator + `@prisma/adapter-pg`,
  Prisma's current driver-adapter-based client — not the older
  `prisma-client-js` generator)
- **Validation:** class-validator / class-transformer
- **Auth infrastructure:** Passport JWT strategy + guards (no login/register
  endpoints yet — see below)
- **Docs:** `@nestjs/swagger` (OpenAPI), served at `/api/docs`
- **Testing:** Vitest (unit + e2e)
- **Linting:** oxlint

This is a genuinely newer major-version stack than you may expect from
training data or older tutorials — Nest 12 ships ESM-by-default (relative
imports need explicit `.js` extensions even in `.ts` source), and Prisma 7's
SQL workflow requires an explicit driver adapter rather than an implicit
bundled engine. If something looks unfamiliar, it probably changed upstream
— check the installed package's own docs/types before assuming the older
pattern still applies.

## Getting started

### 1. Start Postgres

Either:

```bash
docker compose up -d
```

or point `DATABASE_URL` at a Postgres instance you already have running
(a native install works fine too — just create a role/database matching
your `.env`).

### 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in real values — see [Environment variables](#environment-variables)
below for what each one does. The defaults match `docker-compose.yml`, so
if you used step 1 as-is you don't need to change `DATABASE_URL`.

### 3. Install dependencies

```bash
npm install
```

If you hit `Cannot read properties of null (reading 'edgesOut')` from npm's
dependency resolver, that's a known npm/arborist bug unrelated to this
project — retry with `npm install --legacy-peer-deps`.

### 4. Run migrations and generate the client

```bash
npm run prisma:migrate:dev
npm run prisma:generate
```

(`migrate dev` runs `generate` for you automatically in most cases — running
it again explicitly is always safe and a no-op if nothing changed.)

### 5. Seed a dev account (optional but recommended)

```bash
npm run db:seed
```

Creates one tenant ("Fitzeno — Riverside District", matching the frontend's
mock `gymProfile`) and one `OWNER` user (`owner@fitzeno.app` /
`ChangeMe123!`) — dev-only credentials, never reused anywhere real.

### 6. Run the server

```bash
npm run start:dev
```

- API: `http://localhost:3001/api/v1`
- Health check: `http://localhost:3001/api/v1/health`
- Swagger UI: `http://localhost:3001/api/docs`

## Environment variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `NODE_ENV` | no | `development` | `development` \| `test` \| `production` |
| `PORT` | no | `3001` | HTTP port |
| `DATABASE_URL` | **yes** | — | Postgres connection string |
| `JWT_SECRET` | **yes** | — | Signs access tokens. Min 16 chars; generate a real one with `openssl rand -base64 48`. Never reuse the `.env.example` placeholder. |
| `JWT_ACCESS_TOKEN_TTL_SECONDS` | no | `900` (15 min) | Access token lifetime |
| `CORS_ORIGIN` | no | `http://localhost:3000` | Comma-separated list of allowed origins |
| `THROTTLE_TTL_MS` | no | `60000` | Rate-limit window |
| `THROTTLE_LIMIT` | no | `120` | Requests allowed per window per client |

All of the above are validated at boot (`src/config/env.validation.ts`) — a
missing or malformed value fails startup immediately with a clear message,
rather than surfacing as a confusing runtime error later.

## Architecture

```
backend/
  prisma/
    schema.prisma       single source of truth for the DB schema
    migrations/          generated SQL migrations (committed)
    seed.ts               dev-only tenant + owner user
  src/
    main.ts               process entrypoint — thin, delegates to bootstrap.ts
    bootstrap.ts           app-wide setup (helmet, CORS, prefix, versioning,
                            validation, Swagger) — shared by main.ts AND the
                            e2e test suite, so tests exercise real behavior
    app.module.ts           root module: config, throttling, global guards
    config/                typed, validated environment configuration
    prisma/                 PrismaService/PrismaModule — the one pooled
                            connection every feature module injects
    common/
      dto/                  shared request/response shapes (pagination)
      errors/               the ErrorCode enum every error response uses
      filters/               AllExceptionsFilter — one error envelope, always
      interceptors/          ResponseInterceptor (success envelope),
                            LoggingInterceptor
      guards/                JwtAuthGuard, RolesGuard — registered globally
      decorators/            @Public(), @Roles(), @CurrentUser()
      types/                 shared request/JWT payload interfaces
    auth/                   JWT strategy + module (infrastructure only —
                            see below)
    health/                 GET /api/v1/health
    generated/prisma/        Prisma's generated client (gitignored, regenerate
                            with `npm run prisma:generate`)
```

### Why this database/ORM

**PostgreSQL** because it's the standard, well-supported choice for a
production multi-tenant SaaS: real constraints and indexes, JSON columns
for the semi-structured bits (e.g. a future `permissionOverrides` map),
and it runs anywhere (Docker locally, RDS/Cloud SQL/Supabase/Railway/etc.
in production) without vendor lock-in.

**Prisma** over TypeORM because `schema.prisma` is a single, readable
source of truth for the whole data model — genuinely easier for someone
joining the project later to read top-to-bottom than scanning decorated
entity classes scattered across modules — and its migration workflow
(`prisma migrate dev`) generates reviewable, committed SQL rather than
relying on decorator-diffing at runtime. The `@prisma/client` package is
pinned to the last stable release (`7.10.0`) rather than npm's `latest`
tag, which currently points at an `8.0.0-rc` — a release candidate has no
place as a dependency in something meant to be production-style.

### Database conventions (for every future table)

Established in `prisma/schema.prisma` on `Tenant` and `User`, and meant to
be followed by every model added in later phases:

- `id` is a UUID, generated with `@default(uuid())` — never an
  auto-increment integer, so IDs are safe to generate client-side and never
  leak row counts to an API consumer.
- `createdAt` / `updatedAt` timestamps on every table.
- `deletedAt` (nullable) for soft deletion on anything an owner might want
  to restore — never hard-delete business or financial history. Nothing
  enforces the soft-delete filter automatically yet (no Prisma
  client extension/middleware); that's an explicit next-phase decision once
  there's real business data to filter.
- Tenant-scoped tables carry a `tenantId` foreign key **and** an index on
  it. See [Tenant isolation](#tenant-isolation-a-deliberately-unfinished-story)
  below for what this does and doesn't guarantee yet.
- snake_case column/table names in Postgres (`@map`/`@@map`), camelCase in
  the generated TypeScript client — keeps SQL idiomatic while the
  application code stays idiomatic TS.

### Request/response conventions

Every response — success or failure — is wrapped consistently so the
frontend has exactly one shape to unwrap regardless of which endpoint it
called:

```jsonc
// success
{ "success": true, "data": { /* ... */ } }

// success, paginated (PaginatedResult from common/dto)
{ "success": true, "data": [ /* items */ ], "meta": { "page": 1, "limit": 20, "totalItems": 42, "totalPages": 3 } }

// error — same shape regardless of whether it came from a thrown
// HttpException, a class-validator failure, a known Prisma error, or an
// unexpected exception
{
  "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": "Validation failed.", "details": ["email must be an email"] },
  "path": "/api/v1/members",
  "timestamp": "2026-09-23T10:00:00.000Z"
}
```

`ErrorCode` (`common/errors/error-code.enum.ts`) is the stable,
machine-readable field the frontend should switch on — never parse
`error.message`, which is meant for humans and can change wording.

Pagination/filtering/search: any future list endpoint should accept (and
its DTO should extend) `PaginationQueryDto` (`page`, `limit`, `search`,
`sortBy`, `sortOrder`) and return a `PaginatedResult<T>` — the
`ResponseInterceptor` already knows how to unwrap that shape into the `data`
+ `meta` envelope above.

### Security foundation

- **Helmet** for standard security headers (CSP, HSTS, `X-Content-Type-Options`,
  `X-Frame-Options`, ...).
- **CORS** locked to `CORS_ORIGIN` (comma-separated), not wildcard.
- **Rate limiting** via `@nestjs/throttler`, registered as a global guard —
  every route is limited by default (`THROTTLE_LIMIT` requests per
  `THROTTLE_TTL_MS`).
- **Validation** via a global `ValidationPipe` with `whitelist: true` and
  `forbidNonWhitelisted: true` — unknown request fields are rejected, not
  silently dropped or silently accepted.
- **Auth-by-default**: `JwtAuthGuard` is registered globally (`APP_GUARD`),
  so a new controller requires a valid access token unless it opts out with
  `@Public()`. This is the opposite of the more common "opt in to auth
  per-route" pattern, chosen deliberately — a forgotten `@UseGuards()` on a
  new endpoint is a very easy way to accidentally ship an open route, and
  this foundation makes that mistake impossible instead of just discouraged.
- **Safe error responses**: `AllExceptionsFilter` never leaks a stack trace,
  SQL, or file path to the client — unexpected errors log their full detail
  server-side and return a generic message. See the "Validation &
  error handling" test coverage in `common/filters/all-exceptions.filter.spec.ts`
  for the exact behavior.

### Auth: infrastructure only, on purpose

This phase deliberately does **not** include `/auth/register` or
`/auth/login` endpoints. What it does include, and what's actually verified
by the test suite:

- The `User` table (schema, with a `passwordHash` column ready for bcrypt).
- A working `JwtStrategy` that re-validates the user against the database
  on every request (so a disabled/deleted account loses access immediately,
  rather than waiting out the token's TTL) — see
  `auth/strategies/jwt.strategy.ts`.
- `JwtAuthGuard` (global) and `RolesGuard` + `@Roles()` for future
  per-endpoint role restriction, both with unit tests covering the
  public-bypass and role-mismatch paths.
- `@CurrentUser()` to pull the authenticated user out of any guarded
  handler.

The actual login/register business logic (password hashing, rate-limited
login attempts, refresh tokens, password reset, etc.) is the first real
business module for the next backend phase — building it against
already-proven guard/strategy plumbing rather than as part of "getting the
foundation to boot."

### Tenant isolation: a deliberately unfinished story

The product needs one gym's data to never be reachable from another gym's
request context. This phase lays the schema half of that (every
tenant-owned table has `tenantId` + an index, and an authenticated
request's JWT carries `tenantId` via `@CurrentUser()`), but does **not**
attempt to enforce it generically — there's no single guard that can know
"does resource X belong to tenant Y" without knowing what X is, and
building that generically before any tenant-scoped resource exists would be
guesswork. The convention every future service must follow: every Prisma
query in a tenant-scoped service includes `tenantId: user.tenantId` in its
`where` clause. Worth revisiting with a Prisma Client extension (a
`$extends` that auto-injects the tenant filter) once there's a second or
third real service to prove the pattern against.

### What's here / what's not

**Here:** app bootstrap, configuration, database connection + migrations,
the `Tenant`/`User` schema foundation, the global error/response envelope,
validation, security headers/CORS/rate-limiting, Swagger, a real health
check, and auth *infrastructure* (guards/strategy, no endpoints).

**Not here, by design** (see the phase brief this was built from): Members,
Staff, Trainers, Leads, Memberships, Classes, Bookings, Attendance,
Payments, Invoices, Notifications, Reports, Inventory/POS, Expenses,
Settings, Audit/Activity — every one of these is a real business domain
the frontend already has mock data and full UI for (see
`../src/lib/data/*.ts` and `../README.md`'s project structure section), and
each becomes its own Nest module (`module/`, `controller.ts`, `service.ts`,
`dto/`) in a later phase, built on this foundation rather than duplicating
it.

## Development commands

| Command | Purpose |
|---|---|
| `npm run start:dev` | Dev server, watch mode |
| `npm run build` | Production build (`nest build`) |
| `npm run start:prod` | Run the built output (`dist/main.js`) |
| `npm run lint` | oxlint |
| `npm run test` | Unit tests (Vitest) |
| `npm run test:e2e` | e2e tests (Vitest) — **requires a running database**; boots the real `AppModule` and hits it over HTTP with supertest |
| `npm run prisma:migrate:dev` | Create + apply a migration from schema changes |
| `npm run prisma:migrate:deploy` | Apply pending migrations without prompting — CI/production |
| `npm run prisma:generate` | Regenerate the Prisma client after a schema change |
| `npm run prisma:studio` | Prisma Studio — a local DB browser GUI |
| `npm run db:seed` | Re-run the dev seed (idempotent — upserts) |

## Known limitations going into the next phase

- No business modules yet (see above) — the frontend keeps using its mock
  data (`src/lib/data/*.ts`) until each domain's API lands.
- No real login/register endpoints yet, only the guard/strategy
  infrastructure they'll be built on.
- Tenant isolation is a schema-level convention, not yet enforced by a
  shared guard/query extension — see
  [Tenant isolation](#tenant-isolation-a-deliberately-unfinished-story).
- `npm audit` reports 4 high-severity advisories, all inside the `prisma`
  CLI package's own transitive dev-tooling dependencies (`deepmerge-ts`,
  bundled `mysql2` support we don't use since this project is
  Postgres-only) — not in `@prisma/client` or anything that runs in the
  deployed server process. The suggested `npm audit fix --force` downgrades
  to Prisma 6, which is a real regression (older client, no driver-adapter
  support); left as-is and worth re-checking next time Prisma cuts a patch
  release.
- Soft-delete (`deletedAt`) is a schema convention, not yet enforced by a
  query filter — nothing currently reads it.
