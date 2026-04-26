# PGFI Shipping — pgfishipping.com

Haiti ↔ USA cargo & freight platform.

> Full functional spec lives in [`pgfishipping-spec.md`](./pgfishipping-spec.md).
> Current implementation progress is tracked in [`PROGRESS.md`](./PROGRESS.md).

---

## Project Layout

```
pgfishipping.com/
├── pgfishipping-spec.md     # Source-of-truth product specification
├── PROGRESS.md              # What is built / what is next
├── docker-compose.yml       # Local Postgres + Redis
└── pgfishipping/            # Actual application code (monorepo)
    ├── backend/             # Express + TypeScript + Prisma API (port 4000)
    ├── frontend/            # Next.js 14 customer portal (port 3030)
    ├── admin/               # Next.js 14 admin panel (port 3001)
    └── mobile/              # Expo React Native app (later phase)
```

---

## Prerequisites

| Tool          | Version | Purpose                              |
|---------------|---------|--------------------------------------|
| Node.js       | 20+     | Runtime (works fine on 22, 24)       |
| npm           | 10+     | Package manager                      |
| PostgreSQL    | 15+     | Primary database (one of three options below) |
| Redis         | 7+      | Cache, rate limit, BullMQ            |

### Postgres + Redis: pick ONE

**Option A — Docker (recommended, zero config):**
```bash
# install Docker Desktop from https://www.docker.com/products/docker-desktop
docker compose up -d
```

**Option B — Homebrew (native macOS):**
```bash
brew install postgresql@15 redis
brew services start postgresql@15
brew services start redis
createdb pgfishipping
```

**Option C — Free cloud (no local install):**
- Postgres: [Neon](https://neon.tech) or [Supabase](https://supabase.com) (both free)
- Redis: [Upstash](https://upstash.com) (free)
- Just paste connection URLs into `pgfishipping/backend/.env`.

---

## Quick Start

```bash
cd pgfishipping/backend
cp .env.example .env       # edit values
npm install
npx prisma generate
npx prisma migrate dev     # creates DB tables
npm run seed               # super admin + warehouses + pricing rules
npm run dev                # http://localhost:4000
```

Health check: `curl http://localhost:4000/health`

### Customer portal (frontend)

```bash
cd pgfishipping/frontend
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:4000/api
npm install
npm run dev                        # http://localhost:3030
```

### Admin panel

```bash
cd pgfishipping/admin
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:4000/api
npm install
npm run dev                        # http://localhost:3001 (login as super admin)
```

Default seeded super admin: `admin@pgfishipping.com` / `ChangeMe!Now123`.

---

## Build Strategy

This is a large multi-app project. We build **vertical slices** — backend + tests + working endpoint — and only move to the next phase once the current one is verified. Phase order and progress live in [`PROGRESS.md`](./PROGRESS.md).

---

## License

Proprietary — © PGFI Shipping
