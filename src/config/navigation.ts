import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Database,
  Factory,
  BarChart3,
  AlertCircle,
  Network,
  Radar,
  ShieldCheck,
  Bell,
} from 'lucide-react';
import type { TranslationKey } from '@/stores/languageStore';

export interface NavItem {
  icon: LucideIcon;
  labelKey: TranslationKey;
  href: string;
  customLabel?: string;
  customPageId?: string;
}

export interface NavSection {
  titleKey?: TranslationKey;
  items: NavItem[];
}

export const navigation: NavSection[] = [
  {
    items: [
      { icon: LayoutDashboard, labelKey: 'overview', href: '/' },
    ],
  },
  {
    titleKey: 'moduleData',
    items: [
      { icon: Database, labelKey: 'dataOverview', href: '/data' },
      { icon: Factory, labelKey: 'plantRealtime', href: '/plant' },
      { icon: BarChart3, labelKey: 'historicTelemetry', href: '/telemetry' },
      { icon: AlertCircle, labelKey: 'dataAlerts', href: '/anomalies' },
    ],
  },
  {
    titleKey: 'moduleNetwork',
    items: [
      { icon: Network, labelKey: 'networkOverview', href: '/network' },
      { icon: Radar, labelKey: 'currentNetworkState', href: '/sniffer' },
      { icon: ShieldCheck, labelKey: 'policies', href: '/policies' },
      { icon: Bell, labelKey: 'alerts', href: '/alerts' },
    ],
  },
];
