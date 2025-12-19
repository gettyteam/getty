<template>
  <a href="#main" class="skip-link">Skip to main content</a>
  <SuspendedModal :is-open="suspendedModalOpen" @close="suspendedModalOpen = false" />
  <ConfigBlockedModal
    :is-open="configBlockedModalOpen"
    :filename="configBlockedFilename"
    :details="configBlockedDetails"
    @close="configBlockedModalOpen = false" />
  <CommandPalette :is-open="commandPaletteOpen" @close="commandPaletteOpen = false" />
  <div class="admin-container mx-auto px-6 py-4 max-w-[1330px]" :class="{ dark: isDark }">
    <header
      class="os-header flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-border md:flex-nowrap md:pb-5 md:mb-8"
      role="banner">
      <div class="flex items-center gap-3 shrink-0">
        <button
          class="md:hidden inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border hover:bg-card transition-colors"
          @click="toggleMobileSidebar"
          :aria-expanded="mobileSidebarOpen.toString()"
          aria-controls="admin-sidebar"
          aria-label="Toggle navigation">
          <svg
            class="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round">
            <path d="M3 6h18" />
            <path d="M3 12h18" />
            <path d="M3 18h18" />
          </svg>
        </button>
        <RouterLink
          to="/admin/stream"
          class="flex items-center gap-2"
          :aria-label="t('statusTitle')">
          <span class="md:hidden">
            <img
              :src="'/img/getty-fav.png'"
              :alt="sidebarIconAlt"
              class="h-8 w-8"
              decoding="async"
              fetchpriority="high"
              height="32"
              width="32"
              @error="(e) => (e.target.src = '/favicon.ico')" />
          </span>
          <span class="hidden md:block">
            <img :src="logoLight" alt="getty Logo" class="h-9 logo-light" />
            <img :src="logoDark" alt="getty Logo" class="h-9 logo-dark" />
          </span>
        </RouterLink>
      </div>
      <div
        class="ml-auto flex flex-wrap items-center gap-x-3 gap-y-2 md:ml-0 md:justify-end relative">
        <button
          @click="commandPaletteOpen = true"
          class="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-card hover:text-foreground transition-colors mr-2 w-48 lg:w-64"
          aria-label="Search">
          <i class="pi pi-search"></i>
          <span>{{ t('commonSearch') || 'Search...' }}</span>
          <span class="ml-auto text-xs border border-border rounded px-1.5 opacity-70">Ctrl K</span>
        </button>
        <button
          @click="commandPaletteOpen = true"
          class="md:hidden flex items-center justify-center w-8 h-8 rounded-lg border border-border hover:bg-card transition-colors"
          aria-label="Search">
          <i class="pi pi-search text-[14px] leading-none" aria-hidden="true"></i>
        </button>

        <WalletLoginButton />
        <a
          href="/index.html"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-2 p-2 md:px-3 md:py-2 rounded-lg border border-border text-sm hover:bg-card transition-colors"
          aria-label="Home"
          :title="t('home')">
          <svg
            viewBox="0 0 24 24"
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true">
            <path d="M3 11.5 12 4l9 7.5" />
            <path d="M5 10v10h14V10" />
            <path d="M9 20v-6h6v6" />
          </svg>
          <span class="sr-only md:not-sr-only" data-i18n="home">Home</span>
        </a>

        <div class="relative" @keyup.esc="menuOpen = false">
          <button
            @click="toggleMenu"
            class="flex items-center gap-2 p-2 md:px-3 md:py-2 rounded-lg border border-border text-sm hover:bg-card transition-colors"
            :aria-expanded="menuOpen.toString()"
            aria-haspopup="true">
            <svg
              viewBox="0 0 24 24"
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20" />
              <path
                d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z" />
            </svg>
            <span class="sr-only md:not-sr-only font-medium">{{ currentLocaleLabel }}</span>
            <svg
              class="hidden md:block w-4 h-4 opacity-70"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <div
            v-show="menuOpen"
            class="absolute right-0 mt-2 w-44 bg-card border border-border rounded-xl shadow-lg p-2 z-50"
            role="menu">
            <p class="px-2 py-1 text-xs uppercase tracking-wide text-[var(--text-secondary)]">
              {{ t('language') }}
            </p>
            <ul class="space-y-1">
              <li>
                <button
                  @click="setLocale('en')"
                  class="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-[var(--bg-chat)]"
                  :class="{ 'bg-[var(--bg-chat)]': locale === 'en' }">
                  English
                </button>
              </li>
              <li>
                <button
                  @click="setLocale('es')"
                  class="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-[var(--bg-chat)]"
                  :class="{ 'bg-[var(--bg-chat)]': locale === 'es' }">
                  Español
                </button>
              </li>
            </ul>
          </div>
        </div>
        <button @click="toggleTheme" class="theme-toggle" title="Toggle theme">
          <svg class="sun-icon" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,2L14.39,5.42C13.65,5.15 12.84,5 12,5C11.16,5 10.35,5.15 9.61,5.42L12,2M3.34,7L7.5,6.65C6.9,7.16 6.36,7.78 5.94,8.5C5.52,9.22 5.25,10 5.11,10.79L3.34,7M3.36,17L5.12,13.23C5.26,14 5.53,14.78 5.95,15.5C6.37,16.22 6.91,16.84 7.51,17.35L3.36,17M20.65,7L18.88,10.77C18.74,10 18.47,9.22 18.05,8.5C17.63,7.78 17.09,7.16 16.49,6.65L20.65,7M20.64,17L16.5,17.35C17.1,16.84 17.64,16.22 18.06,15.5C18.48,14.78 18.75,14 18.89,13.21L20.64,17M12,22L9.59,18.56C10.33,18.83 11.14,19 12,19C12.86,19 13.67,18.83 14.41,18.56L12,22Z" />
          </svg>
          <svg class="moon-icon" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,11L19.61,12.25L20.2,14.23L18.5,13.06L16.8,14.23L17.39,12.25L15.75,11L17.81,10.95L18.5,9L19.19,10.95L21.25,11M18.97,15.95C19.8,15.87 20.69,17.05 20.16,17.8C19.84,18.25 19.5,18.67 19.08,19.07C15.17,23 8.84,23 4.94,19.07C1.03,15.17 1.03,8.83 4.94,4.93C5.34,4.53 5.76,4.17 6.21,3.85C6.96,3.32 8.14,4.21 8.06,5.04C7.79,7.9 8.75,10.87 10.95,13.06C13.14,15.26 16.1,16.22 18.97,15.95M17.33,17.97C14.5,17.81 11.7,16.64 9.53,14.5C7.36,12.31 6.2,9.5 6.04,6.68C3.23,9.82 3.34,14.4 6.35,17.41C9.37,20.43 14,20.54 17.33,17.97Z" />
          </svg>
        </button>

        <WalletLogoutButton />
      </div>
    </header>
    <div
      class="admin-layout flex flex-col md:flex-row md:items-start gap-5"
      :class="{ 'sidebar-collapsed': sidebarCollapsed }">
      <aside
        id="admin-sidebar"
        class="admin-sidebar os-sidebar w-56 flex-shrink-0 transition-all duration-300 rounded-l-xl"
        :class="{
          'w-16': sidebarCollapsed,
          'overflow-y-auto overflow-x-hidden': sidebarSuggestionVisible,
        }"
        role="navigation"
        aria-label="Primary">
        <div class="px-3 pt-3">
          <div class="flex items-center gap-2" :class="{ 'justify-center': sidebarCollapsed }">
            <img
              :src="sidebarIcon"
              :alt="sidebarIconAlt"
              class="w-7 h-7 rounded-full"
              :style="resolvedSidebarIconBg ? { background: resolvedSidebarIconBg } : undefined"
              @error="(e) => (e.target.src = '/favicon.ico')" />
            <div class="flex flex-col gap-0.5 leading-none" v-if="!sidebarCollapsed">
              <span class="font-semibold">{{ t('administration') }}</span>
              <span class="text-xs opacity-80">v{{ appVersion }}</span>
            </div>
          </div>
        </div>
        <button
          class="sidebar-toggle-btn"
          @click="toggleSidebar"
          :aria-pressed="sidebarCollapsed.toString()"
          :title="sidebarCollapsed ? 'Expand' : 'Collapse'">
          <svg
            class="sidebar-toggle-icon w-3 h-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
        <div class="sidebar-section">
          <nav class="sidebar-nav">
            <RouterLink class="sidebar-link os-nav-link" active-class="active" to="/admin/home">
              <span class="icon os-icon" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </span>
              <span>{{ t('sidebarHome') }}</span>
            </RouterLink>
          </nav>
        </div>
        <div class="sidebar-section">
          <h3 class="sidebar-title" v-if="!sidebarCollapsed">
            {{ t('sidebarWidgetsAndModules') }}
          </h3>
          <nav class="sidebar-nav">
            <div class="sidebar-collapsible">
              <button
                type="button"
                class="sidebar-link os-nav-link sidebar-collapsible-trigger"
                :class="{ active: analyticsActive, open: analyticsMenuOpen }"
                :aria-label="sidebarCollapsed ? t('statusTitle') : undefined"
                @click="toggleAnalyticsMenu">
                <span class="icon os-icon" aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                  </svg>
                </span>
                <span class="sidebar-link-label">{{ t('statusTitle') }}</span>
                <span class="sidebar-caret" aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </button>
              <div
                class="sidebar-submenu"
                v-show="analyticsMenuOpen"
                :class="{ 'full-threadline': !analyticsActive }">
                <RouterLink
                  class="sidebar-sublink os-nav-link"
                  active-class="active"
                  :aria-label="sidebarCollapsed ? t('statusOverviewNav') : undefined"
                  to="/admin/stream">
                  <i class="pi pi-chart-line sidebar-sublink-icon" aria-hidden="true"></i>
                  <span class="sublink-label">{{ t('statusOverviewNav') }}</span>
                </RouterLink>
                <RouterLink
                  class="sidebar-sublink os-nav-link"
                  active-class="active"
                  :aria-label="sidebarCollapsed ? t('channelAnalyticsNav') : undefined"
                  to="/admin/channel">
                  <i class="pi pi-chart-bar sidebar-sublink-icon" aria-hidden="true"></i>
                  <span class="sublink-label">{{ t('channelAnalyticsNav') }}</span>
                </RouterLink>
              </div>
            </div>

            <RouterLink
              class="sidebar-link os-nav-link"
              active-class="active"
              to="/admin/user-profile">
              <span class="icon os-icon" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round">
                  <path d="M5 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <span>{{ t('userProfileTitle') }}</span>
            </RouterLink>

            <RouterLink class="sidebar-link os-nav-link" active-class="active" to="/admin/chat">
              <span class="icon os-icon" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round">
                  <path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2v5Z" />
                  <path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1" />
                </svg>
              </span>
              <span>{{ t('chat') }}</span>
            </RouterLink>
            <RouterLink class="sidebar-link os-nav-link" active-class="active" to="/admin/events">
              <span class="icon os-icon" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round">
                  <path
                    d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </span>
              <span>{{ t('eventsTitle') || 'Events' }}</span>
            </RouterLink>
            <RouterLink class="sidebar-link os-nav-link" active-class="active" to="/admin/raffle">
              <span class="icon os-icon" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round">
                  <rect x="3" y="8" width="18" height="4" rx="1" />
                  <path d="M12 8v13" />
                  <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
                  <path
                    d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
                </svg>
              </span>
              <span>{{ t('raffleTitle') }}</span>
            </RouterLink>
            <RouterLink class="sidebar-link os-nav-link" active-class="active" to="/admin/last-tip">
              <span class="icon os-icon" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round">
                  <path d="M12 1v22" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </span>
              <span>{{ t('lastTip') }}</span>
            </RouterLink>
            <RouterLink class="sidebar-link os-nav-link" active-class="active" to="/admin/tip-goal">
              <span class="icon os-icon" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <circle cx="12" cy="12" r="5" />
                  <circle cx="12" cy="12" r="1" />
                </svg>
              </span>
              <span>{{ t('tipGoal') }}</span>
            </RouterLink>
            <!-- Wander auth panel removed; login now handled by header button -->
            <RouterLink
              class="sidebar-link os-nav-link"
              active-class="active"
              to="/admin/notifications">
              <span class="icon os-icon" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round">
                  <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </span>
              <span>{{ t('notifications') }}</span>
            </RouterLink>
            <RouterLink
              class="sidebar-link os-nav-link"
              active-class="active"
              to="/admin/liveviews">
              <span class="icon os-icon" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </span>
              <span>{{ t('liveviewsTitle') }}</span>
            </RouterLink>
            <RouterLink
              class="sidebar-link os-nav-link"
              active-class="active"
              to="/admin/social-media">
              <span class="icon os-icon" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <path d="M8.59 13.51 15.42 17.49" />
                  <path d="m15.41 6.51-6.82 3.98" />
                </svg>
              </span>
              <span>{{ t('socialMediaTitle') }}</span>
            </RouterLink>
            <RouterLink
              class="sidebar-link os-nav-link"
              active-class="active"
              to="/admin/announcement">
              <span class="icon os-icon" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round">
                  <path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6l-5 4H4a1 1 0 0 0-1 1Z" />
                  <path d="M16 12h2" />
                  <path d="M16 8h2" />
                  <path d="M16 16h2" />
                </svg>
              </span>
              <span>{{ t('announcementTitle') }}</span>
            </RouterLink>
            <RouterLink
              class="sidebar-link os-nav-link"
              active-class="active"
              to="/admin/integrations">
              <span class="icon os-icon" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round">
                  <circle cx="12" cy="18" r="3" />
                  <circle cx="6" cy="6" r="3" />
                  <circle cx="18" cy="6" r="3" />
                  <path d="M6 9v1a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9" />
                  <path d="M12 12v3" />
                </svg>
              </span>
              <span>{{ t('externalNotificationsTitle') }}</span>
            </RouterLink>

            <RouterLink
              class="sidebar-link os-nav-link"
              active-class="active"
              to="/admin/achievements">
              <span class="icon os-icon" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round">
                  <path d="M8 21h8" />
                  <path d="M12 17v4" />
                  <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
                  <path d="M17 9a5 5 0 0 0 5-5h-5" />
                  <path d="M7 9a5 5 0 0 1-5-5h5" />
                </svg>
              </span>
              <span>{{ t('achievementsTitle') }}</span>
            </RouterLink>
            <RouterLink
              v-if="SHOW_SETTINGS_SECTION"
              class="sidebar-link os-nav-link"
              active-class="active"
              to="/admin/settings">
              <span class="icon os-icon" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path
                    d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .66.26 1.3.73 1.77.47.47 1.11.73 1.77.73H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
                </svg>
              </span>
              <span>{{ t('settings') }}</span>
            </RouterLink>
          </nav>
        </div>

        <SidebarSuggestion
          v-if="!sidebarCollapsed"
          class="mx-2 mt-auto mb-2"
          @visibility-change="(shown) => (sidebarSuggestionVisible = shown)" />
      </aside>

      <div class="admin-overlay md:hidden" @click="setMobileSidebar(false)"></div>
      <main class="admin-main flex-1 min-w-0" id="main" tabindex="-1" role="main">
        <div class="admin-main-content flex-1">
          <RouterView />
        </div>

        <GettyFooter />
      </main>
    </div>
    <ToastHost />
    <OsConfirmDialog />
  </div>
