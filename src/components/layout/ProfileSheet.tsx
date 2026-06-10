import { LogOut } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/Sheet';
import { useAuthStore } from '@/stores/authStore';
import { useTranslation } from '@/stores/languageStore';
import { AccountSection } from '@/components/profile/AccountSection';
import { AppearanceSection } from '@/components/profile/AppearanceSection';
import { SecuritySection } from '@/components/profile/SecuritySection';

const ROLE_LABELS: Record<string, { es: string; en: string }> = {
  superadmin: { es: 'Super Administrador', en: 'Super Administrator' },
  admin: { es: 'Administrador', en: 'Administrator' },
  tecnico: { es: 'Tecnico', en: 'Technician' },
};

interface ProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileSheet({ open, onOpenChange }: ProfileSheetProps) {
  const { t, language } = useTranslation();
  const session = useAuthStore((state) => state.session);
  const logout = useAuthStore((state) => state.logout);

  if (!session) return null;

  const role = session.role || 'tecnico';
  const roleLabel = ROLE_LABELS[role]?.[language] ?? role;

  const handleLogout = () => {
    onOpenChange(false);
    logout();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        width="w-[360px]"
        title={t('profileTitle')}
        description={t('profileDescription')}
      >
        <div className="flex flex-col">
          <Section title={t('sectionAccount')}>
            <AccountSection session={session} roleLabel={roleLabel} />
          </Section>

          <Section title={t('sectionAppearance')}>
            <AppearanceSection />
          </Section>

          <Section title={t('sectionSecurity')}>
            <SecuritySection />
          </Section>

          <div className="px-4 py-3 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-sm text-[var(--status-critical)] hover:bg-[var(--status-critical-muted)] transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>{t('logout')}</span>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <section className="px-4 py-4 border-b border-[var(--border-subtle)]">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-3">
        {title}
      </h3>
      {children}
    </section>
  );
}
