import { RadarChart, IndicatorsPanel } from '@/components/control';
import { Badge } from '@/components/ui/Badge';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { mockControlIndicators } from '@/data/mockData';

export function ControlPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Sistema de Control</h1>
        <Badge variant="info" className="bg-primary-100 text-primary-700">
          Sistema de Control
        </Badge>
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
