# PRD — MSME ERP (Local Language Micro-ERP)

## 1. Problem Statement

- Indian MSMEs must handle GST-compliant billing, digital payments, and tighter inventory control to stay competitive.
- Micro-businesses (2–5 staff) find existing ERP/billing tools too complex, English-centric, and costly.
- Result: manual ledgers, Excel files, and WhatsApp images → lost invoices, stock mismatch, late GST filings, and cash-flow issues.

## 2. Target Users

| Persona | Description |
|---|---|
| **Shop Owner** | Kirana, textile, pharma, hardware shops |
| **Service Owner** | Salon, repair shop, workshop (service + products) |
| **Trader / Wholesaler** | Manages multiple SKUs and bulk stock |

### User Constraints
- Uses Android phone heavily; maybe one old PC at shop
- Prefers local language (Tamil) for daily operations
- Limited time for training; wants "just works" flows

## 3. Goals and Non-Goals

### 3.1 Goals (v1)
- Create a GST-compliant invoice in under 30 seconds
- Track current stock and low-stock items
- Maintain customer dues and basic ledger
- Provide simple daily/weekly sales summaries
- Keep UX local-language first, usable with minimal training

### 3.2 Non-Goals (v1)
- Full accounting / general ledger
- Payroll, HR, and advanced financial reporting
- Multi-branch, large-enterprise workflows
- Deep e-commerce or POS hardware integration

## 4. Key User Stories

- As a shop owner, I want to create and share a GST invoice in Tamil so I can bill faster and look professional.
- As an owner, I want to know which items are low in stock so I can reorder before stock-outs.
- As an owner, I want to see a customer's outstanding balance so I know who to follow up with.
- As an owner, I want the app to work even when the internet is patchy so billing never stops.
- As an owner, I want local-language labels and errors so my staff can use the system confidently.

## 5. Scope (v1)

### 5.1 In Scope
- Tenant onboarding (phone-OTP, business details, GSTIN)
- Product and service catalog
- Sales invoicing:
  - GST fields: GSTIN (seller/buyer), HSN/SAC, tax rates, totals
  - PDF invoice + share via WhatsApp / email
- Inventory:
  - Stock quantity, low-stock threshold, stock movements per invoice
- Customer management:
  - Basic profile, GSTIN optional, running balance
- Dashboard:
  - Daily/weekly sales, top 5 products, dues summary
- Localisation:
  - Tamil UI text and validation errors, English fallback
- Offline:
  - Cache master data and unsynced invoices locally (IndexedDB)
  - Sync when online

### 5.2 Out of Scope (v1)
- Purchase invoices and supplier management
- Bank reconciliation
- Multi-warehouse inventory
- Native mobile apps (Android/iOS)
- Integrations with Tally / Odoo / government e-invoicing portals

## 6. Functional Requirements

| ID | Requirement |
|---|---|
| R1 | User can sign up using phone-OTP and create a business profile |
| R2 | User can configure GSTIN, shop address, and logo for invoice header |
| R3 | User can create/edit/delete products with price, GST rate, and stock |
| R4 | User can create customers with optional GSTIN and track dues |
| R5 | User can create invoices with line items, tax breakup, and totals |
| R6 | System auto-updates stock and customer ledger when invoice is finalised |
| R7 | User can generate and download PDF invoice |
| R8 | User can share invoice via WhatsApp link |
| R9 | User can view daily/weekly sales and dues summary |
| R10 | App supports Tamil and English; language toggleable per tenant |

## 7. Non-Functional Requirements

| Attribute | Requirement |
|---|---|
| Performance | Initial load < 3s on 4G |
| Reliability | No data loss on network drop; writes idempotent |
| Security | Tenant isolation via Supabase RLS; HTTPS everywhere |
| Usability | 2–3 taps for primary actions; large tap targets |
| Compliance | Invoice format aligned with basic GST layout |
| Platform | Chrome/Edge on Windows; Chrome on Android |

## 8. Success Metrics

- Time to create invoice (P90) < 30s after first week of usage
- ≥ 70% of users open app daily in their active month
- > 80% invoices generated with valid GST structure
- < 1% offline sync failures per tenant per month

## 9. Roadmap (v2+)

- Purchase and supplier management
- Simple P&L and tax summary reports
- Bank import and reconciliation
- Government e-invoicing / e-way bill portal integration
- Native Android app wrapping the PWA
- Multi-user roles (owner + staff)
