# Fitzeno

A premium, production-style gym management platform — public marketing site, member portal, and owner dashboard, built with Next.js, TypeScript, Tailwind CSS, and shadcn/ui-style components on Radix primitives, backed by a NestJS + PostgreSQL API.

This repository holds both halves of the product:

- **`/`** (this directory) — the Next.js frontend, detailed below.
- **`backend/`** — the NestJS API. See [`backend/README.md`](backend/README.md) for its own setup, environment variables, and architecture notes. The two are independent projects (separate `package.json`, separate `npm install`) that happen to live in one repo.

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

The backend (`backend/`) is not wired into these pages yet — the frontend still runs entirely on the realistic mock data under `src/lib/data/`. The login screen includes shortcuts to preview both dashboards directly. See `backend/README.md` for the current state of the API: authentication, user management, role/permission authorization, multi-tenant gym/business management, a Members/Leads-CRM domain (member roster, lead lifecycle, trial scheduling, and lead-to-member conversion), and now Trainers, Classes/Scheduling, Class Bookings/Waitlist, and Personal Training (recurring class templates with lazily generated occurrences, capacity-aware booking with concurrency-safe FIFO waitlisting, trainer-availability-driven PT booking) are implemented and tested, but Memberships/Payments/Attendance don't exist yet, so there's nothing to point most of this frontend at until later phases.

## Project structure

```
src/
  app/
    (public)/     marketing site routes
    (auth)/       login, register, password flows
    owner/        owner dashboard (sidebar + topbar shell)
    portal/       member portal (sidebar + topbar + mobile bottom nav)
  components/
    ui/           base primitives (button, input, dialog, tabs, ...)
    shared/       cross-app composites (empty/error states, stat cards, ...)
    dashboard/    sidebar, topbar, nav config, charts
    public/       marketing site sections and cards
    portal/       member portal components
    brand/        logo and brand mark
  lib/data/        typed mock data (members, leads, payments, classes, ...)

backend/           NestJS API — see backend/README.md
```

## Scripts

These run against the frontend (`package.json` in this directory) — the backend has its own scripts, documented in `backend/README.md`.

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run lint` — run ESLint
