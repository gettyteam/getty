<template>
  <div class="input-group copy-field-group" role="group">
    <input
      class="grouped-input"
      :value="value"
      readonly
      @focus="$event.target.select()"
      :type="inputType"
      :aria-label="ariaLabel || t('chatWidgetUrl')" />
    <EyeToggle
      v-if="secret"
      :shown="revealed"
      @toggle="revealed = $event"
      class="grouped-btn-icon" />
    <button class="grouped-btn" type="button" @click="copy" :aria-label="t('copy')">
      {{ t('copy') }}
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { pushToast } from '../../services/toast';
import EyeToggle from '../EyeToggle.vue';

const { t } = useI18n();
const props = defineProps({
  value: { type: String, required: true },
  toast: { type: String, default: 'urlCopied' },
  ariaLabel: { type: String, default: '' },
  secret: { type: Boolean, default: false },
});

const revealed = ref(false);
const inputType = computed(() => (props.secret && !revealed.value ? 'password' : 'text'));

function copy() {
  navigator.clipboard.writeText(props.value);
  pushToast({ type: 'success', message: t(props.toast) });
}
</script>

<style scoped>
.grouped-btn-icon {
  border: 1px solid var(--input-border);
  border-right: none;
  background: var(--input-bg);
  color: var(--text-primary) !important;
  padding: 0 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.grouped-btn-icon:hover {
  background: var(--hover-bg);
}
</style>
