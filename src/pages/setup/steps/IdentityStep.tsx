/**
 * Step 1: Identity Configuration
 * Configures: installation.name, installation.logo_url, installation.theme
 */

import { useId, useRef, useState } from 'react';
import { useInstallationStore } from '@/stores/installationStore';
import { LogoUpload } from '@/components/ui/LogoUpload';
import { useSetupPreview } from '../previewContext';
import { cn } from '@/lib/utils';
import type { ThemeTemplate } from '@/types/installation';

const TEMPLATE_OPTIONS: { id: ThemeTemplate; label: string; hint: string }[] = [
  { id: 'scada', label: 'SCADA', hint: 'Industrial, ISA-101' },
  { id: 'modern', label: 'Modern', hint: 'Cards redondeados, sombras' },
];

type ColorKey = 'primary' | 'secondary' | 'accent';

// Mirrors the defaults in installationStore (initial setupData and the
// post-config-load fallback). Changing them here should be done in lockstep.
const DEFAULT_COLORS: Record<ColorKey, string> = {
  primary: '#0D9488',
  secondary: '#0EA5E9',
  accent: '#F59E0B',
};

const COLOR_FIELDS: { key: ColorKey; label: string; help: string }[] = [
  { key: 'primary', label: 'Primario', help: 'Acciones y enlaces' },
  { key: 'secondary', label: 'Secundario', help: 'Realces y series' },
  { key: 'accent', label: 'Acento', help: 'Avisos suaves' },
];

function isValidHex(v: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(v);
}

