import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, startOfDay, endOfDay } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { FileDown, X, ArrowUpRight } from 'lucide-react';
import { useTranslation } from '@/stores/languageStore';
import { Button } from '@/components/ui/Button';
import { FluviaBox, FluviaProse } from '@/components/anomaly-management/FluviaBox';
import { Segmented } from '@/components/anomaly-management/Segmented';
import { AlertsTable } from '@/components/network/AlertsTable';
import { buildEventReportModel } from '@/lib/eventReport';
import { downloadEventReportPdf } from '@/lib/eventReportPdf';
import { buildDayNarrative } from '@/lib/dayNarrative';
import { useInstallation } from '@/hooks/useInstallation';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import type { AnomalyEvent, CalendarDayEvents, CalendarEvent, NetworkAlert } from '@/types';

interface CalendarDayModalProps {
  dateKey: string;
  date: Date;
  events: CalendarDayEvents;
  /** Alertas de red de la jornada (ya filtradas por día). */
  alerts: NetworkAlert[];
  /** Episodios de anomalía de la jornada (para informe + narrativa). */
  dayAnomalyEvents: AnomalyEvent[];
  /** Episodios de la ventana de 7 días (para detección de patrón). */
  weekAnomalyEvents: AnomalyEvent[];
  onClose: () => void;
}

type Tab = 'resumen' | 'red';

/** El tipo de evento del calendario mapea a una clave de traducción existente. */
const TYPE_LABEL_KEY: Record<CalendarEvent['type'], 'anomaly' | 'emergency' | 'alert' | 'notice'> = {
  anomaly: 'anomaly',
  emergency: 'emergency',
  alert: 'alert',
  aviso: 'notice',
};

const TYPE_DOT: Record<CalendarEvent['type'], string> = {
  anomaly: 'bg-[var(--status-warning)]',
  emergency: 'bg-[var(--status-critical)]',
  alert: 'bg-[var(--status-advisory)]',
  aviso: 'bg-[var(--status-normal)]',
};

