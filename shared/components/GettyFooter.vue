<template>
  <footer class="getty-footer mt-10 text-xs text-[var(--text-secondary)]" role="contentinfo">
    <div class="max-w-7xl mx-auto px-6">
      <div class="border-t border-border pt-6"></div>

      <div class="flex flex-col md:flex-row md:items-center gap-6">
        <div class="flex items-center md:shrink-0">
          <a
            :href="siteUrl"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center hover:text-[var(--text-primary)]"
            :aria-label="t('footerSite', 'Website')"
            :title="t('footerSite', 'Website')">
            <img
              :src="leftLogoLightSrc"
              alt="getty"
              class="h-8 w-auto getty-footer-logo-light"
              decoding="async"
              loading="lazy" />
            <img
              :src="leftLogoDarkSrc"
              alt="getty"
              class="h-8 w-auto getty-footer-logo-dark"
              decoding="async"
              loading="lazy" />
          </a>
        </div>

        <!-- eslint-disable vue/no-v-html -->
        <div class="flex-1 leading-relaxed" v-html="copyrightHtml"></div>
        <!-- eslint-enable vue/no-v-html -->

        <div class="flex items-center md:shrink-0 md:justify-end">
          <img
            :src="rightLogoSrc"
            alt="getty"
            class="h-8 w-8 rounded"
            decoding="async"
            loading="lazy" />
        </div>
      </div>

      <div class="border-t border-border mt-4 mb-6"></div>

      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <nav
          class="flex flex-wrap items-center gap-x-2 gap-y-1"
          :aria-label="t('footerLinks', 'Footer')">
          <a
            :href="privacyUrl"
            target="_blank"
            rel="noopener"
            class="hover:text-[var(--text-primary)]">
            {{ t('footerPrivacy', 'Privacy Policy') }}
          </a>
          <span aria-hidden="true">|</span>
          <a
            :href="termsUrl"
            target="_blank"
            rel="noopener"
            class="hover:text-[var(--text-primary)]">
            {{ t('footerTerms', 'Terms of Use') }}
          </a>
          <span aria-hidden="true">|</span>
          <a
            :href="githubUrl"
            target="_blank"
            rel="noopener"
            class="hover:text-[var(--text-primary)]">
            {{ t('footerGithub', 'GitHub') }}
          </a>
        </nav>

        <div class="flex items-center gap-3">
          <a
            :href="odyseeUrl"
            :aria-label="t('footerOdysee', 'Odysee')"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center hover:text-[var(--text-primary)]"
            :title="t('footerOdysee', 'Odysee')">
            <svg viewBox="0 0 192 192" width="16" height="16" fill="none" aria-hidden="true">
              <path
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="12.096"
                d="M98.612 39.193c7.085.276 9.76 4.503 12.192 10.124 3.249 7.494.988 10.141-12.192 13.85-13.187 3.74-19.535-1.171-20.404-10.115-.976-10.115 11.684-12.729 11.684-12.729 3.495-.876 6.36-1.226 8.72-1.13zm65.362 107.42c2.54-9.665-6.121-19.201-11.2-27.806-4.998-8.467-11.972-17.925-18.629-22.87a4.832 4.832 0 0 1-.378-7.376c6.57-6.21 18.15-18.329 21.813-24.725 3.413-6.664 7.628-14.488 5.34-21.513-2.058-6.317-8.8-14.298-15.274-12.806-7.342 1.692-6.837 10.98-9.216 20.638-3.222 13.187-10.86 11.697-13.968 11.697-3.108 0-1.24-4.658-8.46-25.377-7.217-20.72-26.002-15.526-40.27-6.985-18.14 10.874-10.046 34.054-5.562 48.992-2.546 2.453-12.118 4.368-20.834 9.06-10.75 5.78-21.645 9.363-24.66 19.372-1.883 6.254.172 15.997 6.162 18.602 6.645 2.889 12.633-1.694 19.751-9.073a36.226 36.226 0 0 1 7.089-5.482 75.994 75.994 0 0 1 18.276-8.59s6.97 10.707 13.432 23.393c6.457 12.686-6.968 16.918-8.459 16.918-1.497 0-22.675-1.973-17.95 15.926 4.726 17.9 30.598 11.437 43.785 2.728 13.187-8.708 9.947-37.06 9.947-37.06 12.94-1.985 16.915 11.684 18.158 18.628 1.243 6.944 4.06 18.052 11.449 19.412 8.248 1.517 17.528-7.593 19.659-15.705z" />
            </svg>
          </a>

          <a
            :href="xUrl"
            :aria-label="t('footerX', 'X')"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center hover:text-[var(--text-primary)]"
            :title="t('footerX', 'X')">
            <svg viewBox="0 0 1024 1024" width="16" height="16" aria-hidden="true">
              <g
                fill="none"
                fill-rule="evenodd"
                stroke="none"
                stroke-width="1"
                transform="translate(112 112)">
                <path
                  class="footer-x-bg"
                  d="M711.111 800H88.89C39.8 800 0 760.2 0 711.111V88.89C0 39.8 39.8 0 88.889 0H711.11C760.2 0 800 39.8 800 88.889V711.11C800 760.2 760.2 800 711.111 800" />
                <path
                  class="footer-x-fg"
                  fill-rule="nonzero"
                  d="M628 623H484.942L174 179h143.058zm-126.012-37.651h56.96L300.013 216.65h-56.96z" />
                <path
                  class="footer-x-fg"
                  fill-rule="nonzero"
                  d="M219.296885 623 379 437.732409 358.114212 410 174 623z" />
                <path
                  class="footer-x-fg"
                  fill-rule="nonzero"
                  d="M409 348.387347 429.212986 377 603 177 558.330417 177z" />
              </g>
            </svg>
          </a>

          <a
            :href="githubUrl"
            :aria-label="t('footerGithub', 'GitHub')"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center hover:text-[var(--text-primary)]"
            :title="t('footerGithub', 'GitHub')">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
              <path
                d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.46-1.16-1.11-1.47-1.11-1.47c-.91-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33c.85 0 1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2Z" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance } from 'vue';

