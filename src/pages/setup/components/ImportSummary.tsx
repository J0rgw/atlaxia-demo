import type { ParseStats } from '@/lib/plantSurveyParser';

// See SensorRow.tsx — kept in sync intentionally.
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

interface ImportSummaryProps {
  plantName: string;
  clientName: string;
  stats: ParseStats;
  onReupload: () => void;
  onClear: () => void;
}

export function ImportSummary({ plantName, clientName, stats, onReupload, onClear }: ImportSummaryProps) {
  return (
    <div className="bg-[var(--status-normal-muted)] border border-[var(--status-normal)] rounded-md p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--status-normal-muted)] flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-[var(--status-normal)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-[var(--text-primary)]">{plantName}</p>
            <p className="text-xs text-[var(--text-secondary)]">{clientName}</p>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-[var(--text-secondary)]">
              <span>{stats.processCount} procesos</span>
              <span className="text-[var(--text-muted)]">|</span>
              <span>{stats.totalSensors} sensores</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onReupload}
            className="text-xs text-[var(--status-normal)] hover:opacity-80 px-2 py-1 rounded hover:bg-[var(--status-normal-muted)] transition-colors"
          >
            Re-subir
          </button>
          <button
            onClick={onClear}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--status-critical)] px-2 py-1 rounded hover:bg-[var(--status-critical-muted)] transition-colors"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Type badges */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        {Object.entries(stats.bySensorType).map(([type, count]) => (
          <span
            key={type}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${getTypeColor(type)}`}
          >
            {type}
            <span className="opacity-70">{count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
