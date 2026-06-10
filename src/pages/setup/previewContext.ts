/**
 * SetupPreviewContext — exposes the wizard's local dark/light preview toggle
 * to the steps. Lives in its own file so SetupWizard.tsx stays
 * Fast-Refresh-friendly (only-export-components).
 */

import { createContext, useContext } from 'react';
import type { PreviewMode } from '@/hooks/useUnauthThemeBootstrap';

export type { PreviewMode };

export interface SetupPreviewContextValue {
  previewMode: PreviewMode;
  togglePreviewMode: () => void;
}

export const SetupPreviewContext = createContext<SetupPreviewContextValue | null>(null);

export function useSetupPreview(): SetupPreviewContextValue {
  const ctx = useContext(SetupPreviewContext);
  if (!ctx) throw new Error('useSetupPreview must be used inside <SetupWizard />');
  return ctx;
}
