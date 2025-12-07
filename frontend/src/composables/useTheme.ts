import { ref, onMounted } from 'vue';

export function useTheme() {
  const isDark = ref(false);

  function resolveThemePreference(): 'dark' | 'light' {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem('theme');
    } catch (_) {}
    if (stored === 'dark' || stored === 'light') return stored;

    let legacy: string | null = null;
    try {
      legacy = localStorage.getItem('prefers-dark');
    } catch (_) {}
    if (legacy === '1') return 'dark';
    if (legacy === '0') return 'light';

    try {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    } catch (_) {
      return 'dark';
    }
  }

  function applyTheme(mode: 'dark' | 'light', persist: boolean = false) {
    const dark = mode === 'dark';
    isDark.value = dark;

    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.classList.toggle('light', !dark);
    try {
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    } catch (_) {}

    const body = document.body;
    if (body) {
      body.classList.toggle('dark', dark);
      body.classList.toggle('light', !dark);
    }

    if (persist) {
      try {
        localStorage.setItem('theme', dark ? 'dark' : 'light');
      } catch (_) {}
      try {
        localStorage.setItem('prefers-dark', dark ? '1' : '0');
      } catch (_) {}
    }
  }

  function toggleTheme() {
    const next = isDark.value ? 'light' : 'dark';
    applyTheme(next, true);
  }

  onMounted(() => {
    const initial = resolveThemePreference();
    applyTheme(initial, false);

    try {
      window.addEventListener('storage', (event) => {
        if (!event) return;
        if (event.storageArea && event.storageArea !== localStorage) return;
        if (event.key && event.key !== 'theme' && event.key !== 'prefers-dark') return;
        const mode = resolveThemePreference();
        applyTheme(mode, false);
      });
    } catch (_) {}
  });

  return {
    isDark,
    toggleTheme,
  };
}
