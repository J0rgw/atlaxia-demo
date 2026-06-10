import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { FluviaChat } from '../chat';
import { useSidebarStore } from '@/stores/sidebarStore';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const collapsed = useSidebarStore((s) => s.collapsed);

  return (
    <div className="min-h-screen bg-[var(--bg-base)] transition-colors">
      <Sidebar />
      <div className={cn('transition-[margin] duration-200', collapsed ? 'ml-[48px]' : 'ml-[200px]')}>
        <Header />
        <main className="p-4">{children}</main>
      </div>
      <FluviaChat />
    </div>
  );
}
