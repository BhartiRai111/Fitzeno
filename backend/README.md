# Fitzeno API

The backend for the Fitzeno gym management platform — a NestJS 12 service on
PostgreSQL via Prisma, built to sit behind the existing Next.js frontend in
`../src`.

**Status:** identity, access-control, gym/business management, and the
first real business domain — **Members & Leads/CRM** — complete. On top of
auth/authorization (register/login, roles + configurable permissions) and
the gym/business layer (owner onboarding, tenant isolation), this phase
adds a gym's member roster and its lead pipeline: the full lead lifecycle
from first contact through trial to conversion, and the resulting member
record, without duplicating identity or creating disconnected data.
Memberships, Classes, Bookings, Payments, and Attendance are still not
implemented — see
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

`POST /auth/register-business` is how a brand-new gym gets created (see
[Gym / business management](#gym--business-management)) — the seed above
is just a convenience so there's already something to log into. Joining an
**existing** gym (`POST /auth/register`) resolves which one via an
optional `tenantSlug`; omit it and it falls back to "the only gym that
exists," which is what makes the seeded single-tenant setup above work
without any extra parameters — but it refuses to guess once a second gym
exists (see [Tenant isolation](#tenant-isolation)). Staff accounts
(Manager/Trainer/Front Desk) aren't self-registered — an `OWNER` invites
them via `POST /users/invite`; only `MEMBER` accounts go through
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
      guards/                JwtAuthGuard, RolesGuard, TenantStatusGuard —
                            registered globally
      decorators/            @Public(), @Roles(), @CurrentUser(),
                            @SkipTenantStatusCheck()
      types/                 shared request/JWT payload interfaces
    auth/                   register/register-business/login/refresh/logout/
                            me, forgot/reset password, change-password — see
                            Authentication
    authz/                  role-permission defaults, PermissionsService,
                            @RequirePermission()/PermissionsGuard — see
                            Roles & permissions
    users/                  the staff/team directory: list, invite,
                            status/role, permission overrides
    tenants/                the current gym: profile, settings, status — see
                            Gym / business management
    members/                the gym's member roster: profile, notes,
                            portal self-access — see Members & Leads/CRM
    leads/                  the lead/CRM pipeline: lifecycle, follow-ups,
                            conversion — depends on members/ — see
                            Members & Leads/CRM
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
  it. See [Tenant isolation](#tenant-isolation)
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
[Tenant isolation](#tenant-isolation).

Every response uses `UserResponseDto`/`toUserResponse()`
(`users/dto/user-response.dto.ts`), which strips `passwordHash` — nothing
in this codebase should ever return a raw Prisma `User` object from an
endpoint.

### Gym / business management

`Tenant` *is* "a gym" — the workspace every Owner/Manager/Trainer/Front
Desk/Member belongs to (via `User.tenantId`), and the boundary every
future business module's data will be scoped inside. This phase turns it
from a bare `id`/`name`/`slug` row (the previous phase's foundation) into a
real, manageable business:

- **Owner onboarding**: `POST /auth/register-business` (public, throttled
  3/min like `/auth/register`) creates a brand-new `Tenant` (status
  `ONBOARDING`, default-valued `TenantSettings`) and its first user — an
  `OWNER` — in one atomic transaction, then signs them straight in. This is
  the "create a gym" step the product brief describes as *registration →
  gym creation → owner relationship → ready for dashboard*; there's
  deliberately no separate "finish setting up" gate before the owner can
  use their new account. To join an **existing** gym as a `MEMBER`, use
  `POST /auth/register` instead (unchanged route, now resolving which
  tenant to join — see [Tenant isolation](#tenant-isolation) below).
- **Business profile**: name, tagline, description, logo URL, contact
  (phone/email/website), address, and regional defaults
  (timezone/currency/locale) live directly on `Tenant` — see
  `GET`/`PATCH /tenants/me`. Deliberately excludes anything member/staff/
  identity-shaped; that stays on `User`.
- **Settings**: `TenantSettings` (one-to-one with `Tenant`) holds the
  operational configuration a gym owner edits from the Settings page —
  business hours, membership policy defaults (freezes, cancellation
  notice, renewal reminders), accepted payment methods, and
  member/staff notification-channel toggles. Four purpose-built JSON
  columns, one per Settings-page tab, not a generic key-value table — see
  `GET`/`PATCH /tenants/me/settings` and the comment on `TenantSettings` in
  `prisma/schema.prisma` for why JSON was the right call here specifically.
  Every section is independently optional in the `PATCH` body, matching
  how the Settings page saves one tab at a time.
- **Status & lifecycle** (`TenantStatus`): `ONBOARDING` (just created,
  fully usable — flips to `ACTIVE` automatically the first time the owner
  saves a profile change, no separate "activate" call needed) → `ACTIVE`
  (normal operation) ⇄ `INACTIVE` (the owner paused/closed the gym
  themselves — reversible via `PATCH /tenants/me/status`) or → `SUSPENDED`
  (a platform-level hold; the schema and enforcement path support it, but
  no endpoint can set or lift it yet — there's no platform-admin surface
  in this phase, per the brief's own scoping).
- **A suspended/inactive gym blocks ordinary access** (`TenantStatusGuard`,
  global) for everyone in it, owner included — except two routes marked
  `@SkipTenantStatusCheck()`: `GET /tenants/me` (so the frontend can show
  *why* access is blocked) and `PATCH /tenants/me/status` (so an owner can
  reverse their own pause — a suspension is NOT self-liftable, enforced at
  the service layer, not the guard, since the guard has no way to tell
  "owner reactivating their own pause" from "owner trying to escape a
  platform suspension" — see `TenantsService.updateStatus`). Login and
  token refresh check the same thing (`AuthService.login`/`refresh`), so a
  paused gym can't even start a new session, not just lose access mid-one.
- **Every gym-management route resolves "the current gym" from the
  caller's own JWT** (`@CurrentUser().tenantId`) — there is no `GET/PATCH
  /tenants/:id`. A resource reachable only as "mine" cannot leak across
  tenants by construction; no ownership check needed because there's
  nothing to check an ownership claim against.
- **Authorization reuses the existing role/permission model exactly**:
  profile and settings routes are gated on the `SETTINGS` `PermissionArea`
  (`OWNER`: MANAGE, `MANAGER`: VIEW, everyone else: NONE — already defined
  in `authz/role-permissions.const.ts` from the previous phase, unchanged
  here) via `@RequirePermission()`; pausing/reactivating the gym is gated
  on the `OWNER` role directly via `@Roles()`, the same pattern
  `UsersController` uses for role changes — a business-wide lifecycle
  action isn't something a permission override should be able to grant.

### Members & Leads/CRM

The gym's actual roster, and the pipeline that feeds it — the full journey
the product brief describes: *Lead → Contact → Follow-up → Trial → Gym
Visit → Conversion → Member*.

**`Member` vs `User` — two layers, on purpose.** `User` (from the auth
phase) is a login identity; `Member` (`members/`, new this phase) is a
gym's business record of a person — contact details, emergency contact,
assigned trainer, join date, status, notes. A `Member` never *requires* a
`User`: front-desk staff routinely add a walk-in's details long before (or
instead of) that person ever creating portal credentials. The link
(`Member.userId`, nullable, unique) is one-directional and optional, and
gets made automatically rather than through a separate step: when someone
registers for the member portal (`POST /auth/register`) and a `Member` row
in that tenant already has a matching email with no `userId` yet,
`AuthService.register()` links the two (`MembersService.linkPendingPortalUser`)
instead of leaving a disconnected duplicate. A `Member` with no `User` is
a completely normal, fully-functional state, not a half-finished one.

**Member status vs membership status — a real distinction, not just
naming.** `Member.status` (`ACTIVE` / `INACTIVE` / `CANCELLED`) describes
whether this person is a recognized member of the gym at all. It is
deliberately *not* the same enum as a future `MembershipStatus` (trial /
active / expiring / expired / frozen / cancelled), which will describe a
*paid plan's* state once the Memberships module exists. A member can — and
routinely does — exist with no active membership: a lead converted today
whose first payment hasn't been recorded yet, someone between plans, or a
lapsed member the gym hasn't formally cancelled. `Member` carries no
plan/payment/attendance data itself; each of those is a later module's own
table with its own `memberId` FK back here, exactly like `User`'s own
header comment describes for business-specific profile data.

**Lead lifecycle** (`LeadStatus`): `NEW → CONTACTED → FOLLOW_UP →
TRIAL_SCHEDULED → TRIAL_COMPLETED → CONVERTED`, with `LOST` as a
terminal-but-reversible side exit. Transitions are **not** enforced as a
strict state machine — a walk-in can go `NEW → CONVERTED` the same day, a
`FOLLOW_UP` can follow a postponed trial back from `TRIAL_SCHEDULED` — real
sales cycles don't fit a rigid funnel, and the brief explicitly asked not
to force one. The one transition that *is* locked down: `PATCH /leads/:id`
cannot set `status: CONVERTED` (the DTO's allowed values exclude it
entirely) and a lead that has already converted rejects further edits —
conversion only happens through `POST /leads/:id/convert`, which is also
what creates or links the `Member`, so a lead can never show `CONVERTED`
with nothing on the other end of it.

**Follow-ups** live as plain fields on `Lead` (`nextFollowUpAt`,
`assignedToId`) rather than a separate entity — a lead only ever has one
"next" follow-up at a time, so a dedicated table would just be `Lead`'s own
columns with extra indirection. *"Which leads need attention today?"* is
`GET /leads?followUpDueBy=<date>` — leads whose next follow-up is due or
overdue, automatically excluding anything already `CONVERTED`/`LOST`
unless an explicit `status` filter says otherwise.

**Trials** are a timestamp and a notes field on `Lead`
(`trialScheduledAt`, `trialNotes`) — deliberately not a foreign key into a
Class/Booking row, since neither exists yet. Building that FK now would
risk a second, conflicting source of truth once the Bookings module lands;
that module is free to link a real `Booking` back to the `Lead` (or the
`Member` it becomes) however it sees fit, without `Lead` needing to
change.

**Conversion** (`POST /leads/:id/convert`, `LeadsService.convert`) is one
transaction: create-or-link the `Member`, then mark the `Lead` `CONVERTED`
with a timestamp. "Create-or-link" is the mechanism that satisfies *avoid
creating unnecessary duplicate person records* — if a `Member` with the
same email already exists in the tenant (e.g. this person was already
added as a walk-in before this old lead got processed), that record is
linked (`Member.convertedFromLeadId`) instead of a second one being
created. The lead's source/interest/notes stay reachable through that
relation rather than being copied onto `Member` — one place they're
stored, not two. An optional `trainerId`/`joinedOn` on the convert request
lets staff assign a trainer and set a join date at the moment of
conversion.

**Authorization** reuses the `MEMBERS` `PermissionArea` unchanged for
*both* controllers — the approved frontend already groups "Member
profiles, contact info, and lead follow-up" under one area
(`src/lib/permissions.ts`), so `MembersController` and `LeadsController`
are both gated on it rather than inventing a second one. On top of that,
one role-scoping rule applies to both: a `TRAINER` — whose role
description is "no access to business-wide data" — only ever sees members
assigned to them (`Member.trainerId`) or leads assigned to them
(`Lead.assignedToId`), regardless of any filter they pass; reading a
record outside that scope by id is a `403`, distinct from the `404` a
genuine cross-tenant lookup gets. This is a role-based scoping rule, not a
permission level, so it applies independent of any permission override —
see `MembersService.applyTrainerScope`/`assertTrainerCanAccess` and
`LeadsService`'s equivalents. A portal `MEMBER` has `NONE` on the
`MEMBERS` area like every other non-staff area, so `GET /members` and
`GET /leads` are closed to them entirely — their own data comes from
`GET /members/me` instead, which needs no permission at all since it's
always the caller's own record.

`trainerId` (on `Member`) and `assignedToId` (on `Lead`) are validated
against `UsersService.findByIdInTenant` before being written — both must
resolve to a real user in the *same* tenant (a cross-tenant id 404s, same
as anywhere else), and `trainerId` specifically must belong to a
`TRAINER`-role user, `assignedToId` to any staff role (not a portal
`MEMBER`).

### Trainers, Classes, Scheduling, Bookings, Waitlist & Personal Training

The real day-to-day workflow: *Trainer → Availability → Class/Schedule →
Member Booking → Capacity → Waitlist*, and separately *Member → Trainer →
Available Slot → Personal Training Booking*. Four new modules
(`trainers/`, `classes/`, `class-bookings/`, `pt-sessions/`), six new
tables, no changes to Attendance/Payments/Notifications (still later
phases — see below).

**`Trainer` vs `User` — the same "two layers" pattern as `Member` vs
`User`.** `Trainer` (`trainers/`) is the coaching profile — bio,
specialties, certifications, years of experience, status,
`offersPersonalTraining` — for a `User` whose role is `TRAINER`. It is
**never auto-created**: unlike the Member-portal auto-link, an owner/manager
explicitly opts a staff member into coaching via `POST /trainers`, because
"this TRAINER-role user is actually bookable for classes/PT right now" is a
real business decision, not something that should follow implicitly from a
role assignment. `TrainerAvailability` is a set of recurring weekly windows
(`dayOfWeek` + `startTime`/`endTime`) that governs **Personal Training
bookability only** — a trainer's classes are scheduled directly on
`ClassSeries` and don't consult this table at all, matching the approved
frontend's own framing of the Availability page ("Set the hours members can
book personal training sessions with you").

**Recurring classes: a two-table split, generated lazily.** `ClassSeries`
(`classes/`) is the template an owner/manager authors once — name,
category (free text, not a closed enum — an open set, same reasoning as
`Trainer.specialties`), trainer, day of week, start time, duration,
capacity, location, and a `startDate`/optional `endDate` window.
`ClassOccurrence` rows are the actual dated, bookable instances members see
and book. They are **not** generated by a cron job or all at once up
front — `ClassesService.ensureOccurrencesGenerated` materializes them
lazily, on every browse/list request, for whatever date range was asked
for (capped to an 8-week rolling horizon). Generation is idempotent
(`createMany` + `skipDuplicates`, backed by a `(classSeriesId, date)`
unique constraint), so re-covering an already-generated date is a safe
no-op. A one-off (non-recurring) class is simply a `ClassSeries` whose
`endDate` equals its `startDate` — no separate model or recurrence-type
enum needed. Editing a series only changes occurrences generated *after*
the edit; already-materialized future sessions keep their original
trainer/time/location/capacity unless edited individually via
`PATCH /classes/:occurrenceId` (a substitute trainer covering one session,
a one-off room change, a delayed start) — the simple, common-calendar-app
choice over a full "this event / this and following / all events" editing
model.

**Trainer conflict prevention** happens at two levels: pattern-level, at
`ClassSeries` create/update time (`ClassesService.assertNoSeriesConflict`)
— rejects a new/edited series whose day-of-week + time range overlaps
another *active* series for the same trainer, only when their date windows
also overlap; and specific-date, whenever an individual `ClassOccurrence`
or `PersonalTrainingSession` is created or a single occurrence's
trainer/time is overridden — checked directly against the other table via
`PrismaService` (not a module import) so `classes/` and `pt-sessions/`
don't need to depend on each other for this one check. A trainer can never
end up double-booked across classes and PT sessions on the same date/time
through the API, though see the capacity-increase limitation below.

**Bookings, capacity, and the waitlist** (`class-bookings/`).
`ClassBooking` has one row per `(classOccurrence, member)` — cancelling
and later rebooking the *same* class **reuses that row** (its status
transitions `CANCELLED → CONFIRMED`/`WAITLISTED`) instead of inserting a
new one, which is what lets the unique constraint prevent duplicate active
bookings without needing a partial-unique index Prisma's schema DSL can't
express. Booking rules enforced in `ClassBookingsService.book`: the
occurrence must be `SCHEDULED` and in the future, the member must be
`ACTIVE` (the honest membership-eligibility proxy available today — see
the Members & Leads/CRM section above on why `Member.status` isn't a real
membership/plan state), and no duplicate *active* booking may exist. If a
seat is free the booking is `CONFIRMED`; otherwise it's `WAITLISTED`.
Cancelling a `CONFIRMED` booking (`ClassBookingsService.cancel`)
auto-promotes the earliest-booked `WAITLISTED` row (FIFO, by `bookedAt`)
to `CONFIRMED` in the same transaction. Staff also get a manual
`POST /class-bookings/:id/promote` to skip FIFO order deliberately —
mirrors the approved frontend's "Promote to Booked" waitlist action. A
member can self-cancel a `CONFIRMED` booking only outside a 4-hour
cancellation window (mirrors the frontend's own
`CANCELLATION_WINDOW_HOURS`); a `WAITLISTED` booking can be dropped any
time; staff cancellations bypass the window entirely. Cancelling a whole
`ClassSeries` or a single `ClassOccurrence` cascades to cancel every
affected future booking in the same transaction.

**Concurrency**: capacity/waitlist accounting is the one place in this
codebase where two requests racing matters — two members both trying to
book the last seat must never both end up `CONFIRMED`. `book()`,
`cancel()`, and PT's `book()`/`reschedule()` all run inside
`runSerializableTransaction` (`common/utils/serializable-transaction.util.ts`):
Postgres `SERIALIZABLE` isolation via Prisma's native
`$transaction(fn, { isolationLevel: 'Serializable' })`, with a bounded
retry (3 attempts) on Postgres's serialization-failure error (Prisma code
`P2034`) — the expected, correct outcome of two serializable transactions
conflicting, not a real error. Chosen over raw `SELECT ... FOR UPDATE` row
locking as the simpler, still-correct option at this scale.

**Personal Training** (`pt-sessions/`). `GET /pt-sessions/available-slots`
computes a trainer's actually-free windows for one date: their
`TrainerAvailability` windows for that weekday, minus their `SCHEDULED`
class occurrences that date, minus their other `CONFIRMED` PT sessions
that date (`PtSessionsService.getAvailableSlots`/`subtractBusyIntervals`).
Booking (`PtSessionsService.book`) re-validates all of that plus the
*member's* own schedule (their confirmed class bookings and PT sessions
that date must not overlap either), member `ACTIVE` status, and that the
requested time is fully inside an availability window — all inside the
same serializable-transaction pattern as class bookings. Rescheduling
(`PATCH /pt-sessions/me/:id` or the staff equivalent) re-runs every one of
those checks against the new date/time rather than treating cancel+rebook
as two separate, less-safe steps. No payment/pricing fields exist on
`PersonalTrainingSession` — PT payment processing is explicitly out of
scope for this phase.

**Authorization** reuses the existing `BOOKINGS` `PermissionArea`
unchanged for every mutating staff endpoint across all four modules — the
approved frontend already scopes "Class schedule, bookings, and
waitlists" under this one area, and `TRAINER` already has `bookings:manage`
by default from the authz phase, so trainers can manage their own
classes/bookings/PT with no new permission plumbing. Reads that members
need — browsing trainers, browsing/booking classes, viewing available PT
slots — deliberately carry **no permission gate at all**: a portal
`MEMBER` has `NONE` on every `PermissionArea` (see Members & Leads/CRM
above) and was never meant to reach `@RequirePermission`-gated routes, so
these stay open-to-any-authenticated-tenant-user, the same choice already
made for `GET /members/me`. Every "my own X" self-service route
(`/trainers/me/*`, `/class-bookings/me/*`, `/pt-sessions/me/*`) follows
that identical no-permission, always-your-own-record pattern. Staff list
endpoints apply the same `TRAINER`-scoping precedent Members/Leads
established: a `TRAINER` listing series, bookings, or PT sessions only
ever sees their own, regardless of filters passed.

**Tenant isolation** follows pattern 2 from the section below throughout:
every by-id lookup (`findByIdInTenant`-style) filters on `tenantId` and
404s — never 403s — for a real row belonging to a different gym.
`ClassOccurrence`/`ClassBooking`/`PersonalTrainingSession` all carry their
own `tenantId` column (denormalized from their parent `ClassSeries`/
`Member` relation where applicable) purely so every tenant-scoped query
here can filter directly without an extra join, matching this schema's
existing convention.

### Tenant isolation

The product needs one gym's data to never be reachable from another gym's
request context — this phase is where that stops being a schema
convention and becomes an enforced one. Every tenant-owned table carries
`tenantId` + an index, and an authenticated request's JWT carries
`tenantId` via `@CurrentUser()`. Two access patterns cover every route in
this codebase so far, and are meant to be the only two future modules need:

1. **"The current gym/record"** — the resource is *always* the caller's
   own, resolved from the JWT, never a client-supplied id. `TenantsService`
   is the clearest example: there is no `GET /tenants/:id` to even attempt
   cross-tenant access against. Prefer this whenever a resource is
   naturally singular-per-tenant (a gym's own profile/settings, and later
   things like a gym's own billing/subscription record).
2. **"A record scoped to my tenant, looked up by id"** — for anything
   staff manage on behalf of *other* records: users, members, leads, and
   later classes, bookings, ... `UsersService.findByIdInTenant(tenantId, id)`
   is the established convention, now followed by three services
   (`UsersService`, `MembersService`, `LeadsService`): every by-id lookup
   includes `tenantId` in its `where` clause and returns `404` — not
   `403` — for a real row that belongs to a different tenant, so the
   response can't even confirm the id exists elsewhere. Every future
   by-id lookup should follow this exact name and behavior.

Members and Leads add one more wrinkle beyond tenant isolation: a
**within-tenant** scoping rule for the `TRAINER` role (see Members &
Leads/CRM above) — a trainer's own gym's data, further narrowed to just
what's assigned to them. It uses the same `403`-for-out-of-scope,
`404`-for-out-of-tenant distinction, layered on top of pattern 2 rather
than replacing it.

What's still missing is a *shared, generic* tenant-isolation enforcement
mechanism — there's no single guard or query layer that can know "does
resource X belong to tenant Y" without knowing what X is, so each new
tenant-scoped service has to follow pattern 1 or 2 above deliberately
rather than getting it for free. Worth revisiting with a Prisma Client
extension (a `$extends` that auto-injects the tenant filter into
pattern-2-style queries) now that four real services
(`UsersService`, `TenantsService`, `MembersService`, `LeadsService`) exist
to prove the pattern against.

### What's here / what's not

**Here:** app bootstrap, configuration, database connection + migrations,
the global error/response envelope, validation, security
headers/CORS/rate-limiting, Swagger, a real health check, the full
identity/access-control layer, the full gym/business layer (owner
onboarding, business profile + settings, status lifecycle, enforced
multi-tenant isolation), **Members** (roster, profile/notes, portal
self-access, trainer assignment/scoping), **Leads/CRM** (lifecycle,
follow-ups, trial scheduling, conversion into a Member with no duplicate
records), and now **Trainers** (coaching profiles + weekly PT
availability), **Classes/Scheduling** (recurring class templates + lazily
generated dated occurrences, trainer-conflict prevention), **Class
Bookings/Waitlist** (capacity-aware booking with FIFO waitlist promotion,
concurrency-safe under simultaneous requests), and **Personal Training**
(available-slot computation, booking, rescheduling, cancellation) — see
the section above for the full model.

**Not here, by design**: Memberships (plans, renewals, freezes, payments —
`Member` deliberately carries none of this; class/PT booking eligibility
uses `Member.status === ACTIVE` as an honest proxy until a real
Memberships module exists), Attendance (booking statuses `ATTENDED`/
`NO_SHOW` exist on `ClassBooking`/`PersonalTrainingSession` as schema
groundwork, but nothing sets them yet — see the Trainers/Classes/Bookings
section above), Payments (no PT session pricing/payment fields),
Invoices, Notifications (booking-confirmed/cancelled, class-changed/
cancelled, and waitlist-promotion are all real state transitions in the
new services above, ready for a future notifications module to hook into,
but nothing sends anything today), Reports, Inventory/POS, Expenses,
Audit/Activity, and any platform-level admin surface (the
`TenantStatus.SUSPENDED` state and its enforcement exist, but nothing can
set it yet). Every one of these is a real business domain the frontend
already has mock data and full UI for (see `../src/lib/data/*.ts` and
`../README.md`'s project structure section), and each becomes its own
Nest module in a later phase, built on this foundation — each carrying its
own `tenantId` (following one of the patterns in
[Tenant isolation](#tenant-isolation)) and FKs back to the
identity/member/booking records established here, rather than duplicating
any of them.

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
- Tenant isolation is enforced in application code (`UsersService`,
  `TenantsService`, `MembersService`, `LeadsService` each follow one of the
  documented patterns) but is still a per-service convention, not a shared
  guard/query extension that would make forgetting it impossible — see
  [Tenant isolation](#tenant-isolation).
- One email = one gym: `User.email` is globally unique, not per-tenant, so
  the same person can't hold a login in two different gyms today (e.g. a
  trainer who works at two locations). Revisiting this would mean a
  real user↔tenant membership model instead of the current one-FK-per-user
  one — a bigger shift than this phase's scope, and not something the
  product brief for this phase asked for.
- The public `/register` page has no gym-selector UI yet, so member
  self-registration only works unambiguously while exactly one gym exists
  on a given deployment (`tenantSlug` is accepted but nothing in the
  frontend collects one yet) — real per-gym signup links are frontend work
  for a later phase, once `POST /auth/register-business` has a UI in front
  of it too.
- No platform-level admin surface exists to set `TenantStatus.SUSPENDED` —
  the enum value and its enforcement (`TenantStatusGuard`,
  `AuthService.login`/`refresh`) are in place, but nothing can reach it
  yet outside a direct database write (see the suspension test in
  `test/tenants.e2e-spec.ts`).
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
- Member/Lead search (`search=`) uses a plain `contains`/ILIKE match, same
  as `UsersService.list()` — fine at today's scale, but not a real
  full-text index; worth a `pg_trgm` index (or equivalent) once a gym's
  member count makes it worth measuring.
- No dedicated audit/activity log yet — `MembersService`/`LeadsService`
  keep each meaningful action (create, status change, conversion, note) in
  its own single-purpose method specifically so a future notifications or
  audit module has a clean place to hook in, but nothing emits an event or
  writes a log entry today.
- A `Member`'s `trainerId` is a single assignment, not a history — changing
  it overwrites the previous value with no record of who trained this
  member before. Worth revisiting if "trainer history" becomes a real
  product need.
- Increasing a `ClassOccurrence`'s `capacity` (`PATCH /classes/:id`) does
  **not** auto-promote anyone off the waitlist — only a cancellation does.
  Staff need to follow a capacity increase with a manual
  `POST /class-bookings/:id/promote` for waiting members. Worth revisiting
  if this turns out to be a common workflow rather than an edge case.
- Trainer-conflict prevention at `ClassSeries` create/update time is
  pattern-level (day-of-week + time, checked against other series' date
  windows) — a `PersonalTrainingSession` booked for a specific date
  *before* a conflicting recurring class series is created on that same
  weekday/time is not retroactively flagged; the conflict only surfaces if
  that specific occurrence is later individually edited. A narrow gap,
  documented rather than solved with a heavier check across every future
  occurrence of every series.
- `ClassBooking`/`PersonalTrainingSession` carry `ATTENDED`/`NO_SHOW` (and
  `COMPLETED` for PT) status values with nothing in this phase that ever
  sets them — deliberate schema groundwork for the next phase's Attendance
  module, not a partially-built feature.
- No configurable booking window (how far ahead a class must be booked) or
  per-tenant cancellation-window setting — the 4-hour cancellation window
  is a hard-coded constant (`CANCELLATION_WINDOW_HOURS`, mirroring the
  approved frontend's own constant), same reasoning as every other
  not-yet-configurable rule in this backend: genuinely supported by the
  product today, not invented ahead of a real need.