</template>
<script setup>
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter, RouterLink, RouterView } from 'vue-router';
import { watch, ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { anyDirty, getDirtyLabels } from './composables/useDirtyRegistry';
import ToastHost from './components/shared/ToastHost.vue';
import SidebarSuggestion from './components/shared/SidebarSuggestion.vue';
import OsConfirmDialog from './components/os/OsConfirmDialog.vue';
import SuspendedModal from './components/SuspendedModal.vue';
import ConfigBlockedModal from './components/ConfigBlockedModal.vue';
import CommandPalette from './components/shared/CommandPalette.vue';
import GettyFooter from 'shared/components/GettyFooter.vue';
import { confirmDialog } from './services/confirm';
import WalletLoginButton from './components/WalletLoginButton.vue';
import WalletLogoutButton from './components/WalletLogoutButton.vue';
import { useWanderSession } from './wander/store/wanderSession';
import { fetchChannelAnalyticsConfig } from './services/channelAnalytics';

const bodyClasses = [
  'bg-background',
  'text-gray-100',
  'font-sans',
  'w-full',
  'm-0',
  'p-0',
  'min-h-screen',
];

const logoLight =
  'https://aqet2p7rnwvvcvraawg2ojq7sfyals6jav2dh6vm7occr347kfsa.arweave.net/BAk9P_Ftq1FWIAWNpyYfkXAFy8kFdDP6rPuEKO-fUWQ';
const logoDark =
  'https://xc43575rqmogbtegwxry2rk4hkctslkb63os6y2cdq25nfkgmguq.arweave.net/uLm-_7GDHGDMhrXjjUVcOoU5LUH23S9jQhw11pVGYak';

const DEFAULT_SIDEBAR_ICON = '/favicon.ico';
const DEFAULT_SIDEBAR_ICON_ALT = 'getty';
const DEFAULT_CHANNEL_AVATAR =
  'https://thumbnails.odycdn.com/optimize/s:0:0/quality:85/plain/https://player.odycdn.com/speech/spaceman-png:2.png';
const sidebarIcon = ref(DEFAULT_SIDEBAR_ICON);
const sidebarIconAlt = ref(DEFAULT_SIDEBAR_ICON_ALT);
const usingDefaultChannelAvatar = ref(false);
const appVersion = import.meta.env.VITE_APP_VERSION || 'dev';

const { locale, t } = useI18n();
const route = useRoute();
const router = useRouter();
const SHOW_SETTINGS_SECTION = true;

const isDark = ref(false);
const menuOpen = ref(false);
const sidebarCollapsed = ref(false);
const sidebarSuggestionVisible = ref(false);
const mobileSidebarOpen = ref(false);
const analyticsMenuOpen = ref(false);
const suspendedModalOpen = ref(false);
const configBlockedModalOpen = ref(false);
const commandPaletteOpen = ref(false);
const configBlockedFilename = ref('');
const configBlockedDetails = ref(null);

let channelConfigUpdatedHandler = null;

async function refreshSidebarIcon() {
  try {
    const cfg = await fetchChannelAnalyticsConfig();
    const thumb = cfg?.channelIdentity?.thumbnailUrl;
    const configured = Boolean(cfg?.claimId && String(cfg.claimId).trim());
    const identityLabel = String(
      cfg?.channelIdentity?.title || cfg?.channelIdentity?.name || ''
    ).trim();

    if (!configured) {
      sidebarIcon.value = DEFAULT_SIDEBAR_ICON;
      usingDefaultChannelAvatar.value = false;
    } else if (thumb && String(thumb).trim()) {
      sidebarIcon.value = String(thumb).trim();
      usingDefaultChannelAvatar.value = false;
    } else {
      sidebarIcon.value = DEFAULT_CHANNEL_AVATAR;
      usingDefaultChannelAvatar.value = true;
    }

    sidebarIconAlt.value = identityLabel || DEFAULT_SIDEBAR_ICON_ALT;
  } catch {
    sidebarIcon.value = DEFAULT_SIDEBAR_ICON;
    sidebarIconAlt.value = DEFAULT_SIDEBAR_ICON_ALT;
    usingDefaultChannelAvatar.value = false;
  }
}

const resolvedSidebarIconBg = computed(() => {
  if (!usingDefaultChannelAvatar.value) return '';

  return isDark.value ? 'var(--bg-card)' : 'var(--text-primary)';
});

const currentLocaleLabel = computed(() => (locale.value === 'es' ? 'ES' : 'EN'));
const analyticsActive = computed(
  () => route.path.startsWith('/admin/stream') || route.path.startsWith('/admin/channel')
);

const wanderSession = useWanderSession();
const LAYOUT_RESIZE_EVENT = 'admin:layout-resized';
let layoutResizeFrame = null;

function notifyLayoutResize() {
  if (typeof window === 'undefined') return;
  if (layoutResizeFrame) {
    window.cancelAnimationFrame(layoutResizeFrame);
  }
  layoutResizeFrame = window.requestAnimationFrame(() => {
    layoutResizeFrame = null;
    try {
      window.dispatchEvent(new CustomEvent(LAYOUT_RESIZE_EVENT));
    } catch {}
  });
}

watch(
  () => [wanderSession.state.address, wanderSession.state.loading, route.path],
  ([address, loading, path]) => {
    if (loading) return;
    if (!address && path.startsWith('/admin')) {
      router.push('/');
    }
  },
  { immediate: true }
);

watch(
  () => route.path,
  (path) => {
    if (path.startsWith('/admin/stream') || path.startsWith('/admin/channel')) {
      analyticsMenuOpen.value = true;
    } else {
      analyticsMenuOpen.value = false;
    }
  },
  { immediate: true }
);

watch(
  () => sidebarCollapsed.value,
  (collapsed) => {
    if (collapsed) sidebarSuggestionVisible.value = false;
  }
);

function resolveThemePreference() {
  let stored = null;
  try {
    stored = localStorage.getItem('theme');
  } catch {}
  if (stored === 'dark') return true;
  if (stored === 'light') return false;
  let legacy = null;
  try {
    legacy = localStorage.getItem('prefers-dark');
  } catch {}
  if (legacy === '1') return true;
  if (legacy === '0') return false;
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return true;
  }
}

