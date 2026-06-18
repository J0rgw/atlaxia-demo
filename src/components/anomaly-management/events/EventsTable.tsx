import { cn } from '@/lib/utils';
import { StatusDot } from '@/components/ui/StatusDot';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { criticalityFromLevel } from '@/lib/statusStyles';
import type { AnomalyEvent } from '@/types';
import { fmtDuration, fmtTimeShort } from './format';

interface EventsTableProps {
  events: AnomalyEvent[] | undefined;
  isLoading: boolean;
  selectedId: number | null;
  onSelect: (event: AnomalyEvent) => void;
}

const TH_BASE =
  'px-2 py-2 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap';

const MAX_SENSOR_CHIPS = 2;
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
 * Tabla densa de episodios (patrón AnomaliesTable/AlertsTable). Los filtros de
 * Sistema/Revisión viven en la toolbar (segmented); aquí los headers son texto.
 */
export function EventsTable({ events, isLoading, selectedId, onSelect }: EventsTableProps) {
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
            <th scope="col" className={cn(TH_BASE, 'text-center')}>Nivel pico</th>
            <th
              scope="col"
              className={cn(TH_BASE, 'text-right cursor-help underline decoration-dotted')}
              title="Nº de muestras de la racha con nivel de planta ≥ 4 (scoring punto a punto, 1 muestra/s)"
            >
              Detec.
            </th>
            <th scope="col" className={cn(TH_BASE, 'text-left')}>Sensores</th>
            <th scope="col" className={cn(TH_BASE, 'text-left')}>Sistema</th>
            <th scope="col" className={cn(TH_BASE, 'text-left')}>Revisión</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-subtle)]">
          {isLoading && events === undefined
            ? Array.from({ length: 6 }, (_, i) => (
                <tr key={i}>
                  <td colSpan={N_COLUMNS} className="px-2 py-2.5">
                    <Skeleton.Bar className="h-4 w-full" />
                  </td>
                </tr>
              ))
            : (events ?? []).map((event) => {
                const dot = rowStatus(event);
                const isOpen = event.closed_reason === null;
                return (
                  <tr
                    key={event.id}
                    onClick={() => onSelect(event)}
                    aria-current={selectedId === event.id ? true : undefined}
                    className={cn(
                      'cursor-pointer transition-colors',
                      selectedId === event.id
                        ? 'bg-[var(--status-advisory-muted)]'
                        : isOpen
                          ? 'bg-[var(--status-critical-muted)] hover:bg-[var(--bg-inset)]'
                          : 'hover:bg-[var(--bg-inset)]'
                    )}
                  >
                    <td className="px-2 py-2 w-6" title={dot.title}>
                      <StatusDot status={dot.status} size="sm" pulse={dot.pulse} />
                    </td>
                    {/* Activador real: la fila conserva su semántica de tabla
                        (`th scope="row"`); el botón es el punto de foco/teclado
                        que abre la investigación, no un `<tr role="button">`. */}
                    <th scope="row" className="px-2 py-2 text-left font-normal">
                      <button
                        type="button"
                        aria-label={`Abrir episodio #${event.id}, ${fmtTimeShort(event.tiempo_inicio)}`}
                        onClick={() => onSelect(event)}
                        className="rounded-sm text-xs font-readout text-[var(--text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
                      >
                        #{event.id}
                      </button>
                    </th>
                    <td className="px-2 py-2 text-xs font-readout text-[var(--text-primary)] whitespace-nowrap">
                      {fmtTimeShort(event.tiempo_inicio)}
                    </td>
                    <td className="px-2 py-2 text-xs font-readout text-[var(--text-secondary)] text-right whitespace-nowrap">
                      {isOpen ? 'en curso' : fmtDuration(event.duracion_segundos)}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <span className="inline-flex justify-center">
                        <Badge axis="criticality" value={criticalityFromLevel(event.nivel_pico)} />
                      </span>
                    </td>
                    <td className="px-2 py-2 text-xs font-readout text-[var(--text-secondary)] text-right">
                      {event.n_detecciones}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1 flex-wrap">
                        {event.sensores_involucrados.slice(0, MAX_SENSOR_CHIPS).map((s) => (
                          <Badge key={s} tag={s} />
                        ))}
                        {event.sensores_involucrados.length > MAX_SENSOR_CHIPS && (
                          <span className="text-[10px] font-readout text-[var(--text-muted)]">
                            +{event.sensores_involucrados.length - MAX_SENSOR_CHIPS}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <Badge axis="state" value={event.posible ? 'candidata' : 'confirmada'} />
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <Badge
                        axis="state"
                        value={
                          event.review_status === 'pending_review'
                            ? 'pendiente'
                            : event.review_status === 'confirmed_real'
                              ? 'confirmada-real'
                              : 'falso-positivo'
                        }
                      />
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
