# PGFI Shipping — Frontend (Customer Portal)

Next.js 14 (App Router) + TypeScript + Tailwind + next-intl + Zustand + Axios + React Hook Form + Zod.

## Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, shadcn-style components (button, input, label, card)
- **i18n**: next-intl (EN, FR, HT, ES) with locale-prefixed routes
- **State**: Zustand (auth store with localStorage persistence)
- **HTTP**: Axios with auto refresh-token retry and bearer token injection
- **Forms**: react-hook-form + zod
- **Icons**: lucide-react

## Routes

- `/[locale]` — Landing page
- `/[locale]/login` — Login
- `/[locale]/register` — Sign up
- `/[locale]/forgot-password` — Forgot password
- `/[locale]/reset-password?token=…` — Reset password
- `/[locale]/verify-email?token=…` — Email verification
- `/[locale]/dashboard` — Authenticated dashboard (placeholder)
- `/[locale]/track`, `/[locale]/calculator`, `/[locale]/support` — placeholders for Phase 12

## Getting started

```bash
cp .env.local.example .env.local
npm install
npm run dev
```

The app expects the backend API at `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:4000/api`).

## Scripts

- `npm run dev` — start dev server on http://localhost:3030
- `npm run build` — build for production
- `npm run start` — start production server
- `npm run lint` — run Next/ESLint
- `npm run typecheck` — TypeScript type-check
