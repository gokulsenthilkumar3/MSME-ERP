# DB Schema — MSME ERP

> All business tables include: `id UUID PRIMARY KEY`, `tenant_id UUID FK → tenants.id`, `created_at TIMESTAMPTZ DEFAULT now()`, `updated_at TIMESTAMPTZ DEFAULT now()`

## Entity Relationship Overview

```text
tenants ──< users
tenants ──< products
tenants ──< customers
tenants ──< invoices ──< invoice_items >── products
invoices ──< ledger_entries >── customers
invoices ──< stock_movements >── products
```

---

## 1. tenants

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| name | TEXT | Business name |
| gstin | TEXT | Nullable, validated format |
| phone | TEXT | Primary contact |
| address | TEXT | |
| logo_url | TEXT | Supabase Storage URL |
| language | TEXT | Default language for the tenant — see valid codes below |
| plan | TEXT | `'free'` / `'pro'` / `'business'` |
| invoice_prefix | TEXT | e.g. `'INV'` |
| invoice_seq | INT | Auto-incrementing counter |

**`language` valid values:** `'en'` `'ta'` `'ml'` `'bad'` `'iru'` `'tod'` `'kot'` `'kur'`  
Default: `'ta'`  
This sets the default language for all new staff users under this tenant.

---

## 2. users

| Column | Type | Notes |
|---|---|---|
| id | UUID | Matches Supabase Auth user id |
| tenant_id | UUID | FK → tenants.id |
| phone | TEXT | |
| name | TEXT | |
| role | TEXT | `'owner'` / `'staff'` |
| language_code | TEXT | Per-user language override; defaults to tenant's `language` |

**`language_code` constraint:**
```sql
ALTER TABLE users
  ADD COLUMN language_code TEXT NOT NULL DEFAULT 'en',
  ADD CONSTRAINT users_language_code_check
    CHECK (language_code IN ('en','ta','ml','bad','iru','tod','kot','kur'));
```

**Fallback resolution order:** `users.language_code` → `tenants.language` → `'en'`

---

## 3. products

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK |
| name | TEXT | |
| sku | TEXT | |
| unit | TEXT | `pcs` / `kg` / `litre` / `box` |
| price | NUMERIC(10,2) | Default selling price |
| gst_rate | NUMERIC(5,2) | 0 / 5 / 12 / 18 / 28 |
| hsn_code | TEXT | |
| stock_qty | NUMERIC(10,3) | Current stock |
| low_stock_threshold | NUMERIC(10,3) | Alert trigger |
| is_active | BOOLEAN | Soft delete |

**Indexes:**
- `idx_products_tenant_sku (tenant_id, sku)`
- `idx_products_tenant_name (tenant_id, name)`

---

## 4. customers

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK |
| name | TEXT | |
| phone | TEXT | |
| gstin | TEXT | Nullable |
| address | TEXT | |
| balance | NUMERIC(10,2) | Running balance (+ = dues, - = advance) |

**Index:** `idx_customers_tenant_phone (tenant_id, phone)`

---

## 5. invoices

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK |
| customer_id | UUID | FK → customers.id |
| invoice_no | TEXT | Auto-generated (INV-0001) |
| invoice_date | DATE | |
| due_date | DATE | Nullable |
| subtotal | NUMERIC(10,2) | Before tax |
| total_gst | NUMERIC(10,2) | Total tax amount |
| total | NUMERIC(10,2) | Grand total |
| status | TEXT | `'draft'` / `'sent'` / `'paid'` / `'overdue'` |
| pdf_url | TEXT | Supabase Storage URL |
| notes | TEXT | Nullable |

**Indexes:**
- `idx_invoices_tenant_date (tenant_id, invoice_date DESC)`
- `idx_invoices_status (tenant_id, status)`

---

## 6. invoice_items

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| invoice_id | UUID | FK → invoices.id |
| tenant_id | UUID | FK (denormalised for RLS) |
| product_id | UUID | FK → products.id |
| qty | NUMERIC(10,3) | |
| unit_price | NUMERIC(10,2) | Snapshot at time of invoice |
| gst_rate | NUMERIC(5,2) | Snapshot |
| line_total | NUMERIC(10,2) | qty × unit_price |

---

## 7. ledger_entries

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK |
| customer_id | UUID | FK → customers.id |
| type | TEXT | `'debit'` (customer owes) / `'credit'` (customer paid) |
| amount | NUMERIC(10,2) | |
| reference_id | UUID | Nullable — invoice id |
| note | TEXT | |

**Index:** `idx_ledger_customer_date (customer_id, created_at DESC)`

---

## 8. stock_movements

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK |
| product_id | UUID | FK → products.id |
| movement_type | TEXT | `'in'` / `'out'` / `'adjustment'` |
| qty | NUMERIC(10,3) | |
| reference_id | UUID | Nullable — invoice id |
| note | TEXT | |

**Index:** `idx_stock_product_date (product_id, created_at DESC)`

---

## RLS Policy Example

```sql
-- Apply same pattern to all business tables
CREATE POLICY tenant_isolation ON products
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );
```

---

## 9. i18n / Language Migration

### Migration: Add `language_code` to `users`

```sql
-- Migration: 20260517_add_language_code_to_users.sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS language_code TEXT NOT NULL DEFAULT 'en';

ALTER TABLE users
  ADD CONSTRAINT users_language_code_check
    CHECK (language_code IN ('en','ta','ml','bad','iru','tod','kot','kur'));

COMMENT ON COLUMN users.language_code IS
  'Per-user UI language. Supported: en, ta, ml, bad (Badaga), iru (Irula), tod (Toda), kot (Kota), kur (Kurumba).';
```

### Migration: Update `tenants.language` constraint

```sql
-- Migration: 20260517_update_tenant_language_constraint.sql
ALTER TABLE tenants
  DROP CONSTRAINT IF EXISTS tenants_language_check;

ALTER TABLE tenants
  ADD CONSTRAINT tenants_language_check
    CHECK (language IN ('en','ta','ml','bad','iru','tod','kot','kur'));

COMMENT ON COLUMN tenants.language IS
  'Default language for this tenant. New staff users inherit this. Supported: en, ta, ml, bad, iru, tod, kot, kur.';
```