function applyTheme(dark, persist = true) {
  if (isDark.value === dark && !persist) return;
  isDark.value = dark;

  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.classList.toggle('light', !dark);
  if (document.body) {
    document.body.classList.toggle('dark', dark);
    document.body.classList.toggle('light', !dark);
  }

  const mode = dark ? 'dark' : 'light';
  let allowTransition = true;
  try {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq?.matches) allowTransition = false;
  } catch {}
  if (allowTransition) {
    try {
      if (themeTransitionTimer) {
        clearTimeout(themeTransitionTimer);
        themeTransitionTimer = null;
      }
      document.documentElement.classList.add('theme-transition');
      document.body?.classList.add('theme-transition');
      themeTransitionTimer = window.setTimeout(() => {
        document.documentElement.classList.remove('theme-transition');
        document.body?.classList.remove('theme-transition');
        themeTransitionTimer = null;
      }, 320);
    } catch {}
  } else {
    try {
      if (themeTransitionTimer) {
        clearTimeout(themeTransitionTimer);
        themeTransitionTimer = null;
      }
      document.documentElement.classList.remove('theme-transition');
      document.body?.classList.remove('theme-transition');
    } catch {}
  }
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.classList.toggle('light', !dark);
  try {
    document.documentElement.setAttribute('data-theme', mode);
  } catch {}
  try {
    const body = document.body;
    if (body) {
      body.classList.toggle('dark', dark);
      body.classList.toggle('light', !dark);
    }
  } catch {}
  if (persist) {
    try {
      localStorage.setItem('theme', mode);
    } catch {}
    try {
      localStorage.setItem('prefers-dark', dark ? '1' : '0');
    } catch {}
  }
}
function toggleTheme() {
  applyTheme(!isDark.value);
}

