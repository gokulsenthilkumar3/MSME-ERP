# UI / UX Design — MSME ERP (Local Language)

## 1. Design Principles

1. **Tamil-first** — all labels, placeholders, and validation messages in Tamil by default; English on toggle.
2. **Speed over features** — every primary action in ≤ 3 taps.
3. **Offline confidence** — always show a visible sync status (online / offline / syncing).
4. **Low-literacy friendly** — icons alongside every label; never text-only actions.
5. **Mobile-first** — primary target is Android Chrome on a small screen (375–430px).

---

## 2. Visual Style

### Color Palette

| Token        | Hex       | Usage                          |
| ------------ | --------- | ------------------------------ |
| Primary      | `#1A6B3C` | Buttons, active nav, CTA       |
| Accent       | `#F4A200` | Low-stock badges, alerts       |
| Background   | `#F9FAFB` | Page background                |
| Surface      | `#FFFFFF` | Cards, modals                  |
| Text Primary | `#111827` | Headings and body text         |
| Text Muted   | `#6B7280` | Placeholders, secondary labels |
| Danger       | `#DC2626` | Errors, delete actions         |
| Success      | `#16A34A` | Paid status, completed actions |

### Typography

- System font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- Headings: `font-semibold`, 18–24px
- Body: 14–16px
- Invoice totals: 20–28px (prominent)

### Spacing & Touch

- Minimum tap target: **44×44px**
- Card padding: 16px
- Form input height: 48px

---

## 3. Navigation

### Bottom Navigation (Mobile)

| Tab       | Icon | Tamil Label   |
| --------- | ---- | ------------- |
| Home      | 🏠   | முகப்பு       |
| Invoices  | 📄   | பில்கள்       |
| Products  | 📦   | பொருட்கள்     |
| Customers | 🙋   | வாடிக்கையாளர் |
| Settings  | ⚙️   | அமைப்புகள்    |

### Header (all screens)

- Left: Shop name
- Center: Screen title
- Right: Sync status (🟢 online / ⚫ offline / 🔄 syncing)

---

## 4. Key Screens

### 4.1 Dashboard (Home)

```
┌─────────────────────────────────┐
│ 🏪 கடை பெயர்        🟢 ஆன்லைன் │
├─────────────────────────────────┤
│ ┌──────────┐  ┌───────────────┐ │
│ │ இன்றைய  │  │ நிலுவை தொகை │ │
│ │ விற்பனை │  │ ₹12,400       │ │
│ │ ₹8,250  │  └───────────────┘ │
│ └──────────┘                   │
│ ┌─────────────────────────────┐ │
│ │ ⚠️ குறைவு சரக்கு: 3 பொருட்│ │
│ └─────────────────────────────┘ │
│ Quick Actions:                  │
│ [+ பில்] [+ பொருள்] [+ வாடிக்கை]│
│─────────────────────────────────│
│ சமீபத்திய பில்கள்               │
│ • Kumar — ₹1,200 — Paid ✅      │
│ • Ravi Store — ₹3,400 — Pending │
└─────────────────────────────────┘
```

---

### 4.2 Create Invoice

**Step 1 — Customer**

- Searchable dropdown by name or phone
- "+ புதிய வாடிக்கையாளர்" inline modal

**Step 2 — Add Items**

- Product search (name or SKU)
- Quantity input (numeric keyboard)
- Unit price auto-filled from product (editable)
- GST auto-calculated and shown inline
- "+ பொருள் சேர்" row
- Item list with swipe-to-delete

**Step 3 — Totals + Actions**

```
┌───────────────────────────────┐
│ மொத்தம் (before GST): ₹950   │
│ GST (5%):             ₹47.50 │
│ ─────────────────────────── │
│ கொடுக்க வேண்டியது:  ₹997.50 │
└───────────────────────────────┘
[ வரைவு சேமி ]  [ பில் உருவாக்கு ]
```

**Post-creation screen:**

- ✅ பில் உருவாக்கப்பட்டது!
- [ PDF பார்க்க ] [ WhatsApp-ல் அனுப்பு ] [ புதிய பில் ]

---

### 4.3 Products

- List: name, SKU, unit price, stock quantity
- Low-stock badge: 🟡 on items below threshold
- FAB: `+ பொருள் சேர்`
- Product detail / edit:
  - Price, GST %, HSN code, stock threshold
  - Stock adjustment modal: `+சேர்` / `-குறை` with reason note

---

### 4.4 Customers

- List: name, phone, balance badge
  - 🔴 `₹3,200 நிலுவை` = customer owes
  - 🟢 `₹500 முன்பணம்` = advance paid
- Customer detail:
  - Total purchases, outstanding
  - Ledger timeline (newest first)
  - `[ பணம் பெற்றது ]` button → amount + UPI/cash modal

---

### 4.5 Settings

- Business Profile (name, phone, address, GSTIN)
- Logo upload
- Invoice Preferences (prefix, starting number)
- Language toggle: தமிழ் / English
- Plan & Billing
- Export Data (CSV download)
- Logout

---

## 5. Localisation Rules

- All labels and errors in Tamil; English available via toggle.
- Date format: `DD-MM-YYYY` (e.g. `17-05-2026`)
- Number format: Indian grouping — `1,23,456.78`
- Currency: `₹` prefix, 2 decimal places
- Friendly validation messages:
  - ✅ `பொருளின் பெயர் தேவை` (not "name is required")
  - ✅ `GST விகிதம் சரியாக இல்லை` (not "invalid gst_rate")

---

## 6. Accessibility

- All inputs have `aria-label` in Tamil
- Color contrast ≥ 4.5:1 (WCAG AA) for all text
- Minimum 44×44px touch targets on all buttons
- Focus states visible on all interactive elements
- Semantic HTML: `<button>`, `<label>`, `<nav>`, `<main>`
