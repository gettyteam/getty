import { ref, onMounted } from 'vue';

declare global {
  interface Window {
    __i18n?: {
      getLanguage?: () => string;
      setLanguage?: (lang: string) => void;
    };
  }
}

export function useLanguage() {
  const currentLang = ref('en');
  const isMenuOpen = ref(false);

  function getCookie(name: string) {
    try {
      const cname = name + '=';
      const parts = document.cookie.split(';');
      for (let i = 0; i < parts.length; i++) {
        let c = parts[i].trim();
        if (c.indexOf(cname) === 0) return decodeURIComponent(c.substring(cname.length));
      }
    } catch (_) {}
    return null;
  }

  function setCookie(name: string, value: string, days: number) {
    try {
      const d = new Date();
      d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
      const expires = 'expires=' + d.toUTCString();
      const secure = location.protocol === 'https:' ? '; Secure' : '';
      document.cookie =
        name +
        '=' +
        encodeURIComponent(value) +
        '; ' +
        expires +
        '; Path=/' +
        '; SameSite=Lax' +
        secure;
    } catch (_) {}
  }

  function resolveLanguage() {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem('lang');
    } catch {}
    const cookieLang = getCookie('getty_lang');
    
    return (
      cookieLang ||
      saved ||
      (window.__i18n && window.__i18n.getLanguage && window.__i18n.getLanguage()) ||
      'en'
    );
  }

  function setLanguage(lang: string) {
    currentLang.value = lang;
    try {
      localStorage.setItem('lang', lang);
    } catch {}
    setCookie('getty_lang', lang, 365);
    
    try {
      if (window.__i18n && typeof window.__i18n.setLanguage === 'function') {
        window.__i18n.setLanguage(lang);
      }
    } catch (_) {}
    
  }

  function toggleMenu() {
    isMenuOpen.value = !isMenuOpen.value;
  }

  function closeMenu() {
    isMenuOpen.value = false;
  }

  onMounted(() => {
    const lang = resolveLanguage();
    setLanguage(lang);
  });

  return {
    currentLang,
    isMenuOpen,
    setLanguage,
    toggleMenu,
    closeMenu
  };
}