function toggleMenu() {
  menuOpen.value = !menuOpen.value;
}
function toggleAnalyticsMenu() {
  analyticsMenuOpen.value = !analyticsMenuOpen.value;
}
function handleClickOutside(e) {
  if (!menuOpen.value) return;
  const menuEl = document.querySelector('.os-header .relative');
  if (menuEl && !menuEl.contains(e.target)) menuOpen.value = false;
}
function setLocale(l) {
  locale.value = l;
  menuOpen.value = false;
  try {
    localStorage.setItem('admin_locale', l);
    localStorage.setItem('lang', l);
  } catch {}
}

function handleSuspended() {
  suspendedModalOpen.value = true;
}

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value;
  try {
    localStorage.setItem('admin-sidebar-collapsed', sidebarCollapsed.value ? '1' : '0');
  } catch {}
  setSidebarWidthVar();
}

function setMobileSidebar(open) {
  mobileSidebarOpen.value = open;
  try {
    document.documentElement.classList.toggle('mobile-sidebar-open', open);
  } catch {}
  try {
    document.body.style.overflow = open ? 'hidden' : '';
  } catch {}
}
function toggleMobileSidebar() {
  setMobileSidebar(!mobileSidebarOpen.value);
}

function setHeaderHeightVar() {
  try {
    const header = document.querySelector('.os-header');
    const h = header ? header.offsetHeight : 64;
    document.documentElement.style.setProperty('--admin-header-h', h + 'px');
    const rect = header ? header.getBoundingClientRect() : null;
    const headerBottom = rect ? rect.bottom : h;
    const hs = header ? getComputedStyle(header) : null;
    const mb = hs ? parseFloat(hs.marginBottom || '0') : 0;
    document.documentElement.style.setProperty('--admin-top', headerBottom + mb + 'px');
  } catch {
    /* ignore */
  }
}
let resizeTimer = null;
let storageHandler = null;
let themeTransitionTimer = null;
function onResize() {
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    setHeaderHeightVar();
    setContainerLeftVar();
    if (window.innerWidth >= 768) setMobileSidebar(false);
  }, 100);
}
function onScroll() {
  setHeaderHeightVar();
}

