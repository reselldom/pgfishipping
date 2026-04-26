# PGFI Shipping — Implementation Progress

> Source of truth for what is **built and tested** vs. what is **next**.
> Spec: [`pgfishipping-spec.md`](./pgfishipping-spec.md)

Last updated: starting build.

---

## Legend
- ✅ Done & tested
- 🟡 Partial / scaffolded
- ⬜ Not started

---

## Roadmap

| # | Phase | Status |
|---|-------|--------|
| 0 | Monorepo scaffold + Docker Compose + tooling                              | ✅ |
| 1 | Backend skeleton (Express, TS, config, logger, error handler, /health)   | ✅ |
| 2 | Prisma schema (all 16 models) + migrations + seed                         | ✅ |
| 3 | Auth (register, login, JWT, password reset, email verify, change pwd)     | ✅ |
| 4 | User & profile (me, profile update, photo, ID, address, data export)      | ✅ |
| 5 | Shipments (pre-alert, list, detail, FOB, invoice, 3rd-party, label, public track) | ✅ |
| 6 | Calculator + pricing rules + exchange rate                                 | ✅ |
| 7 | Wallet (balance, deposit + webhook, gift card, pay shipment)               | ✅ |
| 8 | Email system (welcome, reset, verify, package status, wallet, 3rd-party)   | ✅ |
| 9 | Background jobs (BullMQ): tracking poll, weekly summary, exchange-rate refresh | ✅ |
| 7 | Wallet (balance, transactions, MonCash/NatCash, gift cards, pay)          | ⬜ |
| 8 | Email system (Resend + React Email templates + triggers)                  | ⬜ |
| 9 | Background jobs (BullMQ tracking poll, weekly summary)                    | ⬜ |
| 10 | Admin API (customers, shipments, finance, staff, locations, analytics)   | ⬜ |
| 11 | Frontend foundation (Next.js + Tailwind + shadcn + i18n + auth)          | ⬜ |
| 12 | Frontend public pages                                                     | ⬜ |
| 13 | Frontend dashboard pages                                                  | ⬜ |
| 14 | Admin panel frontend                                                      | ⬜ |
| 15 | Mobile app (Expo)                                                         | ⬜ |
| 16 | Deployment (Railway + Vercel + Cloudflare R2)                             | ⬜ |

---

## Notes / Decisions Log
- **Local DB choice:** Postgres + Redis via `docker-compose.yml` (preferred) or Homebrew or free cloud. Documented in `README.md`.
- **No env values committed.** `.env.example` files contain placeholders only.
