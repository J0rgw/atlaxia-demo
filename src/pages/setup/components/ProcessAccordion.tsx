import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { SensorMapping, SensorCategory } from '@/types/installation';
import { SensorRow } from './SensorRow';

interface ProcessAccordionProps {
  category: SensorCategory;
  mapping: Record<string, SensorMapping>;
  defaultSelected: string[];
  editingSensor: string | null;
  allCategories: SensorCategory[];
  onToggleExpand: () => void;
  onRemoveCategory: () => void;
  onEditSensor: (sensorId: string | null) => void;
  onRemoveSensor: (sensorId: string) => void;
  onUpdateSensor: (sensorId: string, updates: Partial<SensorMapping>) => void;
  onToggleDefault: (sensorId: string) => void;
  onMoveToCategory: (categoryId: string, sensorId: string) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  variant?: 'default' | 'uncategorized';
}

export function ProcessAccordion({
  category,
  mapping,
  defaultSelected,
  editingSensor,
  allCategories,
  onToggleExpand,
  onRemoveCategory,
  onEditSensor,
  onRemoveSensor,
  onUpdateSensor,
  onToggleDefault,
  onMoveToCategory,
  onSelectAll,
  onDeselectAll,
  variant = 'default',
}: ProcessAccordionProps) {
  const [hovering, setHovering] = useState(false);
  const isUncategorized = variant === 'uncategorized';

  // Group sensors by equipment_name
  const sensorsWithEquipment: Record<string, string[]> = {};
  const sensorsWithoutEquipment: string[] = [];

  for (const sensorId of category.sensors) {
    const sensor = mapping[sensorId];
    if (!sensor) continue;
    if (sensor.equipment_name) {
      if (!sensorsWithEquipment[sensor.equipment_name]) {
        sensorsWithEquipment[sensor.equipment_name] = [];
      }
      sensorsWithEquipment[sensor.equipment_name].push(sensorId);
    } else {
      sensorsWithoutEquipment.push(sensorId);
    }
  }

  const hasEquipmentGroups = Object.keys(sensorsWithEquipment).length > 0;
  const selectedCount = category.sensors.filter((id) => defaultSelected.includes(id)).length;

  return (
    <div
      className={cn(
        'rounded-lg border overflow-hidden transition-colors',
        isUncategorized ? 'border-[var(--status-warning)]/40' : 'border-[var(--border-subtle)]',
      )}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Header */}
      <button
        onClick={onToggleExpand}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors',
          isUncategorized ? 'bg-[var(--status-warning-muted)] hover:opacity-90' : 'bg-[var(--bg-inset)] hover:bg-[var(--bg-inset)]',
        )}
      >
        <svg
          className={cn(
            'w-4 h-4 transition-transform duration-200 shrink-0',
            isUncategorized ? 'text-[var(--status-warning)]' : 'text-[var(--text-muted)]',
            category.expanded && 'rotate-90'
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>

        <span className={cn(
          'font-medium text-sm flex-1',
          isUncategorized ? 'text-[var(--status-warning)]' : 'text-[var(--text-primary)]'
        )}>
          {category.name}
        </span>

        <span className={cn(
          'text-xs px-1.5 py-0.5 rounded-full font-medium',
          isUncategorized ? 'bg-[var(--status-warning-muted)] text-[var(--status-warning)]' : 'bg-[var(--bg-inset)] text-[var(--text-secondary)]'
        )}>
          {category.sensors.length}
        </span>

        {hovering && !isUncategorized && (
          <span
            onClick={(e) => { e.stopPropagation(); onRemoveCategory(); }}
            className="text-[var(--text-muted)] hover:text-[var(--status-critical)] p-0.5 transition-colors"
            title="Eliminar proceso"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
        )}
      </button>

      {/* Body */}
      {category.expanded && (
        <div className="p-1">
          {/* Select all/deselect all */}
          {category.sensors.length > 0 && onSelectAll && onDeselectAll && (
            <div className="flex items-center gap-2 px-2 py-1 text-xs text-[var(--text-muted)]">
              <button onClick={onSelectAll} className="hover:text-[var(--status-normal)] transition-colors">
                Seleccionar todos ({selectedCount}/{category.sensors.length})
              </button>
              {selectedCount > 0 && (
                <>
                  <span>|</span>
                  <button onClick={onDeselectAll} className="hover:text-[var(--text-secondary)] transition-colors">
                    Deseleccionar
                  </button>
                </>
              )}
            </div>
          )}

          {category.sensors.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] p-3 text-center">Sin sensores en este proceso</p>
          ) : hasEquipmentGroups ? (
            <>
              {/* Sensors grouped by equipment */}
              {Object.entries(sensorsWithEquipment).map(([equipmentName, sensorIds]) => (
                <div key={equipmentName} className="mb-1">
                  <div className="flex items-center gap-2 px-2 py-1 ml-2 border-l-2 border-[var(--border-subtle)]">
                    <svg className="w-3 h-3 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                    <span className="text-xs font-medium text-[var(--text-secondary)]">{equipmentName}</span>
                  </div>
                  <div className="ml-2 border-l-2 border-[var(--border-subtle)] pl-1">
                    {sensorIds.map((sensorId) => (
                      <SensorRow
                        key={sensorId}
                        sensorId={sensorId}
                        mapping={mapping[sensorId]}
                        isEditing={editingSensor === sensorId}
                        isDefaultSelected={defaultSelected.includes(sensorId)}
                        onEdit={() => onEditSensor(editingSensor === sensorId ? null : sensorId)}
                        onRemove={() => onRemoveSensor(sensorId)}
                        onUpdate={(updates) => onUpdateSensor(sensorId, updates)}
                        onToggleDefault={() => onToggleDefault(sensorId)}
                        categories={allCategories.filter((c) => c.id !== category.id)}
                        onMoveToCategory={(catId) => onMoveToCategory(catId, sensorId)}
                      />
                    ))}
                  </div>
                </div>
              ))}
              {/* Sensors without equipment */}
              {sensorsWithoutEquipment.map((sensorId) => (
                <SensorRow
                  key={sensorId}
                  sensorId={sensorId}
                  mapping={mapping[sensorId]}
                  isEditing={editingSensor === sensorId}
                  isDefaultSelected={defaultSelected.includes(sensorId)}
                  onEdit={() => onEditSensor(editingSensor === sensorId ? null : sensorId)}
                  onRemove={() => onRemoveSensor(sensorId)}
                  onUpdate={(updates) => onUpdateSensor(sensorId, updates)}
                  onToggleDefault={() => onToggleDefault(sensorId)}
                  categories={allCategories.filter((c) => c.id !== category.id)}
                  onMoveToCategory={(catId) => onMoveToCategory(catId, sensorId)}
                />
              ))}
            </>
          ) : (
            category.sensors.map((sensorId) =>
              mapping[sensorId] ? (
                <SensorRow
                  key={sensorId}
                  sensorId={sensorId}
                  mapping={mapping[sensorId]}
                  isEditing={editingSensor === sensorId}
                  isDefaultSelected={defaultSelected.includes(sensorId)}
                  onEdit={() => onEditSensor(editingSensor === sensorId ? null : sensorId)}
                  onRemove={() => onRemoveSensor(sensorId)}
                  onUpdate={(updates) => onUpdateSensor(sensorId, updates)}
                  onToggleDefault={() => onToggleDefault(sensorId)}
                  categories={isUncategorized ? allCategories : allCategories.filter((c) => c.id !== category.id)}
                  onMoveToCategory={(catId) => onMoveToCategory(catId, sensorId)}
                />
              ) : null
            )
          )}
        </div>
      )}
    </div>
  );
}