function setContainerLeftVar() {
  try {
    const container = document.querySelector('.admin-container');
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const left = Math.max(rect.left, 0);
    document.documentElement.style.setProperty('--container-left', left + 'px');
  } catch {
    /* ignore */
  }
}

function setSidebarWidthVar() {
  const w = sidebarCollapsed.value ? 64 : 224;
  document.documentElement.style.setProperty('--sidebar-w', w + 'px');
  notifyLayoutResize();
}

onMounted(() => {
  document.documentElement.classList.add('bg-background');
  bodyClasses.forEach((className) => {
    if (!document.body.classList.contains(className)) {
      document.body.classList.add(className);
    }
  });
  const initialDark = resolveThemePreference();
  applyTheme(initialDark, true);
  window.addEventListener('click', handleClickOutside);
  window.addEventListener('getty:tenant-suspended', handleSuspended);
  window.addEventListener('getty:config-blocked', (e) => {
    configBlockedFilename.value = e.detail?.filename || 'Configuration';
    configBlockedDetails.value = {
      reason: e.detail?.reason,
      blockedAt: e.detail?.blockedAt,
    };
    configBlockedModalOpen.value = true;
  });
  setHeaderHeightVar();
  setContainerLeftVar();
  setSidebarWidthVar();
  window.addEventListener('resize', onResize);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setMobileSidebar(false);
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      commandPaletteOpen.value = true;
    }
  });

  refreshSidebarIcon();
  try {
    channelConfigUpdatedHandler = () => refreshSidebarIcon();
    window.addEventListener('getty-session-updated', channelConfigUpdatedHandler);
    window.addEventListener('getty-channel-analytics-config-updated', channelConfigUpdatedHandler);
  } catch {}

  storageHandler = (event) => {
    if (!event) return;
    if (event.storageArea && event.storageArea !== localStorage) return;
    if (event.key && event.key !== 'theme' && event.key !== 'prefers-dark') return;
    applyTheme(resolveThemePreference(), false);
  };
  try {
    window.addEventListener('storage', storageHandler);
  } catch {}

  try {
    localStorage.removeItem('admin-compact');
  } catch {}
  try {
    document.documentElement.classList.remove('compact');
  } catch {}
  let sc = null;
  try {
    sc = localStorage.getItem('admin-sidebar-collapsed');
  } catch {}
  if (sc === '1') sidebarCollapsed.value = true;
});
onBeforeUnmount(() => {
  document.documentElement.classList.remove('bg-background');
  window.removeEventListener('click', handleClickOutside);
  window.removeEventListener('getty:tenant-suspended', handleSuspended);
  window.removeEventListener('resize', onResize);
  window.removeEventListener('scroll', onScroll);
  if (channelConfigUpdatedHandler) {
    try {
      window.removeEventListener('getty-session-updated', channelConfigUpdatedHandler);
      window.removeEventListener(
        'getty-channel-analytics-config-updated',
        channelConfigUpdatedHandler
      );
    } catch {}
  }
  channelConfigUpdatedHandler = null;
  if (storageHandler) {
    try {
      window.removeEventListener('storage', storageHandler);
    } catch {}
  }
  if (layoutResizeFrame) {
    try {
      window.cancelAnimationFrame(layoutResizeFrame);
    } catch {}
    layoutResizeFrame = null;
  }
  bodyClasses.forEach((className) => {
    document.body.classList.remove(className);
  });
});

