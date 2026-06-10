import { useMemo } from 'react';
import { navigation, type NavSection } from '@/config/navigation';
import { useCustomPagesStore } from '@/stores/customPagesStore';
import { resolveIcon } from '@/lib/iconResolver';
import type { TranslationKey } from '@/stores/languageStore';

export function useNavigation(): NavSection[] {
  const pages = useCustomPagesStore((s) => s.pages);

  return useMemo(() => {
    const enabledPages = pages
      .filter((p) => p.definition.enabled)
      .map((p) => p.definition)
      .sort((a, b) => a.order - b.order);

    if (enabledPages.length === 0) return navigation;

    return [
      ...navigation,
      {
        titleKey: 'customPages' as TranslationKey,
        items: enabledPages.map((page) => ({
          icon: resolveIcon(page.icon),
          labelKey: 'customPages' as TranslationKey,
          customLabel: page.name,
          href: `/custom/${page.slug}`,
          customPageId: page.id,
        })),
      },
    ];
  }, [pages]);
}
