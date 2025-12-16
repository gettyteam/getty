<template>
  <span>{{ displayValue }}</span>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';

const props = defineProps<{
  value: number;
  formatter?: (_val: number) => string;
  duration?: number;
}>();

const current = ref(0);
const duration = props.duration || 1000;

const displayValue = computed(() => {
  if (props.formatter) {
    return props.formatter(Math.round(current.value));
  }
  return Math.round(current.value).toString();
});

function animate(start: number, end: number) {
  const startTime = performance.now();
  const change = end - start;

  function update(now: number) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);

    const ease = 1 - Math.pow(1 - progress, 4);

    current.value = start + change * ease;

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      current.value = end;
    }
  }

  requestAnimationFrame(update);
}

watch(
  () => props.value,
  (newVal, oldVal) => {
    animate(oldVal || 0, newVal);
  }
);

onMounted(() => {
  animate(0, props.value);
});
</script>
