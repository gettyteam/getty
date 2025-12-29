import { ref, computed } from 'vue';
import Fuse from 'fuse.js';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

export function useCommandPalette() {
  const query = ref('');
  const router = useRouter();
  const { t } = useI18n();

  const commands = computed(() => [
    { 
      id: 'nav-home', 
      title: t('sidebarHome') || 'Home', 
      type: 'navigation', 
      path: '/admin/home', 
      icon: 'pi pi-home',
      section: 'Navigation'
    },
    { 
      id: 'nav-stream', 
      title: t('statusOverviewNav') || 'Stream Overview', 
      type: 'navigation', 
      path: '/admin/stream', 
      icon: 'pi pi-desktop',
      section: 'Navigation'
    },
    { 
      id: 'nav-channel', 
      title: t('channelAnalyticsNav') || 'Channel Analytics', 
      type: 'navigation', 
      path: '/admin/channel', 
      icon: 'pi pi-chart-bar',
      section: 'Navigation'
    },
    { 
      id: 'nav-profile', 
      title: t('userProfileTitle') || 'User Profile', 
      type: 'navigation', 
      path: '/admin/user-profile', 
      icon: 'pi pi-user',
      section: 'Navigation'
    },
    { 
      id: 'nav-chat', 
      title: t('chat') || 'Chat', 
      type: 'navigation', 
      path: '/admin/chat', 
      icon: 'pi pi-comments',
      section: 'Navigation'
    },
    { 
      id: 'nav-events', 
      title: t('eventsTitle') || 'Events', 
      type: 'navigation', 
      path: '/admin/events', 
      icon: 'pi pi-calendar',
      section: 'Navigation'
    },
    { 
      id: 'nav-raffle', 
      title: t('raffleTitle') || 'Raffle', 
      type: 'navigation', 
      path: '/admin/raffle', 
      icon: 'pi pi-gift',
      section: 'Navigation'
    },
    { 
      id: 'nav-achievements', 
      title: t('achievementsTitle') || 'Achievements', 
      type: 'navigation', 
      path: '/admin/achievements', 
      icon: 'pi pi-star',
      section: 'Navigation'
    },
    { 
      id: 'nav-notifications', 
      title: t('notificationsTitle') || 'Notifications', 
      type: 'navigation', 
      path: '/admin/notifications', 
      icon: 'pi pi-bell',
      section: 'Navigation'
    },
    { 
      id: 'nav-tip-goal', 
      title: t('tipGoalTitle') || 'Tip Goal', 
      type: 'navigation', 
      path: '/admin/tip-goal', 
      icon: 'pi pi-bullseye',
      section: 'Navigation'
    },
    {
      id: 'nav-goal-followers',
      title: t('goalFollowersTitle') || 'Followers',
      type: 'navigation',
      path: '/admin/goal-followers',
      icon: 'pi pi-users',
      section: 'Navigation'
    },
    { 
      id: 'nav-social', 
      title: t('socialMediaTitle') || 'Social Media', 
      type: 'navigation', 
      path: '/admin/social-media', 
      icon: 'pi pi-share-alt',
      section: 'Navigation'
    },
    { 
      id: 'nav-integrations', 
      title: t('externalNotificationsTitle') || 'Integrations', 
      type: 'navigation', 
      path: '/admin/integrations', 
      icon: 'pi pi-share-alt',
      section: 'Navigation'
    },
    { 
      id: 'nav-announcements', 
      title: t('announcementTitle') || 'Announcements', 
      type: 'navigation', 
      path: '/admin/announcement', 
      icon: 'pi pi-megaphone',
      section: 'Navigation'
    },
    { 
      id: 'nav-liveviews', 
      title: t('liveviewsTitle') || 'Live Views', 
      type: 'navigation', 
      path: '/admin/liveviews', 
      icon: 'pi pi-eye',
      section: 'Navigation'
    },
    { 
      id: 'nav-last-tip', 
      title: t('lastTipTitle') || 'Last Tip', 
      type: 'navigation', 
      path: '/admin/last-tip', 
      icon: 'pi pi-dollar',
      section: 'Navigation'
    },
    { 
      id: 'nav-settings', 
      title: t('settingsTitle') || 'Settings', 
      type: 'navigation', 
      path: '/admin/settings', 
      icon: 'pi pi-cog',
      section: 'Navigation'
    },
    
    {
      id: 'act-summary',
      title: t('home.actions.summary') || 'Stream summary',
      type: 'navigation',
      path: '/admin/stream',
      icon: 'pi pi-calendar-plus',
      section: 'Actions'
    },
    {
      id: 'act-configure-chat',
      title: 'Configure Chat Overlay',
      type: 'navigation',
      path: '/admin/chat',
      icon: 'pi pi-palette',
      section: 'Actions'
    }
  ]);

  const fuse = computed(() => new Fuse(commands.value, {
    keys: ['title', 'section'],
    threshold: 0.3,
  }));

  const filteredResults = computed(() => {
    if (!query.value) {
      return commands.value.slice(0, 5); 
    }
    return fuse.value.search(query.value).map(r => r.item);
  });

  function execute(item) {
    if (item.type === 'navigation') {
      router.push(item.path);
    }
  }

  return {
    query,
    filteredResults,
    execute
  };
}
