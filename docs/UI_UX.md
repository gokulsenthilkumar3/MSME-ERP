# UI / UX Design — MSME ERP (Local Language)

## 1. Design Principles

1. **Multilingual-first** — supports 8 languages: English, Tamil (தமிழ்), Malayalam (മലയാളം), Badaga, Irula (இருள), Toda, Kota, and Kurumba (ಕುರುಂಬ); Tamil is the default.
2. **Speed over features** — every primary action in ≤ 3 taps.
3. **Offline confidence** — always show a visible sync status (online / offline / syncing).
4. **Low-literacy friendly** — icons alongside every label; never text-only actions.
5. **Mobile-first** — primary target is Android Chrome on a small screen (375–430px).
6. **Script-aware typography** — fonts must support Tamil, Malayalam, and Kannada scripts simultaneously.

---

## 2. Visual Style

### Color Palette

| Token | Hex | Usage |
|---|---|---|
| Primary | `#1A6B3C` | Buttons, active nav, CTA |
| Accent | `#F4A200` | Low-stock badges, alerts |
| Background | `#F9FAFB` | Page background |
| Surface | `#FFFFFF` | Cards, modals |
| Text Primary | `#111827` | Headings and body text |
| Text Muted | `#6B7280` | Placeholders, secondary labels |
| Danger | `#DC2626` | Errors, delete actions |
| Success | `#16A34A` | Paid status, completed actions |

### Typography
- System font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans Tamil', 'Noto Sans Malayalam', 'Noto Sans Kannada', sans-serif`
- **Noto Sans** variants cover all 8 language scripts without layout shift
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

| Tab | Icon | Label (shown in active language) |
|---|---|---|
| Home | 🏠 | Dashboard / முகப்பு / ഡാഷ്‌ബോർഡ് / Mule Patte |
| Invoices | 📄 | Invoice / பில்கள் / ഇൻവോയ്‌സ് / Hisa Patte |
| Products | 📦 | Product / பொருட்கள் / ഉൽപ്പന്നം / Vastu |
| Customers | 🙋 | Customer / வாடிக்கையாளர் / ഉപഭോക്താവ് / Giraaki |
| Settings | ⚙️ | Settings / அமைப்புகள் / ക്രമീകരണങ്ങൾ / Guritu |

### Header (all screens)
- Left: Shop name
- Center: Screen title (in user's active language)
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

> All text labels above are shown in the user's active language. The example above shows Tamil.

---

### 4.2 Create Invoice

**Step 1 — Customer**
- Searchable dropdown by name or phone
- "+ New Customer" inline modal (label in user's language)

**Step 2 — Add Items**
- Product search (name or SKU)
- Quantity input (numeric keyboard)
- Unit price auto-filled from product (editable)
- GST auto-calculated and shown inline
- "+ Add Product" row (label in user's language)
- Item list with swipe-to-delete

**Step 3 — Totals + Actions**
```
┌───────────────────────────────┐
│ மொத்தம் (before GST): ₹950   │
│ GST (5%):             ₹47.50 │
│ ─────────────────────────── │
│ கொடுக்க வேண்டியது:  ₹997.50 │
└───────────────────────────────┘
[ Save Draft ]  [ Generate Invoice ]
```

**Post-creation screen:**
- ✅ Invoice created! (in user's language)
- [ View PDF ] [ Share on WhatsApp ] [ New Invoice ]

---

### 4.3 Products

- List: name, SKU, unit price, stock quantity
- Low-stock badge: 🟡 on items below threshold
- FAB: `+ Add Product` (in user's language)
- Product detail / edit:
  - Price, GST %, HSN code, stock threshold
  - Stock adjustment modal: `+Add` / `-Reduce` with reason note

---

### 4.4 Customers

- List: name, phone, balance badge
  - 🔴 `₹3,200 Due` = customer owes (label in active language)
  - 🟢 `₹500 Advance` = advance paid
- Customer detail:
  - Total purchases, outstanding
  - Ledger timeline (newest first)
  - `[ Record Payment ]` button → amount + UPI/cash modal

---

### 4.5 Settings

- Business Profile (name, phone, address, GSTIN)
- Logo upload
- Invoice Preferences (prefix, starting number)
- **Language:**
  - Dropdown showing all 8 languages in their native script
  - Tribal languages marked with 🌿
  - Selected language takes effect immediately (no page reload)
  - Saved to `users.language_code` via `PATCH /me`
- Plan & Billing
- Export Data (CSV download)
- Logout

#### Language Switcher UI
```
┌──────────────────────────────────┐
│ 🌐 Language / மொழி / ഭാഷ        │
│ ┌────────────────────────────┐   │
│ │ ▼ தமிழ்                   │   │
│ └────────────────────────────┘   │
│   English                        │
│   தமிழ்                          │
│   മലയാളം                         │
│   Badaga 🌿                      │
│   இருள 🌿                        │
│   Toda 🌿                        │
│   Kota 🌿                        │
│   ಕುರುಂಬ 🌿                      │
└──────────────────────────────────┘
```

---

## 5. Localisation Rules

- All UI strings stored in `src/i18n/locales/{lang}/common.json`; **no hardcoded display strings** in React components.
- Fallback chain: `users.language_code` → `tenants.language` → `'en'`
- Date format: `DD-MM-YYYY` (e.g. `17-05-2026`) — consistent across all languages
- Number format: Indian grouping — `1,23,456.78` — consistent across all languages
- Currency: `₹` prefix, 2 decimal places — consistent across all languages
- Friendly validation messages in the user's active language:
  - ✅ `பொருளின் பெயர் தேவை` in Tamil
  - ✅ `Hesaru beku` in Badaga
  - ✅ `Product name is required` in English
- `document.documentElement.lang` updated on language change for screen reader support
- All `aria-label` attributes use the active language string via `t()` hook

### Supported Languages Reference

| Code | Language | Native Name | Script | Speakers | Tribal |
|------|----------|-------------|--------|----------|--------|
| `en` | English | English | Latin | Global | No |
| `ta` | Tamil | தமிழ் | Tamil | ~80M | No |
| `ml` | Malayalam | മലയാളം | Malayalam | ~38M | No |
| `bad` | Badaga | Badaga | Latin | ~400k | Yes 🌿 |
| `iru` | Irula | இருள | Tamil | ~200k | Yes 🌿 |
| `tod` | Toda | Toda | Latin | ~1.5k | Yes 🌿 |
| `kot` | Kota | Kota | Kannada/Tamil | ~1.5k | Yes 🌿 |
| `kur` | Kurumba | ಕುರುಂಬ | Kannada | ~300k | Yes 🌿 |

---

## 6. Accessibility

- All inputs have `aria-label` rendered via `t()` (active language)
- Color contrast ≥ 4.5:1 (WCAG AA) for all text — verified across all language scripts
- Minimum 44×44px touch targets on all buttons
- Focus states visible on all interactive elements
- Semantic HTML: `<button>`, `<label>`, `<nav>`, `<main>`
- `lang` attribute on `<html>` updated on language switch for assistive technology
- Noto Sans font family loaded to avoid missing glyph boxes for Tamil, Malayalam, Kannada scripts
