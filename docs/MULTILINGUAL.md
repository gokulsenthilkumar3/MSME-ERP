# Multilingual Support — MSME ERP

## Overview

The MSME ERP supports **8 languages** targeting MSMEs in Tamil Nadu and the Nilgiris region:

| Code | Language | Script | Native Name | Region |
|------|----------|--------|-------------|--------|
| `en` | English | Latin | English | Global |
| `ta` | Tamil | Tamil | தமிழ் | Tamil Nadu |
| `ml` | Malayalam | Malayalam | മലയാളം | Kerala / TN border |
| `bad` | Badaga | Latin (no standard script) | Badaga | Nilgiris |
| `iru` | Irula | Tamil (adapted) | இருள | Nilgiris / Coimbatore |
| `tod` | Toda | Latin (IPA-based) | Tòdr | Nilgiris |
| `kot` | Kota | Tamil (adapted) | கோத | Nilgiris |
| `kur` | Kurumba (Alu/Jenu/Betta) | Kannada / Tamil | ಕುರುಂಬ | Nilgiris |

> ⚠️ Badaga, Irula, Toda, Kota, and Kurumba are **oral/endangered languages** with no universally standardized script. The translations provided here are phonetic approximations using the closest available script (Tamil, Kannada, or Latin). Community validation is strongly recommended before production use.

---

## Architecture

### Library
Use **`i18next`** with **`react-i18next`** for the frontend.

```bash
npm install i18next react-i18next i18next-browser-languagedetector i18next-http-backend
```

### File Structure

```
src/
  i18n/
    index.ts            # i18next configuration
    locales/
      en/common.json
      ta/common.json
      ml/common.json
      bad/common.json
      iru/common.json
      tod/common.json
      kot/common.json
      kur/common.json
```

### i18n Configuration (`src/i18n/index.ts`)

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'ta', 'ml', 'bad', 'iru', 'tod', 'kot', 'kur'],
    ns: ['common'],
    defaultNS: 'common',
    backend: { loadPath: '/locales/{{lng}}/{{ns}}.json' },
    interpolation: { escapeValue: false },
  });

export default i18n;
```

### Language Switcher Component

```tsx
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'en',  label: 'English' },
  { code: 'ta',  label: 'தமிழ்' },
  { code: 'ml',  label: 'മലയാളം' },
  { code: 'bad', label: 'Badaga' },
  { code: 'iru', label: 'இருள' },
  { code: 'tod', label: 'Toda' },
  { code: 'kot', label: 'கோத' },
  { code: 'kur', label: 'ಕುರುಂಬ' },
];

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  return (
    <select
      value={i18n.language}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
      aria-label="Select language"
    >
      {LANGUAGES.map((lang) => (
        <option key={lang.code} value={lang.code}>{lang.label}</option>
      ))}
    </select>
  );
};
```

---

## DB Schema Addition

Add a `user_language_preference` column to the `users` table:

```sql
ALTER TABLE users
ADD COLUMN language_code VARCHAR(10) NOT NULL DEFAULT 'en'
CHECK (language_code IN ('en','ta','ml','bad','iru','tod','kot','kur'));
```

---

## Notes on Tribal Languages

- **Badaga**: ~400,000 speakers in the Nilgiris. Uses a modified Latin or Tamil script. Translations here use phonetic Latin.
- **Irula**: ~200,000 speakers. Related to Tamil. Uses Tamil script with adaptations.
- **Toda**: ~1,500 speakers. Highly endangered. IPA/Latin transcription used.
- **Kota**: ~1,500 speakers. Related to Tamil-Kannada. Tamil script adaptation used.
- **Kurumba** (Alu / Jenu / Betta dialects): ~300,000 total. Kannada-influenced. Kannada script used.

For production, partner with **Nilgiris tribal language preservation societies** and **Tamil Nadu Tribal Welfare Department** for accurate translations.
