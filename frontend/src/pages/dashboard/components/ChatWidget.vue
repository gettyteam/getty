<template>
  <section class="os-card overflow-hidden flex flex-col h-[450px] md:order-4 lg:order-4">
    <h2 class="os-panel-title">
      <span class="icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path
            d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8.5 8.5Z"></path>
        </svg>
      </span>
      <span data-i18n="liveChatTitle">{{ getI18nText('liveChatTitle', 'Live Chat') }}</span>
    </h2>
    <div class="flex-1 flex flex-col max-h-[calc(100%-44px)] overflow-hidden relative">
      <BlockedState v-if="isBlocked" module-name="Chat" />
      <template v-else>
        <div
          v-if="messages.length === 0"
          class="flex items-center justify-center h-full text-gray-500 text-sm"
          data-i18n="chatWaiting">
          {{ getI18nText('chatWaiting', 'Waiting for messages...') }}
        </div>
        <div
          id="dashboard-chat-widget"
          ref="chatContainer"
          class="chat-container flex-1 overflow-y-auto p-2 space-y-2">
          <div
            v-for="(msg, index) in messages"
            :key="index"
            class="message"
            :class="{ 'has-donation': msg.credits > 0 }">
            <div class="message-header">
              <div class="message-avatar" :class="getAvatarBgClass(msg.channelTitle)">
                <img
                  :src="msg.avatar || defaultAvatar"
                  :alt="msg.channelTitle"
                  @error="handleAvatarError" />
              </div>
              <div class="message-user-container">
                <span class="message-username" :style="getUsernameStyle(msg.channelTitle)">
                  {{ msg.channelTitle }}
                </span>
                <!-- eslint-disable vue/no-v-html -->
                <span
                  class="message-text-inline"
                  :class="{ 'has-donation': msg.credits > 0 }"
                  v-html="sanitize(formatWithMapping(msg.message, store.emojiMapping))"></span>
                <!-- eslint-enable vue/no-v-html -->
              </div>
              <span v-if="msg.credits > 0" class="message-donation">${{ msg.credits }} USD</span>
              <!-- eslint-disable vue/no-v-html -->
              <div
                v-if="msg.sticker"
                class="message-sticker-container"
                v-html="sanitize(formatWithMapping(msg.sticker, store.emojiMapping))"></div>
              <!-- eslint-enable vue/no-v-html -->
            </div>
          </div>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import DOMPurify from 'dompurify';
import { useWidgetStore } from '../../../stores/widgetStore';
import { formatWithMapping } from '../../../utils/emoji';
import BlockedState from './BlockedState.vue';
// @ts-ignore
import { i18nTrigger } from '../languageManager';

defineProps({
  isBlocked: {
    type: Boolean,
    default: false,
  },
});

const store = useWidgetStore();
const chatContainer = ref<HTMLElement | null>(null);
const defaultAvatar =
  'https://thumbnails.odycdn.com/optimize/s:0:0/quality:85/plain/https://player.odycdn.com/speech/spaceman-png:2.png';

const getI18nText = (key: string, fallback: string) => {
  i18nTrigger.value;
  if (
    (window as any).languageManager &&
    typeof (window as any).languageManager.getText === 'function'
  ) {
    return (window as any).languageManager.getText(key) || fallback;
  }
  return fallback;
};

const messages = computed(() => store.chatMessages);

const CYBERPUNK_PALETTE = [
  { color: '#000', border: 'rgba(17, 255, 121, 0.9)' },
  { color: '#fff', border: 'rgba(255, 17, 121, 0.9)' },
  { color: '#fff', border: 'rgba(121, 17, 255, 0.9)' },
  { color: '#fff', border: 'rgba(36, 98, 165, 0.9)' },
  { color: '#000', border: 'rgba(255, 231, 17, 0.9)' },
  { color: '#fff', border: 'rgba(19, 19, 19, 0.9)' },
];

function getAvatarBgClass(name: string = 'Anonymous') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  const idx = Math.abs(h) % 10;
  return `avatar-bg-${idx}`;
}

function getUsernameStyle(name: string = 'Anonymous') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % CYBERPUNK_PALETTE.length;
  const palette = CYBERPUNK_PALETTE[index];
  return {
    color: palette.color === '#000' ? '#e6edf3' : palette.color,
  };
}

function handleAvatarError(e: Event) {
  const target = e.target as HTMLImageElement;
  target.src = defaultAvatar;
}

function sanitize(content: string) {
  return DOMPurify.sanitize(content);
}

function scrollToBottom() {
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
  }
}

watch(
  () => store.chatMessages.length,
  () => {
    nextTick(() => {
      scrollToBottom();
    });
  }
);

onMounted(() => {
  store.initWebSocket();
  scrollToBottom();
});
</script>

<style scoped>
.chat-container {
  scrollbar-width: none;
  background: transparent;
}

.chat-container::-webkit-scrollbar {
  display: none;
}

.message {
  background: #0a0e12;
  border-left: 6px solid #161b22;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 6px;
  animation: fadeIn 0.3s;
  box-sizing: border-box;
  position: relative;
  color: #e6edf3;
}

.message.has-donation {
  background: #ececec;
  border-left-color: #ddb826;
  color: #000;
}

.message-header {
  display: flex;
  position: relative;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: flex-start;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  background: #21262d;
  flex: 0 0 auto;
}

.message-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.message-user-container {
  flex-wrap: wrap;
  align-items: baseline;
  width: 100%;
  position: relative;
  margin-left: 8px;
  display: flex;
}

.message-username {
  display: inline-block;
  white-space: nowrap;
  margin-right: 6px;
  flex-shrink: 0;
  padding: 2px 4px;
  border-radius: 4px;
  font-weight: 700;
  font-size: 12px;
}

.message.has-donation .message-username {
  color: #000 !important;
  text-shadow: none !important;
}

/* High specificity to override global light theme styles */
#dashboard-chat-widget .message-text-inline {
  display: inline;
  word-break: break-word;
  white-space: normal;
  flex-grow: 1;
  min-width: 0;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  color: #e6edf3 !important;
}

#dashboard-chat-widget .message.has-donation .message-text-inline {
  color: #000 !important;
}

.message-donation {
  position: absolute;
  right: -4px;
  bottom: -8px;
  background-color: #ddb826;
  color: #131313;
  padding: 0px 2px;
  border-radius: 4px;
  font-weight: 800;
  font-size: 12px;
  z-index: 10;
}

.message-sticker-container {
  width: 100%;
  margin-top: 6px;
  padding-left: 0;
}

:deep(.comment-sticker) {
  max-width: 90px;
  max-height: 90px;
  vertical-align: top;
  margin: 2px;
  display: inline-block;
}

.avatar-bg-0 {
  background-color: #00bcd4;
}
.avatar-bg-1 {
  background-color: #ff9800;
}
.avatar-bg-2 {
  background-color: #8bc34a;
}
.avatar-bg-3 {
  background-color: #e91e63;
}
.avatar-bg-4 {
  background-color: #9c27b0;
}
.avatar-bg-5 {
  background-color: #3f51b5;
}
.avatar-bg-6 {
  background-color: #ff5722;
}
.avatar-bg-7 {
  background-color: #4caf50;
}
.avatar-bg-8 {
  background-color: #2196f3;
}
.avatar-bg-9 {
  background-color: #ffc107;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
