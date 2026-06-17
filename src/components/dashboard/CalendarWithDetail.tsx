import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { CalendarGrid } from './CalendarGrid';
import { CalendarDayModal } from './CalendarDayModal';
import { getDateKey } from '@/lib/calendarUtils';
import { useAnomalyEvents } from '@/hooks/useAnomalyEvents';
import type {
  AnomalyData,
  AnomalyEventFilters,
  CalendarDayEvents,
  NetworkAlert,
} from '@/types';

interface CalendarWithDetailProps {
  anomalies: AnomalyData[];
  alerts: NetworkAlert[];
}

interface SelectedDay {
  date: Date;
  dateKey: string;
  events: CalendarDayEvents;
}

const BASE_FILTER = { posible: 'all', review_status: 'all' } as const;

/**
 * Calendario del Resumen con detalle de jornada: al pulsar un día con eventos,
 * abre un modal con el resumen FluvIA del día, los eventos, el informe PDF
 * acotado a la jornada y las alertas de red. El propio modal gestiona su
 * animación de apertura/cierre (zoom desde/hacia la celda del día).
 */
export function CalendarWithDetail({ anomalies, alerts }: CalendarWithDetailProps) {
  const [selected, setSelected] = useState<SelectedDay | null>(null);

  // Ventana de la jornada y de los 7 días previos para narrativa + patrón.
  // Los hooks son incondicionales; cuando no hay día seleccionado caen sobre
  // "hoy" (el resultado no se usa hasta que se abre el modal).
  const refDate = selected?.date ?? null;

  const dayFilter = useMemo<AnomalyEventFilters>(() => {
    const d = refDate ?? new Date();
    return {
      range: 'custom',
      customFrom: startOfDay(d).toISOString(),
      customTo: endOfDay(d).toISOString(),
      ...BASE_FILTER,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.dateKey]);

  const weekFilter = useMemo<AnomalyEventFilters>(() => {
    const d = refDate ?? new Date();
    return {
      range: 'custom',
      customFrom: startOfDay(subDays(d, 6)).toISOString(),
      customTo: endOfDay(d).toISOString(),
      ...BASE_FILTER,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.dateKey]);

  const dayQuery = useAnomalyEvents(dayFilter);
  const weekQuery = useAnomalyEvents(weekFilter);

  // Alertas de red de la jornada seleccionada.
  const dayAlerts = useMemo(() => {
    if (!selected) return [];
    return alerts.filter((a) => getDateKey(new Date(a.timestamp)) === selected.dateKey);
  }, [alerts, selected]);

  const handleDay = (date: Date, events: CalendarDayEvents | null) => {
    if (!events) return; // solo días con eventos
    setSelected({ date, dateKey: getDateKey(date), events });
  };

  // Desmonta el modal. La animación de salida la ejecuta el propio modal antes
  // de invocar este callback, así que aquí solo limpiamos el estado.
  const closeModal = () => setSelected(null);

  return (
    <>
      <CalendarGrid
        anomalies={anomalies}
        alerts={alerts}
        onDayClick={handleDay}
      />

      {selected &&
        createPortal(
          <CalendarDayModal
            dateKey={selected.dateKey}
            date={selected.date}
            events={selected.events}
            alerts={dayAlerts}
            dayAnomalyEvents={dayQuery.data?.events ?? []}
            weekAnomalyEvents={weekQuery.data?.events ?? []}
            onClose={closeModal}
          />,
          document.body,
        )}
    </>
  );
}
