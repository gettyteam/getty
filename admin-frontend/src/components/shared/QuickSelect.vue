<template>
  <div class="relative inline-block text-left" ref="containerRef">
    <button
      type="button"
      class="quick-select-trigger"
      :class="{ 'quick-select-trigger-active': isOpen, 'is-disabled': disabled }"
      :aria-expanded="isOpen"
      aria-haspopup="listbox"
      :disabled="disabled"
      @click="!disabled && toggle()">
      <span class="quick-select-label">{{ selectedLabel }}</span>
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
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </span>
    </button>

    <div v-if="isOpen" class="quick-select-popover" role="listbox" :aria-label="ariaLabel">
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        class="quick-select-option"
        :class="{
          'quick-select-option-active': modelValue === option.value,
          'quick-select-option-disabled': option.disabled,
        }"
        role="option"
        :aria-selected="modelValue === option.value"
        :disabled="option.disabled"
        @click="!option.disabled && select(option)">
        {{ option.label }}
        <svg
          v-if="modelValue === option.value"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  modelValue: {
    type: [String, Number, Boolean],
    default: '',
  },
  options: {
    type: Array,
    default: () => [],
  },
  placeholder: {
    type: String,
    default: 'Select...',
  },
  ariaLabel: {
    type: String,
    default: '',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue']);

const isOpen = ref(false);
const containerRef = ref(null);

const selectedLabel = computed(() => {
  const found = props.options.find((o) => o.value === props.modelValue);
  return found ? found.label : props.placeholder;
});

function toggle() {
  isOpen.value = !isOpen.value;
}

function select(option) {
  emit('update:modelValue', option.value);
  isOpen.value = false;
}

function handleClickOutside(event) {
  if (containerRef.value && !containerRef.value.contains(event.target)) {
    isOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.relative {
  position: relative;
}

.quick-select-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--border-color, #e2e8f0);
  background: var(--card-bg, #ffffff);
  color: var(--text-primary, #0f172a);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 140px;
  justify-content: space-between;
}

.quick-select-trigger:hover {
  border-color: var(--text-secondary, #94a3b8);
}

.quick-select-trigger-active {
  border-color: var(--btn-bg, #2563eb);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}

.quick-select-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.quick-select-caret {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary, #64748b);
}

.quick-select-popover {
  position: absolute;
  z-index: 50;
  top: calc(100% + 4px);
  left: 0;
  min-width: 100%;
  width: max-content;
  max-width: 300px;
  border-radius: 12px;
  border: 1px solid var(--border-color, #e2e8f0);
  background: var(--card-bg, #ffffff);
  color: var(--text-primary, #0f172a);
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.quick-select-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease;
  text-align: left;
  gap: 8px;
}

.quick-select-option:hover,
.quick-select-option:focus-visible {
  background: var(--bg-chat, #f1f5f9);
  outline: none;
}

.quick-select-option-active {
  background: rgba(57, 45, 151, 0.07);
}

.quick-select-option-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.quick-select-option-disabled:hover {
  background: transparent;
}

@media (prefers-color-scheme: dark) {
  .quick-select-trigger {
    background: var(--card-bg, #0f1214);
    border-color: var(--border-color, #2d333b);
  }
  .quick-select-popover {
    background: var(--card-bg, #0f1214);
    border-color: var(--border-color, #2d333b);
  }
  .quick-select-option:hover {
    background: rgba(255, 255, 255, 0.05);
  }
}
</style>
