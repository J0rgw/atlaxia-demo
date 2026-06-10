import { useLanguageStore } from '@/stores/languageStore';
import { cn } from '@/lib/utils';

export function LanguageToggle() {
  const { language, toggleLanguage } = useLanguageStore();

  return (
    <button
      onClick={toggleLanguage}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg',
        'text-sm font-medium transition-colors text-[var(--text-primary)]',
        'hover:bg-[var(--bg-inset)] border border-[var(--border-subtle)] dark:border-[var(--border-default)]'
      )}
      aria-label={`Change language to ${language === 'es' ? 'English' : 'Spanish'}`}
    >
      <span
        className={cn(
          'transition-opacity',
          language === 'es' ? 'opacity-100' : 'opacity-40'
        )}
      >
        ES
      </span>
      <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">|</span>
      <span
        className={cn(
          'transition-opacity',
          language === 'en' ? 'opacity-100' : 'opacity-40'
        )}
      >
        EN
      </span>
    </button>
  );
}
