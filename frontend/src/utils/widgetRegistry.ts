import { defineAsyncComponent } from 'vue';
import type { Component } from 'vue';
import type { WidgetType } from '../types/dashboard';

const ChatWidget = defineAsyncComponent(() => import('../pages/dashboard/components/ChatWidget.vue'));
const LastTipWidget = defineAsyncComponent(() => import('../pages/dashboard/components/LastTipWidget.vue'));
const TipGoalWidget = defineAsyncComponent(() => import('../pages/dashboard/components/TipGoalWidget.vue'));
const NotificationWidget = defineAsyncComponent(() => import('../pages/dashboard/components/NotificationWidget.vue'));
const RecentEventsWidget = defineAsyncComponent(() => import('../pages/dashboard/components/RecentEventsWidget.vue'));
const RaffleWidget = defineAsyncComponent(() => import('../pages/dashboard/components/RaffleWidget.vue'));
const AchievementsWidget = defineAsyncComponent(() => import('../pages/dashboard/components/AchievementsWidget.vue'));

const StreamStatsWidget = defineAsyncComponent(() => import('../pages/dashboard/components/StreamStatsWidget.vue'));

export const widgetRegistry: Record<WidgetType, Component> = {
  'chat': ChatWidget,
  'last-tip': LastTipWidget,
  'goal': TipGoalWidget,
  'alerts': RecentEventsWidget,
  'raffle': RaffleWidget,
  'achievements': AchievementsWidget,
  'stats': StreamStatsWidget
};

export const widgetTitles: Record<WidgetType, string> = {
  'chat': 'Chat',
  'last-tip': 'Last Tip',
  'goal': 'Tip Goal',
  'alerts': 'Recent Events',
  'raffle': 'Giveaways',
  'achievements': 'Achievements',
  'stats': 'Stream Stats'
};

export const getWidgetComponent = (type: string): Component => {
  return widgetRegistry[type as WidgetType] || { template: '<div class="p-4 text-red-500">Unknown Widget</div>' };
};
