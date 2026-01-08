<template>
  <OsCard>
    <template #header>
      <h3 class="os-card-title flex items-center gap-1.5">
        <span class="icon os-icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linejoin="round">
            <path d="M3 3v18h18" />
            <polyline points="7 14 11 10 14 13 18 9" />
          </svg>
        </span>
        {{ t('streamHistoryTitle') }}
      </h3>
    </template>
    <BlockedState v-if="isBlocked" :module-name="t('streamHistoryTitle')" :details="blockDetails" />

    <div class="nav-bar-layout h-auto min-h-[64px] py-1 mb-3 flex-wrap" v-if="!isBlocked">
      <div class="w-auto p-2 flex items-center gap-2">
        <h3 class="font-heading text-lg font-semibold">{{ t('activity') }}</h3>
        <button
          type="button"
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-os-sm border text-[0.75rem] hover:opacity-100"
          style="
            background: rgb(255, 24, 76);
            color: #fff;
            font-weight: 600;
            border-color: rgb(255, 24, 76);
          "
          @click="settingsCollapsed = !settingsCollapsed">
          <i class="pi pi-cog" aria-hidden="true"></i>
          <span class="sr-only sm:not-sr-only">{{ t('settings') || 'Settings' }}</span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            :style="
              settingsCollapsed
                ? 'transform:rotate(-90deg);transition:transform .2s'
                : 'transition:transform .2s'
            ">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <div class="w-auto p-2 ml-auto flex flex-wrap items-center gap-2">
        <div class="live-analytics-trigger relative">
          <button
            type="button"
            class="top-toggle inline-flex items-center justify-center w-8 h-8 p-0 rounded-full border border-[var(--card-border)] bg-[var(--bg-chat)] text-sm font-medium sm:w-auto sm:h-auto sm:justify-start sm:gap-1 sm:px-3 sm:py-1.5"
            :aria-expanded="String(!overlayCollapsed)"
            @click="overlayCollapsed = !overlayCollapsed"
            :title="overlayCollapsed ? 'Expand live analytics' : 'Collapse live analytics'">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true">
              <path
                d="M3 12h4l3-7 4 14 3-7h4"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round" />
            </svg>
            <span class="sr-only sm:not-sr-only">{{ t('activity') }}</span>
            <svg
              class="hidden sm:inline-block"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              :style="
                overlayCollapsed
                  ? 'transform:rotate(-90deg);transition:transform .2s'
                  : 'transition:transform .2s'
              "
              aria-hidden="true">
              <path
                d="M6 9l6 6 6-6"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round" />
            </svg>
          </button>
          <div
            v-if="!overlayCollapsed"
            class="chart-overlay chart-overlay-popover"
            aria-label="viewer-stats">
            <div class="overlay-row">
              <span class="dot dot-teal" aria-hidden="true"></span>
              <span class="ov-label">{{ t('kpiAvgViewers') }}</span>
              <span class="ov-value">{{ Number(perf.range.avgViewers || 0).toFixed(1) }}</span>
            </div>
            <div class="overlay-row">
              <span class="dot dot-red" aria-hidden="true"></span>
              <span class="ov-label">{{ t('kpiPeakViewers') }}</span>
              <span class="ov-value">{{ perf.range.peakViewers }}</span>
            </div>
            <div class="overlay-row">
              <span class="dot dot-slate" aria-hidden="true"></span>
              <span class="ov-label">{{ t('kpiHighestViewers') }}</span>
              <span class="ov-value">{{ perf.allTime.highestViewers }}</span>
            </div>
          </div>
        </div>

        <div class="relative flex items-center gap-1">
          <button
            type="button"
            class="range-trigger"
            :aria-expanded="String(calendarOpen)"
            aria-haspopup="dialog"
            :title="t('streamHistoryRangePlaceholder')"
            @click="toggleCalendar">
            <span class="range-trigger-icon" aria-hidden="true">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"></rect>
                <path d="M3 10h18"></path>
                <path d="M8 2v4"></path>
                <path d="M16 2v4"></path>
              </svg>
            </span>
            <span class="range-trigger-label sr-only sm:not-sr-only">{{
              t('streamHistoryRangePlaceholder')
            }}</span>
            <span class="range-trigger-icon" aria-hidden="true">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </span>
          </button>
        </div>

        <div class="relative">
          <button
            type="button"
            class="quick-select-trigger"
            :aria-expanded="String(quickPeriodOpen)"
            aria-haspopup="listbox"
            @click="quickPeriodOpen = !quickPeriodOpen"
            ref="quickPeriodTriggerRef">
            <span class="quick-select-label">{{ quickPeriodLabel }}</span>
            <span class="quick-select-caret" aria-hidden="true">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </span>
          </button>
          <div
            v-if="quickPeriodOpen"
            ref="quickPeriodPopoverRef"
            class="quick-select-popover"
            role="listbox">
            <button
              v-for="opt in quickPeriodOptions"
              :key="opt.value"
              type="button"
              class="quick-select-option"
              :class="{ active: filterQuick === opt.value }"
              @click="onQuickFilterChange(opt.value)">
              {{ opt.label }}
            </button>
            <div class="h-px bg-[var(--card-border)] my-1"></div>
            <button
              type="button"
              class="quick-select-option"
              :class="{ active: filterQuick === 'custom' }"
              @click="onQuickFilterChange('custom')">
              {{ t('streamHistoryRangeCustom') }}
            </button>
          </div>
        </div>

        <div class="relative">
          <button
            type="button"
            class="quick-select-trigger"
            :aria-expanded="String(quickSpanOpen)"
            aria-haspopup="listbox"
            @click="quickSpanOpen = !quickSpanOpen"
            ref="quickSpanTriggerRef">
            <span class="quick-select-label">{{ quickSpanLabel }}</span>
            <span class="quick-select-caret" aria-hidden="true">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </span>
          </button>
          <div
            v-if="quickSpanOpen"
            ref="quickSpanPopoverRef"
            class="quick-select-popover"
            role="listbox">
            <button
              v-for="opt in quickSpanOptions"
              :key="opt.value"
              type="button"
              class="quick-select-option"
              :class="{ active: Number(filterQuickSpan) === opt.value }"
              @click="onQuickRangeChange(opt.value)">
              {{ opt.label }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="w-full mb-4 px-1 flex flex-wrap items-center gap-2" v-if="!isBlocked">
      <div class="text-xs font-bold uppercase tracking-wide opacity-60 mr-1 hidden sm:block">
        Metrics:
      </div>

      <button
        class="px-2 py-1 rounded text-xs border border-[var(--card-border)] flex items-center gap-1.5 transition-colors"
        :class="
          activeMetric === 'time-streamed'
            ? 'bg-[rgba(139,92,246,0.15)] border-[rgba(139,92,246,0.5)] text-[var(--text-primary)] font-semibold'
            : 'bg-[var(--bg-chat)] hover:bg-[var(--card-bg)] opacity-80 hover:opacity-100'
        "
        @click="activeMetric = 'time-streamed'">
        <span class="dot dot-purple"></span>
        {{ t('metricTimeStreamed') || 'Time Streamed' }}
      </button>

      <button
        class="px-2 py-1 rounded text-xs border border-[var(--card-border)] flex items-center gap-1.5 transition-colors"
        :class="
          activeMetric === 'avg-viewers'
            ? 'bg-[rgba(34,211,238,0.15)] border-[rgba(34,211,238,0.5)] text-[var(--text-primary)] font-semibold'
            : 'bg-[var(--bg-chat)] hover:bg-[var(--card-bg)] opacity-80 hover:opacity-100'
        "
        @click="activeMetric = 'avg-viewers'">
        <span class="dot dot-teal"></span>
        {{ t('metricAvgViewers') || 'Avg Viewers' }}
      </button>

      <button
        class="px-2 py-1 rounded text-xs border border-[var(--card-border)] flex items-center gap-1.5 transition-colors"
        :class="
          activeMetric === 'follows'
            ? 'bg-[rgba(34,197,94,0.15)] border-[rgba(34,197,94,0.5)] text-[var(--text-primary)] font-semibold'
            : 'bg-[var(--bg-chat)] hover:bg-[var(--card-bg)] opacity-80 hover:opacity-100'
        "
        @click="activeMetric = 'follows'">
        <span class="dot bg-green-500"></span>
        {{ t('metricFollows') || 'Follows' }}
      </button>

      <button
        class="px-2 py-1 rounded text-xs border border-[var(--card-border)] flex items-center gap-1.5 transition-colors"
        :class="
          activeMetric === 'unique-viewers'
            ? 'bg-[rgba(249,115,22,0.15)] border-[rgba(249,115,22,0.5)] text-[var(--text-primary)] font-semibold'
            : 'bg-[var(--bg-chat)] hover:bg-[var(--card-bg)] opacity-80 hover:opacity-100'
        "
        @click="activeMetric = 'unique-viewers'">
        <span class="dot bg-orange-500"></span>
        {{ t('metricUniqueViewers') || 'Unique Viewers' }}
      </button>

      <button
        class="px-2 py-1 rounded text-xs border border-[var(--card-border)] flex items-center gap-1.5 transition-colors"
        :class="
          activeMetric === 'unique-chatters'
            ? 'bg-[rgba(236,72,153,0.15)] border-[rgba(236,72,153,0.5)] text-[var(--text-primary)] font-semibold'
            : 'bg-[var(--bg-chat)] hover:bg-[var(--card-bg)] opacity-80 hover:opacity-100'
        "
        @click="activeMetric = 'unique-chatters'">
        <span class="dot dot-pink"></span>
        {{ t('metricUniqueChatters') || 'Unique Chatters' }}
      </button>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4" v-if="!isBlocked">
      <div
        class="p-3 rounded-[8px] border cursor-pointer transition-all duration-200"
        :class="
          activeMetric === 'time-streamed'
            ? 'bg-[rgba(139,92,246,0.08)] border-[rgba(139,92,246,0.4)] shadow-md'
            : 'bg-[var(--bg-chat)] border-[var(--card-border)] hover:border-[rgba(139,92,246,0.3)] hover:-translate-y-0.5'
        "
        @click="activeMetric = 'time-streamed'">
        <div class="text-xs uppercase tracking-wide opacity-70 mb-1 font-semibold">
          {{ t('metricTimeStreamed') || 'Time Streamed' }}
        </div>
        <div class="text-2xl font-bold">
          {{ fmtTotal(perf.range.hoursStreamed) }}
        </div>
        <div class="text-[10px] flex items-center gap-1 mt-1 opacity-80">Range total</div>
      </div>

      <div
        class="p-3 rounded-[8px] border cursor-pointer transition-all duration-200"
        :class="
          activeMetric === 'avg-viewers'
            ? 'bg-[rgba(34,211,238,0.08)] border-[rgba(34,211,238,0.4)] shadow-md'
            : 'bg-[var(--bg-chat)] border-[var(--card-border)] hover:border-[rgba(34,211,238,0.3)] hover:-translate-y-0.5'
        "
        @click="activeMetric = 'avg-viewers'">
        <div class="text-xs uppercase tracking-wide opacity-70 mb-1 font-semibold">
          {{ t('metricAvgViewers') || 'Avg Viewers' }}
        </div>
        <div class="text-2xl font-bold">{{ perf.range.avgViewers || 0 }}</div>
        <div
          class="text-[10px] flex items-center gap-1 mt-1 opacity-80"
          v-if="perf.range.activeDays > 0">
          {{ perf.range.activeDays }} streams
        </div>
      </div>

      <div
        class="p-3 rounded-[8px] border cursor-pointer transition-all duration-200"
        :class="
          activeMetric === 'follows'
            ? 'bg-[rgba(34,197,94,0.08)] border-[rgba(34,197,94,0.4)] shadow-md'
            : 'bg-[var(--bg-chat)] border-[var(--card-border)] hover:border-[rgba(34,197,94,0.3)] hover:-translate-y-0.5'
        "
        @click="activeMetric = 'follows'">
        <div class="text-xs uppercase tracking-wide opacity-70 mb-1 font-semibold">
          {{ t('metricFollows') || 'Follows' }}
        </div>
        <div class="text-2xl font-bold">
          {{
            followersPerf.total != null
              ? followersPerf.total
              : perf.range.maxFollowers
                ? perf.range.maxFollowers
                : '-'
          }}
        </div>
        <div
          class="text-[10px] flex items-center gap-1 mt-1"
          :class="Number(followersPerf.change) > 0 ? 'text-green-500' : 'text-neutral-400'">
          <span v-if="Number(followersPerf.change) > 0">▲</span>{{ followersPerf.change || '-' }}
        </div>
      </div>

      <div
        class="p-3 rounded-[8px] border cursor-pointer transition-all duration-200"
        :class="
          activeMetric === 'unique-viewers'
            ? 'bg-[rgba(249,115,22,0.08)] border-[rgba(249,115,22,0.4)] shadow-md'
            : 'bg-[var(--bg-chat)] border-[var(--card-border)] hover:border-[rgba(249,115,22,0.3)] hover:-translate-y-0.5'
        "
        @click="activeMetric = 'unique-viewers'">
        <div class="text-xs uppercase tracking-wide opacity-70 mb-1 font-semibold">
          {{ t('metricUniqueViewers') || 'Unique Viewers' }}
        </div>
        <div class="text-2xl font-bold">{{ perf.range.peakViewers || 0 }}</div>
        <div class="text-[10px] flex items-center gap-1 mt-1 opacity-80">Range peak (est)</div>
      </div>

      <div
        class="p-3 rounded-[8px] border cursor-pointer transition-all duration-200"
        :class="
          activeMetric === 'unique-chatters'
            ? 'bg-[rgba(236,72,153,0.08)] border-[rgba(236,72,153,0.4)] shadow-md'
            : 'bg-[var(--bg-chat)] border-[var(--card-border)] hover:border-[rgba(236,72,153,0.3)] hover:-translate-y-0.5'
        "
        @click="activeMetric = 'unique-chatters'">
        <div class="text-xs uppercase tracking-wide opacity-70 mb-1 font-semibold">
          {{ t('metricUniqueChatters') || 'Unique Chatters' }}
        </div>
        <div class="text-2xl font-bold">{{ perf.range.maxChatters || '-' }}</div>
        <div class="text-[10px] flex items-center gap-1 mt-1 opacity-80">Range peak</div>
      </div>
    </div>

    <div
      class="w-full p-3 mb-2 rounded-[8px] border border-[var(--card-border)] bg-[var(--bg-chat)]"
      v-if="!settingsCollapsed">
      <div class="grid [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))] gap-3">
        <span v-if="samplingCaption" class="text-[0.72rem] opacity-90 italic sampling-caption">
          {{ samplingCaption }}
        </span>
        <div class="form-group [grid-column:1/-1]">
          <label class="label">{{ t('streamHistoryClaimId') }}</label>
          <input class="input" v-model="claimid" />
          <div class="mt-2 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-os-sm border border-[var(--card-border)] bg-[var(--bg-chat)] text-xs opacity-85 hover:opacity-100 disabled:opacity-60"
              :disabled="saving"
              :title="saving ? t('commonSaving') || 'Saving…' : t('commonSave') || 'Save'"
              @click="saveConfig">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true">
                <path
                  d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round" />
                <path
                  d="M7 3v6h8V3"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round" />
                <path
                  d="M7 21v-7h10v7"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round" />
              </svg>
              <span>{{ saving ? t('commonSaving') : t('commonSave') }}</span>
            </button>

            <button
              type="button"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-os-sm border border-[var(--card-border)] bg-[var(--bg-chat)] text-xs opacity-85 hover:opacity-100"
              :title="t('commonRefresh') || 'Refresh'"
              @click="refresh">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true">
                <path
                  d="M21 12a9 9 0 1 1-2.64-6.36"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round" />
                <path
                  d="M21 3v6h-6"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round" />
              </svg>
              <span>{{ t('commonRefresh') }}</span>
            </button>

            <button
              type="button"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-os-sm border border-[var(--card-border)] bg-[var(--bg-chat)] text-xs text-red-500 hover:opacity-100"
              :title="t('streamHistoryClear') || 'Clear'"
              @click="clearHistory">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true">
                <path d="M3 6h18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                <path
                  d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round" />
                <path
                  d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round" />
              </svg>
              <span>{{ t('streamHistoryClear') }}</span>
            </button>

            <button
              type="button"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-os-sm border border-[var(--card-border)] bg-[var(--bg-chat)] text-xs opacity-85 hover:opacity-100"
              :title="t('streamHistoryExport') || 'Export'"
              @click="downloadExport">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true">
                <path
                  d="M12 3v12"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round" />
                <path
                  d="M8 11l4 4 4-4"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round" />
                <path
                  d="M4 21h16"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round" />
              </svg>
              <span>{{ t('streamHistoryExport') }}</span>
            </button>

            <label
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-os-sm border border-[var(--card-border)] bg-[var(--bg-chat)] text-xs opacity-85 hover:opacity-100 cursor-pointer"
              :title="t('streamHistoryImport') || 'Import'">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true">
                <path
                  d="M12 21V9"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round" />
                <path
                  d="M16 13l-4-4-4 4"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round" />
                <path
                  d="M4 21h16"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round" />
              </svg>
              <span>{{ t('streamHistoryImport') }}</span>
              <input type="file" accept="application/json" @change="onImport" class="hidden" />
            </label>
          </div>

          <div class="mt-3 flex flex-col gap-1">
            <label class="label flex items-center gap-2">
              <span>{{ t('streamHistoryDailyGoalLabel') }}</span>
              <span class="text-[0.7rem] font-normal opacity-70">{{
                t('streamHistoryDailyGoalHint')
              }}</span>
            </label>
            <input class="input w-28" type="number" min="0" step="0.5" v-model.number="goalHours" />
          </div>

          <div class="status-row mt-3 pt-3 border-t border-[var(--card-border)]">
            <span class="badge" :class="status.connected ? 'ok' : 'err'">
              {{ status.connected ? t('connected') : t('disconnected') }}
            </span>
            <span class="badge" :class="status.live ? 'live' : 'idle'" v-if="status.connected">
              {{ status.live ? t('liveNow') : t('notLive') }}
            </span>
            <span
              class="badge samples"
              :title="
                t('streamHistoryDataPointsHint') +
                '\n' +
                t('streamHistoryDataPointsCurrent') +
                ': ' +
                sampleCount
              ">
              {{ t('streamHistoryDataPoints') }}: {{ sampleCount }}
              <span class="hist-points-info" aria-hidden="true">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round">
                  <rect x="3" y="10" width="3" height="11" rx="0.5" />
                  <rect x="9" y="6" width="3" height="15" rx="0.5" />
                  <rect x="15" y="13" width="3" height="8" rx="0.5" />
                  <path d="M3 21h18" />
                </svg>
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="nav-bar-layout">
      <div class="Layout">
        <button class="tw-interactable" aria-label="Previous period" @click="shiftPeriod(-1)">
          <div class="Layout">
            <div class="Layout">
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path
                  fill-rule="evenodd"
                  d="m8 12.207 5.207 5.207L14.621 16l-3.793-3.793 3.793-3.793L13.207 7 8 12.207Z"
                  clip-rule="evenodd"
                  fill="currentColor"></path>
              </svg>
            </div>
          </div>
        </button>
      </div>

      <div class="Layout relative">
        <button
          class="tw-interactable"
          id="date-picker-toggle"
          @click="toggleCalendar"
          ref="calendarTriggerRef">
          <div class="Layout nav-bar-header" aria-live="polite">
            <p class="nav-bar-header__text" id="date-range">{{ rangeLabel }}</p>
            <p class="nav-bar-header__text" id="days-count">{{ rangeDurationLabel }}</p>
          </div>
        </button>

        <div
          v-if="calendarOpen"
          ref="calendarPopoverRef"
          class="range-popover"
          role="dialog"
          style="top: 100%; left: 50%; transform: translateX(-50%); margin-top: 10px"
          :aria-label="t('streamHistoryRangePlaceholder')">
          <div class="range-popover-body split">
            <div class="calendar-pane">
              <label>
                <span>{{ t('streamHistoryRangeStart') }}</span>
                <input
                  type="date"
                  v-model="rangeDraft.start"
                  :min="minCalendarDate"
                  :max="todayIso" />
              </label>
            </div>
            <div class="calendar-pane">
              <label>
                <span>{{ t('streamHistoryRangeEnd') }}</span>
                <input
                  type="date"
                  v-model="rangeDraft.end"
                  :min="rangeDraft.start || minCalendarDate"
                  :max="todayIso" />
              </label>
            </div>
          </div>
          <p v-if="rangeError" class="range-error mt-2">{{ rangeError }}</p>
          <div class="range-popover-footer">
            <button
              type="button"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[var(--card-border)] bg-[var(--bg-chat)] text-xs font-medium hover:opacity-100 disabled:opacity-60"
              :disabled="!customRangeActive && !hasDraft"
              @click="onClearRangeClick">
              {{ t('streamHistoryRangeClear') }}
            </button>
            <div class="range-actions">
              <button
                type="button"
                class="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-transparent bg-transparent text-xs font-medium text-[var(--text-secondary,#475569)] hover:underline"
                @click="closeCalendar">
                {{ t('commonCancel') }}
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-1 px-3 py-1 rounded-md border border-transparent bg-[#2563eb] text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed range-apply-btn"
                :disabled="applyDisabled"
                @click="applyCalendarRange">
                {{ t('streamHistoryRangeApply') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="Layout">
        <button class="tw-interactable" aria-label="Next period" @click="shiftPeriod(1)">
          <div class="Layout">
            <div class="Layout">
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path
                  fill-rule="evenodd"
                  d="m15.621 12.207-5.207 5.207L9 16l3.793-3.793L9 8.414 10.414 7l5.207 5.207Z"
                  clip-rule="evenodd"
                  fill="currentColor"></path>
              </svg>
            </div>
          </div>
        </button>
      </div>
    </div>

    <div class="mt-4" v-if="!isBlocked">
      <div
        v-if="tzChangeVisible"
        class="mb-3 p-3 rounded-md border border-[var(--card-border)] bg-[var(--bg-chat)] text-xs flex flex-col gap-2">
        <div class="font-semibold flex items-center gap-1">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{{ t('streamHistoryTzChangedTitle') }}</span>
        </div>
        <div>
          {{
            t('streamHistoryTzChangedBody', {
              prev: previousTzDisplay || '—',
              current: currentPhysicalTzDisplay,
            })
          }}
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[var(--card-border)] bg-[var(--bg-chat)] hover:opacity-100"
            @click="acceptNewTimezone">
            {{ t('streamHistoryUseNewTz') }} ({{ currentPhysicalTzDisplay }})
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[var(--card-border)] hover:opacity-100"
            @click="keepPreviousTimezone">
            {{ t('streamHistoryKeepPrevTz') }} ({{ previousTzDisplay || tzDisplay }})
          </button>
        </div>
      </div>
      <div
        class="mb-4 text-xs opacity-70 italic"
        v-if="!isBlocked && activeMetric === 'follows' && !followersPerf.total">
        Note: Follows history requires Channel Analytics configuration.
      </div>

      <div
        class="chart-wrap mb-4"
        :class="status.live ? 'ring-1 ring-offset-2 ring-red-500/20' : ''">
        <div v-if="!isBlocked" class="w-full h-full chart-canvas z-10" ref="chartEl"></div>
        <BlockedState
          v-if="isBlocked"
          :module-name="t('streamHistoryTitle')"
          :details="blockDetails"
          class="absolute inset-0 z-20 bg-[var(--card-bg)]/95" />
        <div
          v-if="!isBlocked"
          class="text-xs mt-3 flex flex-wrap items-center gap-2 px-2 py-1 bg-[var(--bg-chat)] rounded border border-[var(--card-border)]">
          <span class="opacity-70"> {{ rangeDurationLabel }} • {{ rangeLabel }} </span>
          <div class="ml-auto flex items-center gap-2">
            <span class="peak-session-summary" v-if="activeMetric === 'avg-viewers'">
              <span class="peak-session-label">{{ t('kpiPeakViewers') }}:</span>
              <span class="peak-session-value">{{ perf.range.peakViewers }}</span>
            </span>
            <div class="h-4 w-px bg-[var(--card-border)] mx-1"></div>
            <div
              class="flex bg-[var(--bg-chat)] rounded-[6px] border border-[var(--card-border)] p-0.5">
              <button
                type="button"
                class="px-2 py-0.5 rounded-[4px] text-[0.7rem] font-medium transition-colors"
                :class="
                  mode === 'candle'
                    ? 'bg-[var(--card-bg)] shadow-sm text-[#8757f6]'
                    : 'hover:bg-[var(--card-bg)]/50 opacity-70'
                "
                @click="mode = 'candle'">
                Candles
              </button>
              <button
                type="button"
                class="px-2 py-0.5 rounded-[4px] text-[0.7rem] font-medium transition-colors"
                :class="
                  mode === 'line'
                    ? 'bg-[var(--card-bg)] shadow-sm text-[#8757f6]'
                    : 'hover:bg-[var(--card-bg)]/50 opacity-70'
                "
                @click="mode = 'line'">
                Line
              </button>
            </div>
          </div>
        </div>
      </div>
      <div v-if="sparklineAvailable" class="viewers-trend mt-2">
        <div class="viewers-trend-header">
          <span>{{ t('streamHistoryViewersTrend') }}</span>
          <button type="button" class="trend-toggle" @click="showViewerTrend = !showViewerTrend">
            {{ showViewerTrend ? t('hide') || 'Hide' : t('show') || 'Show' }}
          </button>
        </div>
        <div v-show="showViewerTrend" ref="sparklineEl" class="sparkline-canvas"></div>
      </div>
    </div>

    <div class="kpis mt-4">
      <div class="kpi">
        <div class="kpi-label">{{ t('kpiHoursStreamed') }}</div>
        <div class="kpi-value">{{ fmtHours(perf.range.hoursStreamed) }}</div>
        <div v-if="streamComparisons.hasCurrent" class="kpi-subtitle">
          <span>{{ lastStreamSubtitle }}</span>
          <span class="kpi-delta" :class="deltaClass(streamComparisons.durationDiffHours)">
            {{ formatHoursDelta(streamComparisons.durationDiffHours) }}
          </span>
        </div>
      </div>
      <div class="kpi">
        <div class="kpi-label">{{ t('kpiAvgViewers') }}</div>
        <div class="kpi-value">{{ perf.range.avgViewers.toFixed(2) }}</div>
        <div v-if="streamComparisons.hasCurrent" class="kpi-subtitle">
          <span>{{ lastStreamSubtitle }}</span>
          <span class="kpi-delta" :class="deltaClass(streamComparisons.avgViewersDiff)">
            {{ formatAvgViewersDelta(streamComparisons.avgViewersDiff) }}
          </span>
        </div>
      </div>
      <div class="kpi">
        <div class="kpi-label">{{ t('kpiPeakViewers') }}</div>
        <div class="kpi-value">{{ perf.range.peakViewers }}</div>
        <div v-if="streamComparisons.hasCurrent" class="kpi-subtitle">
          <span>{{ lastStreamSubtitle }}</span>
          <span class="kpi-delta" :class="deltaClass(streamComparisons.peakViewersDiff)">
            {{ formatPeakViewersDelta(streamComparisons.peakViewersDiff) }}
          </span>
        </div>
      </div>
      <div class="kpi">
        <div class="kpi-label">{{ t('kpiHoursWatched') }}</div>
        <div
          class="kpi-value"
          :title="
            t('kpiHoursWatchedTooltip') || 'Total hours all viewers spent watching (viewers × time)'
          ">
          {{ perf.range.hoursWatched.toFixed(2) }}
        </div>
        <div v-if="streamComparisons.hasCurrent" class="kpi-subtitle">
          <span>{{ lastStreamSubtitle }}</span>
          <span class="kpi-delta" :class="deltaClass(streamComparisons.viewerHoursDiff)">
            {{ formatViewerHoursDelta(streamComparisons.viewerHoursDiff) }}
          </span>
        </div>
      </div>
      <div class="kpi">
        <div class="kpi-label flex items-center gap-1">
          <span>{{ t('channelHighlightsFollowers') || 'Followers' }}</span>
          <button
            type="button"
            class="custom-tooltip-btn inline-flex items-center justify-center w-4 h-4 rounded cursor-help opacity-70 hover:opacity-100"
            :data-tooltip="
              t('kpiFollowersTooltip') ||
              'This metric depends on Odysee login and Channel Analytics configuration.'
            "
            tabindex="0">
            <i class="pi pi-question-circle os-help-icon" aria-hidden="true"></i>
          </button>
        </div>
        <div class="kpi-value">
          <template v-if="followersPerf.total != null">
            {{ Number(followersPerf.total || 0).toLocaleString() }}
          </template>
          <span v-else class="text-neutral-400 font-normal text-2xl">—</span>
        </div>
        <div v-if="followersPerf.change" class="kpi-subtitle">
          <span class="kpi-delta" :class="deltaClass(followersPerf.change)">
            {{ followersPerf.change > 0 ? '+' : '' }}{{ followersPerf.change }}
            <span class="delta-range" v-if="followersRangeLabel">({{ followersRangeLabel }})</span>
          </span>
        </div>
      </div>
      <div class="kpi">
        <div class="kpi-label">{{ t('kpiActiveDays') }}</div>
        <div class="kpi-value">{{ perf.range.activeDays }}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">{{ t('kpiTotalHoursStreamed') }}</div>
        <div class="kpi-value">{{ fmtTotal(perf.allTime.totalHoursStreamed) }}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">{{ t('kpiHighestViewers') }}</div>
        <div class="kpi-value">{{ perf.allTime.highestViewers }}</div>
      </div>
      <div class="kpi earnings-kpi">
        <div class="kpi-label flex items-center gap-2">
          <span>{{ t('kpiTotalEarnings') || 'Total earnings' }}</span>
          <button
            type="button"
            class="earnings-toggle"
            :aria-pressed="String(!earningsHidden)"
            @click="toggleEarningsHidden"
            :title="earningsHidden ? t('show') || 'Show' : t('hide') || 'Hide'">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg">
              <path
                d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round" />
              <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" />
            </svg>
          </button>
        </div>
        <div class="kpi-value earnings-values" :class="earningsHidden ? 'blurred' : ''">
          <div class="line-amount">
            <span>{{ displayedAR.toFixed(4) }}</span>
            <span class="unit">AR</span>
          </div>
          <div v-if="displayedUSD != null" class="usd">
            ≈ ${{
              displayedUSD.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            }}
          </div>
          <span
            v-if="usingWalletBalance"
            class="wallet-badge px-1 py-0.5 rounded text-[0.55rem] font-semibold tracking-wide bg-[var(--bg-chat)] border border-[var(--card-border)] opacity-80"
            :title="t('walletBalanceLabel') || 'Wallet balance (60s cache)'"
            >wallet</span
          >
        </div>
      </div>
      <div class="kpi stream-duration-kpi">
        <div class="kpi-label">{{ t('kpiStreamDuration') }}</div>
        <div class="kpi-value">
          <template v-if="streamComparisons.hasCurrent">
            {{ fmtHours(streamComparisons.durationHours) }}
          </template>
          <template v-else>
            {{ t('kpiNoStreamData') }}
          </template>
        </div>
        <div v-if="streamComparisons.hasCurrent" class="kpi-subtitle">
          <span>{{ lastStreamSubtitle }}</span>
          <span class="kpi-delta" :class="deltaClass(streamComparisons.durationDiffHours)">
            {{ formatHoursDelta(streamComparisons.durationDiffHours) }}
          </span>
        </div>
      </div>
    </div>

    <teleport to="body">
      <div
        v-if="showClearModal"
        class="modal-overlay"
        @click.self="!clearBusy && (showClearModal = false)"
        role="dialog"
        aria-modal="true">
        <div class="modal-card">
          <div class="modal-title">{{ t('streamHistoryClear') }}</div>
          <div class="modal-body">
            <p class="mb-2">{{ t('streamHistoryClearConfirm') }}</p>
            <p class="text-xs opacity-80">{{ t('streamHistoryHint') }}</p>
          </div>
          <div class="modal-actions">
            <button class="btn" :disabled="clearBusy" @click="showClearModal = false">
              {{ t('commonClose') }}
            </button>
            <button class="btn" :disabled="clearBusy" @click="downloadExport">
              {{ t('streamHistoryExport') }}
            </button>
            <button class="btn btn-danger" :disabled="clearBusy" @click="confirmClear">
              {{ t('streamHistoryClear') }}
            </button>
          </div>
        </div>
      </div>
    </teleport>

    <teleport to="body">
      <div
        v-if="showClaimChangeModal"
        class="modal-overlay"
        @click.self="!clearBusy && (showClaimChangeModal = false)"
        role="dialog"
        aria-modal="true">
        <div class="modal-card !p-0 overflow-hidden">
          <div class="p-5">
            <div class="flex items-start gap-4 mb-4">
              <div
                class="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center shrink-0">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="text-yellow-600 dark:text-yellow-400">
                  <path
                    d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              <div class="flex-1">
                <h3 class="text-lg font-bold leading-6 mb-2">
                  {{ t('streamHistoryClaimIdChanged') }}
                </h3>
                <div class="text-sm opacity-90 leading-relaxed">
                  {{ t('streamHistoryClaimChangeClearConfirm') }}
                </div>
              </div>
            </div>

            <div class="pl-14">
              <div
                class="flex gap-3 p-3 rounded bg-[var(--bg-chat)] border border-[var(--card-border)] text-xs opacity-90">
                <div class="shrink-0 text-blue-500 dark:text-blue-400 pt-0.5">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                </div>
                <div>
                  <span class="font-bold opacity-100 mr-1">Info</span>
                  {{ t('streamHistoryHint') }}
                </div>
              </div>
            </div>
          </div>

          <div
            class="bg-[var(--bg-chat)] p-4 flex justify-end gap-3 border-t border-[var(--card-border)]">
            <button
              class="btn border border-[var(--card-border)] hover:bg-[var(--card-bg)]"
              :disabled="clearBusy"
              @click="showClaimChangeModal = false">
              {{ t('commonClose') }}
            </button>
            <button
              class="btn bg-[var(--card-bg)] border border-[var(--card-border)] hover:bg-[var(--bg-chat)]"
              :disabled="clearBusy"
              @click="downloadExport">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                class="mr-1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {{ t('streamHistoryExport') }}
            </button>
            <button
              class="btn btn-danger"
              :disabled="clearBusy"
              @click="confirmClearAfterClaimChange">
              {{ t('streamHistoryClear') }}
            </button>
          </div>
        </div>
      </div>
    </teleport>
  </OsCard>
</template>

<script setup>
import { useI18n } from 'vue-i18n';
import { createStreamHistoryPanel } from './createStreamHistoryPanel.js';
import { ref, watch, computed, onMounted, onBeforeUnmount, reactive } from 'vue';
import { metrics } from '../../stores/metricsStore.js';
import BlockedState from '../shared/BlockedState.vue';

const { t, locale } = useI18n();
const EARLIEST_ANALYTICS_YEAR = 2020;
const EARLIEST_ANALYTICS_DATE = new Date(EARLIEST_ANALYTICS_YEAR, 0, 1);
const minCalendarDate = `${EARLIEST_ANALYTICS_YEAR}-01-01`;
const QUICK_SPAN_VALUES = Object.freeze([1, 7, 14, 30, 90]);
const state = createStreamHistoryPanel(t);

const {
  status,
  claimid,
  saving,
  isBlocked,
  blockDetails,
  saveConfig,
  refresh,
  clearHistory,
  downloadExport,
  onImport,
  filterQuick,
  onQuickFilterChange,
  filterQuickSpan,
  onQuickRangeChange,
  overlayCollapsed,
  perf,
  chartEl,
  sparklineEl,
  mode,
  fmtHours,
  fmtTotal,
  earningsHidden,
  toggleEarningsHidden,
  totalAR,
  usdFromAr,
  arUsd,
  showClearModal,
  clearBusy,
  confirmClear,
  showClaimChangeModal,
  confirmClearAfterClaimChange,
  goalHours,
  samplingCaption,
  showViewerTrend,
  sparklineAvailable,
  customRange,
  customRangeActive,
  applyCustomRange,
  clearCustomRange,
  streamComparisons,
  followersPerf,
} = state;

const usingWalletBalance = computed(() => {
  try {
    return (
      metrics.value?.tips?.totalBalance && typeof metrics.value.tips.totalBalance.ar === 'number'
    );
  } catch {
    return false;
  }
});
const displayedAR = computed(() => {
  if (usingWalletBalance.value) {
    try {
      return Number(metrics.value.tips.totalBalance.ar || 0);
    } catch {}
  }
  return Number(totalAR.value || 0);
});
const displayedUSD = computed(() => {
  if (usingWalletBalance.value) {
    try {
      const v = metrics.value.tips.totalBalance.usd;
      if (typeof v === 'number' && !isNaN(v)) return v;
    } catch {}
  }
  try {
    if (arUsd.value != null) return usdFromAr(totalAR.value, arUsd.value);
  } catch {}
  return null;
});

const streamDateFormatter = computed(() => {
  try {
    return new Intl.DateTimeFormat(locale.value || 'en-US', { month: 'short', day: 'numeric' });
  } catch {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
  }
});

const formatActiveDayLabel = (dayKey) => {
  if (typeof dayKey !== 'string' || dayKey.length !== 10) return '';
  const [yearRaw, monthRaw, dayRaw] = dayKey.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return '';
  const candidate = new Date(year, month - 1, day);
  if (Number.isNaN(candidate.getTime())) return '';
  try {
    return streamDateFormatter.value.format(candidate);
  } catch {
    return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;
  }
};

const hasStreamComparisons = computed(() => !!streamComparisons?.value?.hasCurrent);

const lastStreamSubtitle = computed(() => {
  if (!hasStreamComparisons.value) return '';
  const dateLabel = formatActiveDayLabel(streamComparisons.value.activeDayKey);
  if (dateLabel) return t('kpiLastStreamSubtitle', { date: dateLabel });
  return t('kpiLastStreamSubtitleStandalone');
});

const toFixedTrim = (num, decimals) => {
  const safeDecimals = Math.max(0, Number(decimals) || 0);
  const str = num.toFixed(safeDecimals);
  if (safeDecimals <= 0) return str;
  return str.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
};

const formatDeltaValue = (delta, decimals = 2, unit = '') => {
  if (delta == null) return t('kpiNoPreviousStream');
  const numeric = Number(delta);
  if (!Number.isFinite(numeric)) return t('kpiNoPreviousStream');
  const absVal = Math.abs(numeric);
  const trimmed = toFixedTrim(absVal, decimals);
  const valuePart = unit ? `${trimmed}${unit}` : trimmed;
  const sign = numeric > 0 ? '+' : numeric < 0 ? '-' : '';
  return `${sign}${valuePart} ${t('kpiVsPrevious')}`;
};

const formatHoursDelta = (delta) => {
  const magnitude = Math.abs(Number(delta || 0));
  const decimals = magnitude >= 10 ? 1 : 2;
  return formatDeltaValue(delta, decimals, 'h');
};

const formatAvgViewersDelta = (delta) => formatDeltaValue(delta, 2);

const formatPeakViewersDelta = (delta) => formatDeltaValue(delta, 0);

const formatViewerHoursDelta = (delta) => formatDeltaValue(delta, 2, 'h');

const followersRangeLabel = computed(() => {
  if (!followersPerf.value) return '';
  const r = followersPerf.value.range;
  const opt = quickPeriodOptions.value.find((o) => o.value === r);
  return opt ? opt.label : r;
});

const deltaClass = (delta) => {
  if (delta == null) return 'neutral';
  const numeric = Number(delta);
  if (!Number.isFinite(numeric)) return 'neutral';
  if (numeric > 0) return 'positive';
  if (numeric < 0) return 'negative';
  return 'neutral';
};

const calendarOpen = ref(false);
const calendarSource = ref(null);
const calendarTriggerRef = ref(null);
const calendarPopoverRef = ref(null);
const quickPeriodOpen = ref(false);
const quickSpanOpen = ref(false);
const quickPeriodTriggerRef = ref(null);
const quickPeriodPopoverRef = ref(null);
const quickSpanTriggerRef = ref(null);
const quickSpanPopoverRef = ref(null);
const rangeDraft = reactive({ start: '', end: '' });

const todayIso = computed(() => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
});

const dateFormatter = computed(() => {
  try {
    return new Intl.DateTimeFormat(locale.value || 'en-US', { dateStyle: 'medium' });
  } catch {
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });
  }
});

const parseInputDate = (value) => {
  if (typeof value !== 'string' || value.length !== 10) return null;
  const [yRaw, mRaw, dRaw] = value.split('-');
  const y = Number(yRaw);
  const m = Number(mRaw);
  const d = Number(dRaw);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const candidate = new Date(y, m - 1, d);
  if (Number.isNaN(candidate.getTime())) return null;
  if (candidate.getFullYear() !== y || candidate.getMonth() !== m - 1 || candidate.getDate() !== d)
    return null;
  if (candidate.getTime() < EARLIEST_ANALYTICS_DATE.getTime()) return null;
  return candidate;
};

const formatDateDisplay = (iso) => {
  const date = parseInputDate(iso);
  if (!date) return '';
  try {
    return dateFormatter.value.format(date);
  } catch {
    return iso;
  }
};

const syncDraftFromRange = () => {
  const range = customRange.value || {};
  if (customRangeActive.value && range.startDate && range.endDate) {
    rangeDraft.start = range.startDate;
    rangeDraft.end = range.endDate;
  } else {
    rangeDraft.start = '';
    rangeDraft.end = '';
  }
};

const hasDraft = computed(() => !!(rangeDraft.start || rangeDraft.end));

const draftValid = computed(() => {
  return !!(parseInputDate(rangeDraft.start) && parseInputDate(rangeDraft.end));
});

const draftOrdered = computed(() => {
  if (!draftValid.value) return false;
  const start = parseInputDate(rangeDraft.start);
  const end = parseInputDate(rangeDraft.end);
  return start && end ? start.getTime() <= end.getTime() : false;
});

const rangeError = computed(() => {
  if (!draftValid.value || draftOrdered.value) return '';
  return t('streamHistoryRangeErrorOrder');
});

const applyDisabled = computed(() => !draftValid.value || !draftOrdered.value);

const rangeLabel = computed(() => {
  if (!customRangeActive.value || !customRange.value) {
    return t('streamHistoryRangePlaceholder');
  }
  const { startDate, endDate } = customRange.value;
  const startLabel = formatDateDisplay(startDate);
  const endLabel = formatDateDisplay(endDate);
  if (!startLabel || !endLabel) return t('streamHistoryRangePlaceholder');
  if (startLabel === endLabel) return startLabel;
  try {
    return t('chartTooltipRange', { start: startLabel, end: endLabel });
  } catch {
    return `${startLabel} - ${endLabel}`;
  }
});

const quickPeriodOptions = computed(() => [
  { value: 'day', label: t('quickToday') },
  { value: 'week', label: t('quickThisWeek') },
  { value: 'month', label: t('quickThisMonth') },
  { value: 'year', label: t('quickThisYear') },
]);

const quickPeriodLabel = computed(() => {
  if (filterQuick.value === 'custom') return t('streamHistoryRangeCustom');
  const option = quickPeriodOptions.value.find((item) => item.value === filterQuick.value);
  return option ? option.label : t('quickToday');
});

const quickSpanOptions = computed(() =>
  QUICK_SPAN_VALUES.map((value) => ({ value, label: `${value}d` }))
);

const quickSpanLabel = computed(() => {
  const current = Number(filterQuickSpan.value);
  const option = quickSpanOptions.value.find((item) => item.value === current);
  return option ? option.label : `${current || 30}d`;
});

const rangeDurationLabel = computed(() => {
  let start, end;
  if (customRangeActive.value && customRange.value && customRange.value.startDate) {
    start = parseInputDate(customRange.value.startDate);
    end = parseInputDate(customRange.value.endDate);
  } else {
    const span = Number(filterQuickSpan.value) || 30;
    return `${span} ${t('days') || 'days'}`;
  }

  if (start && end) {
    const diff = Math.abs(end.getTime() - start.getTime());
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
    return `${days} ${t('days') || 'days'}`;
  }
  return '';
});

const shiftPeriod = (dir) => {
  let start, end;

  if (customRangeActive.value && customRange.value && customRange.value.startDate) {
    start = parseInputDate(customRange.value.startDate);
    end = parseInputDate(customRange.value.endDate);
  } else {
    end = new Date(todayIso.value);
    const span = Number(filterQuickSpan.value) || 30;
    start = new Date(end);
    start.setDate(end.getDate() - span + 1);
  }

  if (!start || !end) return;

  const diff = end.getTime() - start.getTime();

  if (dir === -1) {
    end = new Date(start.getTime());
    end.setDate(end.getDate() - 1);
    start = new Date(end.getTime() - diff);
  } else {
    start = new Date(end.getTime());
    start.setDate(start.getDate() + 1);
    end = new Date(start.getTime() + diff);

    const today = new Date(todayIso.value);
    if (end > today) {
      end = today;
      start = new Date(end.getTime() - diff);
    }
  }

  if (start && end) {
    if (calendarOpen.value) {
      quickPeriodOpen.value = false;
      quickSpanOpen.value = false;
    }
    applyCustomRange([start, end]);
  }
};

const toggleCalendar = (source = 'bottom') => {
  if (calendarOpen.value && calendarSource.value === source) {
    calendarOpen.value = false;
  } else {
    calendarSource.value = source;
    calendarOpen.value = true;
    quickPeriodOpen.value = false;
    quickSpanOpen.value = false;
  }
};

const closeCalendar = () => {
  calendarOpen.value = false;
};

const applyCalendarRange = () => {
  if (applyDisabled.value) return;
  const start = parseInputDate(rangeDraft.start);
  const end = parseInputDate(rangeDraft.end);
  if (!start || !end) return;
  applyCustomRange([start, end]);
  closeCalendar();
};

const onClearRangeClick = () => {
  if (customRangeActive.value) {
    clearCustomRange();
  }
  rangeDraft.start = '';
  rangeDraft.end = '';
};

watch(calendarOpen, (open) => {
  if (open) {
    syncDraftFromRange();
  }
});

watch(quickPeriodOpen, (open) => {
  if (open) {
    quickSpanOpen.value = false;
  }
});

watch(quickSpanOpen, (open) => {
  if (open) {
    quickPeriodOpen.value = false;
  }
});

watch(filterQuick, () => {
  quickPeriodOpen.value = false;
});

watch(filterQuickSpan, () => {
  quickSpanOpen.value = false;
});

watch(customRangeActive, (active) => {
  if (!active) {
    rangeDraft.start = '';
    rangeDraft.end = '';
  } else if (!calendarOpen.value) {
    syncDraftFromRange();
  }
});

watch(
  () => {
    const range = customRange.value || {};
    return `${range.startDate || ''}/${range.endDate || ''}`;
  },
  () => {
    if (calendarOpen.value) {
      syncDraftFromRange();
    }
  }
);

const handlePointerDown = (event) => {
  if (!calendarOpen.value && !quickPeriodOpen.value && !quickSpanOpen.value) {
    return;
  }
  const target = event.target;
  const within = (triggerRef, popoverRef) => {
    try {
      if (triggerRef && triggerRef.contains(target)) return true;
      if (popoverRef && popoverRef.contains(target)) return true;
    } catch {}
    return false;
  };
  if (calendarOpen.value && !within(calendarTriggerRef.value, calendarPopoverRef.value)) {
    closeCalendar();
  }
  if (quickPeriodOpen.value && !within(quickPeriodTriggerRef.value, quickPeriodPopoverRef.value)) {
    quickPeriodOpen.value = false;
  }
  if (quickSpanOpen.value && !within(quickSpanTriggerRef.value, quickSpanPopoverRef.value)) {
    quickSpanOpen.value = false;
  }
};

const handleKeydown = (event) => {
  if (event.key === 'Escape') {
    let handled = false;
    if (calendarOpen.value) {
      closeCalendar();
      handled = true;
    }
    if (quickPeriodOpen.value) {
      quickPeriodOpen.value = false;
      handled = true;
    }
    if (quickSpanOpen.value) {
      quickSpanOpen.value = false;
      handled = true;
    }
    if (handled) {
      try {
        event.preventDefault();
        event.stopPropagation();
      } catch {}
    }
  }
};
onMounted(() => {
  try {
    document.addEventListener('pointerdown', handlePointerDown, true);
  } catch {}
  try {
    window.addEventListener('keydown', handleKeydown);
  } catch {}
});

onBeforeUnmount(() => {
  try {
    document.removeEventListener('pointerdown', handlePointerDown, true);
  } catch {}
  try {
    window.removeEventListener('keydown', handleKeydown);
  } catch {}
});

const SETTINGS_KEY = 'getty_stream_history_settings_panel_v1';
const settingsCollapsed = ref(true);
try {
  const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
  if (saved && typeof saved.collapsed === 'boolean') settingsCollapsed.value = saved.collapsed;
} catch {}
watch(
  settingsCollapsed,
  (v) => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ collapsed: v }));
    } catch {}
  },
  { immediate: false }
);

const {
  tzDisplay,
  tzChangeVisible,
  previousTzDisplay,
  currentPhysicalTzDisplay,
  acceptNewTimezone,
  keepPreviousTimezone,
  sampleCount,
  activeMetric,
} = state;
</script>
<style scoped src="./StreamHistoryPanel.css"></style>
