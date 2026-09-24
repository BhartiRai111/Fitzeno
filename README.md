# Fitzeno

A premium, production-style gym management platform — public marketing site, member portal, and owner dashboard, backed by a NestJS + PostgreSQL API.

This repository holds two independent projects, each with its own `package.json` and its own `npm install`:

- **[`frontend/`](frontend/README.md)** — the Next.js app (marketing site, member portal, owner dashboard, trainer portal).
- **[`backend/`](backend/README.md)** — the NestJS API.

See each project's own README for setup, environment variables, and architecture notes.

## Quick start

```bash
# 1. Start Postgres, then set up and run the backend
cd backend
npm install
npx prisma migrate deploy
npm run db:seed
npm run start:dev        # http://localhost:3001/api/v1

# 2. In a separate terminal, run the frontend
cd frontend
npm install
cp .env.example .env.local   # if you don't already have one
npm run dev               # http://localhost:3000
```