let suppressNextDirtyPrompt = false;
router.beforeEach(async (to, from, next) => {
  if (suppressNextDirtyPrompt) {
    suppressNextDirtyPrompt = false;
    return next();
  }
  if (from.fullPath !== to.fullPath && anyDirty()) {
    const labels = getDirtyLabels();
    let description =
      t('unsavedChangesBody') || 'You have unsaved changes. Leave this page and discard them?';

    const validLabels = labels.filter((l) => l && l.trim());

    if (validLabels.length) {
      const modules = validLabels.join(', ');
      let checkMsg = t('unsavedChangesCheckSettings', { modules });
      if (checkMsg === 'unsavedChangesCheckSettings') {
        checkMsg = `Please check the settings in ${modules}.`;
      }

      description = `
        <div class="flex flex-col gap-3">
          <div class="flex items-start gap-2 text-red-600 dark:text-red-400">
            <i class="pi pi-info-circle mt-0.5"></i>
            <span class="font-medium">${checkMsg}</span>
          </div>
          <p>${description}</p>
        </div>`;
    }

    const ok = await confirmDialog({
      title: t('unsavedChangesTitle') || 'Unsaved changes',
      description,
      html: !!validLabels.length,
      confirmText: t('leaveAnyway') || 'Leave anyway',
      cancelText: t('commonCancel') || 'Cancel',
      danger: true,
    });
    if (!ok) {
      suppressNextDirtyPrompt = true;
      return next(false);
    }
  }
  next();
});

