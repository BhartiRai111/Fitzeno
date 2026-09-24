# Fitzeno

A premium, production-style gym management platform — public marketing site, member portal, and owner dashboard, built with Next.js, TypeScript, Tailwind CSS, and shadcn/ui-style components on Radix primitives, backed by a NestJS + PostgreSQL API.

This repository holds both halves of the product:

- **`frontend/`** (this directory) — the Next.js frontend, detailed below.
- **`backend/`** (sibling directory) — the NestJS API. See [`../backend/README.md`](../backend/README.md) for its own setup, environment variables, and architecture notes. The two are independent projects (separate `package.json`, separate `npm install`) that happen to live in one repo.

## Frontend stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 (CSS-first theme, light/dark mode)
- **UI primitives:** Radix UI + class-variance-authority (shadcn/ui pattern)
- **Icons:** Lucide
- **Charts:** Recharts

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- `/` — public marketing site (plans, classes, trainers, contact, etc.)
- `/login`, `/register`, `/forgot-password`, `/reset-password` — authentication
- `/owner` — owner/admin dashboard
- `/portal` — member portal

The frontend is wired to the real backend (`../backend/`) via `src/lib/api/` — copy `.env.example` to `.env.local` and point `NEXT_PUBLIC_API_URL` at a running backend (see `../backend/README.md` to start it) before running `npm run dev`. Auth, Members/Leads CRM, Trainers, Membership Plans/Memberships, Transactions, and Notifications/Announcements are backend-driven; Attendance/check-in, POS/inventory, expenses, a dedicated Reports module, search, and audit logging have no backend yet and still run on the realistic mock data under `src/lib/data/`, as does most of the Classes/Bookings/PT and Member Portal booking/membership UI.

## Project structure

```
frontend/            this directory
  src/
    app/
      (public)/       marketing site routes
      (auth)/         login, register, password flows
      owner/          owner dashboard (sidebar + topbar shell)
      portal/         member portal (sidebar + topbar + mobile bottom nav)
      trainer/        trainer portal
    components/
      ui/             base primitives (button, input, dialog, tabs, ...)
      shared/         cross-app composites (empty/error states, stat cards, ...)
      dashboard/      sidebar, topbar, nav config, charts
      public/         marketing site sections and cards
      portal/         member portal components
      brand/          logo and brand mark
    lib/
      api/            typed API client, per-module fetch functions
      auth/            AuthProvider/useAuth, RequireAuth route guard
      data/            typed mock data (members, leads, payments, classes, ...)
    hooks/             React Query hooks wrapping lib/api

backend/              sibling directory — NestJS API, see ../backend/README.md
```

## Scripts

These run against the frontend (`package.json` in this directory) — the backend has its own scripts, documented in `../backend/README.md`.

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run lint` — run ESLint
