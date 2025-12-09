<template>
  <div
    class="dashboard-card bg-card text-card-foreground rounded-md shadow-sm p-4 relative overflow-hidden"
    style="border: 1px solid var(--card-border)">
    <slot name="decoration"></slot>

    <div class="relative z-10">
      <div class="flex items-center gap-3 mb-2">
        <i v-if="icon" :class="[icon, 'text-2xl']"></i>
        <h3 class="text-lg font-semibold">{{ title }}</h3>
      </div>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <p v-if="subtitle" class="text-sm text-muted-foreground mb-4" v-html="subtitle"></p>

      <div v-if="metrics" class="metrics grid grid-cols-2 gap-4 mt-2">
        <div
          v-for="(metric, key) in normalizedMetrics"
          :key="key"
          class="metric-item flex flex-col">
          <span class="text-md text-muted-foreground font-bold mb-1">{{
            $t(`home.metrics.${key}`)
          }}</span>
          <div class="flex items-center gap-2">
            <span class="text-2xl font-bold tracking-tight">{{ metric.value }}</span>
            <div v-if="metric.trend === 'up'" class="text-green-500 flex items-center">
              <svg
                width="1.5rem"
                height="1.5rem"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M22 7L14.1314 14.8686C13.7354 15.2646 13.5373 15.4627 13.309 15.5368C13.1082 15.6021 12.8918 15.6021 12.691 15.5368C12.4627 15.4627 12.2646 15.2646 11.8686 14.8686L9.13137 12.1314C8.73535 11.7354 8.53735 11.5373 8.30902 11.4632C8.10817 11.3979 7.89183 11.3979 7.69098 11.4632C7.46265 11.5373 7.26465 11.7354 6.86863 12.1314L2 17M22 7H15M22 7V14"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"></path>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div v-if="actions && actions.length" class="actions mt-6 flex gap-2">
        <router-link
          v-for="action in actions"
          :key="action.to"
          :to="action.to"
          :class="
            action.class ||
            'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2'
          ">
          {{ action.label }}
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  metrics: { type: Object, default: null },
  icon: { type: String, default: '' },
  type: { type: String, default: 'default' },
  actions: { type: Array, default: () => [] },
});

const normalizedMetrics = computed(() => {
  if (!props.metrics) return {};
  const result = {};
  for (const [key, value] of Object.entries(props.metrics)) {
    if (typeof value === 'object' && value !== null) {
      result[key] = value;
    } else {
      result[key] = { value };
    }
  }
  return result;
});
</script>
