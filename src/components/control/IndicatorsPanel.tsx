import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useTranslation } from '@/stores/languageStore';
import type { ControlIndicators } from '@/types';
import type { TranslationKey } from '@/stores/languageStore';

interface IndicatorsPanelProps {
  data: ControlIndicators;
}

type IndicatorKey = keyof Omit<ControlIndicators, 'timestamp'>;

const indicatorKeys: { key: IndicatorKey; labelKey: TranslationKey }[] = [
  { key: 'calidad', labelKey: 'quality' },
  { key: 'caudal', labelKey: 'flow' },
  { key: 'ciberseguridad', labelKey: 'cybersecurity' },
  { key: 'factorHumano', labelKey: 'humanFactor' },
  { key: 'temperatura', labelKey: 'temperature' },
];

export function IndicatorsPanel({ data }: IndicatorsPanelProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('currentValues')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {indicatorKeys.map(({ key, labelKey }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-secondary)]">{t(labelKey)}</span>
              <span className="text-lg font-semibold text-[var(--text-primary)] font-readout">
                {data[key].toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