export function IdentityStep() {
  const { setupData, updateInstallation } = useInstallationStore();
  const { installation } = setupData;
  const { previewMode, togglePreviewMode } = useSetupPreview();

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateInstallation({ name: e.target.value });
  };

  const handleColorChange = (colorKey: 'primary' | 'secondary' | 'accent', value: string) => {
    updateInstallation({
      theme: { ...installation.theme, [colorKey]: value },
    });
  };

  const handleTemplateChange = (template: ThemeTemplate) => {
    updateInstallation({
      theme: { ...installation.theme, template },
    });
  };

  const handleResetColors = () => {
    updateInstallation({
      theme: { ...installation.theme, ...DEFAULT_COLORS },
    });
  };

  const isPaletteDefault =
    installation.theme.primary.toLowerCase() === DEFAULT_COLORS.primary.toLowerCase() &&
    installation.theme.secondary.toLowerCase() === DEFAULT_COLORS.secondary.toLowerCase() &&
    installation.theme.accent.toLowerCase() === DEFAULT_COLORS.accent.toLowerCase();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Identidad de la Instalacion</h2>
        <p className="text-[var(--text-secondary)]">
          Configura el nombre, logo y colores que identificaran esta instalacion.
        </p>
      </div>

      {/* Installation Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
          Nombre de la instalacion *
        </label>
        <input
          type="text"
          id="name"
          value={installation.name}
          onChange={handleNameChange}
          placeholder="Ej: Planta Industrial Norte"
          className="w-full h-10 px-3 bg-[var(--bg-inset)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] border border-[var(--border-default)] rounded-md focus:ring-2 focus:ring-[var(--accent-primary)]/30 focus:border-[var(--accent-primary)] outline-none transition-colors"
        />
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Este nombre aparecera en el encabezado y reportes
        </p>
      </div>

      {/* Logo Upload */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
          Logo (opcional)
        </label>
        <LogoUpload
          value={installation.logo_url}
          onChange={(url) => updateInstallation({ logo_url: url })}
        />
      </div>

      {/* Theme Colors */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)]">
              Colores del tema
            </label>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Estos colores impulsan los tokens de la interfaz en tiempo real.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetColors}
            disabled={isPaletteDefault}
            className={cn(
              'inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium rounded-md border transition-colors',
              isPaletteDefault
                ? 'border-[var(--border-subtle)] text-[var(--text-muted)] cursor-not-allowed'
                : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-emphasis)] hover:bg-[var(--bg-inset)]'
            )}
            title="Restaurar paleta por defecto"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M20 20v-6h-6M5.07 19a9 9 0 0014.65-4.07M18.93 5A9 9 0 004.28 9.07" />
            </svg>
            Restaurar
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {COLOR_FIELDS.map((f) => (
            <ColorPill
              key={f.key}
              colorKey={f.key}
              label={f.label}
              help={f.help}
              value={installation.theme[f.key]}
              onChange={(v) => handleColorChange(f.key, v)}
            />
          ))}
        </div>
      </div>

      {/* Theme Template + Dark/Light preview */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
          Plantilla de tema
        </label>
        <div className="flex items-center gap-2 flex-wrap">
          <div
            role="group"
            aria-label="Plantilla de tema"
            className="inline-flex h-10 rounded-md border border-[var(--border-default)] bg-[var(--bg-inset)] p-0.5"
          >
            {TEMPLATE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleTemplateChange(opt.id)}
                aria-pressed={installation.theme.template === opt.id}
                className={cn(
                  'inline-flex items-center px-3 text-sm font-medium rounded transition-colors',
                  installation.theme.template === opt.id
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-card'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={togglePreviewMode}
            aria-label={previewMode === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="inline-flex items-center gap-2 h-10 px-3 rounded-md border border-[var(--border-default)] bg-[var(--bg-inset)] text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-emphasis)] transition-colors"
          >
            {previewMode === 'dark' ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="4" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
            <span>{previewMode === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>
          </button>
        </div>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {TEMPLATE_OPTIONS.find((o) => o.id === installation.theme.template)?.hint}. El modo claro/oscuro
          es solo una vista previa local; cada usuario puede cambiarlo despues.
        </p>
      </div>

      {/* Theme Preview */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Vista previa</label>
        <div className="p-4 bg-[var(--bg-inset)] rounded-lg border border-[var(--border-subtle)]">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-8 h-8 rounded"
              style={{ backgroundColor: installation.theme.primary }}
            />
            <span className="font-medium text-[var(--text-primary)]">
              {installation.name || 'Nombre de la instalacion'}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              className="px-3 py-1.5 text-sm text-white rounded"
              style={{ backgroundColor: installation.theme.primary }}
            >
              Boton Primario
            </button>
            <button
              className="px-3 py-1.5 text-sm text-white rounded"
              style={{ backgroundColor: installation.theme.secondary }}
            >
              Boton Secundario
            </button>
            <span
              className="px-2 py-1 text-sm rounded"
              style={{ backgroundColor: installation.theme.accent, color: 'white' }}
            >
              Acento
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ColorPillProps {
  colorKey: ColorKey;
  label: string;
  help: string;
  value: string;
  onChange: (value: string) => void;
}

/**
 * Compact h-10 swatch + hex pill. The whole pill is the click target — it
 * triggers a hidden native <input type="color"> for the OS-level picker. The
 * hex field accepts manual entry but only commits a valid #RRGGBB on blur so
 * the live preview doesn't flicker mid-typing.
 */
function ColorPill({ colorKey, label, help, value, onChange }: ColorPillProps) {
  const inputId = useId();
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<string | null>(null);

  const displayValue = (draft ?? value).toUpperCase();
  const draftIsInvalid = draft !== null && !isValidHex(draft);

  const commitDraft = () => {
    if (draft === null) return;
    if (isValidHex(draft) && draft.toLowerCase() !== value.toLowerCase()) {
      onChange(draft);
    }
    setDraft(null);
  };

  return (
    <div className="space-y-1">
      <label
        htmlFor={inputId}
        className="flex h-10 items-center gap-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-inset)] pl-1 pr-2 transition-colors focus-within:border-[var(--accent-primary)] focus-within:ring-2 focus-within:ring-[var(--accent-primary)]/30 hover:border-[var(--border-emphasis)]"
      >
        <button
          type="button"
          onClick={() => colorInputRef.current?.click()}
          aria-label={`Elegir color ${label.toLowerCase()}`}
          className="relative h-8 w-8 rounded-sm border border-[var(--border-subtle)] shadow-card overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
          style={{ backgroundColor: isValidHex(value) ? value : 'transparent' }}
        >
          <input
            ref={colorInputRef}
            type="color"
            value={isValidHex(value) ? value : '#000000'}
            onChange={(e) => onChange(e.target.value)}
            aria-hidden
            tabIndex={-1}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          />
        </button>
        <div className="flex-1 min-w-0 leading-tight">
          <div className="text-xs font-medium text-[var(--text-primary)] truncate">{label}</div>
          <input
            id={inputId}
            type="text"
            value={displayValue}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitDraft();
              } else if (e.key === 'Escape') {
                setDraft(null);
              }
            }}
            spellCheck={false}
            aria-label={`Hex de ${label.toLowerCase()}`}
            aria-invalid={draftIsInvalid}
            data-color-key={colorKey}
            className={cn(
              'w-full bg-transparent text-xs font-readout tracking-tight outline-none truncate',
              draftIsInvalid ? 'text-[var(--status-critical)]' : 'text-[var(--text-secondary)]'
            )}
          />
        </div>
      </label>
      <p className="text-[11px] text-[var(--text-muted)] px-1">{help}</p>
    </div>
  );
}
