# Fitzeno

A premium, production-style gym management platform — public marketing site, member portal, and owner dashboard, built with Next.js, TypeScript, Tailwind CSS, and shadcn/ui-style components on Radix primitives.

## Stack

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

The backend is not connected yet — all data is realistic mock data under `src/lib/data/`. The login screen includes shortcuts to preview both dashboards directly.

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
```

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run lint` — run ESLint
