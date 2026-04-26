# PGFI Shipping — Implementation Progress

> Source of truth for what is **built and tested** vs. what is **next**.
> Spec: [`pgfishipping-spec.md`](./pgfishipping-spec.md)

Last updated: Phase 14 complete (admin panel frontend).

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
| 13 | Frontend dashboard pages (dashboard, shipments list + detail, pre-alert, wallet, address, settings)             | ✅ |
| 14 | Admin panel frontend                                                                                             | ✅ |
| 15 | Mobile app (Expo)                                                                                                | ⬜ |
| 16 | Deployment (Railway + Vercel + Cloudflare R2)                                                                    | ⬜ |

---

## Notes / Decisions Log
- **Local DB choice:** Postgres + Redis via `docker-compose.yml` (preferred) or Homebrew or free cloud. Documented in `README.md`.
- **No env values committed.** `.env.example` files contain placeholders only.
- **Phase 11 (frontend foundation):** Next.js 14 App Router with locale-prefixed routes via `next-intl`. Static rendering enabled with `setRequestLocale`. Production build passes for all 4 locales (`en`, `fr`, `ht`, `es`) on every page. Auth flow: login + register → Zustand store (persisted) → bearer token in Axios → silent refresh through `httpOnly` cookie → logout endpoint. Forgot/reset/verify-email pages also wired. Smoke tests confirm `/`, `/en`, `/ht`, `/en/login`, `/fr/dashboard` all return HTTP 200, and the H1 changes per locale.
- **Phase 12 (frontend public pages):** Home (hero + 3 features + 4-step "how it works" + final CTA), public **tracking** page (search + 4-step horizontal stepper + summary + event timeline, with `?code=…` deep-linking), 4-step **calculator wizard** wired to `POST /calculator/estimate` (USD + HTG totals, line-item fee breakdown), **US Addresses** explainer with format example, **About** + **Terms** + **Privacy** static pages, and a **Support** contact page (form drafts a `mailto:` with phone/email fallbacks). All 4 locales fully translated; production build green; 11 routes smoke-tested HTTP 200 across `en`/`fr`/`ht`/`es`. Live calculator returns real fees from seeded pricing rules; tracking API resolves seeded shipment `PG-710198` correctly with step=2.
- **Phase 13 (frontend dashboard pages):** Authenticated area under `/[locale]/dashboard` with a left sidebar (overview · shipments · new pre-alert · wallet · my US address · settings). **Overview** shows wallet balance (USD + HTG with live rate), customer code, counts for pre-alerts/active/delivered, recent active shipments, and the user's US air address card. **Shipments list** has 3 tabs (Pre-alerts / Active / Delivered), search, and pagination — all reflected in URL params. **Shipment detail** renders summary, declared value/total cost, paid/unpaid badge, label PDF download, invoice upload, third-party pickup form, and a tracking events timeline. **Pre-alert form** posts to `POST /shipments/pre-alert` and redirects to the new shipment. **Wallet** page shows balance + transactions, in-page deposit form (MonCash/NatCash/PayMon/Bank), and a gift-card redeem form; deposit response surfaces the sandbox redirect URL. **My US address** shows air + sea addresses with copy-to-clipboard. **Settings** has profile editor (name + phones + preferred language), password change, and one-click data export. Uses a small in-house shadcn-style component set (Button, Input, Label, Card, Select, Textarea, Badge, Toaster) plus a status-color `<StatusBadge>`. Auth-gating via `RequireAuth` in the dashboard layout. Login API helper updated to send `identifier` (matches backend zod schema). `npm run build` green for all 4 locales × 6 dashboard pages; `npm run typecheck` clean; live API smoke tests confirm pre-alert creation, paginated list, deposit init, and balance reads end-to-end.
- **Phase 14 (admin panel frontend):** New separate Next.js 14 app under `pgfishipping/admin/` (English-only, dev port `3001`, `npm run dev|build|typecheck`). Reuses backend `/api/auth/login` (rejects non-admin roles client-side via `isAdmin()`) and the full `/api/admin/*` surface from Phase 10. Sidebar nav with 10 sections: **Dashboard** (KPI cards for customers / shipments / 30-day revenue / wallet float, mini stat row, daily-revenue bar chart, gift-card outstanding tile from `/admin/analytics/dashboard` + `/admin/analytics/revenue/last-30-days`); **Customers** (paginated list with search + status filter; detail page with profile / wallet panel / status update / wallet adjustment with reason / recent shipments / recent transactions); **Shipments** (paginated list with search + status + service + customer-code filters + bulk-update-status across multi-select; detail page with edit form for weight/vendor/contents/external tracking/FOB/total cost, add-tracking-event form, paid/delivered timestamps, full event timeline); **Pricing** (CRUD on pricing rules); **Warehouses** (CRUD on US/HT warehouses); **Gift cards** (issue + paginated list + void); **Tickets** (paginated list + detail with reply textarea + close action); **Staff** (list + create / update / deactivate); **Broadcast** (compose subject + HTML/text + segment selector → preview audience → send with sent/failed counters); **Config** (list/set/delete system config keys). Production build is green for all 14 routes (`npm run build` clean), `npm run typecheck` clean, dev server returns HTTP 200 on every route, and live admin-API smoke tests pass: super-admin login, dashboard stats, customer detail with `{ user, stats, recentShipments, recentTransactions }`, paginated shipments with full `{user}` join, set system-config key, issue gift card, broadcast preview, and warehouses/pricing list.
