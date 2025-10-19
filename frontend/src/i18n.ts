import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import translationEN from "./locales/en/translation.json";
import translationTR from "./locales/tr/translation.json";

const resources = {
  tr: {
    translation: translationTR,
  },
  en: {
    translation: translationEN,
  },
};

// Get saved language from localStorage or default to Turkish
const savedLanguage = localStorage.getItem("language") || "tr";

i18n.use(initReactI18next).init({
  resources,
  lng: savedLanguage, // use saved language or default
  fallbackLng: "tr", // fallback to Turkish
  debug: false,

  interpolation: {
    escapeValue: false, // react already does escaping
  },

  // Allow empty values to fall back to key
  returnEmptyString: false,

  // Namespace and key separator
  keySeparator: ".",
  nsSeparator: ":",

  // React options
  react: {
    useSuspense: false,
  },
});

// Save language changes to localStorage
i18n.on("languageChanged", (lng) => {
  localStorage.setItem("language", lng);
});

export default i18n;