const leftLogoLightSrc =
  'https://xc43575rqmogbtegwxry2rk4hkctslkb63os6y2cdq25nfkgmguq.arweave.net/uLm-_7GDHGDMhrXjjUVcOoU5LUH23S9jQhw11pVGYak';

const leftLogoDarkSrc =
  'https://aqet2p7rnwvvcvraawg2ojq7sfyals6jav2dh6vm7occr347kfsa.arweave.net/BAk9P_Ftq1FWIAWNpyYfkXAFy8kFdDP6rPuEKO-fUWQ';

const rightLogoSrc =
  'https://f6kxms722ekygyfrhqnuhegs7czgujfu4mnklpl3wfldfpo5c6fq.arweave.net/L5V2S_rRFYNgsTwbQ5DS-LJqJLTjGqW9e7FWMr3dF4s';

const siteUrl = import.meta.env.VITE_SITE_URL || 'https://getty.sh/';
const privacyUrl = import.meta.env.VITE_PRIVACY_URL || 'https://getty.sh/en/guide/privacypolicy/';
const termsUrl = import.meta.env.VITE_TERMS_URL || 'https://getty.sh/en/guide/terms/';
const githubUrl = import.meta.env.VITE_GITHUB_URL || 'https://github.com/gettyteam/getty';
const xUrl = import.meta.env.VITE_X_URL || 'https://x.com/getty_sh';
const odyseeUrl = import.meta.env.VITE_ODYSEE_URL || 'https://odysee.com';

const instance = getCurrentInstance();
const vueT = instance?.appContext?.config?.globalProperties?.$t as
  | undefined
  | ((_key: string) => string);

function t(key: string, fallback: string) {
  const lm = (globalThis as any)?.languageManager;
  if (lm && typeof lm.getText === 'function') {
    return lm.getText(key) || fallback;
  }

  if (typeof vueT === 'function') {
    const translated = vueT(key);
    if (translated && translated !== key) return translated;
  }

  return fallback;
}

const copyrightHtml = computed(() =>
  t(
    'copyright',
    "© 2025 <a href='https://getty.sh/' target='_blank'>getty</a> - <a href='https://www.gnu.org/licenses/agpl-3.0.html' target='_blank'>AGPL v3 License</a> - <a href='https://github.com/gettyteam/getty' target='_blank'>Source Code</a>"
  )
);
</script>

<style>
.getty-footer .getty-footer-logo-light {
  display: block;
}

.getty-footer .getty-footer-logo-dark {
  display: none;
}

.dark .getty-footer .getty-footer-logo-light,
[data-theme='dark'] .getty-footer .getty-footer-logo-light,
.dark-mode .getty-footer .getty-footer-logo-light {
  display: none !important;
}

.dark .getty-footer .getty-footer-logo-dark,
[data-theme='dark'] .getty-footer .getty-footer-logo-dark,
.dark-mode .getty-footer .getty-footer-logo-dark {
  display: block !important;
}
</style>
