/**
 * Step 2: Sensors Configuration
 * Configures: sensors_config.categories, sensors_config.mapping, sensors_config.defaultSelected
 *
 * Supports two data sources:
 * - Plant survey JSON (primary): auto-imports sensors into process-based categories
 * - ThingsBoard (secondary): flat list of available sensor keys
 */

import { useState, useEffect, useMemo } from 'react';
import { useInstallationStore } from '@/stores/installationStore';
import type { SensorCategory, SensorMapping } from '@/types/installation';
import { parsePlantSurvey } from '@/lib/plantSurveyParser';
import type { PlantSurvey } from '@/types/plantSurvey';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { JsonUploadZone } from '../components/JsonUploadZone';
import { ImportSummary } from '../components/ImportSummary';
import { SensorSourceTabs } from '../components/SensorSourceTabs';
import { ProcessAccordion } from '../components/ProcessAccordion';

function generateSensorId(tbKey: string): string {
  return tbKey.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

export function SensorsStep() {
  const {
    setupData,
    updateSensorsConfig,
    availableSensors,
    availableSensorsLoading,
    fetchAvailableSensors,
    plantSurveyData,
    setPlantSurveyData,
  } = useInstallationStore();

  const { sensors_config } = setupData;
  const [searchTerm, setSearchTerm] = useState('');
  const [editingSensor, setEditingSensor] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);

  // Parse stats from current survey data
  const surveyInfo = useMemo(() => {
    if (!plantSurveyData) return null;
    try {
      const result = parsePlantSurvey(plantSurveyData);
      return { plantName: result.plantName, clientName: result.clientName, stats: result.stats };
    } catch {
      return null;
    }
  }, [plantSurveyData]);

  // Load available sensors on mount
  useEffect(() => {
    if (availableSensors.length === 0) {
      fetchAvailableSensors();
    }
  }, [availableSensors.length, fetchAvailableSensors]);

  // Set of added sensor IDs for quick lookup
  const addedSensorIds = useMemo(() => new Set(Object.keys(sensors_config.mapping)), [sensors_config.mapping]);

  // Handle JSON import
  const handleJsonImport = (data: PlantSurvey) => {
    setPlantSurveyData(data);
    // Auto-import all sensors
    const store = useInstallationStore.getState();
    store.setPlantSurveyData(data);
    store.importFromPlantSurvey();
  };

  const handleReupload = () => {
    setPlantSurveyData(null);
  };

  const handleClear = () => {
    setPlantSurveyData(null);
    updateSensorsConfig({
      categories: [],
      mapping: {},
      defaultSelected: [],
    });
  };

  // Add sensor from ThingsBoard
  const handleAddSensor = (tbKey: string) => {
    const sensorId = generateSensorId(tbKey);
    if (sensors_config.mapping[sensorId]) return;

    const newMapping: SensorMapping = {
      thingsboard_key: tbKey,
      display_name: tbKey,
    };

    updateSensorsConfig({
      mapping: { ...sensors_config.mapping, [sensorId]: newMapping },
    });
  };

  // Add all sensors from a JSON process
  const handleAddAllFromProcess = (processIndex: number) => {
    if (!plantSurveyData) return;
    const plant = plantSurveyData.plants[0];
    if (!plant) return;
    const process = plant.processes[processIndex];
    if (!process) return;

    const newMapping = { ...sensors_config.mapping };
    const newCategories = [...sensors_config.categories];

    const categoryId = process.process_name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

    let category = newCategories.find((c) => c.id === categoryId);
    if (!category) {
      category = { id: categoryId, name: process.process_name, expanded: true, sensors: [] };
      newCategories.push(category);
    }

    for (const sensor of process.sensors) {
      const sensorId = generateSensorId(sensor.sensor_name);
      if (newMapping[sensorId]) continue;

      newMapping[sensorId] = {
        thingsboard_key: sensor.sensor_name,
        display_name: sensor.sensor_alias || sensor.sensor_name,
        unit: sensor.unit,
        min: sensor.min_value ?? undefined,
        max: sensor.max_value ?? undefined,
        process_area: process.process_name,
        sensor_type: sensor.sensor_type,
        variable_type: (['continuous', 'binary', 'categorical'].includes(sensor.variable_type)
          ? sensor.variable_type as 'continuous' | 'binary' | 'categorical'
          : 'continuous'),
        instrument_role: sensor.instrument_role,
        description: sensor.description,
        causality: sensor.causality && ['endogenous', 'exogenous'].includes(sensor.causality)
          ? sensor.causality as 'endogenous' | 'exogenous'
          : (sensor.causality === 'interna' ? 'endogenous' : sensor.causality === 'externa' ? 'exogenous' : undefined),
        categorical_values: sensor.categorical_values,
        equipment_name: sensor.equipment_name,
      };

      if (!category.sensors.includes(sensorId)) {
        category.sensors.push(sensorId);
      }
    }

    updateSensorsConfig({
      mapping: newMapping,
      categories: newCategories,
    });
  };

  // Remove sensor
  const handleRemoveSensor = (sensorId: string) => {
    const newMapping = { ...sensors_config.mapping };
    delete newMapping[sensorId];

    const newCategories = sensors_config.categories.map((cat) => ({
      ...cat,
      sensors: cat.sensors.filter((s) => s !== sensorId),
    }));

    const newDefaultSelected = sensors_config.defaultSelected.filter((s) => s !== sensorId);

    updateSensorsConfig({
      mapping: newMapping,
      categories: newCategories,
      defaultSelected: newDefaultSelected,
    });
  };

  // Update sensor mapping
  const handleUpdateSensor = (sensorId: string, updates: Partial<SensorMapping>) => {
    updateSensorsConfig({
      mapping: {
        ...sensors_config.mapping,
        [sensorId]: { ...sensors_config.mapping[sensorId], ...updates },
      },
    });
  };

  // Add category
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;

    const categoryId = newCategoryName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const newCategory: SensorCategory = {
      id: categoryId,
      name: newCategoryName,
      expanded: true,
      sensors: [],
    };

    updateSensorsConfig({
      categories: [...sensors_config.categories, newCategory],
    });

    setNewCategoryName('');
    setShowNewCategoryInput(false);
  };

  // Remove category
  const handleRemoveCategory = (categoryId: string) => {
    updateSensorsConfig({
      categories: sensors_config.categories.filter((c) => c.id !== categoryId),
    });
  };

  // Toggle category expansion
  const handleToggleExpand = (categoryId: string) => {
    updateSensorsConfig({
      categories: sensors_config.categories.map((cat) =>
        cat.id === categoryId ? { ...cat, expanded: !cat.expanded } : cat
      ),
    });
  };

  // Move sensor to category
  const handleMoveSensorToCategory = (categoryId: string, sensorId: string) => {
    const newCategories = sensors_config.categories.map((cat) => {
      if (cat.id === categoryId) {
        return { ...cat, sensors: [...cat.sensors.filter((s) => s !== sensorId), sensorId] };
      }
      return { ...cat, sensors: cat.sensors.filter((s) => s !== sensorId) };
    });

    updateSensorsConfig({ categories: newCategories });
  };

  // Toggle default selected
  const handleToggleDefaultSelected = (sensorId: string) => {
    const isSelected = sensors_config.defaultSelected.includes(sensorId);
    updateSensorsConfig({
      defaultSelected: isSelected
        ? sensors_config.defaultSelected.filter((s) => s !== sensorId)
        : [...sensors_config.defaultSelected, sensorId],
    });
  };

  // Select/deselect all in category
  const handleSelectAll = (categoryId: string) => {
    const cat = sensors_config.categories.find((c) => c.id === categoryId);
    if (!cat) return;
    const newSelected = new Set(sensors_config.defaultSelected);
    cat.sensors.forEach((id) => newSelected.add(id));
    updateSensorsConfig({ defaultSelected: Array.from(newSelected) });
  };

  const handleDeselectAll = (categoryId: string) => {
    const cat = sensors_config.categories.find((c) => c.id === categoryId);
    if (!cat) return;
    const catSensorSet = new Set(cat.sensors);
    updateSensorsConfig({
      defaultSelected: sensors_config.defaultSelected.filter((id) => !catSensorSet.has(id)),
    });
  };

  // Get uncategorized sensors
  const categorizedSensorIds = sensors_config.categories.flatMap((c) => c.sensors);
  const uncategorizedSensors = Object.keys(sensors_config.mapping).filter((id) => !categorizedSensorIds.includes(id));

  const selectedSensorIds = Object.keys(sensors_config.mapping);

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-1">Configurar Sensores</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Importa sensores desde la encuesta de planta (JSON) o seleccionalos desde ThingsBoard.
          </p>
        </div>

        {/* Upload zone or summary */}
        {plantSurveyData && surveyInfo ? (
          <ImportSummary
            plantName={surveyInfo.plantName}
            clientName={surveyInfo.clientName}
            stats={surveyInfo.stats}
            onReupload={handleReupload}
            onClear={handleClear}
          />
        ) : (
          <JsonUploadZone onImport={handleJsonImport} />
        )}

        {/* Two-column layout */}
        <div className="grid grid-cols-[minmax(280px,1fr)_minmax(320px,1.5fr)] gap-4" style={{ minHeight: 400 }}>
          {/* Left: Source panel */}
          <SensorSourceTabs
            plantSurvey={plantSurveyData}
            availableSensors={availableSensors}
            availableSensorsLoading={availableSensorsLoading}
            addedSensorKeys={addedSensorIds}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onAddSensor={handleAddSensor}
            onAddAllFromProcess={handleAddAllFromProcess}
          />

          {/* Right: Organized sensors */}
          <div className="border border-[var(--border-subtle)] rounded-lg overflow-hidden flex flex-col">
            <div className="bg-[var(--bg-inset)] px-4 py-2.5 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div>
                <h3 className="font-medium text-[var(--text-primary)] text-sm">Sensores Configurados</h3>
                <p className="text-xs text-[var(--text-muted)]">{selectedSensorIds.length} sensores</p>
              </div>
              <button
                onClick={() => setShowNewCategoryInput(true)}
                className="text-xs text-[var(--status-normal)] hover:opacity-80 font-medium"
              >
                + Nuevo Proceso
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {/* New category input */}
              {showNewCategoryInput && (
                <div className="flex items-center gap-2 p-2 bg-[var(--status-normal-muted)] rounded-lg">
                  <input
                    id="new-category-name"
                    type="text"
                    placeholder="Nombre del proceso"
                    aria-label="Nombre del nuevo proceso"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-1 px-2 py-1 text-sm bg-[var(--bg-inset)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] border border-[var(--border-default)] rounded focus:ring-2 focus:ring-[var(--accent-primary)]/30 focus:border-[var(--accent-primary)] outline-none transition-colors"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                    autoFocus
                  />
                  <button
                    onClick={handleAddCategory}
                    className="px-2.5 py-1 text-sm bg-[var(--status-normal)] text-white rounded hover:opacity-90 transition-colors"
                  >
                    Crear
                  </button>
                  <button
                    onClick={() => { setShowNewCategoryInput(false); setNewCategoryName(''); }}
                    className="px-2 py-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    Cancelar
                  </button>
                </div>
              )}

              {/* Process accordions */}
              {sensors_config.categories.map((category) => (
                <ProcessAccordion
                  key={category.id}
                  category={category}
                  mapping={sensors_config.mapping}
                  defaultSelected={sensors_config.defaultSelected}
                  editingSensor={editingSensor}
                  allCategories={sensors_config.categories}
                  onToggleExpand={() => handleToggleExpand(category.id)}
                  onRemoveCategory={() => handleRemoveCategory(category.id)}
                  onEditSensor={setEditingSensor}
                  onRemoveSensor={handleRemoveSensor}
                  onUpdateSensor={handleUpdateSensor}
                  onToggleDefault={handleToggleDefaultSelected}
                  onMoveToCategory={handleMoveSensorToCategory}
                  onSelectAll={() => handleSelectAll(category.id)}
                  onDeselectAll={() => handleDeselectAll(category.id)}
                />
              ))}

              {/* Uncategorized sensors */}
              {uncategorizedSensors.length > 0 && (
                <ProcessAccordion
                  category={{
                    id: '__uncategorized__',
                    name: 'Sin Proceso',
                    expanded: true,
                    sensors: uncategorizedSensors,
                  }}
                  mapping={sensors_config.mapping}
                  defaultSelected={sensors_config.defaultSelected}
                  editingSensor={editingSensor}
                  allCategories={sensors_config.categories}
                  onToggleExpand={() => {}}
                  onRemoveCategory={() => {}}
                  onEditSensor={setEditingSensor}
                  onRemoveSensor={handleRemoveSensor}
                  onUpdateSensor={handleUpdateSensor}
                  onToggleDefault={handleToggleDefaultSelected}
                  onMoveToCategory={handleMoveSensorToCategory}
                  variant="uncategorized"
                />
              )}

              {/* Empty state */}
              {selectedSensorIds.length === 0 && !showNewCategoryInput && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-14 h-14 rounded-md bg-[var(--bg-inset)] flex items-center justify-center mb-3">
                    <svg className="w-7 h-7 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-[var(--text-muted)] font-medium">Sin sensores configurados</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Importa un JSON de encuesta o selecciona sensores de ThingsBoard
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
