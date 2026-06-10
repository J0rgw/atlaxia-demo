import { ChevronDown, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SensorMapping, SensorCategory } from '@/types/installation';
import { SensorSettingsRow } from './SensorSettingsRow';

interface SensorCategoryAccordionProps {
  category: SensorCategory;
  mapping: Record<string, SensorMapping>;
  defaultSelected: string[];
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleDefault: (sensorId: string) => void;
  onUpdateSensor: (sensorId: string, updates: Partial<SensorMapping>) => void;
  searchFilter: string;
  language: string;
}

export function SensorCategoryAccordion({
  category,
  mapping,
  defaultSelected,
  expanded,
  onToggleExpand,
  onToggleDefault,
  onUpdateSensor,
  searchFilter,
  language,
}: SensorCategoryAccordionProps) {
  const lowerFilter = searchFilter.toLowerCase();
  const filteredSensors = category.sensors.filter((id) => {
    if (!searchFilter) return true;
    const sensor = mapping[id];
    return (
      id.toLowerCase().includes(lowerFilter) ||
      sensor?.display_name?.toLowerCase().includes(lowerFilter) ||
      sensor?.thingsboard_key?.toLowerCase().includes(lowerFilter)
    );
  });

  if (filteredSensors.length === 0) return null;

  const defaultCount = filteredSensors.filter((id) => defaultSelected.includes(id)).length;
  const allDefault = defaultCount === filteredSensors.length;

  const handleToggleAll = () => {
    if (allDefault) {
      filteredSensors.forEach((id) => {
        if (defaultSelected.includes(id)) onToggleDefault(id);
      });
    } else {
      filteredSensors.forEach((id) => {
        if (!defaultSelected.includes(id)) onToggleDefault(id);
      });
    }
  };

  return (
    <div className="border border-[var(--border-subtle)] rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full bg-[var(--bg-inset)] px-4 py-2.5 flex items-center justify-between hover:bg-[var(--bg-inset)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <ChevronDown
            className={cn(
              'w-4 h-4 text-[var(--text-muted)] transition-transform',
              expanded && 'rotate-180'
            )}
          />
          <span className="font-medium text-[var(--text-primary)]">{category.name}</span>
        </div>
        <div className="flex items-center gap-3">
          {defaultCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-amber-500">
              <Star className="w-3 h-3 fill-current" />
              {defaultCount}
            </span>
          )}
          <span className="text-sm text-[var(--text-secondary)]">
            {filteredSensors.length} {language === 'es' ? 'sensores' : 'sensors'}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[var(--border-subtle)]">
          <div className="px-3 py-1.5 flex items-center justify-end border-b border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={handleToggleAll}
              className="text-xs text-[var(--accent-primary)] hover:text-[var(--accent-primary)] font-medium"
            >
              {allDefault
                ? (language === 'es' ? 'Deseleccionar todos' : 'Deselect all')
                : (language === 'es' ? 'Seleccionar todos' : 'Select all')}
            </button>
          </div>
          <div className="divide-y divide-[var(--border-subtle)]">
            {filteredSensors.map((sensorId) => {
              const sensor = mapping[sensorId];
              if (!sensor) return null;
              return (
                <SensorSettingsRow
                  key={sensorId}
                  sensorId={sensorId}
                  mapping={sensor}
                  isDefault={defaultSelected.includes(sensorId)}
                  onToggleDefault={() => onToggleDefault(sensorId)}
                  onUpdateMapping={(updates) => onUpdateSensor(sensorId, updates)}
                  language={language}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
