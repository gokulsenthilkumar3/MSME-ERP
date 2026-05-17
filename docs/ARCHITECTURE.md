# Architecture — MSME ERP

## 1. High-Level Diagram

```text
┌─────────────────────────────┐
│   React PWA (Vercel CDN)    │
│   apps/web                  │
└────────────┬────────────────┘
             │ HTTPS / REST
             ▼
┌─────────────────────────────┐
│  Node.js API (Render)       │
│  apps/api                   │
└──┬──────────────────────────┘
   │
   ├──→ Supabase Postgres (RLS)
   ├──→ Supabase Auth (Phone OTP)
   └──→ Supabase Storage (PDFs, logos)

Offline Path:
[React PWA] → [Service Worker + IndexedDB]
                      │
              queue writes locally
                      │
              sync to API on reconnect
```

## 2. Components

### 2.1 Frontend (`apps/web`)

- **React 18 + TypeScript + Vite** — fast build, tree-shakeable
- **TailwindCSS + shadcn/ui** — component library, accessible
- **React Query** — server state (invoices, products, customers)
- **Zustand** — UI state (language preference, active tenant)
- **i18next** — Tamil / English localisation
- **Workbox (service worker)** for:
  - App shell caching
  - IndexedDB caching: products, customers, unsynced invoices
  - Background sync on reconnect
- **@react-pdf/renderer** — client-side PDF generation

### 2.2 Backend (`apps/api`)

- **Node.js + Express (TypeScript)**
- **Zod** — request validation
- **Supabase JS client** — DB queries + Auth JWT verification
- **Prisma ORM** — type-safe DB abstraction
- **Bull + Upstash Redis** — background jobs (PDF gen, email)

### 2.3 Database (Supabase Postgres)

- Core business tables (see `DB_SCHEMA.md`)
- **Row Level Security (RLS)** on every table
  - Policy: tenant sees only their own rows
- Supabase Realtime for low-stock dashboard updates

### 2.4 Storage (Supabase Storage)

- Buckets: `logos` (tenant logos), `invoices` (generated PDFs)
- Signed URLs for PDF download / share

### 2.5 Infrastructure & CI/CD

| Service        | Purpose                                        |
| -------------- | ---------------------------------------------- |
| Vercel         | Host React PWA (auto-deploy from `main`)       |
| Render         | Host Node.js API (Docker container)            |
| Supabase       | Postgres + Auth + Storage + Realtime           |
| Upstash Redis  | Bull queue for background jobs                 |
| GitHub Actions | Lint → Test → Build → Deploy on push to `main` |

## 3. Data Flows

### 3.1 Sign-up / Login

```text
1. User enters phone number on PWA
2. PWA → Supabase Auth: request OTP
3. User enters OTP
4. Supabase returns JWT
5. PWA stores JWT (memory + localStorage)
6. First login: user completes tenant onboarding (name, GSTIN, etc.)
7. API stores tenant record; RLS policies activated
```

### 3.2 Invoice Creation (Online)

```text
1. PWA loads products + customers from cache (IndexedDB)
2. User selects customer, adds line items
3. PWA calculates taxes + totals locally (instant feedback)
4. User taps "Generate Invoice"
5. PWA → POST /api/v1/invoices
6. API:
   a. Validates payload (Zod)
   b. Saves invoice + items to DB
   c. Deducts stock via stock_movements
   d. Updates customer balance via ledger_entries
   e. Enqueues PDF generation job
7. PDF stored in Supabase Storage
8. Signed URL returned to PWA
9. PWA shows "Share on WhatsApp" button
```

### 3.3 Invoice Creation (Offline)

```text
1-3. Same as online flow
4. User taps "Generate Invoice"
5. Service worker detects offline
6. Invoice saved to IndexedDB queue
7. Local invoice number assigned (prefixed "DRAFT-")
8. On reconnect → Background Sync fires
9. Queued invoices POSTed to API in order
10. Invoice numbers normalised server-side
```

### 3.4 Low-Stock Alert

```text
1. Each invoice update triggers stock_movements insert
2. API checks: stock_qty < low_stock_threshold
3. Flag stored on product record
4. Supabase Realtime pushes update to PWA dashboard
5. Dashboard badge shows count of low-stock items
```

## 4. Multi-Tenancy & Security

- Every API request requires `Authorization: Bearer <jwt>`
- API middleware verifies JWT and attaches `tenant_id` to request context
- All DB queries scoped: `WHERE tenant_id = :tenantId`
- Supabase RLS provides DB-level enforcement (defense-in-depth)
- No cross-tenant aggregations anywhere in query layer
- HTTPS enforced on all services; HSTS on Vercel
- Rate limiting: 100 req/min per tenant on API
