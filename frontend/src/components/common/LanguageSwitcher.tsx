import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'tr' ? 'en' : 'tr';
    i18n.changeLanguage(nextLang);
    localStorage.setItem('language', nextLang);
  };

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      aria-label={i18n.language === 'tr' ? 'Switch to English' : 'Türkçeye geç'}
      className={`w-5 h-5 text-[10px] flex items-center justify-center rounded-full border transition-colors
        ${i18n.language === 'tr' ? 'bg-primary-600 text-white' : 'bg-primary-600 text-white'}
        hover:bg-primary-600 hover:text-white`}
      title={i18n.language === 'tr' ? 'English' : 'Türkçe'}
    >
      {i18n.language === 'tr' ? 'TR' : 'EN'}
    </button>
  );
};

export default LanguageSwitcher;
