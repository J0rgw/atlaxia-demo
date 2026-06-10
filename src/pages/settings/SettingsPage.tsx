import { useState, useMemo, useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useTranslation } from '@/stores/languageStore';
import { useInstallationStore } from '@/stores/installationStore';
import { Palette, LayoutGrid, Gauge, Users, FileText, Eye, EyeOff, AlertTriangle, ClipboardList, KeyRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AlertCircle, Check } from 'lucide-react';
import type { LocalInstallationConfig } from './components/InstallationConfigTab';
import type { InstallationConfig } from '@/types/installation';
import { IdentitySection } from './components/IdentitySection';
import { PagesSection } from './components/PagesSection';
import { SensorsSection } from './components/SensorsSection';
import { UserPermissionsTab } from './components/UserPermissionsTab';
import { CustomPagesSection } from './components/CustomPagesSection';
import { TechnicianPagesSection } from './components/TechnicianPagesSection';
import { TechnicianSensorsSection } from './components/TechnicianSensorsSection';
import { AlarmThresholdsSection } from './components/AlarmThresholdsSection';
import { PlantSurveySection } from './components/PlantSurveySection';
import { LicenseSection } from './components/LicenseSection';

type SectionId =
  | 'identity'
  | 'pages'
  | 'sensors'
  | 'alarms'
  | 'plant-survey'
  | 'users'
  | 'custom-pages'
  | 'license'
  | 'my-pages'
  | 'my-sensors';

interface SectionDef {
  id: SectionId;
  icon: LucideIcon;
  labelKey:
    | 'settingsIdentity'
    | 'settingsPages'
    | 'settingsSensors'
    | 'settingsAlarms'
    | 'settingsPlantSurvey'
    | 'settingsUsers'
    | 'settingsCustomPages'
    | 'settingsLicense'
    | 'settingsMyPages'
    | 'settingsMySensors';
}

const ADMIN_SECTIONS: SectionDef[] = [
  { id: 'identity', icon: Palette, labelKey: 'settingsIdentity' },
  { id: 'pages', icon: LayoutGrid, labelKey: 'settingsPages' },
  { id: 'sensors', icon: Gauge, labelKey: 'settingsSensors' },
  { id: 'alarms', icon: AlertTriangle, labelKey: 'settingsAlarms' },
  { id: 'plant-survey', icon: ClipboardList, labelKey: 'settingsPlantSurvey' },
  { id: 'users', icon: Users, labelKey: 'settingsUsers' },
  { id: 'custom-pages', icon: FileText, labelKey: 'settingsCustomPages' },
  { id: 'license', icon: KeyRound, labelKey: 'settingsLicense' },
];

const TECNICO_SECTIONS: SectionDef[] = [
  { id: 'custom-pages', icon: FileText, labelKey: 'settingsCustomPages' },
  { id: 'my-pages', icon: Eye, labelKey: 'settingsMyPages' },
  { id: 'my-sensors', icon: EyeOff, labelKey: 'settingsMySensors' },
];

export function SettingsPage() {
  const { t, language } = useTranslation();
  const session = useAuthStore((state) => state.session);
  const isAdmin = useAuthStore((state) => state.isAdmin);

  const sections = useMemo(() => (isAdmin() ? ADMIN_SECTIONS : TECNICO_SECTIONS), [isAdmin]);
  const [activeSection, setActiveSection] = useState<SectionId>(sections[0]?.id ?? 'custom-pages');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {language === 'es' ? 'Configuracion' : 'Settings'}
        </h1>
        <p className="text-[var(--text-secondary)] text-sm mt-1">
          {language === 'es'
            ? 'Gestiona la configuracion de la instalacion y tus preferencias'
            : 'Manage installation configuration and your preferences'}
        </p>
      </div>

      <div className="flex gap-6">
        <aside className="w-56 flex-shrink-0">
          <nav className="space-y-1">
            {sections.map((s) => {
              const Icon = s.icon;
              const active = activeSection === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSection(s.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-sm transition-colors text-left',
                    active
                      ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-l-2 border-[var(--accent-primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-inset)] border-l-2 border-transparent'
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{t(s.labelKey)}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="flex-1 min-w-0">
          {(activeSection === 'identity' ||
            activeSection === 'pages' ||
            activeSection === 'sensors' ||
            activeSection === 'alarms' ||
            activeSection === 'plant-survey') && (
            <InstallationSectionWrapper section={activeSection} />
          )}
          {activeSection === 'users' && (
            <UserPermissionsTab session={session} language={language} />
          )}
          {activeSection === 'custom-pages' && <CustomPagesSection />}
          {activeSection === 'license' && <LicenseSection language={language} />}
          {activeSection === 'my-pages' && <TechnicianPagesSection />}
          {activeSection === 'my-sensors' && <TechnicianSensorsSection />}
        </div>
      </div>
    </div>
  );
}

interface InstallationSectionWrapperProps {
  section: 'identity' | 'pages' | 'sensors' | 'alarms' | 'plant-survey';
}

function InstallationSectionWrapper({ section }: InstallationSectionWrapperProps) {
  const { language } = useTranslation();
  const config = useInstallationStore((s) => s.config);
  const configLoading = useInstallationStore((s) => s.configLoading);
  const fetchConfig = useInstallationStore((s) => s.fetchConfig);
  const updateConfig = useInstallationStore((s) => s.updateConfig);
  const [localConfig, setLocalConfig] = useState<LocalInstallationConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
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
        pages_config: localConfig.pages_config as InstallationConfig['pages_config'],
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
        <span className="text-[var(--text-secondary)] text-sm">
          {language === 'es' ? 'Cargando configuracion...' : 'Loading configuration...'}
        </span>
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
    <div className="space-y-4">
      {section === 'identity' && (
        <IdentitySection
          localConfig={localConfig}
          setLocalConfig={setLocalConfig}
          language={language}
        />
      )}
      {section === 'pages' && (
        <PagesSection
          localConfig={localConfig}
          setLocalConfig={setLocalConfig}
          language={language}
        />
      )}
      {section === 'sensors' && (
        <SensorsSection
          localConfig={localConfig}
          setLocalConfig={setLocalConfig}
          language={language}
        />
      )}
      {section === 'alarms' && (
        <AlarmThresholdsSection
          localConfig={localConfig}
          setLocalConfig={setLocalConfig}
          language={language}
        />
      )}
      {section === 'plant-survey' && (
        <PlantSurveySection
          localConfig={localConfig}
          setLocalConfig={setLocalConfig}
          language={language}
        />
      )}

      <div className="sticky bottom-0 bg-[var(--bg-surface)]/95 backdrop-blur-sm border-t border-[var(--border-subtle)] py-3">
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
            <div className="flex items-center gap-2 text-[var(--status-normal)] text-sm">
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
