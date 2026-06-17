import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
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
  const { pathname } = useLocation();
  // En anomalías el copiloto FluvIA vive como rail contextual; ocultamos el
  // chat flotante para no duplicar el asistente.
  const hideFloatingChat = pathname.startsWith('/anomalies');

  return (
    <div className="min-h-screen bg-[var(--bg-base)] transition-colors">
      <Sidebar />
      <div className={cn('transition-[margin] duration-200', collapsed ? 'ml-[48px]' : 'ml-[200px]')}>
        <Header />
        <main className="p-4">{children}</main>
      </div>
      {!hideFloatingChat && <FluviaChat />}
    </div>
  );
}
