# PGFI Shipping — Implementation Progress

> Source of truth for what is **built and tested** vs. what is **next**.
> Spec: [`pgfishipping-spec.md`](./pgfishipping-spec.md)

Last updated: Phase 12 complete (frontend public pages).

---

## Legend
- ✅ Done & tested
- 🟡 Partial / scaffolded
- ⬜ Not started

---

## Roadmap

| # | Phase | Status |
|---|-------|--------|
| 0 | Monorepo scaffold + Docker Compose + tooling                                                                     | ✅ |
| 1 | Backend skeleton (Express, TS, config, logger, error handler, /health)                                           | ✅ |
| 2 | Prisma schema (all 16 models) + migrations + seed                                                                | ✅ |
| 3 | Auth (register, login, JWT, password reset, email verify, change pwd)                                            | ✅ |
| 4 | User & profile (me, profile update, photo, ID, address, data export)                                             | ✅ |
| 5 | Shipments (pre-alert, list, detail, FOB, invoice, 3rd-party, label, public track)                                | ✅ |
| 6 | Calculator + pricing rules + exchange rate                                                                       | ✅ |
| 7 | Wallet (balance, deposit + webhook, gift card, pay shipment)                                                     | ✅ |
| 8 | Email system (welcome, reset, verify, package status, wallet, 3rd-party)                                         | ✅ |
| 9 | Background jobs (BullMQ): tracking poll, weekly summary, exchange-rate refresh                                   | ✅ |
| 10 | Admin API (customers, shipments, pricing, warehouses, gift-cards, support, config, staff, broadcast, analytics) | ✅ |
| 11 | Frontend foundation (Next.js 14 App Router + Tailwind + shadcn-style UI + next-intl EN/FR/HT/ES + Zustand auth + Axios + auth flows wired to backend) | ✅ |
| 12 | Frontend public pages (home, public tracking, calculator wizard, addresses, support, terms/privacy)              | ✅ |
| 13 | Frontend dashboard pages (dashboard, shipments, pre-alert, wallet, address, referral, gift card, settings)       | ⬜ |
| 14 | Admin panel frontend                                                                                             | ⬜ |
| 15 | Mobile app (Expo)                                                                                                | ⬜ |
| 16 | Deployment (Railway + Vercel + Cloudflare R2)                                                                    | ⬜ |

---

## Notes / Decisions Log
- **Local DB choice:** Postgres + Redis via `docker-compose.yml` (preferred) or Homebrew or free cloud. Documented in `README.md`.
- **No env values committed.** `.env.example` files contain placeholders only.
- **Phase 11 (frontend foundation):** Next.js 14 App Router with locale-prefixed routes via `next-intl`. Static rendering enabled with `setRequestLocale`. Production build passes for all 4 locales (`en`, `fr`, `ht`, `es`) on every page. Auth flow: login + register → Zustand store (persisted) → bearer token in Axios → silent refresh through `httpOnly` cookie → logout endpoint. Forgot/reset/verify-email pages also wired. Smoke tests confirm `/`, `/en`, `/ht`, `/en/login`, `/fr/dashboard` all return HTTP 200, and the H1 changes per locale.
- **Phase 12 (frontend public pages):** Home (hero + 3 features + 4-step "how it works" + final CTA), public **tracking** page (search + 4-step horizontal stepper + summary + event timeline, with `?code=…` deep-linking), 4-step **calculator wizard** wired to `POST /calculator/estimate` (USD + HTG totals, line-item fee breakdown), **US Addresses** explainer with format example, **About** + **Terms** + **Privacy** static pages, and a **Support** contact page (form drafts a `mailto:` with phone/email fallbacks). All 4 locales fully translated; production build green; 11 routes smoke-tested HTTP 200 across `en`/`fr`/`ht`/`es`. Live calculator returns real fees from seeded pricing rules; tracking API resolves seeded shipment `PG-710198` correctly with step=2.
