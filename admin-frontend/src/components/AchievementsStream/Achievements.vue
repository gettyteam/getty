<template>
  <section class="os-card overflow-hidden flex flex-col">
    <BlockedState v-if="isBlocked" :module-name="t('achievementsTitle')" :details="blockDetails" />

    <div v-else class="p-4 space-y-4">
      <div class="banner flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 class="banner-title">{{ t('achievementsBannerTitle') }}</h3>
          <p class="banner-desc">
            {{ t('achievementsBannerDesc') }}
          </p>
        </div>

        <div class="flex items-center gap-3 shrink-0">
          <div class="text-xs opacity-70 hidden md:block">
            <span>{{ t('settingsTitle') }}</span>
          </div>
          <button
            type="button"
            class="btn-secondary btn-compact-secondary"
            :aria-expanded="String(!settingsCollapsed)"
            aria-controls="ach-settings"
            @click="toggleSettings">
            <span class="opacity-90">{{
              settingsCollapsed ? t('commonShow') : t('commonHide')
            }}</span>
          </button>
        </div>
      </div>

      <div
        id="ach-settings"
        v-show="!settingsCollapsed"
        class="space-y-4"
        :data-ach-theme="cfg.theme">
        <div class="ach-settings-layout">
          <div class="ach-settings-col">
            <div class="ach-group-box" :aria-label="t('achievementsGroupNotificationPrefs')">
              <div class="ach-group-head">
                <HeaderIcon>
                  <svg
                    width="14"
                    height="14"
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
                </HeaderIcon>
                <span class="ach-head-title">{{ t('achievementsGroupNotificationPrefs') }}</span>
              </div>

              <div class="ach-setting-item has-inline-switch">
                <button
                  type="button"
                  class="switch"
                  :aria-pressed="String(cfg.enabled)"
                  @click="cfg.enabled = !cfg.enabled">
                  <span class="knob"></span>
                </button>
                <div class="ach-setting-text">
                  <div class="ach-setting-title">{{ t('achievementsEnableLabel') }}</div>
                  <div class="ach-setting-desc">{{ t('achievementsEnableDesc') }}</div>
                </div>
              </div>

              <div class="ach-setting-item has-inline-switch">
                <button
                  type="button"
                  class="switch"
                  :disabled="!cfg.enabled"
                  :aria-pressed="String(cfg.dnd)"
                  @click="cfg.dnd = !cfg.dnd">
                  <span class="knob"></span>
                </button>
                <div class="ach-setting-text">
                  <div class="ach-setting-title">{{ t('achievementsDndLabel') }}</div>
                  <div class="ach-setting-desc">{{ t('achievementsDndDesc') }}</div>
                </div>
              </div>

              <div class="ach-setting-item is-vertical">
                <div class="ach-setting-text">
                  <div class="ach-setting-title flex items-center gap-2">
                    <span>{{ t('achievementsSoundRowTitle') }}</span>
                    <span
                      class="badge inline-flex items-center justify-center text-[10px] tracking-wide"
                      v-if="cfg.sound.enabled"
                      >ON</span
                    >
                  </div>
                  <div class="ach-setting-desc">{{ t('achievementsSoundRowDesc') }}</div>
                </div>
                <div class="ach-setting-control w-full flex-col items-stretch">
                  <LegacyAudioControls
                    class="w-full"
                    compact
                    force-stack
                    :show-label="false"
                    :enabled="cfg.sound.enabled"
                    :volume="cfg.sound.volume"
                    :audio-source="audio.audioSource"
                    :has-custom-audio="audioState.hasCustomAudio"
                    :audio-file-name="audioState.audioFileName"
                    :audio-file-size="audioState.audioFileSize"
                    :audio-library-id="audioState.audioLibraryId"
                    :library-enabled="true"
                    :remote-url="REMOTE_ACH_SOUND_URL"
                    :save-endpoint="'/api/achievements-audio-settings'"
                    :delete-endpoint="'/api/achievements-audio-settings'"
                    :custom-audio-endpoint="'/api/achievements-custom-audio'"
                    :storage-provider="audioStorageProvider"
                    :storage-providers="storageOptions"
                    :storage-loading="storageLoading"
                    @update:enabled="(v) => (cfg.sound.enabled = v)"
                    @update:volume="(v) => (cfg.sound.volume = v)"
                    @update:audio-source="(v) => (audio.audioSource = v)"
                    @update:storage-provider="handleAudioStorageProviderChange"
                    @audio-saved="refreshAudioState"
                    @audio-deleted="
                      () => {
                        audioState.hasCustomAudio = false;
                        refreshAudioState();
                      }
                    "
                    @toast="(p) => pushToast(p.type || 'info', p.messageKey)" />
                </div>
              </div>
            </div>

            <div class="ach-group-box" :aria-label="t('achievementsGroupChannelId')">
              <div class="ach-group-head">
                <HeaderIcon>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <path d="M7 8h10" />
                    <path d="M7 12h6" />
                    <path d="M7 16h8" />
                  </svg>
                </HeaderIcon>
                <span class="ach-head-title">{{ t('achievementsGroupChannelId') }}</span>
              </div>
              <div class="ach-setting-item is-vertical">
                <div class="ach-setting-text">
                  <div class="ach-setting-title">{{ t('achievementsClaimIdLabel') }}</div>
                  <div class="ach-setting-desc">{{ t('achievementsClaimIdPlaceholder') }}</div>
                </div>
                <div class="ach-setting-control w-full max-w-[680px]">
                  <div class="claimid-row in-group">
                    <input
                      class="input claimid-input"
                      v-model="cfg.claimid"
                      :placeholder="t('achievementsClaimIdPlaceholder')"
                      @input="debouncedAvatarRefresh" />
                    <div class="ach-avatar-slot" v-if="cfg.claimid">
                      <div
                        v-if="avatarLoading"
                        class="ach-avatar-skeleton"
                        aria-hidden="true"
                        :title="t('channelAvatarLoading')"></div>
                      <div
                        v-else
                        class="ach-avatar-preview"
                        :class="{ 'is-error': avatarError }"
                        :title="avatarError ? t('channelAvatarError') : t('channelAvatar')">
                        <template v-if="!avatarError && channelAvatarUrl">
                          <img :src="channelAvatarUrl" alt="" @error="onAvatarError" />
                        </template>
                        <span v-else class="ach-avatar-fallback" aria-hidden="true">{{
                          fallbackInitial
                        }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="ach-group-box" :aria-label="t('achievementsGroupChannel')">
              <div class="ach-group-head">
                <HeaderIcon>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </HeaderIcon>
                <span class="ach-head-title">{{ t('achievementsGroupChannel') }}</span>
                <div
                  v-if="hasChannelAuth && channelFollowersUpdatedAt"
                  class="ach-group-head-right">
                  <span class="ach-sync-tip" tabindex="0">
                    <span class="chip ach-sync-chip" aria-hidden="true">
                      <svg
                        class="ach-sync-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round">
                        <path d="M21 12a9 9 0 1 1-3-6.7" />
                        <path d="M21 3v6h-6" />
                      </svg>
                    </span>
                    <span class="ach-help-bubble">
                      {{ t('achievementsChannelLastSync') }}: {{ channelFollowersSyncLabel }}
                    </span>
                  </span>
                </div>
              </div>

              <div v-if="channelCfgLoading" class="ach-setting-item">
                <div class="ach-setting-text">
                  <div class="ach-setting-desc">{{ t('loading') }}</div>
                </div>
              </div>

              <div v-else class="ach-setting-item is-vertical">
                <div class="ach-setting-text">
                  <div class="ach-setting-title">{{ t('achievementsChannelMetricsTitle') }}</div>
                  <div v-if="!hasChannelAuth" class="ach-setting-desc">
                    {{ t('achievementsChannelAuthWarning') }}
                  </div>
                </div>

                <div v-if="hasChannelAuth" class="ach-setting-control w-full ach-channel-metrics">
                  <div class="ach-metrics-grid">
                    <div class="ach-metric">
                      <div class="ach-metric-label">
                        {{ t('achievementsChannelMetricFollowers') }}
                      </div>
                      <div class="ach-metric-value-row">
                        <div class="ach-metric-value">
                          {{ channelTotals ? fmtInt(channelTotals.subscribers) : '—' }}
                        </div>
                        <div class="ach-metric-delta" :data-sign="deltaSign(channelDeltaSubs)">
                          {{ fmtDelta(channelDeltaSubs) }}
                        </div>
                      </div>
                    </div>
                    <div class="ach-metric">
                      <div class="ach-metric-label">{{ t('achievementsChannelMetricViews') }}</div>
                      <div class="ach-metric-value-row">
                        <div class="ach-metric-value">
                          {{ channelTotals ? fmtInt(channelTotals.views) : '—' }}
                        </div>
                        <div class="ach-metric-delta" :data-sign="deltaSign(channelDeltaViews)">
                          {{ fmtDelta(channelDeltaViews) }}
                        </div>
                      </div>
                    </div>
                    <div class="ach-metric">
                      <div class="ach-metric-label">
                        {{ t('achievementsChannelMetricContent') }}
                      </div>
                      <div class="ach-metric-value-row">
                        <div class="ach-metric-value">
                          {{ channelTotals ? fmtInt(channelTotals.videos) : '—' }}
                        </div>
                        <div class="ach-metric-delta" :data-sign="deltaSign(channelDeltaVideos)">
                          {{ fmtDelta(channelDeltaVideos) }}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-if="channelMetricsError" class="ach-setting-desc mt-2">
                    {{ channelMetricsError }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="ach-settings-col">
            <div class="ach-group-box" :aria-label="t('achievementsGroupDisplay')">
              <div class="ach-group-head">
                <HeaderIcon>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 3v18" />
                    <path d="M3 12h18" />
                  </svg>
                </HeaderIcon>
                <span class="ach-head-title">{{ t('achievementsGroupDisplay') }}</span>
              </div>

              <div class="ach-setting-item is-split-two">
                <div class="ach-split-field">
                  <div class="ach-setting-title">{{ t('achievementsThemeLabel') }}</div>
                  <select
                    class="input w-full mt-1"
                    v-model="cfg.theme"
                    aria-label="{{ t('achievementsThemeLabel') }}">
                    <option value="light">{{ t('themeLight') }}</option>
                    <option value="dark">{{ t('themeDark') }}</option>
                  </select>
                </div>
                <div class="ach-split-field">
                  <div class="ach-setting-title">{{ t('achievementsPositionLabel') }}</div>
                  <select
                    class="input w-full mt-1"
                    v-model="cfg.position"
                    aria-label="{{ t('achievementsPositionLabel') }}">
                    <option value="top-right">{{ t('positionTopRight') }}</option>
                    <option value="top-left">{{ t('positionTopLeft') }}</option>
                    <option value="bottom-right">{{ t('positionBottomRight') }}</option>
                    <option value="bottom-left">{{ t('positionBottomLeft') }}</option>
                  </select>
                </div>
              </div>

              <div class="ach-setting-item">
                <div class="ach-setting-text">
                  <div class="ach-setting-title">{{ t('achievementsHistoryLabel') }}</div>
                  <div class="ach-setting-desc">{{ t('achievementsHistoryLabel') }}</div>
                </div>
                <div class="number-field mt-[12px]" :aria-label="t('achievementsHistoryLabel')">
                  <button
                    type="button"
                    class="nf-btn"
                    :disabled="cfg.historySize <= 1"
                    @click="decHistory"
                    :aria-label="t('commonDecrease') || '−'">
                    −
                  </button>
                  <input
                    class="nf-input"
                    :id="historyNumberId"
                    type="number"
                    min="1"
                    max="20"
                    step="1"
                    inputmode="numeric"
                    v-model.number="cfg.historySize"
                    @input="clampHistory"
                    @blur="clampHistory"
                    :aria-live="'off'" />
                  <button
                    type="button"
                    class="nf-btn"
                    :disabled="cfg.historySize >= 20"
                    @click="incHistory"
                    :aria-label="t('commonIncrease') || '+'">
                    +
                  </button>
                </div>
              </div>
            </div>

            <div class="ach-group-box" :aria-label="t('achievementsGroupPreview')">
              <div class="ach-group-head">
                <HeaderIcon>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </HeaderIcon>
                <span class="ach-head-title">{{ t('achievementsGroupPreview') }}</span>
              </div>
              <div class="ach-preview">
                <div class="ach-preview-title flex items-center justify-between">
                  <span>{{ t('achievementsGroupPreview') }}</span>
                </div>
                <div class="ach-live-demo" :data-theme="cfg.theme">
                  <div class="ald-item">
                    <div class="ald-left">
                      <div class="ald-ico" aria-hidden="true">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round">
                          <path d="M12 17v4" />
                          <path d="M8 21h8" />
                          <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
                          <path d="M17 9a5 5 0 0 0 5-5h-5" />
                          <path d="M7 9a5 5 0 0 1-5-5h5" />
                        </svg>
                      </div>
                      <div class="ald-text">
                        <div class="ald-title">{{ t('ach.def.t_first.title') }}</div>
                        <div class="ald-desc">{{ t('ach.def.t_first.desc') }}</div>
                      </div>
                    </div>
                    <div class="ald-time">{{ t('ach.widget.now') }}</div>
                  </div>
                </div>
                <div class="ach-preview-hint text-[11px] opacity-70">
                  <span>{{ t('achievementsBannerDesc') }}</span>
                </div>
              </div>
            </div>

            <div class="ach-group-box" :aria-label="t('obsIntegration')">
              <div class="ach-group-head">
                <HeaderIcon>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                </HeaderIcon>
                <span class="ach-head-title">{{ t('obsIntegration') }}</span>
              </div>
              <div class="ach-setting-item is-vertical">
                <div class="ach-setting-text">
                  <div class="ach-setting-title">{{ t('achievementsWidgetUrlLabel') }}</div>
                </div>
                <div class="copy-field-row">
                  <CopyField
                    :value="widgetUrl"
                    :aria-label="t('achievementsWidgetUrlLabel')"
                    secret />
                </div>
              </div>
            </div>

            <div class="actions">
              <button
                class="btn btn-secondary btn-compact-secondary btn-save-style"
                @click="save"
                :disabled="saving">
                {{ t('saveSettings') }}
              </button>
              <button
                class="btn-secondary btn-compact-secondary ach-test-btn"
                @click="testNotif"
                :disabled="saving">
                <i class="pi pi-sparkles" aria-hidden="true"></i>
                {{ t('achievementsTestNotificationBtn') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h4 class="section-title flex items-center gap-2">
          <i class="pi pi-trophy opacity-80" aria-hidden="true"></i>
          <span>{{ t('achievementsProgressTitle') }}</span>
        </h4>

        <div v-if="loading" class="space-y-6">
          <div v-for="i in 2" :key="i" class="ach-group">
            <div class="ach-group-title flex items-center gap-2 mb-3">
              <SkeletonLoader class="w-6 h-6 rounded-full" />
              <SkeletonLoader class="w-32 h-6" />
            </div>
            <div class="ach-grid">
              <div v-for="j in 3" :key="j" class="ach-card h-32">
                <SkeletonLoader class="w-full h-full" />
              </div>
            </div>
          </div>
        </div>

        <div v-else v-for="g in grouped" :key="g.cat" class="ach-group">
          <div class="ach-group-title">
            <span class="ach-group-left">
              <span class="ach-group-ico" aria-hidden="true">
                <svg
                  v-if="g.cat === 'viewers'"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round">
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <svg
                  v-else-if="g.cat === 'channel'"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <svg
                  v-else-if="g.cat === 'chat'"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
                </svg>
                <svg
                  v-else-if="g.cat === 'tips'"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round">
                  <line x1="12" x2="12" y1="2" y2="22" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                <svg
                  v-else-if="g.cat === 'time'"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l3 3" />
                </svg>
                <svg
                  v-else
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10" />
                </svg>
              </span>
              <span class="ach-group-label-wrapper">{{ g.label }}</span>
            </span>
            <span class="ach-group-tools">
              <span class="chip">{{ g.completed }}/{{ g.total }}</span>
              <span
                v-if="g.cat === 'time'"
                class="ach-help-tip ach-help-tip--right"
                tabindex="0"
                role="button"
                aria-label="info"
                @keydown.enter.prevent="() => {}">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="ach-help-icon">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4a2 2 0 0 1 2-2h0" />
                  <circle cx="12" cy="8" r="1" />
                </svg>
                <span class="ach-help-bubble">{{ t('achievementsTimeTooltip') }}</span>
              </span>
            </span>
          </div>
          <div class="ach-grid">
            <div v-for="it in g.items" :key="it.id" class="ach-card">
              <div class="ach-card-head">
                <div class="ach-monogram" :data-cat="it.category">{{ monogram(it.category) }}</div>
                <div class="ach-txt">
                  <div class="ach-name">{{ t(it.titleKey) || it.title }}</div>
                  <div class="ach-desc">{{ t(it.descKey) || it.desc }}</div>
                </div>
                <div class="ach-cta">
                  <span v-if="it.completed" class="badge">{{
                    t('tipGoalCardStatusCompleted')
                  }}</span>
                  <button
                    v-else
                    class="pct"
                    :class="(it.progress.percent || 0) <= 1 ? 'pct-zero' : 'pct-progress'"
                    :title="it.progress.percent + '%'">
                    {{ it.progress.percent }}%
                  </button>
                </div>
              </div>
              <div class="ach-bar" v-if="!it.completed">
                <span
                  :class="
                    'ach-w-' + Math.round(Math.max(0, Math.min(100, it.progress.percent)))
                  "></span>
              </div>
              <div class="ach-actions">
                <button
                  v-if="
                    it.category !== 'viewers' &&
                    it.category !== 'channel' &&
                    it.id !== 't_first' &&
                    (it.category === 'time'
                      ? (it.id.startsWith('time_weekly_') || it.id.startsWith('time_monthly_')) &&
                        (it.progress?.percent || 0) >= 100
                      : (it.progress?.percent || 0) > 1)
                  "
                  class="btn btn-secondary btn-compact-secondary badge-action"
                  @click="reset(it.id)"
                  :disabled="saving"
                  :title="t('reset')">
                  {{ t('reset') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- Toasts -->
      <div class="ach-toasts" aria-live="polite" aria-atomic="false">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="ach-toast"
          :class="toast.type"
          role="status">
          <span class="ach-toast-msg">{{ t(toast.messageKey) }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, onBeforeUnmount, reactive, ref, computed, watch } from 'vue';
import LegacyAudioControls from '../shared/LegacyAudioControls.vue';
import CopyField from '../shared/CopyField.vue';
import HeaderIcon from '../shared/HeaderIcon.vue';
import SkeletonLoader from '../SkeletonLoader.vue';
import { useI18n } from 'vue-i18n';
import api from '../../services/api';
import { useWalletSession } from '../../composables/useWalletSession';
import {
  fetchAchievementsConfig,
  saveAchievementsConfig,
  getAchievementsStatus,
  resetAchievement,
  testAchievementsNotification,
  pollAchievementsViewers,
  pollAchievementsChannel,
} from './Achievements.js';
import {
  fetchChannelAnalytics,
  fetchChannelAnalyticsConfig,
} from '../../services/channelAnalytics';
import { usePublicToken } from '../../composables/usePublicToken';
import { useStorageProviders } from '../../composables/useStorageProviders';
import BlockedState from '../shared/BlockedState.vue';

const cfg = reactive({
  enabled: true,
  claimid: '',
  theme: 'light',
  position: 'top-right',
  dnd: false,
  historySize: 10,
  sound: { enabled: false, url: '', volume: 0.5, storageProvider: '' },
});
const status = reactive({ items: [], meta: null });
const achMeta = ref(null);
const loading = ref(false);
const saving = ref(false);
const isBlocked = ref(false);
const blockDetails = ref({});
const toasts = ref([]);
let toastCounter = 0;
const { t } = useI18n();
const { withToken, refresh } = usePublicToken();
const { walletHash } = useWalletSession();
const widgetUrl = computed(() => withToken(`${location.origin}/widgets/achievements`));
const channelAvatarUrl = ref('');
const avatarError = ref(false);
const avatarLoading = ref(false);
const channelCfgLoading = ref(false);
const channelMetricsLoading = ref(false);
const channelAnalyticsCfg = ref(null);
const channelAnalyticsOverview = ref(null);
const channelMetricsError = ref('');
const hasChannelAuth = computed(() => !!channelAnalyticsCfg.value?.hasAuthToken);
const channelTotals = computed(() => channelAnalyticsOverview.value?.totals || null);
const channelHighlights = computed(() => channelAnalyticsOverview.value?.highlights || null);
const channelDeltaSubs = computed(() => {
  const value = channelHighlights.value?.subsChange;
  return Number.isFinite(value) ? value : null;
});
const channelDeltaViews = computed(() => {
  const value = channelHighlights.value?.viewsChange;
  return Number.isFinite(value) ? value : null;
});
const channelDeltaVideos = computed(() => {
  const bars = channelAnalyticsOverview.value?.bars;
  if (!Array.isArray(bars) || !bars.length) return null;
  const last = bars[bars.length - 1]?.videos;
  if (!Number.isFinite(last)) return null;
  const prev = bars.length > 1 ? bars[bars.length - 2]?.videos : 0;
  const prevSafe = Number.isFinite(prev) ? prev : 0;
  return last - prevSafe;
});

const channelFollowersUpdatedAt = computed(() => {
  const raw =
    status.meta && typeof status.meta === 'object' ? status.meta.channelFollowersUpdatedAt : null;
  const numeric = Number(raw);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
});

const channelFollowersSyncLabel = computed(() => {
  if (!hasChannelAuth.value) return '—';
  if (!channelFollowersUpdatedAt.value) return '—';
  try {
    return new Date(channelFollowersUpdatedAt.value).toLocaleString();
  } catch {
    return '—';
  }
});

const metricNumberFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
function fmtInt(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  return metricNumberFormatter.format(numeric);
}

function fmtDelta(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  if (numeric === 0) return '0';
  const prefix = numeric > 0 ? '+' : '';
  return `${prefix}${metricNumberFormatter.format(numeric)}`;
}

function deltaSign(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'unknown';
  if (numeric > 0) return 'pos';
  if (numeric < 0) return 'neg';
  return 'zero';
}
const historyNumberId = 'ach-history-number';
const fallbackInitial = computed(() => {
  const id = (cfg.claimid || '').trim();
  if (!id) return '?';
  return id[0].toUpperCase();
});

const LS_KEY = 'ach-settings-collapsed';
const settingsCollapsed = ref(true);
function readCollapsed() {
  try {
    const v = localStorage.getItem(LS_KEY);
    return v === null ? true : v === '1';
  } catch {
    return true;
  }
}
function writeCollapsed(v) {
  try {
    localStorage.setItem(LS_KEY, v ? '1' : '0');
  } catch {}
}
function toggleSettings() {
  settingsCollapsed.value = !settingsCollapsed.value;
  writeCollapsed(settingsCollapsed.value);
}

const audio = reactive({ audioSource: 'remote' });
const audioState = reactive({
  hasCustomAudio: false,
  audioFileName: '',
  audioFileSize: 0,
  audioLibraryId: '',
  storageProvider: '',
});

const storage = useStorageProviders();
const WUZZY_PROVIDER_ID = 'wuzzy';
const storageOptions = computed(() => storage.providerOptions.value);
const selectedStorageProvider = computed({
  get: () => storage.selectedProvider.value,
  set: (val) => storage.setSelectedProvider(val),
});
const audioStorageProvider = computed(
  () => audioState.storageProvider || selectedStorageProvider.value || ''
);
const storageLoading = computed(() => storage.loading.value);

function resolveStorageSelection(preferred = '') {
  const candidates = [];
  if (preferred) candidates.push(preferred);
  if (cfg.sound.storageProvider) candidates.push(cfg.sound.storageProvider);
  if (audioState.storageProvider) candidates.push(audioState.storageProvider);
  storage.ensureSelection(candidates);
}

function handleAudioStorageProviderChange(providerId) {
  const normalized = typeof providerId === 'string' ? providerId : '';
  audioState.storageProvider = normalized;
  cfg.sound.storageProvider = normalized;
  if (normalized && normalized !== WUZZY_PROVIDER_ID) {
    storage.setSelectedProvider(normalized);
  }
}

const REMOTE_ACH_SOUND_URL =
  'https://itkxmyqv2a2vccunpsndolfhjejajugsztsg3wewgh6lrpvhundq.ardrive.net/RNV2YhXQNVEKjXyaNyynSRIE0NLM5G3YljH8uL6no0c';

function monogram(cat) {
  if (cat === 'viewers') return 'V';
  if (cat === 'channel') return 'S';
  if (cat === 'chat') return 'C';
  if (cat === 'tips') return 'T';
  if (cat === 'time') return 'H';
  return 'M';
}

function labelFor(cat) {
  if (cat === 'viewers') return t('achievementsGroupViewers');
  if (cat === 'channel') return t('achievementsGroupChannel');
  if (cat === 'chat') return t('achievementsGroupChat');
  if (cat === 'tips') return t('achievementsGroupTips');
  if (cat === 'time') return t('achievementsGroupTime');
  return t('achievementsGroupOther');
}

const grouped = computed(() => {
  const order = ['viewers', 'channel', 'chat', 'time', 'tips'];
  const byCat = Object.create(null);
  for (const it of status.items || []) {
    const key = order.includes(it.category) ? it.category : 'misc';
    (byCat[key] ||= []).push(it);
  }
  return order
    .map((cat) => {
      const items = byCat[cat] || [];
      const completed = items.filter((i) => i.completed).length;
      return { cat, label: labelFor(cat), items, total: items.length, completed };
    })
    .filter((g) => g.items.length > 0);
});

async function processAudioData(data) {
  audio.audioSource = data.audioSource || 'remote';
  audioState.hasCustomAudio = !!data.hasCustomAudio;
  audioState.audioFileName = data.audioFileName || '';
  audioState.audioFileSize = data.audioFileSize || 0;
  audioState.audioLibraryId = data.audioLibraryId || '';
  audioState.storageProvider =
    typeof data.storageProvider === 'string' ? data.storageProvider : audioState.storageProvider;
  if (audioState.storageProvider) {
    if (audioState.storageProvider !== WUZZY_PROVIDER_ID) {
      storage.registerProvider(audioState.storageProvider);
    }
    cfg.sound.storageProvider = audioState.storageProvider;
  }

  if (audio.audioSource === 'custom' && audioState.hasCustomAudio) {
    if (data.audioFileUrl) {
      cfg.sound.url = data.audioFileUrl;
    } else {
      try {
        const response = await api.get('/api/achievements-custom-audio');
        cfg.sound.url = response.data.url;
      } catch (error) {
        console.error('Error fetching custom audio URL:', error);
        cfg.sound.url = REMOTE_ACH_SOUND_URL;
      }
    }
  } else {
    cfg.sound.url = REMOTE_ACH_SOUND_URL;
  }
  resolveStorageSelection();
}

async function refreshAudioState() {
  try {
    const { data } = await api.get('/api/achievements-audio-settings');
    await processAudioData(data);
  } catch (error) {
    if (
      error.response &&
      error.response.data &&
      (error.response.data.error === 'CONFIGURATION_BLOCKED' ||
        error.response.data.error === 'configuration_blocked')
    ) {
      isBlocked.value = true;
      const details = error.response.data.details;
      blockDetails.value = typeof details === 'string' ? { reason: details } : details || {};
    } else {
      console.error('Error refreshing audio state:', error);
    }
  }
}

async function loadAll() {
  loading.value = true;
  channelCfgLoading.value = true;
  isBlocked.value = false;
  try {
    const [rConfig, rStatus, rAudio, rChannelCfg] = await Promise.allSettled([
      fetchAchievementsConfig(),
      getAchievementsStatus(),
      api.get('/api/achievements-audio-settings'),
      fetchChannelAnalyticsConfig(),
    ]);

    const blockedError = [rConfig, rStatus, rAudio, rChannelCfg].find(
      (r) =>
        r.status === 'rejected' &&
        (r.reason?.response?.data?.error === 'CONFIGURATION_BLOCKED' ||
          r.reason?.response?.data?.error === 'configuration_blocked')
    );

    if (blockedError) {
      isBlocked.value = true;
      const details = blockedError.reason.response.data.details;
      blockDetails.value = typeof details === 'string' ? { reason: details } : details || {};
      return;
    }

    if (rConfig.status === 'fulfilled') {
      const { config, meta } = rConfig.value;
      if (config && typeof config === 'object') {
        for (const k of Object.keys(config)) {
          if (k === 'sound' && typeof config.sound === 'object' && config.sound) {
            cfg.sound = { ...cfg.sound, ...config.sound };
            if (
              typeof cfg.sound.storageProvider === 'string' &&
              cfg.sound.storageProvider &&
              cfg.sound.storageProvider !== WUZZY_PROVIDER_ID
            ) {
              storage.registerProvider(cfg.sound.storageProvider);
            }
          } else if (k in cfg) {
            cfg[k] = config[k];
          } else {
            cfg[k] = config[k];
          }
        }
      }
      achMeta.value = meta;
    }

    if (rStatus.status === 'fulfilled') {
      const st = rStatus.value;
      status.items = Array.isArray(st.items) ? st.items : [];
      status.meta = st && typeof st === 'object' ? st.meta || null : null;
    }

    if (rChannelCfg.status === 'fulfilled') {
      channelAnalyticsCfg.value = rChannelCfg.value;
    }

    if (rAudio.status === 'fulfilled') {
      await processAudioData(rAudio.value.data);
    }

    try {
      await refreshChannelAvatar();
    } catch {}

    try {
      await refreshChannelAnalytics();
    } catch {}
  } finally {
    loading.value = false;
    channelCfgLoading.value = false;
  }
}

async function refreshChannelAnalytics() {
  channelMetricsError.value = '';
  if (!hasChannelAuth.value) {
    channelAnalyticsOverview.value = null;
    return;
  }
  channelMetricsLoading.value = true;
  try {
    channelAnalyticsOverview.value = await fetchChannelAnalytics('week');
  } catch (e) {
    channelAnalyticsOverview.value = null;
    const status = e?.response?.status;
    if (status === 401) channelMetricsError.value = 'Invalid or missing auth token';
    else if (status === 404) channelMetricsError.value = 'Channel not found';
    else channelMetricsError.value = 'Failed to fetch channel metrics';
  } finally {
    channelMetricsLoading.value = false;
  }
}

async function refreshStatusOnly() {
  try {
    const st = await getAchievementsStatus();
    status.items = Array.isArray(st.items) ? st.items : [];
    status.meta = st && typeof st === 'object' ? st.meta || null : null;
  } catch {}
}

let pollTimer = null;
async function pollRealtime() {
  try {
    await Promise.allSettled([pollAchievementsViewers(), pollAchievementsChannel()]);
  } catch {}
  await refreshStatusOnly();
  await refreshChannelAnalytics();
}
async function save() {
  saving.value = true;
  try {
    const payload = { ...cfg, sound: { ...cfg.sound } };
    const { config, meta } = await saveAchievementsConfig(payload);

    try {
      const formData = new FormData();
      formData.append('audioSource', audio.audioSource);
      formData.append('enabled', String(cfg.sound.enabled));
      formData.append('volume', String(cfg.sound.volume));
      if (audioState.storageProvider) {
        formData.append('storageProvider', audioState.storageProvider);
      }
      await api.post('/api/achievements-audio-settings', formData);
    } catch (e) {
      console.warn('Failed to save achievements audio settings separately:', e);
    }

    if (config && typeof config === 'object') {
      for (const k of Object.keys(config)) {
        if (k === 'sound' && typeof config.sound === 'object' && config.sound) {
          cfg.sound = { ...cfg.sound, ...config.sound };
        } else if (k in cfg) {
          cfg[k] = config[k];
        } else {
          cfg[k] = config[k];
        }
      }
    }
    achMeta.value = meta;
    await loadAll();
    pushToast('success', 'toastSettingsSaved');
  } catch (e) {
    if (
      e.response &&
      e.response.data &&
      (e.response.data.error === 'CONFIGURATION_BLOCKED' ||
        e.response.data.error === 'configuration_blocked')
    ) {
      isBlocked.value = true;
      const details = e.response.data.details;
      blockDetails.value = typeof details === 'string' ? { reason: details } : details || {};
    }
  } finally {
    saving.value = false;
  }
}
async function reset(id) {
  try {
    await resetAchievement(id);
    await loadAll();
    pushToast('info', 'toastAchievementReset');
  } catch (e) {
    if (
      e.response &&
      e.response.data &&
      (e.response.data.error === 'CONFIGURATION_BLOCKED' ||
        e.response.data.error === 'configuration_blocked')
    ) {
      isBlocked.value = true;
      const details = e.response.data.details;
      blockDetails.value = typeof details === 'string' ? { reason: details } : details || {};
    }
  }
}

async function testNotif() {
  try {
    await testAchievementsNotification(walletHash.value);
    pushToast('info', 'toastTestSent');
  } catch (e) {
    if (
      e.response &&
      e.response.data &&
      (e.response.data.error === 'CONFIGURATION_BLOCKED' ||
        e.response.data.error === 'configuration_blocked')
    ) {
      isBlocked.value = true;
      const details = e.response.data.details;
      blockDetails.value = typeof details === 'string' ? { reason: details } : details || {};
    }
  }
}

onMounted(async () => {
  await refresh();
  await storage.fetchProviders();
  await loadAll();
  await pollRealtime();
  pollTimer = setInterval(pollRealtime, 30000);
});
onMounted(() => {
  settingsCollapsed.value = readCollapsed();
});

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
});

watch(
  () => audio.audioSource,
  async (src) => {
    if (src === 'custom' && audioState.hasCustomAudio) {
      try {
        const response = await api.get('/api/achievements-custom-audio');
        cfg.sound.url = response.data.url;
      } catch (error) {
        console.error('Error fetching custom audio URL:', error);
        cfg.sound.url = REMOTE_ACH_SOUND_URL;
      }
    } else {
      cfg.sound.url = REMOTE_ACH_SOUND_URL;
    }
  }
);

watch(storageOptions, () => {
  resolveStorageSelection();
});

watch(selectedStorageProvider, (next) => {
  if (audioState.storageProvider === WUZZY_PROVIDER_ID) return;
  const normalized = typeof next === 'string' ? next : '';
  audioState.storageProvider = normalized;
  cfg.sound.storageProvider = normalized;
});

watch(
  () => cfg.claimid,
  () => {
    refreshChannelAvatar();
  }
);

async function refreshChannelAvatar() {
  try {
    channelAvatarUrl.value = '';
    avatarError.value = false;
    avatarLoading.value = true;
    const id = (cfg.claimid || '').trim();
    if (!id) return;
    const r = await fetch(`/api/channel/avatar?claimId=${encodeURIComponent(id)}`, {
      credentials: 'include',
    });
    if (!r.ok) return;
    const j = await r.json();
    channelAvatarUrl.value = typeof j?.avatar === 'string' ? j.avatar : '';
    if (!channelAvatarUrl.value) avatarError.value = true;
  } catch {
    avatarError.value = true;
  } finally {
    avatarLoading.value = false;
  }
}

function onAvatarError() {
  avatarError.value = true;
  channelAvatarUrl.value = '';
}

let avatarTimer = null;
function clampHistory() {
  if (typeof cfg.historySize !== 'number' || isNaN(cfg.historySize)) cfg.historySize = 1;
  if (cfg.historySize < 1) cfg.historySize = 1;
  if (cfg.historySize > 20) cfg.historySize = 20;
}
function incHistory() {
  if (cfg.historySize < 20) cfg.historySize++;
}
function decHistory() {
  if (cfg.historySize > 1) cfg.historySize--;
}
function debouncedAvatarRefresh() {
  if (avatarTimer) clearTimeout(avatarTimer);
  avatarTimer = setTimeout(() => {
    refreshChannelAvatar();
  }, 450);
}

function pushToast(type, messageKey, timeout = 3500) {
  const id = ++toastCounter;
  toasts.value.push({ id, type, messageKey });
  if (timeout > 0) {
    setTimeout(() => dismissToast(id), timeout);
  }
}
function dismissToast(id) {
  toasts.value = toasts.value.filter((t) => t.id !== id);
}
</script>

<style scoped src="./Achievements.css"></style>
