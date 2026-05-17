# API Design — MSME ERP

**Base URL:** `https://api.msme-erp.local/v1`  
**Auth:** `Authorization: Bearer <supabase_jwt>` on all routes except `/auth/*`

---

## 1. Auth

### POST `/auth/otp/send`
Trigger OTP to phone number via Supabase Auth.

**Body:**
```json
{ "phone": "+91XXXXXXXXXX" }
```

**Response:** `200 OK`
```json
{ "message": "OTP sent" }
```

---

### POST `/auth/otp/verify`
Verify OTP and return JWT.

**Body:**
```json
{ "phone": "+91XXXXXXXXXX", "otp": "123456" }
```

**Response:** `200 OK`
```json
{
  "token": "<jwt>",
  "is_new": true,
  "user": { "id": "uuid", "phone": "+91...", "tenant_id": null }
}
```

---

### GET `/me`
Return current user and tenant profile.

---

### PATCH `/me/tenant`
Update tenant profile (name, GSTIN, address, language, invoice_prefix).

---

## 2. Products

| Method | Endpoint | Description |
|---|---|---|
| GET | `/products` | List products (search, page, limit) |
| POST | `/products` | Create product |
| GET | `/products/:id` | Get product detail |
| PATCH | `/products/:id` | Update product |
| DELETE | `/products/:id` | Soft-delete product |
| GET | `/products/low-stock` | Products below threshold |
| POST | `/products/:id/stock` | Manual stock adjustment |

**POST `/products` body:**
```json
{
  "name": "Rice",
  "sku": "RICE-001",
  "unit": "kg",
  "price": 55.00,
  "gst_rate": 5,
  "hsn_code": "1006",
  "stock_qty": 100,
  "low_stock_threshold": 20
}
```

---

## 3. Customers

| Method | Endpoint | Description |
|---|---|---|
| GET | `/customers` | List customers |
| POST | `/customers` | Create customer |
| GET | `/customers/:id` | Customer detail + balance |
| PATCH | `/customers/:id` | Update customer |
| GET | `/customers/:id/ledger` | Ledger entries (paginated) |
| POST | `/customers/:id/payment` | Record a payment (credit entry) |

---

## 4. Invoices

| Method | Endpoint | Description |
|---|---|---|
| GET | `/invoices` | List invoices (filter: status, date range, customer) |
| POST | `/invoices` | Create + finalise invoice |
| GET | `/invoices/:id` | Invoice detail with items |
| PATCH | `/invoices/:id/status` | Update status (paid/overdue) |
| GET | `/invoices/:id/pdf` | Get signed PDF URL |
| POST | `/invoices/:id/share` | Get WhatsApp share URL |

**POST `/invoices` body:**
```json
{
  "customer_id": "uuid",
  "invoice_date": "2026-05-17",
  "due_date": "2026-05-31",
  "notes": "Monthly supply",
  "items": [
    {
      "product_id": "uuid",
      "qty": 10,
      "unit_price": 55.00,
      "gst_rate": 5
    }
  ]
}
```

**Server side effects on POST:**
- Generates `invoice_no` (INV-0001 sequence)
- Inserts `invoice_items`
- Inserts `stock_movements` (type: `out`)
- Updates `products.stock_qty`
- Inserts `ledger_entries` (type: `debit` on customer)
- Updates `customers.balance`
- Enqueues PDF generation job

---

## 5. Dashboard

| Method | Endpoint | Description |
|---|---|---|
| GET | `/dashboard/summary` | Today's sales, invoice count, dues total |
| GET | `/dashboard/top-products` | Top 5 products by revenue (7/30 days) |
| GET | `/dashboard/top-customers` | Top 5 customers by spend |
| GET | `/dashboard/sales-trend` | Daily sales for last 30 days (chart data) |

---

## 6. Error Format

All errors follow this structure:

```json
{
  "error": "VALIDATION_ERROR",
  "message": "gst_rate must be 0, 5, 12, 18, or 28",
  "field": "gst_rate",
  "status": 422
}
```

| Code | HTTP Status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Invalid request body |
| `NOT_FOUND` | 404 | Resource not found |
| `UNAUTHORIZED` | 401 | Missing / invalid JWT |
| `FORBIDDEN` | 403 | Resource belongs to another tenant |
| `CONFLICT` | 409 | Duplicate SKU, invoice no, etc. |
| `SERVER_ERROR` | 500 | Unexpected server error |
