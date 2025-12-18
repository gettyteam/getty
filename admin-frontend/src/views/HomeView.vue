<template>
  <div class="admin-home p-0">
    <header class="welcome-header mb-8">
      <h1 class="text-3xl font-bold text-foreground">
        {{ $t('home.welcome', { channelName }) }}
      </h1>
      <p class="text-muted-foreground mt-2">
        {{ $t('home.subtitle') }}
      </p>
    </header>

    <DismissibleBanner
      :id="$t('home.banner.version')"
      :title="$t('home.banner.title')"
      :message="$t('home.banner.message')"
      :link="$t('home.banner.link')"
      :link-text="$t('home.banner.linkText')" />

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <DashboardCard
        :title="$t('home.cards.stream.title')"
        :subtitle="$t('home.cards.stream.subtitle')"
        icon="pi pi-face-smile"
        :actions="[
          {
            label: $t('home.actions.summary'),
            to: '/admin/stream',
            icon: 'pi pi-sparkles',
            class: 'btn mt-3',
          },
        ]">
        <template #decoration>
          <img
            src="https://static.odycdn.com/stickers/ROCKET%20SPACEMAN/PNG/rocket-spaceman_with-border.png"
            alt="rocket spaceman"
            class="absolute -right-6 -bottom-6 w-32 opacity-90 pointer-events-none transform" />
        </template>
      </DashboardCard>

      <DashboardCard
        :title="$t('home.cards.achievements.title')"
        :subtitle="
          $t('home.cards.achievements.chatters', { count: lastStreamMetrics.chatters || 0 })
        "
        :metrics="lastStreamMetrics"
        icon="pi pi-chart-bar"
        type="success" />

      <DashboardCard
        :title="$t('home.cards.community.title')"
        :subtitle="$t('home.cards.community.subtitle')"
        :metrics="communityMetrics"
        icon="pi pi-users"
        type="info">
        <template #decoration>
          <img
            src="https://static.odycdn.com/stickers/MISC/PNG/thumbs_up.png"
            alt="thumbs up"
            class="absolute -right-6 -bottom-6 w-32 opacity-90 pointer-events-none transform" />
        </template>
      </DashboardCard>
    </div>

    <section class="recommendations-section relative" v-if="unconfiguredModules.length > 0">
      <div class="mb-4">
        <h2 class="text-xl font-semibold">
          {{ $t('home.recommendations.title') }}
        </h2>
        <p class="text-muted-foreground">
          {{ $t('home.recommendations.subtitle') }}
        </p>
      </div>

      <div class="relative group px-0">
        <div
          class="absolute left-0 top-0 bottom-4 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none"></div>

        <button
          @click="scrollLeft"
          class="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-card border border-border rounded-full p-2 shadow-md hover:bg-accent transition-colors flex items-center justify-center"
          aria-label="Scroll left">
          <i class="pi pi-chevron-left text-foreground"></i>
        </button>

        <div
          ref="scrollContainer"
          class="flex gap-4 overflow-x-auto pb-4 scroll-smooth scrollbar-hide snap-x snap-mandatory">
          <RecommendationCard
            v-for="module in unconfiguredModules"
            :key="module.id"
            :module="module"
            class="flex-shrink-0 snap-center"
            @configure="redirectToModule" />
        </div>

        <button
          @click="scrollRight"
          class="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-card border border-border rounded-full p-2 shadow-md hover:bg-accent transition-colors flex items-center justify-center"
          aria-label="Scroll right">
          <i class="pi pi-chevron-right text-foreground"></i>
        </button>

        <div
          class="absolute right-0 top-0 bottom-4 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none"></div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import DashboardCard from '@/components/dashboard/DashboardCard.vue';
import RecommendationCard from '@/components/dashboard/RecommendationCard.vue';
import DismissibleBanner from '@/components/shared/DismissibleBanner.vue';
import { useAdminSettings } from '@/composables/useAdminSettings';
import { fetchChannelAnalyticsConfig, fetchChannelAnalytics } from '@/services/channelAnalytics';

const { t } = useI18n();
const router = useRouter();
const { fetchUnconfiguredModules, fetchStreamMetrics } = useAdminSettings();

const scrollContainer = ref(null);

function scrollLeft() {
  if (scrollContainer.value) {
    scrollContainer.value.scrollBy({ left: -300, behavior: 'smooth' });
  }
}

function scrollRight() {
  if (scrollContainer.value) {
    scrollContainer.value.scrollBy({ left: 300, behavior: 'smooth' });
  }
}

const channelConfig = ref(null);

const channelName = computed(() => {
  if (channelConfig.value?.channelIdentity?.title) {
    return channelConfig.value.channelIdentity.title;
  }
  if (channelConfig.value?.channelIdentity?.name) {
    return channelConfig.value.channelIdentity.name;
  }
  return t('home.default.creator');
});

const lastStreamMetrics = ref({
  chatters: 0,
  viewers: 0,
  duration: 0,
});

const communityMetrics = ref({
  totalViews: 0,
  totalContent: 0,
  totalFollowers: 0,
});

const unconfiguredModules = ref([]);

let sessionUpdatedHandler = null;

onMounted(async () => {
  await loadDashboardData();
});

onMounted(() => {
  try {
    sessionUpdatedHandler = async () => {
      try {
        channelConfig.value = await fetchChannelAnalyticsConfig();
      } catch (e) {
        console.warn('Failed to load channel config', e);
      }
    };
    window.addEventListener('getty-session-updated', sessionUpdatedHandler);
  } catch {}
});

onUnmounted(() => {
  try {
    if (sessionUpdatedHandler) {
      window.removeEventListener('getty-session-updated', sessionUpdatedHandler);
    }
  } catch {}
  sessionUpdatedHandler = null;
});

async function loadDashboardData() {
  try {
    try {
      channelConfig.value = await fetchChannelAnalyticsConfig();
    } catch (e) {
      console.warn('Failed to load channel config', e);
    }

    try {
      const analytics = await fetchChannelAnalytics('week');
      if (analytics && analytics.totals) {
        communityMetrics.value = {
          totalViews: { value: analytics.totals.views || 0, trend: 'up' },
          totalContent: { value: analytics.totals.videos || 0, trend: 'up' },
          totalFollowers: { value: analytics.totals.subscribers || 0, trend: 'up' },
        };
      }
    } catch (e) {
      if (e.response?.data?.error !== 'missing_claim') {
        console.warn('Failed to load channel analytics', e);
      }
    }

    const metrics = await fetchStreamMetrics();
    if (metrics) {
      if (metrics.lastStreamDate) {
        metrics.lastStreamDate = new Date(metrics.lastStreamDate).toLocaleDateString();
      } else {
        metrics.lastStreamDate = '-';
      }
      lastStreamMetrics.value = metrics;
    }

    const modules = await fetchUnconfiguredModules();
    unconfiguredModules.value = modules;
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
}

function redirectToModule(module) {
  router.push(module.configurationPath);
}
</script>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
