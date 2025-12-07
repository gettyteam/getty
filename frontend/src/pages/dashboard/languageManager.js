import { ref } from 'vue';
import enTranslations from 'shared-i18n/en.json';
import esTranslations from 'shared-i18n/es.json';

const FALLBACK_TRANSLATIONS = {
  en: enTranslations,
  es: esTranslations
};

export const currentLanguage = ref('en');
export const i18nTrigger = ref(0);

function normalizeLanguageCode(lang) {
  if (!lang || typeof lang !== 'string') return 'en';
  const code = lang.toLowerCase().split('-')[0];
  return ['en', 'es'].includes(code) ? code : 'en';
}

function getStoredLanguage() {
  if (typeof localStorage === 'undefined') return 'en';
  return (
    localStorage.getItem('getty-language') ||
    localStorage.getItem('lang') ||
    localStorage.getItem('language') ||
    'en'
  );
}

currentLanguage.value = normalizeLanguageCode(getStoredLanguage());

export const languageManager = {
  current: currentLanguage.value,
  
  getText(key) {
    i18nTrigger.value;

    const lang = currentLanguage.value;
    const bundle = FALLBACK_TRANSLATIONS[lang] || FALLBACK_TRANSLATIONS.en;
    
    if (bundle && Object.prototype.hasOwnProperty.call(bundle, key)) {
      return bundle[key];
    }
    
    if (lang !== 'en' && FALLBACK_TRANSLATIONS.en && Object.prototype.hasOwnProperty.call(FALLBACK_TRANSLATIONS.en, key)) {
      return FALLBACK_TRANSLATIONS.en[key];
    }
    
    return key;
  },

  setLanguage(lang) {
    const newLang = normalizeLanguageCode(lang);
    if (currentLanguage.value !== newLang) {
      currentLanguage.value = newLang;
      this.current = newLang;
      i18nTrigger.value++;
      
      document.documentElement.lang = newLang;
      this.updatePageLanguage();
      
      localStorage.setItem('getty-language', newLang);
    }
  },

  updatePageLanguage() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        const text = this.getText(key);

        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            if (el.hasAttribute('placeholder')) {
                el.setAttribute('placeholder', text);
            }
        } else {
            el.textContent = text;
        }
      }
    });
  }
};

window.languageManager = languageManager;

window.addEventListener('storage', (e) => {
  if (['getty-language', 'lang', 'language'].includes(e.key)) {
    const newLang = normalizeLanguageCode(e.newValue);
    if (newLang !== currentLanguage.value) {
      languageManager.setLanguage(newLang);
    }
  }
});

export default languageManager;
