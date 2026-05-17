-- ============================================================
-- MSME ERP — Supabase Database Schema Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. tenants
-- ============================================================
CREATE TABLE IF NOT EXISTS tenants (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  gstin         TEXT,
  phone         TEXT NOT NULL,
  address       TEXT DEFAULT '',
  logo_url      TEXT,
  language      TEXT DEFAULT 'ta' CHECK (language IN ('ta', 'en')),
  plan          TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'business')),
  invoice_prefix TEXT DEFAULT 'INV',
  invoice_seq   INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone       TEXT NOT NULL,
  name        TEXT NOT NULL,
  role        TEXT DEFAULT 'owner' CHECK (role IN ('owner', 'staff')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);

-- ============================================================
-- 3. products
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  sku                   TEXT NOT NULL,
  unit                  TEXT DEFAULT 'pcs' CHECK (unit IN ('pcs', 'kg', 'litre', 'box', 'pack', 'set')),
  price                 NUMERIC(10,2) NOT NULL DEFAULT 0,
  gst_rate              NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (gst_rate IN (0, 5, 12, 18, 28)),
  hsn_code              TEXT DEFAULT '',
  stock_qty             NUMERIC(10,3) DEFAULT 0,
  low_stock_threshold   NUMERIC(10,3) DEFAULT 10,
  is_active             BOOLEAN DEFAULT true,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_tenant_sku ON products(tenant_id, sku);
CREATE INDEX IF NOT EXISTS idx_products_tenant_name ON products(tenant_id, name);

-- ============================================================
-- 4. customers
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  phone       TEXT DEFAULT '',
  gstin       TEXT,
  address     TEXT DEFAULT '',
  balance     NUMERIC(10,2) DEFAULT 0, -- positive = owes us, negative = advance
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_tenant_phone ON customers(tenant_id, phone);

-- ============================================================
-- 5. invoices
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id   UUID NOT NULL REFERENCES customers(id),
  invoice_no    TEXT NOT NULL,
  invoice_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date      DATE,
  subtotal      NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_gst     NUMERIC(10,2) NOT NULL DEFAULT 0,
  total         NUMERIC(10,2) NOT NULL DEFAULT 0,
  status        TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue')),
  pdf_url       TEXT,
  notes         TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant_date ON invoices(tenant_id, invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(tenant_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_no ON invoices(tenant_id, invoice_no);

-- ============================================================
-- 6. invoice_items
-- ============================================================
CREATE TABLE IF NOT EXISTS invoice_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id  UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id),
  qty         NUMERIC(10,3) NOT NULL,
  unit_price  NUMERIC(10,2) NOT NULL,
  gst_rate    NUMERIC(5,2) NOT NULL DEFAULT 0,
  line_total  NUMERIC(10,2) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

-- ============================================================
-- 7. ledger_entries
-- ============================================================
CREATE TABLE IF NOT EXISTS ledger_entries (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id   UUID NOT NULL REFERENCES customers(id),
  type          TEXT NOT NULL CHECK (type IN ('debit', 'credit')),
  amount        NUMERIC(10,2) NOT NULL,
  reference_id  UUID,
  note          TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ledger_customer_date ON ledger_entries(customer_id, created_at DESC);

-- ============================================================
-- 8. stock_movements
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_movements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id),
  movement_type   TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
  qty             NUMERIC(10,3) NOT NULL,
  reference_id    UUID,
  note            TEXT DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_product_date ON stock_movements(product_id, created_at DESC);

-- ============================================================
-- Row Level Security — Enable & Apply on all business tables
-- ============================================================

ALTER TABLE tenants         ENABLE ROW LEVEL SECURITY;
ALTER TABLE users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices        ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Users can read their own tenant
CREATE POLICY "tenant_read" ON tenants
  FOR SELECT USING (id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "tenant_update" ON tenants
  FOR UPDATE USING (id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Users see only their own user record
CREATE POLICY "user_self" ON users
  FOR ALL USING (id = auth.uid());

-- Tenant isolation for all business tables
CREATE POLICY "tenant_isolation_products" ON products
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "tenant_isolation_customers" ON customers
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "tenant_isolation_invoices" ON invoices
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "tenant_isolation_invoice_items" ON invoice_items
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "tenant_isolation_ledger" ON ledger_entries
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "tenant_isolation_stock_movements" ON stock_movements
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));