router.afterEach(() => {
  setTimeout(() => {
    setHeaderHeightVar();
    setContainerLeftVar();
  }, 0);
  setMobileSidebar(false);

  try {
    const hourId = Math.floor(Date.now() / 3600000);
    localStorage.setItem('admin-suggestion-closed-hour', String(hourId));
  } catch {}
});
</script>
<style>
.skip-link {
  position: absolute;
  left: -999px;
  top: auto;
  width: 1px;
  height: 1px;
  overflow: hidden;
}
.skip-link:focus {
  left: 8px;
  top: 8px;
  width: auto;
  height: auto;
  background: #1e293b;
  color: #fff;
  padding: 8px 12px;
  border-radius: 4px;
  z-index: 10000;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.sidebar-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  color: var(--sidebar-link-color);
  text-decoration: none;
  font-size: 14px;
  line-height: 1.2;
}
.sidebar-link.active {
  background: var(--sidebar-link-active-bg);
  color: var(--text-primary);
}
.sidebar-collapsible {
  display: flex;
  flex-direction: column;
}
.sidebar-collapsible-trigger {
  width: 100%;
  justify-content: space-between;
}
.sidebar-collapsible-trigger .sidebar-caret {
  margin-left: auto;
  display: inline-flex;
  transition: transform 0.2s ease;
}
.sidebar-collapsible-trigger .sidebar-caret svg {
  width: 16px;
  height: 16px;
}
.sidebar-link.open .sidebar-caret {
  transform: rotate(90deg);
}
.sidebar-submenu {
  display: flex;
  flex-direction: column;
  margin-top: 2px;
  padding-left: 0;
  gap: 4px;
  position: relative;
  margin-left: 20px;
}
.sidebar-sublink {
  align-items: center;
  border-radius: 0.5rem;
  color: var(--sidebar-link-color);
  display: flex;
  font-size: 13px;
  gap: 8px;
  margin-left: 12px;
  margin-right: 8px;
  padding: 6px 10px;
  position: relative;
}

