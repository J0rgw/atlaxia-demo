import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { PlantSurvey } from '@/types/plantSurvey';

type TabId = 'json' | 'thingsboard';

// See SensorRow.tsx for the rationale — same palette so the same sensor type
// reads the same in both panels.
const TYPE_COLORS: Record<string, string> = {
  FIT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  LIT: 'bg-[var(--status-normal-muted)] text-[var(--status-normal)]',
  AIT: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  PIT: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  TIT: 'bg-[var(--status-critical-muted)] text-[var(--status-critical)]',
  MV: 'bg-[var(--bg-inset)] text-[var(--text-secondary)]',
  P: 'bg-[var(--bg-inset)] text-[var(--text-secondary)]',
  BLW: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  DOS: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

function getTypeColor(type: string): string {
  return TYPE_COLORS[type] || 'bg-[var(--bg-inset)] text-[var(--text-secondary)]';
}

interface SensorSourceTabsProps {
  plantSurvey: PlantSurvey | null;
  availableSensors: string[];
  availableSensorsLoading: boolean;
  addedSensorKeys: Set<string>;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onAddSensor: (tbKey: string) => void;
  onAddAllFromProcess: (processIndex: number) => void;
}

export function SensorSourceTabs({
  plantSurvey,
  availableSensors,
  availableSensorsLoading,
  addedSensorKeys,
  searchTerm,
  onSearchChange,
  onAddSensor,
  onAddAllFromProcess,
}: SensorSourceTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>(plantSurvey ? 'json' : 'thingsboard');
  const [visibleCount, setVisibleCount] = useState(50);
  const [expandedProcesses, setExpandedProcesses] = useState<Set<number>>(new Set());

  useEffect(() => {
    setVisibleCount(50);
  }, [searchTerm]);

  // If survey loads, switch to JSON tab
  useEffect(() => {
    if (plantSurvey) setActiveTab('json');
  }, [plantSurvey]);

  const toggleProcess = (idx: number) => {
    setExpandedProcesses((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const plant = plantSurvey?.plants[0];
  const hasJson = !!plant;

  // Filter TB sensors
  const filteredTbSensors = availableSensors.filter(
    (s) => s.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="border border-[var(--border-subtle)] rounded-lg overflow-hidden flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-[var(--border-subtle)] bg-[var(--bg-inset)]">
        {hasJson && (
          <button
            onClick={() => setActiveTab('json')}
            className={cn(
              'flex-1 px-3 py-2.5 text-sm font-medium transition-colors relative',
              activeTab === 'json'
                ? 'text-[var(--status-normal)] bg-[var(--bg-surface)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            )}
          >
            Encuesta (JSON)
            {activeTab === 'json' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--status-normal)]" />
            )}
          </button>
        )}
        <button
          onClick={() => setActiveTab('thingsboard')}
          className={cn(
            'flex-1 px-3 py-2.5 text-sm font-medium transition-colors relative',
            activeTab === 'thingsboard'
              ? 'text-[var(--status-normal)] bg-[var(--bg-surface)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          )}
        >
          ThingsBoard
          {activeTab === 'thingsboard' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--status-normal)]" />
          )}
        </button>
      </div>

      {/* Search */}
      <div className="p-2 border-b border-[var(--border-subtle)]">
        <input
          id="sensor-source-search"
          type="text"
          placeholder="Buscar sensor..."
          aria-label="Buscar sensor"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-3 py-1.5 text-sm bg-[var(--bg-inset)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] border border-[var(--border-default)] rounded-md focus:ring-2 focus:ring-[var(--accent-primary)]/30 focus:border-[var(--accent-primary)] outline-none transition-colors"
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {activeTab === 'json' && plant ? (
          <div className="space-y-1">
            {plant.processes.map((process, idx) => {
              const filteredSensors = process.sensors.filter(
                (s) => !searchTerm || s.sensor_name.toLowerCase().includes(searchTerm.toLowerCase()) || (s.sensor_alias || '').toLowerCase().includes(searchTerm.toLowerCase())
              );
              if (filteredSensors.length === 0) return null;

              const allAdded = filteredSensors.every((s) => addedSensorKeys.has(s.sensor_name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')));
              const expanded = expandedProcesses.has(idx);

              return (
                <div key={idx} className="rounded-lg border border-[var(--border-subtle)] overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-inset)]">
                    <button onClick={() => toggleProcess(idx)} className="flex-1 flex items-center gap-2 text-left">
                      <svg
                        className={cn('w-3.5 h-3.5 text-[var(--text-muted)] transition-transform duration-150', expanded && 'rotate-90')}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="text-sm font-medium text-[var(--text-primary)]">{process.process_name}</span>
                      <span className="text-xs text-[var(--text-muted)]">{filteredSensors.length}</span>
                    </button>
                    {!allAdded && (
                      <button
                        onClick={() => onAddAllFromProcess(idx)}
                        className="text-xs text-[var(--status-normal)] hover:opacity-80 px-2 py-0.5 rounded hover:bg-[var(--status-normal-muted)] transition-colors whitespace-nowrap"
                      >
                        + Todos
                      </button>
                    )}
                  </div>
                  {expanded && (
                    <div className="p-1">
                      {filteredSensors.map((sensor) => {
                        const sensorId = sensor.sensor_name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
                        const isAdded = addedSensorKeys.has(sensorId);
                        return (
                          <button
                            key={sensor.sensor_name}
                            onClick={() => !isAdded && onAddSensor(sensor.sensor_name)}
                            disabled={isAdded}
                            className={cn(
                              'w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors text-left',
                              isAdded
                                ? 'opacity-40 cursor-not-allowed'
                                : 'hover:bg-[var(--status-normal-muted)] hover:text-[var(--status-normal)]'
                            )}
                          >
                            {sensor.sensor_type && (
                              <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold leading-none ${getTypeColor(sensor.sensor_type)}`}>
                                {sensor.sensor_type}
                              </span>
                            )}
                            <span className="flex-1 truncate">{sensor.sensor_alias || sensor.sensor_name}</span>
                            {isAdded ? (
                              <svg className="w-4 h-4 text-[var(--status-normal)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 text-[var(--text-muted)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : activeTab === 'thingsboard' ? (
          <>
            {availableSensorsLoading ? (
              <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Cargando sensores...
              </div>
            ) : filteredTbSensors.length === 0 ? (
              <div className="text-center text-[var(--text-muted)] py-8 text-sm">
                {searchTerm ? 'No se encontraron sensores' : availableSensors.length === 0 ? 'No hay sensores en ThingsBoard' : 'Todos los sensores coincidentes ya fueron agregados'}
              </div>
            ) : (
              <div className="space-y-0.5">
                {filteredTbSensors.slice(0, visibleCount).map((sensor) => {
                  const sensorId = sensor.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
                  const isAdded = addedSensorKeys.has(sensorId);
                  return (
                    <button
                      key={sensor}
                      onClick={() => !isAdded && onAddSensor(sensor)}
                      disabled={isAdded}
                      className={cn(
                        'w-full text-left px-3 py-1.5 text-sm rounded transition-colors flex items-center justify-between',
                        isAdded
                          ? 'opacity-40 cursor-not-allowed'
                          : 'hover:bg-[var(--status-normal-muted)] hover:text-[var(--status-normal)]'
                      )}
                    >
                      <span className="truncate">{sensor}</span>
                      {isAdded && (
                        <svg className="w-4 h-4 text-[var(--status-normal)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  );
                })}
                {filteredTbSensors.length > visibleCount && (
                  <div className="px-3 py-2 border-t border-[var(--border-subtle)] mt-1">
                    <p className="text-xs text-[var(--text-muted)]">
                      Mostrando {visibleCount} de {filteredTbSensors.length}
                    </p>
                    <button
                      onClick={() => setVisibleCount((prev) => Math.min(prev + 50, filteredTbSensors.length))}
                      className="text-xs text-[var(--status-normal)] hover:opacity-80 font-medium"
                    >
                      Mostrar 50 mas
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-[var(--text-muted)] py-8 text-sm">
            Sube un archivo JSON para ver los sensores de la encuesta
          </div>
        )}
      </div>
    </div>
  );
}