export function CalendarDayModal({
  dateKey,
  date,
  events,
  alerts,
  dayAnomalyEvents,
  weekAnomalyEvents,
  onClose,
}: CalendarDayModalProps) {
  const [tab, setTab] = useState<Tab>('resumen');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(false);
  const { installationName } = useInstallation();
  const session = useAuthStore((s) => s.session);
  const { t, language } = useTranslation();
  const locale = language === 'es' ? es : enUS;

  const panelRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);

  // Transform que colapsa el panel sobre la celda del día seleccionado: ese es
  // el origen/destino del zoom. Si la celda no está en el DOM (p. ej. tras un
  // cambio de mes) cae sobre un zoom suave centrado.
  const collapseToCell = useCallback(() => {
    const panel = panelRef.current;
    if (!panel) return 'scale(0.92)';
    const rect = panel.getBoundingClientRect();
    const cell = document.querySelector<HTMLElement>(`[data-cal-cell="${dateKey}"]`);
    if (!cell) {
      panel.style.transformOrigin = 'center';
      return 'scale(0.92)';
    }
    const c = cell.getBoundingClientRect();
    panel.style.transformOrigin = `${c.left + c.width / 2 - rect.left}px ${
      c.top + c.height / 2 - rect.top
    }px`;
    return `scale(${Math.max(c.width / rect.width, 0.05)})`;
  }, [dateKey]);

  // Apertura: arranca colapsado sobre la celda y se expande al panel completo.
  // useLayoutEffect aplica el estado inicial antes del primer paint (sin flash).
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const scrim = scrimRef.current;
    if (!panel) return;
    panel.style.transform = collapseToCell();
    panel.style.opacity = '0';
    if (scrim) scrim.style.opacity = '0';
    const raf = requestAnimationFrame(() => {
      panel.style.transition =
        'transform 300ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease-out';
      panel.style.transform = 'scale(1)';
      panel.style.opacity = '1';
      if (scrim) {
        scrim.style.transition = 'opacity 220ms ease-out';
        scrim.style.opacity = '1';
      }
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cierre animado: colapsa el panel de vuelta a la celda y luego desmonta.
  // El timeout es red de seguridad por si `transitionend` no llegara.
  const handleClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    const panel = panelRef.current;
    const scrim = scrimRef.current;
    if (!panel) {
      onClose();
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      onClose();
    };
    const collapsed = collapseToCell();
    panel.style.transition = 'transform 240ms cubic-bezier(0.4, 0, 1, 1), opacity 200ms ease-in';
    requestAnimationFrame(() => {
      panel.style.transform = collapsed;
      panel.style.opacity = '0';
      if (scrim) {
        scrim.style.transition = 'opacity 220ms ease-in';
        scrim.style.opacity = '0';
      }
    });
    panel.addEventListener(
      'transitionend',
      (e) => {
        if (e.propertyName === 'transform') finish();
      },
      { once: true },
    );
    window.setTimeout(finish, 320);
  }, [collapseToCell, onClose]);

  // Cerrar con Escape — el overlay y la X usan el mismo cierre animado.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleClose]);

  const narrative = useMemo(
    () => buildDayNarrative(date, events, dayAnomalyEvents, weekAnomalyEvents, language),
    [date, events, dayAnomalyEvents, weekAnomalyEvents, language],
  );

  // Eventos del día ordenados cronológicamente para los one-liners.
  const orderedEvents = useMemo(
    () => [...events.events].sort((a, b) => a.timestamp - b.timestamp),
    [events.events],
  );

  const linkFor = (type: CalendarEvent['type']) => (type === 'anomaly' ? '/anomalies' : '/network');

  // Informe PDF — misma estructura que anomaly-management, acotado al día.
  const exportPdf = async () => {
    if (!dayAnomalyEvents.length || exporting) return;
    setExporting(true);
    setExportError(false);
    try {
      const model = buildEventReportModel({
        installationName,
        generatedBy: session?.username ?? 'operador',
        generatedAt: Date.now(),
        rangeLabel: format(date, "d 'de' MMMM yyyy", { locale }),
        window: { from: startOfDay(date).getTime(), to: endOfDay(date).getTime() },
        events: dayAnomalyEvents,
        // El informe es contenido institucional en español: generamos la
        // narrativa en es (independiente del idioma de la UI) y sin **negrita**.
        narrative: buildDayNarrative(date, events, dayAnomalyEvents, weekAnomalyEvents, 'es').paragraphs.map(
          (p) => p.replace(/\*\*/g, ''),
        ),
      });
      await downloadEventReportPdf(model);
    } catch {
      setExportError(true);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        ref={scrimRef}
        className="fixed inset-0 z-modal-scrim bg-black/50 backdrop-blur-[2px]"
        onClick={handleClose}
        aria-hidden
      />

      {/* Panel — el zoom de apertura/cierre se aplica sobre este contenedor. */}
      <div
        ref={panelRef}
        className="fixed left-0 right-0 top-[64px] mx-auto z-modal w-[min(640px,92vw)] will-change-transform"
        role="dialog"
        aria-modal="true"
        aria-label={`${t('dayDetail')} · ${format(date, 'd/MM/yyyy')}`}
      >
        <div className="flex max-h-[82vh] flex-col overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-2xl">
          {/* Cabecera */}
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-3">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold capitalize text-[var(--text-primary)]">
                {format(date, language === 'es' ? "EEEE d 'de' MMMM yyyy" : 'EEEE d MMMM yyyy', {
                  locale,
                })}
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                {events.events.length}{' '}
                {events.events.length === 1 ? t('dayEventOne') : t('dayEventMany')}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Segmented<Tab>
                ariaLabel={t('dayDetailView')}
                value={tab}
                onChange={setTab}
                options={[
                  { value: 'resumen', label: t('daySummaryTab') },
                  { value: 'red', label: t('dayNetworkTab') },
                ]}
              />
              <button
                type="button"
                onClick={handleClose}
                aria-label={t('closeLabel')}
                className="flex h-7 w-7 items-center justify-center rounded-sm text-[var(--text-secondary)] hover:bg-[var(--bg-inset)] hover:text-[var(--text-primary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Cuerpo */}
          <div className="min-h-0 flex-1 overflow-auto p-4">
            {tab === 'resumen' ? (
              <div className="space-y-4">
                {/* Resumen FluvIA + patrón */}
                <FluviaBox context={t('fluviaDayContext')}>
                  <div className="space-y-2">
                    {narrative.paragraphs.map((p, i) => (
                      <FluviaProse key={i} text={p} />
                    ))}
                    {narrative.pattern && (
                      <div className="mt-2 rounded-sm border border-[var(--status-warning)]/40 bg-[var(--status-warning-muted)] px-3 py-2 text-xs">
                        <FluviaProse text={narrative.pattern} />
                      </div>
                    )}
                  </div>
                </FluviaBox>

                {/* One-liners de los eventos */}
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                    {t('dayEventsHeading')}
                  </h3>
                  <ul className="divide-y divide-[var(--border-subtle)] rounded-sm border border-[var(--border-subtle)]">
                    {orderedEvents.map((ev) => (
                      <li key={`${ev.type}-${ev.id}-${ev.timestamp}`}>
                        <Link
                          to={linkFor(ev.type)}
                          onClick={onClose}
                          className="flex items-center gap-2.5 px-3 py-2 text-xs transition-colors hover:bg-[var(--bg-inset)]"
                        >
                          <span className={cn('h-2 w-2 shrink-0 rounded-full', TYPE_DOT[ev.type])} />
                          <span className="font-readout text-[var(--text-muted)]">
                            {format(new Date(ev.timestamp), 'HH:mm')}
                          </span>
                          <span className="font-medium text-[var(--text-secondary)]">
                            {t(TYPE_LABEL_KEY[ev.type])}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-[var(--text-primary)]">
                            {ev.name}
                          </span>
                          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Informe PDF */}
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={exportPdf}
                    disabled={!dayAnomalyEvents.length || exporting}
                    title={dayAnomalyEvents.length ? t('reportPdfTitle') : t('reportPdfDisabledTitle')}
                  >
                    <FileDown className="mr-1.5 h-3.5 w-3.5" />
                    {exporting ? t('reportGenerating') : t('reportPdf')}
                  </Button>
                  {exportError && (
                    <span className="text-xs text-[var(--status-critical)]">{t('reportError')}</span>
                  )}
                  {!dayAnomalyEvents.length && (
                    <span className="text-xs text-[var(--text-muted)]">{t('noEpisodesDay')}</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.length > 0 ? (
                  <AlertsTable alerts={alerts} />
                ) : (
                  <p className="px-1 py-6 text-center text-xs text-[var(--text-muted)]">
                    {t('noNetworkAlertsDay')}
                  </p>
                )}
                <Link
                  to="/network"
                  onClick={onClose}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent-primary)] hover:underline"
                >
                  {t('viewAllInNetwork')}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