.sidebar-sublink:before {
  content: '';
  height: 50%;
  left: -17px;
  position: absolute;
  top: 0;
  width: 15px;
}

.sidebar-sublink.active:before {
  border-bottom: 2px solid var(--border-color);
  border-bottom-left-radius: 10px;
  border-left: 2px solid var(--border-color);
}

.sidebar-sublink:not(:last-child):not(.active):after {
  border-left: 2px solid var(--border-color);
  bottom: -6px;
  content: '';
  left: -16px;
  position: absolute;
  top: 0;
}
.sidebar-sublink-icon {
  font-size: 14px;
  opacity: 0.8;
}

.sidebar-submenu.full-threadline {
  position: relative;
}
.sidebar-submenu.full-threadline::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 16px;
  border-left: 2px solid var(--border-color);
  margin-left: -5px;
}
.sidebar-submenu.full-threadline .sidebar-sublink::after {
  display: none;
}

.sidebar-collapsed .sidebar-submenu {
  padding-left: 0;
  margin-left: 0;
  align-items: center;
}
.sidebar-collapsed .sidebar-sublink {
  justify-content: center;
  margin-left: 0;
  margin-right: 0;
}
.sidebar-collapsed .sidebar-sublink::before,
.sidebar-collapsed .sidebar-sublink::after {
  display: none;
}
.sidebar-collapsed .sidebar-sublink .sublink-label {
  display: none;
}
.sidebar-collapsed .sidebar-collapsible-trigger {
  justify-content: center;
}
.sidebar-collapsed .sidebar-link-label {
  display: none;
}
.sidebar-collapsed .sidebar-collapsible-trigger .sidebar-caret {
  display: none;
}
.sidebar-link .icon {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.sidebar-link .icon svg {
  width: 18px;
  height: 18px;
  stroke: currentColor;
}

.logo-light {
  display: none;
}
.logo-dark {
  display: block;
}
html.dark .logo-light {
  display: block;
}
html.dark .logo-dark {
  display: none;
}

.footer-x-bg {
  fill: #000;
}
.footer-x-fg {
  fill: #fff;
}
html.dark .footer-x-bg {
  fill: #fff;
}
html.dark .footer-x-fg {
  fill: #000;
}
</style>
