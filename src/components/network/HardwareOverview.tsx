import { Monitor, Cpu, Router, Network, Server } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useTranslation } from '@/stores/languageStore';
import type { NetworkDevice } from '@/types';

interface HardwareOverviewProps {
  devices: NetworkDevice[];
}

const typeIcons = {
  PC: Monitor,
  PLC: Cpu,
  Router: Router,
  Switch: Network,
  SCADA: Server,
};

export function HardwareOverview({ devices }: HardwareOverviewProps) {
  const { t } = useTranslation();
  const counts = devices.reduce(
    (acc, device) => {
      acc[device.type] = (acc[device.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>{t('hardwareDevices')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-around">
          {Object.entries(typeIcons).map(([type, Icon]) => (
            <div key={type} className="flex flex-col items-center gap-1">
              <div className="p-2 bg-[var(--bg-inset)] rounded-lg">
                <Icon className="w-6 h-6 text-[var(--text-secondary)]" />
              </div>
              <span className="text-xs text-[var(--text-secondary)]">{type}</span>
              <span className="text-lg font-semibold text-[var(--text-primary)]">
                {counts[type] || 0}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
