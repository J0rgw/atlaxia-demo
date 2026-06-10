import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '@/stores/languageStore';
import { useInstallationStore } from '@/stores/installationStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AlertCircle, Check, Palette, LayoutGrid, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SensorMapping, ThemeTemplate } from '@/types/installation';
import { IdentitySection } from './IdentitySection';
import { PagesSection } from './PagesSection';
import { SensorsSection } from './SensorsSection';

export interface LocalInstallationConfig {
  installation_name: string;
  logo_url: string | null;
  theme_primary: string;
  theme_secondary: string;
  theme_accent: string;
  theme_variant: ThemeTemplate;
  sensors_config: {
    categories: Array<{ id: string; name: string; expanded: boolean; sensors: string[] }>;
    mapping: Record<string, SensorMapping>;
    defaultSelected: string[];
  };
  pages_config: {
    enabled: string[];
    default: string;
  };
}

export function InstallationConfigTab() {
  const { language } = useTranslation();
  const { config, configLoading, fetchConfig, updateConfig } = useInstallationStore();
  const [localConfig, setLocalConfig] = useState<LocalInstallationConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [activeSection, setActiveSection] = useState<'identity' | 'pages' | 'sensors'>('identity');
  const saveStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(
    () => () => {
      if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
    },
    []
  );

  useEffect(() => {
    if (config) {
      setLocalConfig({
        installation_name: config.installation_name,
        logo_url: config.logo_url,
        theme_primary: config.theme_primary,
        theme_secondary: config.theme_secondary,
        theme_accent: config.theme_accent,
        theme_variant: config.theme_variant ?? 'scada',
        sensors_config: config.sensors_config,
        pages_config: {
          enabled: config.pages_config.enabled,
          default: config.pages_config.default,
        },
      });
    }
  }, [config]);

  const handleSave = async () => {
    if (!localConfig) return;

    setIsSaving(true);
    setSaveStatus('idle');

    try {
      await updateConfig({
        installation_name: localConfig.installation_name,
        logo_url: localConfig.logo_url,
        theme_primary: localConfig.theme_primary,
        theme_secondary: localConfig.theme_secondary,
        theme_accent: localConfig.theme_accent,
        theme_variant: localConfig.theme_variant,
        sensors_config: localConfig.sensors_config,
        pages_config: localConfig.pages_config as {
          enabled: ('overview' | 'variables' | 'network' | 'anomalies' | 'control' | 'settings')[];
          default: 'overview' | 'variables' | 'network' | 'anomalies' | 'control' | 'settings';
        },
      });
      setSaveStatus('success');
      if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
      saveStatusTimerRef.current = setTimeout(() => {
        setSaveStatus('idle');
        saveStatusTimerRef.current = null;
      }, 3000);
    } catch {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  if (configLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-5 w-5 text-[var(--accent-primary)]" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-[var(--text-secondary)]">
            {language === 'es' ? 'Cargando configuracion...' : 'Loading configuration...'}
          </span>
        </div>
      </div>
    );
  }

  if (!localConfig) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
        <p className="text-[var(--text-secondary)]">
          {language === 'es'
            ? 'No se pudo cargar la configuracion'
            : 'Could not load configuration'}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Selector - uses border-b pattern matching main tabs */}
      <div className="flex gap-1 border-b border-[var(--border-subtle)]">
        <button
          onClick={() => setActiveSection('identity')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
            activeSection === 'identity'
              ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          )}
        >
          <Palette className="w-4 h-4" />
          {language === 'es' ? 'Identidad' : 'Identity'}
        </button>
        <button
          onClick={() => setActiveSection('pages')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
            activeSection === 'pages'
              ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          )}
        >
          <LayoutGrid className="w-4 h-4" />
          {language === 'es' ? 'Paginas' : 'Pages'}
        </button>
        <button
          onClick={() => setActiveSection('sensors')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
            activeSection === 'sensors'
              ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          )}
        >
          <Gauge className="w-4 h-4" />
          {language === 'es' ? 'Sensores' : 'Sensors'}
        </button>
      </div>

      {activeSection === 'identity' && (
        <IdentitySection
          localConfig={localConfig}
          setLocalConfig={setLocalConfig}
          language={language}
        />
      )}

      {activeSection === 'pages' && (
        <PagesSection
          localConfig={localConfig}
          setLocalConfig={setLocalConfig}
          language={language}
        />
      )}

      {activeSection === 'sensors' && (
        <SensorsSection
          localConfig={localConfig}
          setLocalConfig={setLocalConfig}
          language={language}
        />
      )}

      {/* Sticky Save Bar */}
      <div className="sticky bottom-0 bg-[var(--bg-surface)]/95 backdrop-blur-sm border-t border-[var(--border-subtle)] py-3 -mx-1 px-1">
        <div className="flex items-center gap-4">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving
              ? language === 'es'
                ? 'Guardando...'
                : 'Saving...'
              : language === 'es'
              ? 'Guardar Cambios'
              : 'Save Changes'}
          </Button>

          {saveStatus === 'success' && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <Check className="w-4 h-4" />
              {language === 'es' ? 'Cambios guardados' : 'Changes saved'}
            </div>
          )}

          {saveStatus === 'error' && (
            <div className="flex items-center gap-2 text-[var(--status-critical)] text-sm">
              <AlertCircle className="w-4 h-4" />
              {language === 'es' ? 'Error al guardar' : 'Error saving changes'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
