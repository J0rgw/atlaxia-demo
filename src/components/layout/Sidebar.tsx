import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Settings as SettingsIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NavItem, NavSection } from '@/config/navigation';
import { useTranslation } from '@/stores/languageStore';
import { useAuthStore } from '@/stores/authStore';
import { useInstallation } from '@/hooks/useInstallation';
import { useNavigation } from '@/hooks/useNavigation';
import { useSidebarStore } from '@/stores/sidebarStore';
import { useUserViewPrefsStore } from '@/stores/userViewPrefsStore';

const PAGE_ID_MAP: Record<string, string> = {
  '/': 'overview',
  '/data': 'data-overview',
  '/plant': 'machines',
  '/telemetry': 'variables',
  '/anomalies': 'anomalies',
  '/network': 'network-overview',
  '/sniffer': 'network',
  '/alerts': 'alerts',
  '/logs': 'logs',
  '/policies': 'policies',
  '/control': 'control',
  '/settings': 'settings',
};

function SidebarItem({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const location = useLocation();
  const isActive = location.pathname === item.href;
  const Icon = item.icon;
  const { t } = useTranslation();
  const label = item.customLabel || t(item.labelKey);

  return (
    <Link
      to={item.href}
      title={collapsed ? label : undefined}
      className={cn(
        'flex items-center gap-3 rounded-sm text-sm font-medium transition-colors',
        collapsed ? 'justify-center px-2 py-2' : 'px-3 py-2',
        isActive
          ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-l-2 border-[var(--accent-primary)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-inset)]'
      )}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

function SidebarSection({ section, enabledPages, collapsed }: { section: NavSection; enabledPages: string[]; collapsed: boolean }) {
  const { t } = useTranslation();
  const canAccessPage = useAuthStore((state) => state.canAccessPage);
  const hiddenPages = useUserViewPrefsStore((state) => state.hiddenPages);

  const visibleItems = section.items.filter((item) => {
    if (item.customPageId) {
      return !hiddenPages.includes(`custom:${item.customPageId}`);
    }

    const pageId = PAGE_ID_MAP[item.href];

    if (enabledPages.length > 0 && !enabledPages.includes(pageId)) {
      return false;
    }

    if (hiddenPages.includes(pageId)) {
      return false;
    }

    return canAccessPage(pageId);
  });

  if (visibleItems.length === 0) return null;

  return (
    <div className="space-y-1">
      {!collapsed && section.titleKey && (
        <h3 className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {t(section.titleKey)}
        </h3>
      )}
      {visibleItems.map((item) => (
        <SidebarItem key={item.href} item={item} collapsed={collapsed} />
      ))}
    </div>
  );
}

export function Sidebar() {
  const { t } = useTranslation();
  const { enabledPages, logoUrl, installationName } = useInstallation();
  const sections = useNavigation();
  const collapsed = useSidebarStore((s) => s.collapsed);
  const toggle = useSidebarStore((s) => s.toggle);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();
  const settingsActive = location.pathname === '/settings';

  const initials = installationName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-sidebar h-screen bg-[var(--bg-surface)] border-r border-[var(--border-subtle)] flex flex-col transition-[width,colors] duration-200',
        collapsed ? 'w-[48px]' : 'w-[200px]'
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2 h-11 border-b border-[var(--border-subtle)] flex-shrink-0',
          collapsed ? 'px-2 justify-center' : 'px-3'
        )}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={installationName}
            className="w-7 h-7 rounded-sm object-contain flex-shrink-0"
          />
        ) : (
          <div
            className="w-7 h-7 rounded-sm flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <span className="text-white font-bold text-xs">{initials || 'FG'}</span>
          </div>
        )}
        {!collapsed && (
          <span
            className="text-base font-bold truncate"
            style={{ color: 'var(--color-primary)' }}
            title={installationName}
          >
            {installationName}
          </span>
        )}
      </div>

      <nav className={cn('flex-1 overflow-y-auto py-4 space-y-6 scrollbar-thin', collapsed ? 'px-1' : 'px-3')}>
        {sections.map((section, index) => (
          <SidebarSection key={index} section={section} enabledPages={enabledPages} collapsed={collapsed} />
        ))}
      </nav>

      <div className={cn('border-t border-[var(--border-subtle)] space-y-1', collapsed ? 'p-1' : 'p-3')}>
        {isAuthenticated && (
          <Link
            to="/settings"
            title={collapsed ? t('settings') : undefined}
            className={cn(
              'flex items-center gap-3 rounded-sm text-sm font-medium transition-colors',
              collapsed ? 'justify-center px-2 py-2' : 'px-3 py-2',
              settingsActive
                ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-l-2 border-[var(--accent-primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-inset)]'
            )}
          >
            <SettingsIcon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="truncate">{t('settings')}</span>}
          </Link>
        )}
        <button
          type="button"
          onClick={toggle}
          title={collapsed ? t('expand') : undefined}
          aria-label={collapsed ? t('expand') : t('collapse')}
          className={cn(
            'flex items-center w-full rounded-sm text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-inset)] transition-colors',
            collapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2'
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5 flex-shrink-0" />
          ) : (
            <ChevronLeft className="w-5 h-5 flex-shrink-0" />
          )}
          {!collapsed && <span className="truncate">{t('collapse')}</span>}
        </button>
      </div>
    </aside>
  );
}
