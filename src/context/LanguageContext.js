import React, { createContext, useContext, useState } from 'react';
import { translations } from '../i18n/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [locale, setLocale] = useState('ar');

  const isRTL = locale === 'ar';

  const toggleLanguage = () => {
    setLocale(prev => (prev === 'ar' ? 'en' : 'ar'));
  };

  const t = (key, replacements = {}) => {
    const parts = key.split('.');
    let val = translations[locale];
    for (const part of parts) {
      if (val && typeof val === 'object') {
        val = val[part];
      } else {
        val = undefined;
        break;
      }
    }

    if (typeof val !== 'string') {
      // ✅ FIX 6: Fallback to English if Arabic key missing, then to key itself
      let fallback = translations['en'];
      for (const part of parts) {
        if (fallback && typeof fallback === 'object') {
          fallback = fallback[part];
        } else {
          fallback = undefined;
          break;
        }
      }
      return typeof fallback === 'string' ? fallback : key;
    }

    let result = val;
    Object.keys(replacements).forEach(rKey => {
      result = result.replace(`{${rKey}}`, replacements[rKey]);
    });

    return result;
  };

  return (
    <LanguageContext.Provider value={{ locale, isRTL, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
