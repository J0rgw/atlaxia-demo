import { RadarChart, IndicatorsPanel } from '@/components/control';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { mockControlIndicators } from '@/data/mockData';

export function ControlPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Sistema de Control</h1>
        <span className="inline-flex items-center px-2 py-0.5 rounded-none text-xs font-medium font-readout bg-[var(--status-advisory-muted)] text-[var(--status-advisory)]">
          Sistema de Control
        </span>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <ErrorBoundary level="section">
            <RadarChart data={mockControlIndicators} />
          </ErrorBoundary>
        </div>
        <div>
          <ErrorBoundary level="section">
            <IndicatorsPanel data={mockControlIndicators} />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
