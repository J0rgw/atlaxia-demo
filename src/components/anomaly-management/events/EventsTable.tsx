import { cn } from '@/lib/utils';
import { StatusDot } from '@/components/ui/StatusDot';
import { Skeleton } from '@/components/ui/Skeleton';
import { PLANT_LEVEL_CONFIG, REVIEW_STATUS_CONFIG } from '@/lib/statusStyles';
import type { AnomalyEvent, AnomalyEventFilters } from '@/types';
import { fmtDuration, fmtTimeShort } from './format';
import { HeaderFilter } from './HeaderFilter';
import { POSIBLE_OPTIONS, REVIEW_OPTIONS } from './filterOptions';

interface EventsTableProps {
  events: AnomalyEvent[] | undefined;
  isLoading: boolean;
  filters: AnomalyEventFilters;
  onFiltersChange: (filters: AnomalyEventFilters) => void;
  selectedId: number | null;
  onSelect: (event: AnomalyEvent) => void;
}

const TH_BASE =
  'px-3 py-2 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap';

const MAX_SENSOR_CHIPS = 3;
const N_COLUMNS = 9;

function rowStatus(event: AnomalyEvent) {
  if (event.closed_reason === null) {
    return { status: 'error' as const, pulse: true, title: 'Episodio en curso' };
  }
  if (event.closed_reason === 'startup_sweep') {
    return { status: 'warning' as const, pulse: false, title: 'Cerrado por sweep de arranque' };
  }
  return { status: 'offline' as const, pulse: false, title: 'Cerrado (guarda expirada)' };
}

/**
 * Tabla densa de episodios (patrón AnomaliesTable/AlertsTable) con los
 * filtros integrados en los headers de columna, estilo data-grid.
 */
export function EventsTable({
  events,
  isLoading,
  filters,
  onFiltersChange,
  selectedId,
  onSelect,
}: EventsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <caption className="sr-only">
          Registro de episodios de anomalía; activa una fila para abrir su investigación.
        </caption>
        <thead>
          <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-inset)]">
            <th scope="col" className={cn(TH_BASE, 'w-6')}>
              <span className="sr-only">Estado</span>
            </th>
            <th scope="col" className={cn(TH_BASE, 'text-left')}>ID</th>
            <th scope="col" className={cn(TH_BASE, 'text-left')}>Inicio</th>
            <th scope="col" className={cn(TH_BASE, 'text-right')}>Duración</th>
            <th scope="col" className={cn(TH_BASE, 'text-right')}>Nivel pico</th>
            <th
              scope="col"
              className={cn(TH_BASE, 'text-right cursor-help underline decoration-dotted')}
              title="Nº de muestras de la racha con nivel de planta ≥ 4 (scoring punto a punto, 1 muestra/s)"
            >
              Detec.
            </th>
            <th scope="col" className={cn(TH_BASE, 'text-left')}>Sensores</th>
            <th scope="col" className={cn(TH_BASE, 'text-left')}>
              <HeaderFilter
                label="Sistema"
                options={POSIBLE_OPTIONS}
                value={filters.posible}
                defaultValue="all"
                onChange={(posible) => onFiltersChange({ ...filters, posible })}
              />
            </th>
            <th scope="col" className={cn(TH_BASE, 'text-left')}>
              <HeaderFilter
                label="Revisión"
                options={REVIEW_OPTIONS}
                value={filters.review_status}
                defaultValue="all"
                onChange={(review_status) => onFiltersChange({ ...filters, review_status })}
              />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-subtle)]">
          {isLoading && events === undefined
            ? Array.from({ length: 6 }, (_, i) => (
                <tr key={i}>
                  <td colSpan={N_COLUMNS} className="px-3 py-2.5">
                    <Skeleton.Bar className="h-4 w-full" />
                  </td>
                </tr>
              ))
            : (events ?? []).map((event) => {
                const dot = rowStatus(event);
                const level = PLANT_LEVEL_CONFIG[event.nivel_pico] ?? PLANT_LEVEL_CONFIG[0];
                const review = REVIEW_STATUS_CONFIG[event.review_status];
                const isOpen = event.closed_reason === null;
                return (
                  <tr
                    key={event.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Abrir episodio #${event.id}, ${fmtTimeShort(event.tiempo_inicio)}`}
                    onClick={() => onSelect(event)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelect(event);
                      }
                    }}
                    className={cn(
                      'cursor-pointer transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-primary)]/40',
                      selectedId === event.id
                        ? 'bg-[var(--status-advisory-muted)]'
                        : isOpen
                          ? 'bg-[var(--status-critical-muted)] hover:bg-[var(--bg-inset)]'
                          : 'hover:bg-[var(--bg-inset)]'
                    )}
                  >
                    <td className="px-3 py-2 w-6" title={dot.title}>
                      <StatusDot status={dot.status} size="sm" pulse={dot.pulse} />
                    </td>
                    <td className="px-3 py-2 text-xs font-readout text-[var(--text-secondary)]">
                      #{event.id}
                    </td>
                    <td className="px-3 py-2 text-xs font-readout text-[var(--text-primary)] whitespace-nowrap">
                      {fmtTimeShort(event.tiempo_inicio)}
                    </td>
                    <td className="px-3 py-2 text-xs font-readout text-[var(--text-secondary)] text-right whitespace-nowrap">
                      {isOpen ? 'en curso' : fmtDuration(event.duracion_segundos)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span
                        className={cn(
                          'inline-flex px-2 py-0.5 text-xs font-medium font-readout rounded-none',
                          level.badge
                        )}
                      >
                        {level.name}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs font-readout text-[var(--text-secondary)] text-right">
                      {event.n_detecciones}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1 flex-wrap">
                        {event.sensores_involucrados.slice(0, MAX_SENSOR_CHIPS).map((s) => (
                          <span
                            key={s}
                            className="px-1.5 py-0.5 text-[10px] font-readout bg-[var(--bg-inset)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                          >
                            {s}
                          </span>
                        ))}
                        {event.sensores_involucrados.length > MAX_SENSOR_CHIPS && (
                          <span className="text-[10px] font-readout text-[var(--text-muted)]">
                            +{event.sensores_involucrados.length - MAX_SENSOR_CHIPS}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span
                        className={cn(
                          'inline-flex px-2 py-0.5 text-xs font-medium rounded-none',
                          event.posible
                            ? 'bg-[var(--status-warning-muted)] text-[var(--status-warning)]'
                            : 'bg-[var(--status-critical-muted)] text-[var(--status-critical)]'
                        )}
                      >
                        {event.posible ? 'Candidata' : 'Confirmada'}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span
                        className={cn('inline-flex px-2 py-0.5 text-xs font-medium rounded-none', review.badge)}
                      >
                        {review.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
        </tbody>
      </table>
      {!isLoading && (events?.length ?? 0) === 0 && (
        <div className="py-10 text-center text-sm text-[var(--text-muted)]">
          Sin episodios en el rango seleccionado.
        </div>
      )}
    </div>
  );
}
