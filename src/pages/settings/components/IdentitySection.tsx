import { Card } from '@/components/ui/Card';
import { LogoUpload } from '@/components/ui/LogoUpload';
import { ColorPicker } from '@/components/ui/ColorPicker';
import type { LocalInstallationConfig } from './InstallationConfigTab';

interface IdentitySectionProps {
  localConfig: LocalInstallationConfig;
  setLocalConfig: React.Dispatch<React.SetStateAction<LocalInstallationConfig | null>>;
  language: string;
}

export function IdentitySection({ localConfig, setLocalConfig, language }: IdentitySectionProps) {
  return (
    <Card padding="lg">
      <h3 className="font-semibold text-[var(--text-primary)] mb-4">
        {language === 'es' ? 'Identidad de la Instalacion' : 'Installation Identity'}
      </h3>

      <div className="space-y-5 max-w-lg">
        <div>
          <label htmlFor="settings-install-name" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            {language === 'es' ? 'Nombre de la instalacion' : 'Installation name'}
          </label>
          <input
            id="settings-install-name"
            type="text"
            value={localConfig.installation_name}
            onChange={(e) =>
              setLocalConfig({
                ...localConfig,
                installation_name: e.target.value,
              })
            }
            className="w-full px-4 py-2 border border-[var(--border-default)] rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            {language === 'es' ? 'Logo' : 'Logo'}
          </label>
          <LogoUpload
            value={localConfig.logo_url}
            onChange={(url) =>
              setLocalConfig({
                ...localConfig,
                logo_url: url,
              })
            }
            language={language as 'es' | 'en'}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-3">
            {language === 'es' ? 'Colores del tema' : 'Theme colors'}
          </label>
          <div className="grid grid-cols-3 gap-4">
            <ColorPicker
              id="settings-color-primary"
              label={language === 'es' ? 'Primario' : 'Primary'}
              value={localConfig.theme_primary}
              onChange={(hex) =>
                setLocalConfig({ ...localConfig, theme_primary: hex })
              }
            />
            <ColorPicker
              id="settings-color-secondary"
              label={language === 'es' ? 'Secundario' : 'Secondary'}
              value={localConfig.theme_secondary}
              onChange={(hex) =>
                setLocalConfig({ ...localConfig, theme_secondary: hex })
              }
            />
            <ColorPicker
              id="settings-color-accent"
              label={language === 'es' ? 'Acento' : 'Accent'}
              value={localConfig.theme_accent}
              onChange={(hex) =>
                setLocalConfig({ ...localConfig, theme_accent: hex })
              }
            />
          </div>
        </div>

      </div>
    </Card>
  );
}
