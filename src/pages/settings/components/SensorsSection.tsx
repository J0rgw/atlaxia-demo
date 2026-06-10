import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Gauge, Search } from 'lucide-react';
import type { SensorMapping } from '@/types/installation';
import type { LocalInstallationConfig } from './InstallationConfigTab';
import { SensorCategoryAccordion } from './SensorCategoryAccordion';
import { JsonUploadZone } from '@/pages/setup/components/JsonUploadZone';
import { parsePlantSurvey } from '@/lib/plantSurveyParser';
import type { PlantSurvey } from '@/types/plantSurvey';

interface SensorsSectionProps {
  localConfig: LocalInstallationConfig;
  setLocalConfig: React.Dispatch<React.SetStateAction<LocalInstallationConfig | null>>;
  language: string;
}

export function SensorsSection({ localConfig, setLocalConfig, language }: SensorsSectionProps) {
  const [searchFilter, setSearchFilter] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  const toggleDefault = useCallback((sensorId: string) => {
    setLocalConfig((prev) => {
      if (!prev) return prev;
      const currentDefaults = prev.sensors_config.defaultSelected;
      const newDefaults = currentDefaults.includes(sensorId)
        ? currentDefaults.filter((id) => id !== sensorId)
        : [...currentDefaults, sensorId];
      return {
        ...prev,
        sensors_config: {
          ...prev.sensors_config,
          defaultSelected: newDefaults,
        },
      };
    });
  }, [setLocalConfig]);

  const updateSensor = useCallback((sensorId: string, updates: Partial<SensorMapping>) => {
    setLocalConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sensors_config: {
          ...prev.sensors_config,
          mapping: {
            ...prev.sensors_config.mapping,
            [sensorId]: {
              ...prev.sensors_config.mapping[sensorId],
              ...updates,
            },
          },
        },
      };
    });
  }, [setLocalConfig]);

  // Re-import the whole sensors_config from a fresh survey. Replaces
  // categories/mapping/topology in localConfig — the user still has to
  // click "Guardar Cambios" to PUT it to the backend, so the upload is
  // never destructive without explicit confirmation.
  const [importedSummary, setImportedSummary] = useState<string | null>(null);
  const handleSurveyImport = useCallback((survey: PlantSurvey) => {
    try {
      const result = parsePlantSurvey(survey);
      setLocalConfig((prev) => {
        if (!prev) return prev;
        return { ...prev, sensors_config: result.config };
      });
      setImportedSummary(
        `${result.plantName}: ${result.stats.totalSensors} sensores en ${result.stats.processCount} procesos`,
      );
    } catch (err) {
      setImportedSummary(`Error: ${(err as Error).message}`);
    }
  }, [setLocalConfig]);

  const totalSensors = Object.keys(localConfig.sensors_config.mapping).length;
  const totalCategories = localConfig.sensors_config.categories.length;
  const totalDefaults = localConfig.sensors_config.defaultSelected.length;

  return (
    <Card padding="lg">
      <h3 className="font-semibold text-[var(--text-primary)] mb-4">
        {language === 'es' ? 'Configuracion de Sensores' : 'Sensors Configuration'}
      </h3>

      {/* Re-import survey JSON */}
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
          {language === 'es' ? 'Reimportar desde JSON' : 'Re-import from JSON'}
        </p>
        <JsonUploadZone onImport={handleSurveyImport} />
        {importedSummary && (
          <p className="mt-2 text-xs text-[var(--text-secondary)]">
            {language === 'es' ? 'Importado: ' : 'Imported: '}
            <span className="text-[var(--text-primary)]">{importedSummary}</span>
            {' — '}
            {language === 'es'
              ? 'pulsa Guardar Cambios para persistir.'
              : 'click Save Changes to persist.'}
          </p>
        )}
      </div>

      {/* Stats Summary */}
      <div className="bg-[var(--bg-inset)] rounded-lg p-4 mb-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-[var(--accent-primary)]">{totalSensors}</p>
            <p className="text-sm text-[var(--text-secondary)]">
              {language === 'es' ? 'Sensores' : 'Sensors'}
            </p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{totalCategories}</p>
            <p className="text-sm text-[var(--text-secondary)]">
              {language === 'es' ? 'Categorias' : 'Categories'}
            </p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-500">{totalDefaults}</p>
            <p className="text-sm text-[var(--text-secondary)]">
              {language === 'es' ? 'Por defecto' : 'Default'}
            </p>
          </div>
        </div>
      </div>

      {totalCategories > 0 ? (
        <>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder={language === 'es' ? 'Buscar sensores...' : 'Search sensors...'}
              className="w-full pl-9 pr-4 py-2 text-sm border border-[var(--border-default)] rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] outline-none"
            />
          </div>

          {/* Category List */}
          <div className="space-y-3">
            {localConfig.sensors_config.categories.map((cat) => (
              <SensorCategoryAccordion
                key={cat.id}
                category={cat}
                mapping={localConfig.sensors_config.mapping}
                defaultSelected={localConfig.sensors_config.defaultSelected}
                expanded={expandedCategories.has(cat.id)}
                onToggleExpand={() => toggleExpand(cat.id)}
                onToggleDefault={toggleDefault}
                onUpdateSensor={updateSensor}
                searchFilter={searchFilter}
                language={language}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-[var(--text-secondary)]">
          <Gauge className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
          <p>{language === 'es' ? 'No hay sensores configurados' : 'No sensors configured'}</p>
          <p className="text-sm mt-1">
            {language === 'es'
              ? 'Los sensores se configuran durante el setup inicial'
              : 'Sensors are configured during initial setup'}
          </p>
        </div>
      )}
    </Card>
  );
}
