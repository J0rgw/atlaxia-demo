import { lazy, Suspense } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { ConnectionStatus } from '@/components/ui/ConnectionStatus';
import { LiveClock } from './LiveClock';
import { NotificationsDropdown } from './NotificationsDropdown';
import { ProfileDropdown } from './ProfileDropdown';
import { useTranslation } from '@/stores/languageStore';

const IS_DEMO = import.meta.env.MODE === 'demo';
const DemoCommandBar = IS_DEMO
  ? lazy(() => import('@/demo/DemoCommandBar').then((m) => ({ default: m.DemoCommandBar })))
  : null;

export function Header() {
  const { t } = useTranslation();

  return (
    <header
      style={{ zIndex: 40 }}
      className="sticky top-0 h-11 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] shadow-[0_2px_6px_-2px_rgb(0_0_0/0.08)] flex items-center justify-between px-4 transition-colors duration-200 isolate"
    >
      <div className="flex-1 max-w-md">
        {DemoCommandBar ? (
          <Suspense fallback={null}>
            <DemoCommandBar />
          </Suspense>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <Input
              type="search"
              placeholder={t('search')}
              className="pl-10 bg-[var(--bg-inset)]"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <LiveClock />
        <ConnectionStatus showLabels={true} />
        <NotificationsDropdown />
        <ProfileDropdown />
      </div>
    </header>
  );
}
