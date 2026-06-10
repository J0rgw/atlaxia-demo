import { Globe, Moon, Sun } from 'lucide-react';
import { Switch } from '@/components/ui/Switch';
import { cn } from '@/lib/utils';
import { useLanguageStore, useTranslation } from '@/stores/languageStore';
import { useAuthStore, type ThemeVariant } from '@/stores/authStore';
import { useTheme } from '@/providers/ThemeProvider';

export function AppearanceSection() {
  const { t, language } = useTranslation();
  const toggleLanguage = useLanguageStore((state) => state.toggleLanguage);
  const { mode, toggleMode } = useTheme();
  const userTheme = useAuthStore((state) => state.session?.theme_variant ?? null);
  const updateThemeVariant = useAuthStore((state) => state.updateThemeVariant);

  const isDark = mode === 'dark';

  const handlePickTemplate = async (variant: ThemeVariant | null) => {
    try {
      await updateThemeVariant(variant);
    } catch {
      // store rolls back; surface no UI error here, the toggle simply reflects truth
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm text-[var(--text-primary)]">
          {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          <span>{isDark ? t('darkMode') : t('lightMode')}</span>
        </div>
        <Switch checked={isDark} onCheckedChange={toggleMode} aria-label={t('darkMode')} />
      </div>

      <button
        type="button"
        onClick={toggleLanguage}
        className="w-full flex items-center justify-between -mx-2 px-2 py-2 rounded-sm hover:bg-[var(--bg-inset)] transition-colors"
      >
        <div className="flex items-center gap-3 text-sm text-[var(--text-primary)]">
          <Globe className="w-4 h-4" />
          <span>{t('language')}</span>
        </div>
        <span className="flex items-center gap-1 text-xs font-medium">
          <span
            className={cn(
              'px-1.5 py-0.5 rounded-sm',
              language === 'es'
                ? 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]'
                : 'text-[var(--text-muted)]'
            )}
          >
            ES
          </span>
          <span
            className={cn(
              'px-1.5 py-0.5 rounded-sm',
              language === 'en'
                ? 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]'
                : 'text-[var(--text-muted)]'
            )}
          >
            EN
          </span>
        </span>
      </button>

      <div>
        <p className="text-sm font-medium text-[var(--text-primary)]">{t('themeTemplate')}</p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5 mb-2">
          {t('themeTemplateDescription')}
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          <TemplateButton
            label={t('scadaTemplate')}
            active={userTheme === 'scada'}
            onClick={() => handlePickTemplate('scada')}
          />
          <TemplateButton
            label={t('modernTemplate')}
            active={userTheme === 'modern'}
            onClick={() => handlePickTemplate('modern')}
          />
          <TemplateButton
            label={t('useInstallationDefault')}
            active={userTheme === null}
            onClick={() => handlePickTemplate(null)}
          />
        </div>
      </div>
    </div>
  );
}

interface TemplateButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function TemplateButton({ label, active, onClick }: TemplateButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-2 py-2 text-xs rounded-sm border transition-colors',
        active
          ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
          : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)]'
      )}
    >
      {label}
    </button>
  );
}
