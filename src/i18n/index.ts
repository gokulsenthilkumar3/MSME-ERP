import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

/**
 * Supported languages for MSME ERP
 * Nilgiris tribal languages (bad, iru, tod, kot, kur) use phonetic transliterations.
 * Community validation is recommended before production deployment.
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'en',  label: 'English',    script: 'Latin',     speakers: 'Global' },
  { code: 'ta',  label: 'தமிழ்',      script: 'Tamil',     speakers: '~80M' },
  { code: 'ml',  label: 'മലയാളം',    script: 'Malayalam', speakers: '~38M' },
  { code: 'bad', label: 'Badaga',     script: 'Latin',     speakers: '~400k', tribal: true },
  { code: 'iru', label: 'இருள',      script: 'Tamil',     speakers: '~200k', tribal: true },
  { code: 'tod', label: 'Toda',       script: 'Latin',     speakers: '~1.5k', tribal: true },
  { code: 'kot', label: 'Kota',       script: 'Kannada',   speakers: '~1.5k', tribal: true },
  { code: 'kur', label: 'ಕುರುಂಬ',   script: 'Kannada',   speakers: '~300k', tribal: true },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    ns: ['common'],
    defaultNS: 'common',
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'msme_erp_lang',
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
