import { useState } from 'react';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/stores/languageStore';
import { useAuthStore } from '@/stores/authStore';
import { ProfileSheet } from './ProfileSheet';

const ROLE_LABELS: Record<string, { es: string; en: string }> = {
  superadmin: { es: 'Super Administrador', en: 'Super Administrator' },
  admin: { es: 'Administrador', en: 'Administrator' },
  tecnico: { es: 'Tecnico', en: 'Technician' },
};

export function ProfileDropdown() {
  const { t, language } = useTranslation();
  const session = useAuthStore((state) => state.session);
  const [open, setOpen] = useState(false);

  const role = session?.role || 'tecnico';
  const roleLabel = ROLE_LABELS[role]?.[language] ?? role;
  const username = session?.username || t('admin');

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'flex items-center gap-3 pl-4 border-l border-[var(--border-subtle)]',
          'rounded-sm hover:bg-[var(--bg-inset)] transition-colors py-1 pr-2'
        )}
        aria-label={t('profileTitle')}
      >
        <div className="text-right">
          <p className="text-sm font-medium text-[var(--text-primary)]">{username}</p>
          <p className="text-xs text-[var(--text-secondary)]">{roleLabel}</p>
        </div>
        <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
          <User className="w-4 h-4 text-primary-600 dark:text-primary-400" />
        </div>
      </button>

      <ProfileSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
