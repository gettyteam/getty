<template>
  <div class="range-filter" role="radiogroup" :aria-label="t('channelRangeLabel')">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="range-btn"
      :class="{ active: option.value === modelValue }"
      :aria-pressed="option.value === modelValue"
      :aria-label="option.fullLabel"
      :title="option.fullLabel"
      @click="select(option.value)">
      <span class="label-short">{{ option.shortLabel }}</span>
      <span class="label-full">{{ option.fullLabel }}</span>
    </button>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ChannelAnalyticsRange } from '../../services/channelAnalytics';

interface Props {
  modelValue: ChannelAnalyticsRange;
}

const props = defineProps<Props>();
const emit = defineEmits<{ 'update:modelValue': [ChannelAnalyticsRange] }>();
const { t } = useI18n();

const options = computed(() => [
  { value: 'day' as ChannelAnalyticsRange, shortLabel: '1D', fullLabel: t('channelRangeDay') },
  { value: 'week' as ChannelAnalyticsRange, shortLabel: '1W', fullLabel: t('channelRangeWeek') },
  { value: 'month' as ChannelAnalyticsRange, shortLabel: '1M', fullLabel: t('channelRangeMonth') },
  {
    value: 'halfyear' as ChannelAnalyticsRange,
    shortLabel: '6M',
    fullLabel: t('channelRangeHalfYear'),
  },
  { value: 'year' as ChannelAnalyticsRange, shortLabel: '1Y', fullLabel: t('channelRangeYear') },
]);

function select(value: ChannelAnalyticsRange) {
  if (value === props.modelValue) return;
  emit('update:modelValue', value);
}
</script>
<style scoped>
.range-filter {
  display: inline-flex;
  border: 1px solid var(--card-border, rgba(148, 163, 184, 0.3));
  border-radius: 0.75rem;
  padding: 0.15rem;
  gap: 0.15rem;
  background: rgba(148, 163, 184, 0.12);
  max-width: 100%;
}
.range-btn {
  border: none;
  border-radius: 0.75rem;
  padding: 0.35rem 0.9rem;
  font-weight: 600;
  background: transparent;
  color: var(--text-secondary, #475569);
  transition:
    background 0.2s ease,
    color 0.2s ease;
}
.label-short {
  display: none;
}
.label-full {
  display: inline;
}
.range-btn:hover {
  background: rgba(148, 163, 184, 0.25);
}
.range-btn.active {
  background: #553fee;
  color: #fff;
}

@media (max-width: 767.98px) {
  .range-filter {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .range-btn {
    padding: 0.35rem 0.6rem;
    font-size: 0.9rem;
  }
  .label-short {
    display: inline;
  }
  .label-full {
    display: none;
  }
}
</style>
