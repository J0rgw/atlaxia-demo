/**
 * Step 5: Summary and Confirmation
 * Shows the complete configuration JSON and allows submission
 */

import { useState } from 'react';
import { useInstallationStore } from '@/stores/installationStore';
import { AVAILABLE_PAGES } from '@/types/installation';
import { resolveStaticUrl } from '@/lib/api';

export function SummaryStep() {
  const { setupData } = useInstallationStore();
  const [showJson, setShowJson] = useState(false);

  const { installation, sensors_config, pages_config, admin_user } = setupData;

  // Count sensors
  const sensorCount = Object.keys(sensors_config.mapping).length;
  const categoryCount = sensors_config.categories.length;
  const defaultSelectedCount = sensors_config.defaultSelected.length;

  // Get enabled page names
  const enabledPageNames = pages_config.enabled
    .map((id) => AVAILABLE_PAGES.find((p) => p.id === id)?.name)
    .filter(Boolean);

  const defaultPageName = AVAILABLE_PAGES.find((p) => p.id === pages_config.default)?.name;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Resumen de Configuracion</h2>
        <p className="text-[var(--text-secondary)]">
          Revisa la configuracion antes de completar el setup.
        </p>
      </div>

      <div className="space-y-4">
        {/* Installation */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg overflow-hidden">
          <div className="bg-[var(--bg-inset)] px-4 py-2 border-b border-[var(--border-subtle)]">
            <h3 className="font-medium text-[var(--text-primary)]">Instalacion</h3>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-4">
              {installation.logo_url ? (
                <img
                  src={resolveStaticUrl(installation.logo_url) || installation.logo_url}
                  alt="Logo"
                  className="w-12 h-12 object-contain rounded"
                />
              ) : (
                <div className="w-12 h-12 bg-[var(--bg-inset)] rounded flex items-center justify-center">
                  <svg className="w-6 h-6 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              <div>
                <p className="font-medium text-[var(--text-primary)]">{installation.name || 'Sin nombre'}</p>
                <p className="text-sm text-[var(--text-secondary)]">Nombre de la instalacion</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-[var(--text-secondary)] mb-2">Colores del tema</p>
              <div className="flex gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: installation.theme.primary }}
                  />
                  <span className="text-xs text-[var(--text-secondary)]">Primario</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: installation.theme.secondary }}
                  />
                  <span className="text-xs text-[var(--text-secondary)]">Secundario</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: installation.theme.accent }}
                  />
                  <span className="text-xs text-[var(--text-secondary)]">Acento</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sensors */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg overflow-hidden">
          <div className="bg-[var(--bg-inset)] px-4 py-2 border-b border-[var(--border-subtle)]">
            <h3 className="font-medium text-[var(--text-primary)]">Sensores</h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-2xl font-bold text-[var(--status-normal)]">{sensorCount}</p>
                <p className="text-sm text-[var(--text-secondary)]">Sensores habilitados</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{categoryCount}</p>
                <p className="text-sm text-[var(--text-secondary)]">Categorias</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{defaultSelectedCount}</p>
                <p className="text-sm text-[var(--text-secondary)]">Por defecto</p>
              </div>
            </div>

            {categoryCount > 0 && (
              <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
                <p className="text-sm text-[var(--text-secondary)] mb-2">Categorias:</p>
                <div className="flex flex-wrap gap-2">
                  {sensors_config.categories.map((cat) => (
                    <span
                      key={cat.id}
                      className="px-2 py-1 text-sm bg-[var(--bg-inset)] text-[var(--text-primary)] rounded"
                    >
                      {cat.name} ({cat.sensors.length})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pages */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg overflow-hidden">
          <div className="bg-[var(--bg-inset)] px-4 py-2 border-b border-[var(--border-subtle)]">
            <h3 className="font-medium text-[var(--text-primary)]">Paginas</h3>
          </div>
          <div className="p-4">
            <div className="flex flex-wrap gap-2 mb-3">
              {enabledPageNames.map((name) => (
                <span
                  key={name}
                  className="px-3 py-1 text-sm bg-[var(--status-normal-muted)] text-[var(--status-normal)] rounded-md-full"
                >
                  {name}
                </span>
              ))}
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              Pagina por defecto: <span className="font-medium text-[var(--text-primary)]">{defaultPageName}</span>
            </p>
          </div>
        </div>

        {/* Admin User */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg overflow-hidden">
          <div className="bg-[var(--bg-inset)] px-4 py-2 border-b border-[var(--border-subtle)]">
            <h3 className="font-medium text-[var(--text-primary)]">Administrador</h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Usuario</p>
                <p className="font-medium text-[var(--text-primary)]">{admin_user.username || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Email</p>
                <p className="font-medium text-[var(--text-primary)]">{admin_user.email || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Show JSON Toggle */}
      <div>
        <label
          className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
        >
          <input
            id="summary-show-json"
            type="checkbox"
            checked={showJson}
            onChange={() => setShowJson(!showJson)}
            className="w-4 h-4 text-[var(--status-normal)] rounded-md"
          />
          Mostrar JSON completo (debug)
        </label>

        {showJson && (
          <div className="mt-3 bg-[var(--bg-surface)] rounded-lg p-4 overflow-auto max-h-96">
            <pre className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
              {JSON.stringify(
                {
                  installation,
                  sensors_config,
                  pages_config,
                  admin_user: {
                    ...admin_user,
                    password: '********', // Hide password in preview
                  },
                },
                null,
                2
              )}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
