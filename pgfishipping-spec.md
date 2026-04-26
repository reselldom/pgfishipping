# PGFI Shipping — Complete Technical Specification
**Domain:** pgfishipping.com  
**Type:** Haiti ↔ USA Cargo & Freight Platform  
**Version:** 1.0.0  
**Last Updated:** April 2026

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Tech Stack & Justification](#2-tech-stack--justification)
3. [Hosting & Infrastructure](#3-hosting--infrastructure)
4. [Email Service (Primary Notification Channel)](#4-email-service)
5. [Third-Party APIs](#5-third-party-apis)
6. [Environment Variables](#6-environment-variables)
7. [Project Folder Structure](#7-project-folder-structure)
8. [Database Schema (PostgreSQL)](#8-database-schema)
9. [Backend API Endpoints](#9-backend-api-endpoints)
10. [Frontend Pages & Routes](#10-frontend-pages--routes)
11. [Admin Panel Pages & Routes](#11-admin-panel-pages--routes)
12. [Email Notification Templates](#12-email-notification-templates)
13. [Authentication & Security](#13-authentication--security)
14. [File Upload System](#14-file-upload-system)
15. [Wallet & Payment System](#15-wallet--payment-system)
16. [Tracking System Logic](#16-tracking-system-logic)
17. [Price Calculator Logic](#17-price-calculator-logic)
18. [Customer Code Generation](#18-customer-code-generation)
19. [Roles & Permissions Matrix](#19-roles--permissions-matrix)
20. [Deployment Checklist](#20-deployment-checklist)

---

## 1. Project Overview

**Company Name:** PGFI Shipping  
**Website:** pgfishipping.com  
**Service:** Air and sea cargo freight between USA and Haiti  
**Target Users:** Haitian diaspora in the USA + residents in Haiti  
**Languages:** English, French, Haitian Creole, Spanish

### Core Modules
| Module | Description |
|--------|-------------|
| Customer Portal | Web app for customers to manage shipments, track packages, manage wallet |
| Mobile App | React Native iOS + Android app (same features as web) |
| Super Admin Panel | Full control dashboard for staff and administrators |
| Public Website | Landing page, public tracking, calculator, addresses |
| Email Notification System | Automated emails on every shipment status change |

### Customer Account Code Format
- Format: `HT-XXXXXX` (HT = Haiti, 6-digit zero-padded number)
- Example: `HT-000001`, `HT-001234`
- Each customer gets TWO US warehouse addresses:
  - Air: `FirstName LastName/HT-XXXXXX/A` at PGFI Miami warehouse
  - Sea: `FirstName LastName/HT-XXXXXX/B` at PGFI Miami warehouse

### Shipment Tracking Code Format
- Format: `PG-XXXXXXXXXX` (PG = PGFI, 10 alphanumeric chars)
- Example: `PG-A1B2C3D4E5`
- Publicly shareable tracking URL: `https://pgfishipping.com/track/PG-A1B2C3D4E5`

---

## 2. Tech Stack & Justification

### Backend
| Technology | Choice | Why |
|------------|--------|-----|
| Runtime | Node.js 20 LTS | Fast, JS everywhere, huge ecosystem |
| Framework | Express.js | Lightweight, flexible, well-documented |
| Language | TypeScript | Type safety, better DX, fewer runtime errors |
| ORM | Prisma | Type-safe DB access, auto migrations, great DX |
| Database | PostgreSQL 15 | Reliable, relational, excellent for transactions |
| Cache | Redis (Upstash free tier) | Sessions, rate limiting, job queues |
| Job Queue | BullMQ (uses Redis) | Background jobs: emails, tracking polls, reports |
| Auth | JWT + bcrypt | Stateless auth, secure password hashing |
| File uploads | Multer + Cloudflare R2 | Cheap S3-compatible storage |
| PDF generation | Puppeteer or pdf-lib | Invoice/label PDF generation |
| Barcode | bwip-js | Free barcode + QR code generation |
| Validation | Zod | Runtime schema validation |

### Frontend (Customer Portal)
| Technology | Choice | Why |
|------------|--------|-----|
| Framework | Next.js 14 (App Router) | SSR, SEO, API routes, Vercel optimized |
| Language | TypeScript | Consistent with backend |
| Styling | Tailwind CSS | Fast, consistent, mobile-first |
| UI Components | shadcn/ui | Beautiful, accessible, free |
| State management | Zustand | Lightweight, simple |
| Forms | React Hook Form + Zod | Fast, validated forms |
| HTTP client | Axios | Clean API calls |
| Charts | Recharts | Free, React-native charts |
| Barcode scanner | react-webcam + ZXing | Browser-based barcode scanning |
| i18n | next-intl | Multi-language: EN/FR/Creole/ES |

### Admin Panel
| Technology | Choice |
|------------|--------|
| Framework | Next.js 14 (separate app OR /admin route in same app) |
| UI | shadcn/ui + Tailwind CSS |
| Charts | Recharts |
| Tables | TanStack Table v8 |
| Date picker | react-day-picker |

### Mobile App
| Technology | Choice | Why |
|------------|--------|-----|
| Framework | React Native (Expo) | One codebase for iOS + Android |
| Navigation | Expo Router | File-based routing |
| UI | NativeWind (Tailwind for RN) | Consistent design |
| Camera | Expo Camera | Invoice photo capture |
| Notifications | Expo Notifications + FCM | Push notifications |
| Storage | Expo SecureStore | Secure token storage |

---

## 3. Hosting & Infrastructure

### Recommended Stack: 100% Cheap All-in-One

#### Option A: Railway.app (BEST — All-in-One) ⭐ RECOMMENDED
**Total cost: ~$5–20/month to start**

| Service | Provider | Cost |
|---------|----------|------|
| Backend (Node.js API) | Railway | ~$5/month (Hobby plan) |
| PostgreSQL database | Railway (built-in) | $0 (included in plan) |
| Redis | Railway (built-in) | $0 (included) |
| Frontend (Next.js) | Vercel | $0 (free tier) |
| File storage | Cloudflare R2 | $0 up to 10GB, then $0.015/GB |
| Domain | Namecheap or Cloudflare | ~$12/year |
| CDN + DNS | Cloudflare (free tier) | $0 |
| SSL certificate | Cloudflare / Let's Encrypt | $0 |
| **Total** | | **~$5–20/month** |

Railway gives you: Node.js + PostgreSQL + Redis all in one dashboard.
Scale up as you grow — Railway scales automatically.

#### Option B: Render.com (Alternative)
| Service | Provider | Cost |
|---------|----------|------|
| Backend | Render Web Service | $7/month |
| PostgreSQL | Render PostgreSQL | $7/month |
| Redis | Render Redis | $10/month |
| Frontend | Vercel | $0 |
| Files | Cloudflare R2 | $0–$5/month |
| **Total** | | **~$24/month** |

#### Option C: Supabase + Vercel (Serverless)
| Service | Provider | Cost |
|---------|----------|------|
| Backend + DB + Auth + Storage | Supabase | $0–$25/month |
| Frontend | Vercel | $0 |
| **Total** | | **$0–$25/month** |
Note: Supabase has built-in auth, storage, and realtime — but less control.

### Production Architecture
```
Internet
    │
    ▼
Cloudflare (DNS + CDN + DDoS protection — FREE)
    │
    ├── pgfishipping.com → Vercel (Next.js frontend)
    ├── api.pgfishipping.com → Railway (Express API)
    ├── admin.pgfishipping.com → Vercel (Admin Next.js)
    └── r2.pgfishipping.com → Cloudflare R2 (files/images)
```

---

## 4. Email Service

### RECOMMENDED: Resend.com ⭐
**Why Resend:** Modern API, built for developers, best deliverability, cheapest option, free tier generous

| Plan | Price | Emails/month | Best For |
|------|-------|-------------|----------|
| Free | $0 | 3,000/month | Development + soft launch |
| Pro | $20/month | 50,000/month | Growth phase |
| Scale | $90/month | 100,000/month | Mature business |

**API Example:**
```typescript
// Install: npm install resend
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'PGFI Shipping <noreply@pgfishipping.com>',
  to: customer.email,
  subject: 'Your package has been received',
  html: emailTemplate,
});
```

### Alternative: Brevo (formerly Sendinblue)
- Free: 300 emails/day (9,000/month)
- $25/month: 20,000 emails
- Good if you want a drag-and-drop template editor

### Alternative: Mailgun
- Free: 1,000 emails/month for 3 months, then pay-per-use
- $35/month: 50,000 emails
- More complex setup

### Email Triggers (When emails are sent automatically)
| Event | Template | Priority |
|-------|----------|----------|
| Account registered | welcome | HIGH |
| Password reset request | password-reset | HIGH |
| Shipment pre-alert created | pre-alert-confirmation | HIGH |
| Package received at US warehouse | package-received | HIGH |
| Package in transit | in-transit | HIGH |
| Package available for pickup | available-for-pickup | HIGH |
| Package delivered | delivered | HIGH |
| Invoice uploaded | invoice-uploaded | MEDIUM |
| 3rd party authorization created | third-party-auth | MEDIUM |
| Wallet deposit confirmed | wallet-deposit | MEDIUM |
| Wallet payment made | wallet-payment | MEDIUM |
| Weekly shipment summary (if any active) | weekly-summary | LOW |
| Admin: new customer registered | admin-new-customer | LOW |

---

## 5. Third-Party APIs

### All Free or Cheapest Options

| API | Provider | Purpose | Cost | Link |
|-----|----------|---------|------|------|
| Email | Resend.com | All email notifications | Free (3k/mo) | resend.com |
| External tracking | Aftership | Track USPS/UPS/FedEx/DHL/Amazon | Free (50 shipments/mo) | aftership.com |
| External tracking alt | 17track API | Universal carrier tracking | Free tier available | 17track.net |
| USPS tracking | USPS Web Tools | USPS package tracking | FREE | registration.shippingapis.com |
| File storage | Cloudflare R2 | Store invoices, photos, PDFs | Free (10GB) | cloudflare.com |
| Barcode/QR | bwip-js (npm) | Generate barcodes + QR codes | FREE (npm library) | npmjs.com/bwip-js |
| PDF invoices | pdf-lib (npm) | Generate invoice PDFs | FREE (npm library) | npmjs.com/pdf-lib |
| Address autocomplete | Radar.io | Address autocomplete (10k req free/month) | Free tier | radar.com |
| Address alt | Geoapify | Address autocomplete | Free (3k req/day) | geoapify.com |
| Currency exchange | exchangerate-api.com | HTG ↔ USD live rate | Free (1,500 req/mo) | exchangerate-api.com |
| Push notifications | Firebase FCM | Mobile push notifications | FREE | firebase.google.com |
| Auth | Own JWT implementation | No third-party needed | FREE | — |

### Haiti Payment Providers
| Provider | API Docs | Notes |
|----------|----------|-------|
| MonCash (Digicel) | sandbox.moncashbutton.digicel.ht | Most popular in Haiti |
| NatCash | Contact NatCash directly for API | National Bank integration |
| PayMon | Contact for merchant API | Growing provider |

**Important:** Contact MonCash, NatCash, and PayMon directly for merchant/API accounts. These require business registration proof.

---

## 6. Environment Variables

Create a `.env` file in your backend project root:

```env
# App
NODE_ENV=development
PORT=4000
APP_NAME=PGFI Shipping
APP_URL=https://pgfishipping.com
API_URL=https://api.pgfishipping.com
ADMIN_URL=https://admin.pgfishipping.com

# Database (Railway provides this automatically)
DATABASE_URL=postgresql://user:password@host:5432/pgfishipping

# Redis (Railway provides this automatically)
REDIS_URL=redis://default:password@host:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=PGFI Shipping <noreply@pgfishipping.com>
EMAIL_REPLY_TO=support@pgfishipping.com

# File Storage (Cloudflare R2)
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=pgfishipping-files
R2_PUBLIC_URL=https://files.pgfishipping.com

# External Tracking
AFTERSHIP_API_KEY=your-aftership-key
USPS_USER_ID=your-usps-user-id

# Firebase (Push Notifications for mobile)
FIREBASE_PROJECT_ID=pgfishipping
FIREBASE_PRIVATE_KEY=your-firebase-private-key
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@pgfishipping.iam.gserviceaccount.com

# MonCash (Haiti payment)
MONCASH_CLIENT_ID=your-moncash-client-id
MONCASH_CLIENT_SECRET=your-moncash-client-secret
MONCASH_MODE=sandbox # change to 'live' in production

# NatCash
NATCASH_MERCHANT_ID=your-natcash-merchant-id
NATCASH_API_KEY=your-natcash-api-key

# Exchange Rate
EXCHANGE_RATE_API_KEY=your-exchangerate-api-key

# Admin
SUPER_ADMIN_EMAIL=admin@pgfishipping.com
SUPER_ADMIN_PASSWORD=change-this-immediately

# Security
CORS_ORIGINS=https://pgfishipping.com,https://admin.pgfishipping.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

---

## 7. Project Folder Structure

```
pgfishipping/
│
├── backend/                          # Express + TypeScript API
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts           # Prisma client singleton
│   │   │   ├── redis.ts              # Redis/Upstash connection
│   │   │   ├── email.ts              # Resend client setup
│   │   │   ├── storage.ts            # Cloudflare R2 / S3 client
│   │   │   └── constants.ts          # App-wide constants
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.ts               # JWT verify middleware
│   │   │   ├── adminAuth.ts          # Admin role check
│   │   │   ├── rateLimit.ts          # Rate limiting
│   │   │   ├── validate.ts           # Zod request validation
│   │   │   ├── upload.ts             # Multer file upload config
│   │   │   └── errorHandler.ts       # Global error handler
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.routes.ts        # /api/auth/*
│   │   │   ├── user.routes.ts        # /api/user/*
│   │   │   ├── shipment.routes.ts    # /api/shipments/*
│   │   │   ├── tracking.routes.ts    # /api/track/*
│   │   │   ├── wallet.routes.ts      # /api/wallet/*
│   │   │   ├── calculator.routes.ts  # /api/calculator/*
│   │   │   ├── notification.routes.ts# /api/notifications/*
│   │   │   ├── admin/
│   │   │   │   ├── customers.routes.ts
│   │   │   │   ├── shipments.routes.ts
│   │   │   │   ├── finance.routes.ts
│   │   │   │   ├── staff.routes.ts
│   │   │   │   ├── locations.routes.ts
│   │   │   │   ├── config.routes.ts
│   │   │   │   └── analytics.routes.ts
│   │   │   └── index.ts              # Route aggregator
│   │   │
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── user.controller.ts
│   │   │   ├── shipment.controller.ts
│   │   │   ├── tracking.controller.ts
│   │   │   ├── wallet.controller.ts
│   │   │   ├── calculator.controller.ts
│   │   │   └── admin/
│   │   │       ├── customers.controller.ts
│   │   │       ├── shipments.controller.ts
│   │   │       ├── finance.controller.ts
│   │   │       ├── analytics.controller.ts
│   │   │       └── config.controller.ts
│   │   │
│   │   ├── services/
│   │   │   ├── auth.service.ts       # Business logic for auth
│   │   │   ├── user.service.ts
│   │   │   ├── shipment.service.ts
│   │   │   ├── tracking.service.ts   # External tracking polling
│   │   │   ├── wallet.service.ts
│   │   │   ├── calculator.service.ts # Pricing calculation logic
│   │   │   ├── email.service.ts      # All email sending
│   │   │   ├── storage.service.ts    # File upload/delete
│   │   │   ├── barcode.service.ts    # Barcode + QR generation
│   │   │   ├── pdf.service.ts        # Invoice PDF generation
│   │   │   └── customerCode.service.ts # HT-XXXXXX generation
│   │   │
│   │   ├── jobs/
│   │   │   ├── trackingPoll.job.ts   # Poll Aftership every 4hrs
│   │   │   ├── weeklySummary.job.ts  # Weekly email summaries
│   │   │   └── queue.ts              # BullMQ queue setup
│   │   │
│   │   ├── emails/
│   │   │   ├── templates/
│   │   │   │   ├── welcome.tsx       # React Email templates
│   │   │   │   ├── passwordReset.tsx
│   │   │   │   ├── preAlertConfirm.tsx
│   │   │   │   ├── packageReceived.tsx
│   │   │   │   ├── inTransit.tsx
│   │   │   │   ├── available.tsx
│   │   │   │   ├── delivered.tsx
│   │   │   │   ├── walletDeposit.tsx
│   │   │   │   ├── walletPayment.tsx
│   │   │   │   └── thirdPartyAuth.tsx
│   │   │   └── renderer.ts           # Render React Email → HTML string
│   │   │
│   │   ├── utils/
│   │   │   ├── generateCode.ts       # HT-XXXXXX + PG-XXXXXXXXXX
│   │   │   ├── pagination.ts
│   │   │   ├── response.ts           # Standardized API responses
│   │   │   └── logger.ts
│   │   │
│   │   ├── types/
│   │   │   ├── express.d.ts          # Extend Express Request type
│   │   │   └── index.ts
│   │   │
│   │   └── app.ts                    # Express app entry point
│   │
│   ├── prisma/
│   │   ├── schema.prisma             # Full database schema
│   │   └── migrations/               # Auto-generated migrations
│   │
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env
│   └── Dockerfile                    # For Railway deployment
│
├── frontend/                         # Next.js 14 Customer Portal
│   ├── src/
│   │   ├── app/
│   │   │   ├── (public)/             # No auth required
│   │   │   │   ├── page.tsx          # Home / landing page
│   │   │   │   ├── track/
│   │   │   │   │   └── [code]/page.tsx # Public tracking
│   │   │   │   ├── calculator/page.tsx
│   │   │   │   ├── addresses/page.tsx
│   │   │   │   ├── about/page.tsx
│   │   │   │   ├── support/page.tsx
│   │   │   │   ├── login/page.tsx
│   │   │   │   ├── register/page.tsx
│   │   │   │   └── reset-password/page.tsx
│   │   │   │
│   │   │   └── (dashboard)/          # Auth required
│   │   │       ├── layout.tsx        # Dashboard layout with sidebar
│   │   │       ├── dashboard/page.tsx
│   │   │       ├── shipments/
│   │   │       │   ├── page.tsx      # Shipments list (3 tabs)
│   │   │       │   └── [id]/page.tsx # Shipment detail
│   │   │       ├── tracking/[code]/page.tsx
│   │   │       ├── pre-alert/page.tsx
│   │   │       ├── wallet/page.tsx
│   │   │       ├── calculator/page.tsx
│   │   │       ├── address/page.tsx  # My US addresses
│   │   │       ├── referral/page.tsx
│   │   │       ├── gift-card/page.tsx
│   │   │       ├── support/page.tsx
│   │   │       └── settings/
│   │   │           ├── profile/page.tsx
│   │   │           ├── password/page.tsx
│   │   │           └── data/page.tsx
│   │   │
│   │   ├── components/
│   │   │   ├── ui/                   # shadcn/ui components
│   │   │   ├── layout/
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   └── MobileNav.tsx
│   │   │   ├── shipments/
│   │   │   │   ├── ShipmentTable.tsx
│   │   │   │   ├── ShipmentCard.tsx
│   │   │   │   ├── TrackingTimeline.tsx
│   │   │   │   ├── TrackingProgressBar.tsx
│   │   │   │   ├── StatusBadge.tsx
│   │   │   │   └── ShipmentDetail.tsx
│   │   │   ├── wallet/
│   │   │   │   ├── WalletBalance.tsx
│   │   │   │   ├── TransactionList.tsx
│   │   │   │   └── DepositModal.tsx
│   │   │   ├── calculator/
│   │   │   │   ├── RouteStep.tsx
│   │   │   │   ├── PackageStep.tsx
│   │   │   │   └── CostResult.tsx
│   │   │   ├── forms/
│   │   │   │   ├── PreAlertForm.tsx
│   │   │   │   ├── ProfileForm.tsx
│   │   │   │   ├── ThirdPartyAuthForm.tsx
│   │   │   │   └── InvoiceUploadForm.tsx
│   │   │   └── common/
│   │   │       ├── LoadingSpinner.tsx
│   │   │       ├── EmptyState.tsx
│   │   │       ├── CopyButton.tsx
│   │   │       └── LanguageSelector.tsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useShipments.ts
│   │   │   ├── useWallet.ts
│   │   │   └── useTracking.ts
│   │   │
│   │   ├── lib/
│   │   │   ├── api.ts                # Axios instance with auth headers
│   │   │   ├── auth.ts               # Token storage + refresh
│   │   │   └── utils.ts
│   │   │
│   │   ├── store/
│   │   │   ├── authStore.ts          # Zustand auth state
│   │   │   └── shipmentStore.ts
│   │   │
│   │   ├── messages/                 # i18n translations
│   │   │   ├── en.json
│   │   │   ├── fr.json
│   │   │   ├── ht.json               # Haitian Creole
│   │   │   └── es.json
│   │   │
│   │   └── types/
│   │       └── index.ts
│   │
│   ├── public/
│   │   ├── logo.png
│   │   ├── logo.svg
│   │   └── images/
│   │
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
├── admin/                            # Next.js 14 Admin Panel
│   ├── src/
│   │   ├── app/
│   │   │   ├── login/page.tsx
│   │   │   └── (admin)/              # Auth required, role-protected
│   │   │       ├── layout.tsx
│   │   │       ├── dashboard/page.tsx
│   │   │       ├── customers/
│   │   │       │   ├── page.tsx
│   │   │       │   └── [id]/page.tsx
│   │   │       ├── shipments/
│   │   │       │   ├── page.tsx
│   │   │       │   └── [id]/page.tsx
│   │   │       ├── finance/
│   │   │       │   ├── transactions/page.tsx
│   │   │       │   ├── pricing/page.tsx
│   │   │       │   └── reports/page.tsx
│   │   │       ├── staff/page.tsx
│   │   │       ├── locations/page.tsx
│   │   │       ├── analytics/page.tsx
│   │   │       ├── communications/page.tsx
│   │   │       ├── loyalty/page.tsx
│   │   │       └── settings/page.tsx
│   │   └── components/
│   │       ├── AdminSidebar.tsx
│   │       ├── DataTable.tsx         # TanStack Table wrapper
│   │       ├── charts/
│   │       │   ├── RevenueChart.tsx
│   │       │   ├── StatusPieChart.tsx
│   │       │   └── SignupsChart.tsx
│   │       └── forms/
│   │           ├── AddTrackingEventForm.tsx
│   │           ├── PricingRuleForm.tsx
│   │           └── BroadcastEmailForm.tsx
│   │
│   └── package.json
│
└── mobile/                           # React Native (Expo)
    ├── app/
    │   ├── (auth)/
    │   │   ├── login.tsx
    │   │   └── register.tsx
    │   └── (tabs)/
    │       ├── index.tsx             # Home/Dashboard
    │       ├── shipments.tsx
    │       ├── wallet.tsx
    │       ├── calculator.tsx
    │       └── profile.tsx
    ├── components/
    ├── hooks/
    ├── services/
    └── package.json
```

---

## 8. Database Schema

Full Prisma schema (`prisma/schema.prisma`):

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── ENUMS ───────────────────────────────────────────────────────────────────

enum UserRole {
  CUSTOMER
  SUPER_ADMIN
  MANAGER
  WAREHOUSE_STAFF
  COURIER
  FINANCE
  SUPPORT
}

enum UserStatus {
  ACTIVE
  SUSPENDED
  PENDING_VERIFICATION
  DELETED
}

enum ClientType {
  PERSONAL
  BUSINESS
}

enum Language {
  EN
  FR
  HT
  ES
}

enum ServiceType {
  AIR
  SEA
}

enum ShipmentStatus {
  WAITING
  RECEIVED
  IN_TRANSIT
  IN_TRANSIT_B
  INVENTORY
  AVAILABLE
  DELIVERED
  RETURNED
  LOST
  CANCELLED
}

enum ContentType {
  PACKAGE
  DOCUMENT
}

enum SpecialFlag {
  FRAGILE
  LIQUID
  TIRES
  TV
  ELECTRONICS
  REFRIGERATED
  MEDICATIONS
  PERISHABLE
  MOBILE_PHONE
}

enum TransactionType {
  DEPOSIT
  PAYMENT
  REFUND
  ADJUSTMENT
  GIFT_CARD_REDEMPTION
}

enum PaymentMethod {
  MONCASH
  NATCASH
  PAYMON
  BANK_TRANSFER
  GIFT_CARD
  ADMIN_ADJUSTMENT
}

enum TransactionStatus {
  PENDING
  COMPLETED
  FAILED
  CANCELLED
}

enum NotificationChannel {
  EMAIL
  PUSH
}

enum GiftCardStatus {
  ACTIVE
  USED
  EXPIRED
  CANCELLED
}

// ─── MODELS ──────────────────────────────────────────────────────────────────

model User {
  id                String          @id @default(cuid())
  customerCode      String          @unique // HT-000001
  email             String          @unique
  passwordHash      String
  firstName         String
  lastName          String
  phoneCell         String?
  phoneHome         String?
  role              UserRole        @default(CUSTOMER)
  status            UserStatus      @default(PENDING_VERIFICATION)
  clientType        ClientType      @default(PERSONAL)
  language          Language        @default(EN)
  gender            String?
  dateOfBirth       DateTime?
  profilePhotoUrl   String?
  idPhotoUrl        String?
  idType            String?         // passport, cedula, etc.
  idNumber          String?
  referralCode      String          @unique // unique code to share
  referredById      String?
  loyaltyPoints     Int             @default(0)
  pointsExpiresAt   DateTime?
  preferredBranchId String?
  emailVerified     Boolean         @default(false)
  emailVerifyToken  String?
  resetToken        String?
  resetTokenExpiry  DateTime?
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt
  deletedAt         DateTime?

  // Relations
  referredBy        User?           @relation("Referrals", fields: [referredById], references: [id])
  referrals         User[]          @relation("Referrals")
  addresses         UserAddress[]
  usWarehouseAddress UsWarehouseAddress?
  shipments         Shipment[]
  wallet            Wallet?
  notifications     NotificationLog[]
  supportTickets    SupportTicket[]
  thirdPartyAuths   ThirdPartyAuth[]
  loyaltyHistory    LoyaltyEvent[]
  preferredBranch   Warehouse?      @relation(fields: [preferredBranchId], references: [id])

  @@map("users")
}

model UserAddress {
  id                String    @id @default(cuid())
  userId            String
  addressType       String    // "residence" | "delivery"
  fullAddress       String?
  street            String?
  apt               String?
  neighborhood      String?
  city              String
  state             String?
  zip               String?
  country           String
  isDefault         Boolean   @default(false)
  createdAt         DateTime  @default(now())

  user              User      @relation(fields: [userId], references: [id])

  @@map("user_addresses")
}

model UsWarehouseAddress {
  id              String    @id @default(cuid())
  userId          String    @unique
  aptNumber       String    // e.g., "HT-000001"
  airAddress      String    // Full formatted air address
  seaAddress      String    // Full formatted sea address
  warehouseId     String?
  createdAt       DateTime  @default(now())

  user            User      @relation(fields: [userId], references: [id])
  warehouse       Warehouse? @relation(fields: [warehouseId], references: [id])

  @@map("us_warehouse_addresses")
}

model Shipment {
  id                  String          @id @default(cuid())
  trackingCode        String          @unique // PG-XXXXXXXXXX
  userId              String
  externalTracking    String?         // USPS/UPS/FedEx tracking number
  externalCarrier     String?         // USPS, UPS, FedEx, DHL, Amazon
  serviceType         ServiceType     @default(AIR)
  status              ShipmentStatus  @default(WAITING)
  originCountry       String          @default("US")
  destinationCountry  String          @default("HT")
  contentType         ContentType     @default(PACKAGE)
  contentsDescription String?
  vendor              String?         // Amazon, Alibaba, etc.
  specialFlags        SpecialFlag[]
  weightLbs           Float?
  dimensionLength     Float?
  dimensionWidth      Float?
  dimensionHeight     Float?
  fobValue            Float?
  fobCurrency         String          @default("USD")
  invoiceUrl          String?
  additionalNotes     String?
  changeDestination   Boolean         @default(false)
  alternateAddressId  String?
  mergeGroupId        String?
  originWarehouseId   String?
  destinationBranchId String?
  recipientName       String?
  recipientPhone      String?
  totalCost           Float?
  costBreakdown       Json?           // Store itemized cost
  paidAt              DateTime?
  deliveredAt         DateTime?
  createdAt           DateTime        @default(now())
  updatedAt           DateTime        @updatedAt

  // Relations
  user                User            @relation(fields: [userId], references: [id])
  trackingEvents      TrackingEvent[]
  thirdPartyAuth      ThirdPartyAuth?
  transactions        Transaction[]
  originWarehouse     Warehouse?      @relation("OriginWarehouse", fields: [originWarehouseId], references: [id])
  destinationBranch   Warehouse?      @relation("DestinationBranch", fields: [destinationBranchId], references: [id])

  @@map("shipments")
}

model TrackingEvent {
  id          String    @id @default(cuid())
  shipmentId  String
  status      ShipmentStatus
  label       String    // Human-readable label (can be customized)
  location    String?
  notes       String?
  createdById String?   // staff member who added this
  timestamp   DateTime  @default(now())

  shipment    Shipment  @relation(fields: [shipmentId], references: [id])

  @@map("tracking_events")
}

model Warehouse {
  id          String    @id @default(cuid())
  name        String
  type        String    // "US" | "HAITI"
  address     String
  city        String
  state       String?
  country     String
  phone       String?
  email       String?
  isActive    Boolean   @default(true)
  sortOrder   Int       @default(0)
  createdAt   DateTime  @default(now())

  // Relations
  usAddresses       UsWarehouseAddress[]
  originShipments   Shipment[]  @relation("OriginWarehouse")
  destShipments     Shipment[]  @relation("DestinationBranch")
  preferredByUsers  User[]

  @@map("warehouses")
}

model Wallet {
  id            String        @id @default(cuid())
  userId        String        @unique
  balanceUsd    Float         @default(0)
  balanceHtg    Float         @default(0)
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  user          User          @relation(fields: [userId], references: [id])
  transactions  Transaction[]

  @@map("wallets")
}

model Transaction {
  id              String            @id @default(cuid())
  walletId        String
  type            TransactionType
  amount          Float
  currency        String            @default("USD")
  paymentMethod   PaymentMethod?
  status          TransactionStatus @default(PENDING)
  reference       String?           // External payment reference
  shipmentId      String?
  giftCardId      String?
  notes           String?
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  wallet          Wallet            @relation(fields: [walletId], references: [id])
  shipment        Shipment?         @relation(fields: [shipmentId], references: [id])
  giftCard        GiftCard?         @relation(fields: [giftCardId], references: [id])

  @@map("transactions")
}

model ThirdPartyAuth {
  id              String    @id @default(cuid())
  shipmentId      String    @unique
  userId          String
  authorizedName  String
  idType          String
  idNumber        String
  phone           String
  createdAt       DateTime  @default(now())

  shipment        Shipment  @relation(fields: [shipmentId], references: [id])
  user            User      @relation(fields: [userId], references: [id])

  @@map("third_party_auths")
}

model PricingRule {
  id              String    @id @default(cuid())
  name            String    // "Air Freight per LB"
  serviceType     ServiceType
  feeType         String    // "freight" | "fuel" | "airport" | "customs" | "cargo" | "handling"
  ratePerLb       Float?
  flatFee         Float?
  minCharge       Float?
  currency        String    @default("USD")
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@map("pricing_rules")
}

model LoyaltyEvent {
  id          String    @id @default(cuid())
  userId      String
  points      Int       // positive = earned, negative = used
  reason      String    // "shipment_delivered", "referral", "admin_grant", etc.
  referenceId String?   // shipment ID or referral ID
  expiresAt   DateTime?
  createdAt   DateTime  @default(now())

  user        User      @relation(fields: [userId], references: [id])

  @@map("loyalty_events")
}

model Referral {
  id              String    @id @default(cuid())
  referrerId      String
  referredId      String
  commissionUsd   Float     @default(0)
  status          String    @default("pending") // pending | paid
  createdAt       DateTime  @default(now())

  @@map("referrals")
}

model GiftCard {
  id          String          @id @default(cuid())
  code        String          @unique
  valueUsd    Float
  issuedTo    String?
  usedBy      String?
  expiresAt   DateTime?
  status      GiftCardStatus  @default(ACTIVE)
  createdAt   DateTime        @default(now())

  transactions Transaction[]

  @@map("gift_cards")
}

model NotificationLog {
  id          String              @id @default(cuid())
  userId      String
  channel     NotificationChannel
  template    String
  subject     String?
  toEmail     String?
  status      String              @default("sent") // sent | failed | opened
  createdAt   DateTime            @default(now())

  user        User                @relation(fields: [userId], references: [id])

  @@map("notification_logs")
}

model SupportTicket {
  id          String    @id @default(cuid())
  userId      String
  subject     String
  message     String
  reply       String?
  status      String    @default("open") // open | in_progress | closed
  assignedTo  String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  user        User      @relation(fields: [userId], references: [id])

  @@map("support_tickets")
}

model SystemConfig {
  id          String    @id @default(cuid())
  key         String    @unique
  value       String
  updatedAt   DateTime  @updatedAt

  @@map("system_config")
}

model Staff {
  id              String    @id @default(cuid())
  name            String
  email           String    @unique
  passwordHash    String
  role            UserRole
  warehouseId     String?
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())

  @@map("staff")
}
```

---

## 9. Backend API Endpoints

### Base URL: `https://api.pgfishipping.com/api`

### Auth Routes (`/auth`)
```
POST   /auth/register              Create new customer account
POST   /auth/login                 Login with email or customer code
POST   /auth/logout                Invalidate token
POST   /auth/forgot-password       Send password reset email
POST   /auth/reset-password        Reset password with token
POST   /auth/verify-email          Verify email with token
POST   /auth/resend-verification   Resend verification email
PUT    /auth/change-password       Change password (authenticated)
POST   /auth/refresh               Refresh JWT token
```

### User Routes (`/user`) — Authenticated
```
GET    /user/me                    Get current user profile
PUT    /user/profile               Update profile info
POST   /user/photo                 Upload profile photo
POST   /user/id-photo              Upload ID document photo
GET    /user/address               Get US warehouse addresses (air + sea)
GET    /user/shipments             Get all shipments (paginated, filterable)
GET    /user/data                  Download personal data (GDPR)
DELETE /user/account               Delete account permanently
```

### Shipment Routes (`/shipments`) — Authenticated
```
GET    /shipments                  List shipments (filter: status, search, page)
POST   /shipments/pre-alert        Create pre-alert / register incoming package
GET    /shipments/:id              Get full shipment details
PUT    /shipments/:id/fob          Update FOB value
POST   /shipments/:id/invoice      Upload invoice file
GET    /shipments/:id/invoice      Download invoice
POST   /shipments/:id/authorize    Create 3rd party authorization
GET    /shipments/:id/authorize    Get 3rd party auth details
POST   /shipments/merge            Merge multiple shipments
GET    /shipments/:id/label        Download shipping label (PDF with barcode)
POST   /shipments/:id/amazon       Generate Amazon receipt
```

### Tracking Routes (`/track`)
```
GET    /track/:code                Public tracking by internal OR external code
GET    /track/:code/events         Full event timeline (public)
```

### Wallet Routes (`/wallet`) — Authenticated
```
GET    /wallet                     Get balance + recent transactions
GET    /wallet/transactions        Transaction history (paginated)
POST   /wallet/deposit/moncash     Initiate MonCash deposit
POST   /wallet/deposit/natcash     Initiate NatCash deposit
POST   /wallet/redeem-giftcard     Redeem gift card code
POST   /wallet/pay/:shipmentId     Pay for shipment from wallet
```

### Payment Webhooks
```
POST   /webhooks/moncash           MonCash payment callback
POST   /webhooks/natcash           NatCash payment callback
```

### Calculator Routes (`/calculator`)
```
POST   /calculator/estimate        Calculate shipping cost
GET    /calculator/rates           Get public pricing rates
GET    /calculator/exchange-rate   Get current HTG/USD rate
```

### Notification Routes — Authenticated
```
GET    /notifications              Get notification history
```

### Admin Routes — Admin authenticated (`/admin`)
```
# Dashboard
GET    /admin/dashboard            KPIs and summary stats

# Customers
GET    /admin/customers            List all customers (search, filter, paginate)
GET    /admin/customers/:id        Customer full profile
PUT    /admin/customers/:id        Update customer
PUT    /admin/customers/:id/status Activate/suspend customer
PUT    /admin/customers/:id/points Adjust loyalty points
PUT    /admin/customers/:id/wallet Adjust wallet balance
DELETE /admin/customers/:id        Delete customer account
POST   /admin/customers/:id/reset-password

# Shipments
GET    /admin/shipments            List all shipments (search, filter, paginate)
POST   /admin/shipments            Create shipment manually
GET    /admin/shipments/:id        Full shipment detail
PUT    /admin/shipments/:id        Update shipment details
POST   /admin/shipments/:id/event  Add tracking event
PUT    /admin/shipments/bulk-status Bulk status update
POST   /admin/shipments/merge      Merge from admin
GET    /admin/shipments/:id/label  Download barcode label

# Finance
GET    /admin/transactions         All transactions
GET    /admin/revenue              Revenue reports
PUT    /admin/pricing/:id          Update pricing rule
POST   /admin/pricing              Create pricing rule
PUT    /admin/exchange-rate        Update HTG/USD rate
POST   /admin/refund/:transactionId Process refund
GET    /admin/reports/export       Export CSV report

# Staff
GET    /admin/staff                List staff
POST   /admin/staff                Create staff account
PUT    /admin/staff/:id            Update staff
DELETE /admin/staff/:id            Delete/deactivate staff

# Locations
GET    /admin/warehouses           List all warehouses
POST   /admin/warehouses           Create warehouse
PUT    /admin/warehouses/:id       Update warehouse
DELETE /admin/warehouses/:id       Delete warehouse

# Analytics
GET    /admin/analytics/overview   Full analytics data
GET    /admin/analytics/shipments  Shipments over time
GET    /admin/analytics/revenue    Revenue over time
GET    /admin/analytics/customers  Customer growth

# Communications
GET    /admin/support-tickets      List all tickets
PUT    /admin/support-tickets/:id  Reply to ticket
POST   /admin/email/broadcast      Send broadcast email

# Config
GET    /admin/config               Get all system config
PUT    /admin/config/:key          Update config value
GET    /admin/gift-cards           List gift cards
POST   /admin/gift-cards           Generate gift card(s)
```

---

## 10. Frontend Pages & Routes

### Public Pages (No login required)
| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Landing page, hero, services, how it works, CTA |
| `/track` | Public Tracking | Search + 4-step progress bar + timeline |
| `/track/:code` | Tracking Result | Direct link to specific package tracking |
| `/calculator` | Calculator | 3-step wizard: Route → Package → Cost |
| `/addresses` | Addresses | All US + Haiti locations |
| `/about` | About | Company info, mission |
| `/about/terms` | Terms | Terms & conditions |
| `/about/privacy` | Privacy | Privacy policy |
| `/support` | Support | FAQ + contact form |
| `/login` | Login | Email/customer code + password |
| `/register` | Register | Full registration form |
| `/forgot-password` | Forgot Password | Email input |
| `/reset-password` | Reset Password | New password form |
| `/verify-email` | Verify Email | Email verification page |

### Authenticated Pages
| Route | Page | Description |
|-------|------|-------------|
| `/dashboard` | Dashboard | Quick actions, loyalty points, shipments overview |
| `/shipments` | Shipments | Table with 3 tabs + search (Pre-Alerts/Active/Delivered) |
| `/shipments/:id` | Shipment Detail | 4 info cards + status + actions |
| `/shipments/:id/track` | Tracking Timeline | Full event history |
| `/pre-alert` | Pre-Alert | Register incoming package |
| `/wallet` | Wallet | Balance + transactions + deposit |
| `/address` | My Address | Air + Sea US warehouse addresses |
| `/referral` | Referral | My referral link + network |
| `/gift-card` | Gift Card | Redeem gift card |
| `/support` | Support | Create/view tickets |
| `/settings/profile` | Profile | Edit profile + photos |
| `/settings/password` | Password | Change password |
| `/settings/data` | My Data | Download + delete account |

---

## 11. Admin Panel Pages & Routes

| Route | Page | Access |
|-------|------|--------|
| `/login` | Admin Login | All staff |
| `/dashboard` | Main Dashboard | All |
| `/customers` | Customer List | Admin, Manager, Support |
| `/customers/:id` | Customer Detail | Admin, Manager, Support |
| `/shipments` | Shipments List | Admin, Manager, Warehouse |
| `/shipments/:id` | Shipment Detail | Admin, Manager, Warehouse |
| `/shipments/create` | Create Shipment | Admin, Manager |
| `/finance/transactions` | Transactions | Admin, Finance |
| `/finance/pricing` | Pricing Rules | Admin, Finance |
| `/finance/reports` | Revenue Reports | Admin, Finance, Manager |
| `/staff` | Staff Management | Admin only |
| `/locations` | Warehouses | Admin, Manager |
| `/analytics` | Analytics | Admin, Manager, Finance |
| `/communications` | Email Broadcast + Tickets | Admin, Manager, Support |
| `/loyalty` | Points + Referrals | Admin, Manager |
| `/gift-cards` | Gift Cards | Admin, Finance |
| `/settings` | System Config | Admin only |

---

## 12. Email Notification Templates

Install React Email: `npm install @react-email/components resend`

### Template: Welcome Email
```
Subject: Welcome to PGFI Shipping! Your account is ready.
Content:
- Logo
- "Welcome [First Name]!"
- Their customer code: HT-XXXXXX
- Their US warehouse addresses (Air + Sea)
- How it works (3 steps)
- CTA: "Go to your dashboard"
```

### Template: Package Received
```
Subject: [PG-XXXXXXXXXX] Your package has arrived at our warehouse
Content:
- Package tracking code
- Received timestamp + location
- Contents description
- Weight
- Tracking link (shareable)
- CTA: "Track your package"
```

### Template: Package In Transit
```
Subject: [PG-XXXXXXXXXX] Your package is on its way to Haiti!
Content:
- Status: "In Transit"
- Route: USA → Haiti
- Estimated arrival date (if available)
- Tracking link
```

### Template: Package Available
```
Subject: [PG-XXXXXXXXXX] Your package is ready for pickup
Content:
- Status: "Available for pickup"
- Pickup location (Haiti branch address)
- Package details
- Instructions for pickup
- 3rd party auth option note
```

### Template: Package Delivered
```
Subject: [PG-XXXXXXXXXX] Your package has been delivered!
Content:
- Delivered date/time
- "Thank you for choosing PGFI Shipping"
- Rate your experience (link)
- CTA: "View delivery details"
```

### Template: Wallet Deposit Confirmed
```
Subject: Deposit of $XX.XX confirmed
Content:
- Deposit amount + method
- New wallet balance
- Transaction reference
```

### Template: Password Reset
```
Subject: Reset your PGFI Shipping password
Content:
- Reset link (expires in 1 hour)
- Security note: ignore if not requested
```

---

## 13. Authentication & Security

### JWT Strategy
```typescript
// Token structure
{
  sub: userId,           // user ID
  code: "HT-000001",    // customer code
  role: "CUSTOMER",
  iat: 1234567890,
  exp: 1234567890
}

// Access token: 7 days
// Refresh token: 30 days (stored in httpOnly cookie)
```

### Password Rules
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 number
- Hashed with bcrypt (salt rounds: 12)

### Security Checklist
- [ ] HTTPS everywhere (Cloudflare SSL)
- [ ] Helmet.js security headers on Express
- [ ] Rate limiting: 100 requests/15min per IP
- [ ] Stricter rate limiting on: /auth/login (10/min), /auth/forgot-password (5/min)
- [ ] CORS: only allow pgfishipping.com and admin.pgfishipping.com
- [ ] Input validation with Zod on all endpoints
- [ ] SQL injection: protected by Prisma ORM
- [ ] XSS: sanitize all inputs before saving
- [ ] File uploads: validate MIME type + file size (max 10MB)
- [ ] Admin routes: require staff JWT + role check
- [ ] Sensitive data: never return passwordHash in API responses
- [ ] Database: never expose direct connection from frontend

---

## 14. File Upload System

### Cloudflare R2 (S3-compatible, free 10GB)
```typescript
// Folder structure in R2 bucket
pgfishipping-files/
├── profiles/
│   └── {userId}/profile.jpg
├── id-docs/
│   └── {userId}/id.jpg
├── invoices/
│   └── {shipmentId}/invoice.pdf
└── labels/
    └── {shipmentId}/label.pdf
```

### Allowed File Types
| Upload Type | Allowed Formats | Max Size |
|-------------|----------------|---------|
| Profile photo | JPG, PNG, WEBP | 5 MB |
| ID document | JPG, PNG, PDF | 5 MB |
| Invoice | PDF, JPG, PNG, GIF, JPEG, BMP | 10 MB |

### Upload Flow
1. Frontend requests presigned URL from backend
2. Backend generates presigned R2 URL (valid 5 min)
3. Frontend uploads directly to R2 using presigned URL
4. Frontend notifies backend of upload completion
5. Backend saves file URL to database

---

## 15. Wallet & Payment System

### Wallet Rules
- Each customer has one wallet with USD + HTG balance
- Customer can deposit via MonCash, NatCash, PayMon
- Customer can pay shipment fees directly from wallet
- Minimum deposit: $5 USD
- Admin can manually adjust wallet (with notes)

### MonCash Integration Flow
```
1. Customer clicks "Deposit with MonCash"
2. Backend calls MonCash API: create payment intent
3. Backend returns MonCash redirect URL
4. Customer is redirected to MonCash payment page
5. Customer completes payment on MonCash
6. MonCash calls our webhook: POST /webhooks/moncash
7. Backend verifies signature + updates wallet
8. Email sent to customer: deposit confirmed
```

### Exchange Rate
- Fetch from exchangerate-api.com once every 6 hours
- Cache in Redis
- Store latest rate in SystemConfig table as fallback

---

## 16. Tracking System Logic

### Internal Tracking Code Generation
```typescript
// Format: PG- + 10 random alphanumeric uppercase chars
function generateTrackingCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'PG-';
  for (let i = 0; i < 10; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code; // e.g., PG-A1B2C3D4E5
}
```

### 4-Step Progress Bar States
```
Step 1: RECEIVED      → Package at US warehouse
Step 2: IN_TRANSIT    → On its way to Haiti (or on plane/boat)
Step 3: AVAILABLE     → At Haiti branch, ready for pickup
Step 4: DELIVERED     → Picked up / delivered to recipient
```

### External Tracking Polling (Background Job)
```
Every 4 hours:
1. BullMQ job runs
2. Fetch all shipments with status != DELIVERED and externalTracking != null
3. Call Aftership API for each external tracking number
4. If status changed → update ShipmentStatus + create TrackingEvent
5. Send email notification to customer
6. Log result
```

### Shareable Tracking Link
```
https://pgfishipping.com/track/PG-A1B2C3D4E5
```
- Works without login
- Shows 4-step progress bar + full timeline
- Shows package description + route

---

## 17. Price Calculator Logic

### Fee Components (Air)
| Fee | Calculation |
|-----|-------------|
| Freight (Flete) | weight_lbs × rate_per_lb |
| Fuel surcharge | weight_lbs × fuel_rate |
| Airport fee | weight_lbs × airport_rate |
| Customs fee (DGA equivalent) | weight_lbs × customs_rate |
| Handling fee | flat fee or per_lb |
| **Subtotal** | sum of all fees |
| **Tax** | subtotal × tax_rate (if applicable) |
| **Total USD** | subtotal + tax |
| **Total HTG** | total_usd × exchange_rate |

### Rates (Configurable in Admin Panel)
```typescript
// These are stored in pricing_rules table — editable by admin
const DEFAULT_AIR_RATES = {
  freight: 16.936,        // per LB
  fuel: 3.828,            // per LB
  airport: 2.030,         // per LB
  customs: 1.740,         // per LB
  handling: 0.696,        // per LB
};
```

### Calculator Input
```typescript
interface CalculatorInput {
  serviceType: 'AIR' | 'SEA';
  originCountry: string;
  destinationCountry: string;
  weightLbs: number;
  length?: number;
  width?: number;
  height?: number;
  fobValue: number;
  fobCurrency: 'USD' | 'EUR';
  contentType: 'PACKAGE' | 'DOCUMENT';
  specialCategory?: string;
}
```

---

## 18. Customer Code Generation

```typescript
// src/services/customerCode.service.ts
async function generateCustomerCode(): Promise<string> {
  // Get the last customer number from DB
  const lastUser = await prisma.user.findFirst({
    where: { customerCode: { startsWith: 'HT-' } },
    orderBy: { createdAt: 'desc' },
  });

  let nextNumber = 1;
  if (lastUser?.customerCode) {
    const num = parseInt(lastUser.customerCode.replace('HT-', ''));
    nextNumber = num + 1;
  }

  // Zero-pad to 6 digits: HT-000001
  return `HT-${String(nextNumber).padStart(6, '0')}`;
}

// Generate US warehouse addresses for new customer
async function createWarehouseAddress(userId: string, customerCode: string, firstName: string, lastName: string) {
  const aptNumber = customerCode; // HT-000001
  const name = `${firstName} ${lastName}`;
  const usAddress = '8435 NW 68TH ST, MEDLEY, FL 33166'; // Your Miami warehouse

  await prisma.usWarehouseAddress.create({
    data: {
      userId,
      aptNumber,
      airAddress: `${name}/${aptNumber}/A\n${usAddress}`,
      seaAddress: `${name}/${aptNumber}/B\n${usAddress}`,
    },
  });
}
```

---

## 19. Roles & Permissions Matrix

| Permission | Super Admin | Manager | Warehouse | Courier | Finance | Support |
|-----------|:-----------:|:-------:|:---------:|:-------:|:-------:|:-------:|
| View all customers | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Edit customer profile | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Suspend/delete accounts | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View all shipments | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Create shipments | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Update tracking status | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Add tracking events | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| View wallet/transactions | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Adjust wallet balance | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Edit pricing rules | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| View financial reports | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Export reports | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Manage staff accounts | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage warehouses | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Send broadcast emails | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| View support tickets | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Reply support tickets | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Edit system config | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage loyalty/referrals | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Generate gift cards | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| View analytics | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Maintenance mode | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 20. Deployment Checklist

### Pre-Launch
- [ ] Domain registered: pgfishipping.com
- [ ] Cloudflare set up: DNS, SSL, CDN
- [ ] Railway account created + project set up
- [ ] PostgreSQL database created on Railway
- [ ] Redis instance created on Railway
- [ ] Resend.com account + domain verified for sending
- [ ] Cloudflare R2 bucket created: pgfishipping-files
- [ ] Aftership account + API key
- [ ] USPS Web Tools account
- [ ] Firebase project created
- [ ] MonCash merchant account (sandbox first)
- [ ] NatCash merchant account
- [ ] All environment variables set in Railway
- [ ] `npx prisma migrate deploy` run on production DB
- [ ] Super admin account seeded
- [ ] All email templates tested
- [ ] Default pricing rules seeded in database
- [ ] Default warehouses seeded (US + Haiti locations)

### Go-Live
- [ ] Backend deployed to Railway: api.pgfishipping.com
- [ ] Frontend deployed to Vercel: pgfishipping.com
- [ ] Admin panel deployed to Vercel: admin.pgfishipping.com
- [ ] All environment variables verified in production
- [ ] SSL certificates active on all domains
- [ ] Test: register → pre-alert → track → wallet deposit
- [ ] Test: all email notifications deliver correctly
- [ ] Test: admin can update tracking status + email fires
- [ ] Error monitoring set up (Sentry.io free tier)
- [ ] Uptime monitoring set up (UptimeRobot free)
- [ ] Database backups configured (Railway auto-backups)
- [ ] Mobile apps submitted to App Store + Play Store

### Monthly Costs Summary
| Service | Plan | Monthly Cost |
|---------|------|-------------|
| Railway (API + DB + Redis) | Hobby | ~$5 |
| Vercel (Frontend + Admin) | Free | $0 |
| Cloudflare R2 (Files) | Free 10GB | $0 |
| Cloudflare (CDN + DNS) | Free | $0 |
| Resend (Email) | Free 3k/mo | $0 |
| Aftership (Tracking) | Free 50/mo | $0 |
| Firebase (Push) | Free | $0 |
| UptimeRobot (Monitoring) | Free | $0 |
| Sentry (Errors) | Free | $0 |
| **Total to launch** | | **~$5/month** |
| **At 1,000+ customers** | Scale plans | ~$50–100/month |

---

## Quick Start Commands

```bash
# 1. Clone and install
git clone https://github.com/yourname/pgfishipping
cd pgfishipping/backend
npm install

# 2. Set up database
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed

# 3. Start development
npm run dev

# 4. Frontend
cd ../frontend
npm install
npm run dev

# 5. Admin
cd ../admin
npm install
npm run dev
```

---

*Document prepared for PGFI Shipping — pgfishipping.com*  
*Version 1.0.0 | April 2026*  
*Ready to share with development team or AI code editor (Cursor, Windsurf, GitHub Copilot)*
