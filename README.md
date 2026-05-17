# 🏪 MSME ERP — Local Language Micro-ERP

A mobile-first, Tamil-friendly ERP for Indian MSMEs focused on **billing, inventory, customers, and payments**. The goal is to give a kirana / small shop owner a tool that is simpler than a full ERP but more reliable than notebooks and WhatsApp screenshots.

## Problem

- Micro and small businesses are being pushed toward GST compliance, digital billing, and better inventory control.
- Existing ERP/billing tools are often English-heavy, complex, and priced for bigger SMEs, not a 2–5 person shop.
- Result: owners juggle notebooks, partial Excel sheets, and ad-hoc billing apps — leading to stock mismatch, missed dues, and GST stress.

## Vision

> **"A shop owner should be able to create a GST-ready bill in under 30 seconds, know what is out of stock at a glance, and see who still owes money — all in their own language."**

## High-Level Features (v1)

- GST-ready invoice creation (HSN/SAC, GSTIN, tax split)
- Inventory: stock in/out, low-stock alerts
- Customers: simple ledger and dues tracking
- Dashboard: today's sales, weekly trend, top items, dues summary
- Tamil-first UI with English toggle
- Offline-first PWA that syncs when the network comes back

## Tech Stack (Planned)

| Layer | Tech |
|---|---|
| Frontend | React 18 + TypeScript + TailwindCSS (PWA) |
| Backend | Node.js + Express (TypeScript) |
| Database | Supabase (Postgres + RLS) |
| Auth | Supabase Phone-OTP |
| Storage | Supabase Storage (logos, PDFs) |
| Hosting | Vercel (web) + Render (API) |

## Repo Structure

```text
MSME-ERP/
├── apps/
│   ├── web/          # React PWA
│   └── api/          # Node.js REST API
├── packages/
│   └── ui/           # Shared component library
├── infra/            # Docker, CI/CD configs
├── docs/             # All documentation
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── DB_SCHEMA.md
│   ├── API_DESIGN.md
│   └── UI_UX.md
└── README.md
```

## Documentation

| Doc | Description |
|---|---|
| [PRD](docs/PRD.md) | Product requirements, user stories, scope |
| [Architecture](docs/ARCHITECTURE.md) | System design, components, data flows |
| [DB Schema](docs/DB_SCHEMA.md) | Tables, columns, relationships |
| [API Design](docs/API_DESIGN.md) | REST endpoints and contracts |
| [UI/UX](docs/UI_UX.md) | Screens, flows, design principles |

## Status

🚧 **Early design phase** — documentation complete, walking skeleton in progress.

## License

MIT
