export type WidgetType = 'chat' | 'stats' | 'alerts' | 'goal' | 'last-tip' | 'raffle' | 'achievements';

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
  i: string;
  isMinimized?: boolean;
  settings?: Record<string, any>;
  props?: Record<string, any>;
}

export interface LayoutConfig {
  id: string;
  name: string;
  widgets: DashboardWidget[];
}
