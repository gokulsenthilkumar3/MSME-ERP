import React from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, LanguageCode } from './index';

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value as LanguageCode;
    i18n.changeLanguage(lang);
    document.documentElement.lang = lang;
    // Set RTL/LTR — all supported languages are LTR
    document.documentElement.dir = 'ltr';
  };

  return (
    <div className="language-switcher" role="navigation" aria-label="Language selection">
      <select
        value={i18n.language}
        onChange={handleChange}
        aria-label="Select language"
        title="Select language"
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
            {lang.tribal ? ' 🌿' : ''}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSwitcher;
