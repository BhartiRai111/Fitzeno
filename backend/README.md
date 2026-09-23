# Fitzeno API

The backend for the Fitzeno gym management platform — a NestJS 12 service on
PostgreSQL via Prisma, built to sit behind the existing Next.js frontend in
`../src`.

**Status:** identity and access-control layer complete. On top of the
app-bootstrap foundation (config, database, error/response envelope,
security headers, Swagger), this phase adds real authentication
(register/login/refresh/logout, password reset, staff invites), a clean
`User` identity model, and a role + configurable-permission authorization
system — everything every future business module (members, classes,
bookings, payments, ...) will authenticate and authorize against. No
business-domain endpoints exist yet — see
[What's here / What's not](#whats-here--whats-not) below.

## Stack

- **Framework:** NestJS 12 (Express platform), ESM/NodeNext throughout
- **Language:** TypeScript 6
- **Database:** PostgreSQL 16
- **ORM:** Prisma 7 (the `prisma-client` generator + `@prisma/adapter-pg`,
  Prisma's current driver-adapter-based client — not the older
  `prisma-client-js` generator)
- **Validation:** class-validator / class-transformer
- **Auth:** `@nestjs/jwt` + Passport JWT strategy for short-lived access
  tokens, an opaque DB-backed refresh token in an httpOnly cookie, and
  `bcrypt` for password hashing — see [Authentication](#authentication) below
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

Registration (`POST /auth/register`) always resolves to the single
earliest-created tenant, so a fresh, unseeded database with zero tenants
will refuse registration with a clear error — run the seed (or otherwise
create a `Tenant` row) before exercising the auth flow end-to-end. Staff
accounts (Manager/Trainer/Front Desk) aren't self-registered — an `OWNER`
invites them via `POST /users/invite`; only `MEMBER` accounts go through
`/auth/register`.

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
| `JWT_REFRESH_TOKEN_TTL_DAYS` | no | `30` | Refresh-token (httpOnly cookie) lifetime, and how long an unused session stays revocable |
| `PASSWORD_RESET_TTL_HOURS` | no | `2` | How long a forgot-password / staff-invite setup link stays valid |
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
    auth/                   register/login/refresh/logout/me, forgot/reset
                            password, change-password — see Authentication
    authz/                  role-permission defaults, PermissionsService,
                            @RequirePermission()/PermissionsGuard — see
                            Roles & permissions
    users/                  the staff/team directory: list, invite,
                            status/role, permission overrides
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

### Authentication

**Token strategy:** a short-lived JWT **access token** (default 15 min,
`JWT_ACCESS_TOKEN_TTL_SECONDS`) is returned in the response body and sent as
`Authorization: Bearer <token>`; a long-lived, opaque, DB-backed **refresh
token** (default 30 days, `JWT_REFRESH_TOKEN_TTL_DAYS`) lives in an httpOnly,
`sameSite=lax` cookie scoped to `/api/v1/auth` only, never returned in a
JSON body. The refresh token is intentionally *not* a stateless JWT —
storing it as a hashed row (`RefreshToken`, SHA-256, never the raw value) is
what makes logout and password-change able to actually revoke a session
instead of waiting out its TTL. Every refresh **rotates** the token (the old
row is marked `revokedAt` + `replacedByTokenHash`); presenting an
already-revoked token is treated as possible theft and revokes *every*
refresh token that user has outstanding.

**Endpoints** (`auth/auth.controller.ts`, all under `/api/v1/auth`):

| Route | Auth | Throttle | Behavior |
|---|---|---|---|
| `POST /register` | public | 3/min | Creates a `MEMBER` account under the single existing tenant; issues a session |
| `POST /login` | public | 5/min | Email + password; issues a session |
| `POST /refresh` | reads the cookie | — | Rotates the refresh token, issues a new access token |
| `POST /logout` | reads the cookie | — | Revokes the current refresh token (idempotent — an already-invalid token is a no-op success) |
| `GET /me` | bearer | — | The authenticated user |
| `POST /forgot-password` | public | 3/min | Always 204, regardless of whether the email exists |
| `POST /reset-password` | public | — | Consumes a one-time token, sets a new password |
| `POST /change-password` | bearer | — | Verifies the current password, revokes all sessions on success |

**Account-state-aware login**, in order:
1. Unknown email → generic `401 "Invalid email or password."`
2. `status: INVITED` → `403` with an actionable message ("check your email
   for a setup link") — checked *before* the password, since an invited
   account's password is an unknowable random value with nothing to protect
   by staying silent.
3. Wrong password → the *same* generic `401` as an unknown email (a
   deliberate anti-enumeration measure: wrong-email and wrong-password are
   indistinguishable from the response).
4. `status: INACTIVE` → `403` — checked only *after* a correct password, so
   this can't be used to enumerate which accounts are disabled.

**Password reset and staff invites share one mechanism.** An invite
(`POST /users/invite`, below) creates a real `User` row immediately with
`status: INVITED` and a random, never-revealed throwaway password hash —
the invitee can only gain access by completing the same opaque-token flow
`forgot-password` uses. `reset-password` succeeding on an `INVITED` account
flips it to `ACTIVE`. No email provider is wired up yet: the raw reset
token is logged server-side (`AuthService`, `Logger.log`) rather than
emailed — a clearly-marked integration point, never returned in an API
response.

**Passwords:** bcrypt, cost factor 12, 8–72 characters (72 is bcrypt's own
input limit). Opaque tokens (refresh, password-reset) are
`crypto.randomBytes(32)` base64url-encoded, then SHA-256-hashed before
storage — not bcrypt, deliberately, since these are already 256 bits of
generated entropy rather than a human-chosen secret bcrypt's slow hashing
is meant to protect.

**Guard order matters** (`app.module.ts`, `APP_GUARD`, registered in this
order): `ThrottlerGuard` → `JwtAuthGuard` (bypassed by `@Public()`) →
`RolesGuard` (`@Roles(...)`) → `PermissionsGuard` (`@RequirePermission()`,
see below). Every guard is a no-op when its metadata is absent, so a route
using only some of them still composes correctly. `JwtStrategy`
re-validates the user against the database on every request (via
`UsersService`, never `PrismaService` directly) — a disabled or deleted
account loses access immediately rather than waiting out the access
token's TTL.

### Roles & permissions

Mirrors the frontend's already-designed model (`../src/lib/permissions.ts`)
1:1 rather than inventing a new one: a **role-based default** merged with
**per-user overrides** — both role-based *and* configurable, at once.

- **Roles** (`UserRole`): `OWNER`, `MANAGER`, `TRAINER`, `FRONT_DESK`,
  `MEMBER`.
- **Permission areas** (`PermissionArea`, 11 of them): members, bookings,
  attendance, memberships, payments, store, finance, reports, staff,
  announcements, settings.
- **Levels** (`PermissionLevel`): `NONE` < `VIEW` < `MANAGE`.
- **`ROLE_DEFAULT_PERMISSIONS`** (`authz/role-permissions.const.ts`) is a
  static per-role × per-area matrix — `OWNER` gets `MANAGE` everywhere,
  `MEMBER` gets `NONE` everywhere, `MANAGER`/`TRAINER`/`FRONT_DESK` sit
  in between per the frontend's Staff & Permissions page.
- **`PermissionOverride`** rows let an `OWNER` grant or restrict an
  individual user beyond their role default for a specific area
  (`PUT /users/:id/permissions`) — effective permission = the override if
  one exists for that (user, area) pair, else the role default.
  `PermissionsService.getEffectivePermissions()`/`hasPermission()` do the
  merge; `GET /users/:id/permissions` exposes the resolved result.

**Enforcement:**

- `@RequirePermission(area, level)` + the global `PermissionsGuard` for
  route-level checks that don't depend on a URL param (e.g. `GET /users`
  requires `staff:VIEW`).
- `@Roles(UserRole.OWNER)` + `RolesGuard` for the rare case that's about the
  role itself, not a permission area (only an `OWNER` may reassign roles,
  since a role change reshapes the whole permission model).
- **Self-or-permission**, for "view/edit a specific user" endpoints
  (`GET/PATCH /users/:id`, `GET /users/:id/permissions`): a user can always
  reach their own record; reaching someone else's requires `staff` at the
  right level. This can't be expressed by a route-level decorator alone (it
  has no access to `:id`), so it's an explicit `assertSelfOrPermission()`
  check inside the handler — see `users/users.controller.ts`.
- **At least one active `OWNER`, always**: demoting or deactivating the
  last active owner of a tenant is rejected (`400`) — a gym can end up
  short-staffed, never ownerless.

### Users

`users/` is the staff/team directory — listing, inviting, and managing
*other* users. It deliberately owns nothing but identity: no
business-specific profile data (that's for the Members/Trainers modules a
later phase adds on top of the same `User` row via their own `userId` FK).
`UsersService` is every feature module's *only* path to the `User` table —
`AuthService`, `JwtStrategy`, and `UsersController` all go through it
rather than querying Prisma directly, so "how a user is looked up/created"
stays in one place. Every query is scoped to `tenantId` — see
[Tenant isolation](#tenant-isolation-a-deliberately-unfinished-story).

Every response uses `UserResponseDto`/`toUserResponse()`
(`users/dto/user-response.dto.ts`), which strips `passwordHash` — nothing
in this codebase should ever return a raw Prisma `User` object from an
endpoint.

### Tenant isolation: a deliberately unfinished story

The product needs one gym's data to never be reachable from another gym's
request context. Every tenant-owned table has `tenantId` + an index, an
authenticated request's JWT carries `tenantId` via `@CurrentUser()`, and
`UsersService` — the first real tenant-scoped service — actually applies
it: every list/lookup query includes `tenantId` in its `where` clause
(`findByIdInTenant` returns `404`, not `403`, for a real row in a different
tenant — it doesn't even confirm the id exists elsewhere). What's still
missing is a *shared, generic* enforcement mechanism — there's no single
guard that can know "does resource X belong to tenant Y" without knowing
what X is, so each new tenant-scoped service has to remember to filter by
`tenantId` itself rather than getting it for free. Worth revisiting with a
Prisma Client extension (a `$extends` that auto-injects the tenant filter)
now that there are two real services (`UsersService`, and the `Tenant`
lookup in `AuthService`) to prove the pattern against.

### What's here / what's not

**Here:** app bootstrap, configuration, database connection + migrations,
the global error/response envelope, validation, security
headers/CORS/rate-limiting, Swagger, a real health check, and the full
identity/access-control layer — real registration, login, refresh, logout,
password reset, staff invites, a clean `User` model, and role +
configurable-permission authorization (guards, decorators, a permission
service) that every future module authenticates and authorizes against.

**Not here, by design**: Members, Trainers (as business profiles beyond the
`User` identity row — e.g. certifications, specialties), Leads,
Memberships, Classes, Bookings, Attendance, Payments, Invoices,
Notifications, Reports, Inventory/POS, Expenses, Settings, Audit/Activity —
every one of these is a real business domain the frontend already has mock
data and full UI for (see `../src/lib/data/*.ts` and `../README.md`'s
project structure section), and each becomes its own Nest module
(`module/`, `controller.ts`, `service.ts`, `dto/`) in a later phase, built
on this foundation — each carrying its own `userId` FK back to the `User`
table established here, rather than duplicating identity data.

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
- No email provider is wired up: `forgot-password` and staff-invite setup
  links are logged server-side (`AuthService`, dev-visible only) instead of
  emailed — a clearly-marked follow-up integration, not a gap in the token
  mechanism itself.
- Tenant isolation is enforced in application code (every `UsersService`
  query filters by `tenantId`) but is still a per-service convention, not a
  shared guard/query extension that would make forgetting it impossible —
  see [Tenant isolation](#tenant-isolation-a-deliberately-unfinished-story).
- No account lockout after repeated failed login attempts beyond the
  per-IP rate limit (`5/min` on `/auth/login`) — a per-account lockout/backoff
  is a reasonable next hardening step once there's usage data to tune it
  against.
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
