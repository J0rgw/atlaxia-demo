import { useCallback, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { ClipboardList } from 'lucide-react';
import { useInstallationStore } from '@/stores/installationStore';
import { JsonUploadZone } from '@/pages/setup/components/JsonUploadZone';
import { parsePlantSurvey } from '@/lib/plantSurveyParser';
import type { PlantSurvey } from '@/types/plantSurvey';
import type { LocalInstallationConfig } from './InstallationConfigTab';

interface Props {
  localConfig: LocalInstallationConfig;
  setLocalConfig: React.Dispatch<React.SetStateAction<LocalInstallationConfig | null>>;
  language: string;
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className="text-sm text-[var(--text-primary)] mt-0.5 break-words">
        {value === undefined || value === null || value === '' ? '—' : value}
      </p>
    </div>
  );
}

export function PlantSurveySection({ setLocalConfig, language }: Props) {
  const config = useInstallationStore((s) => s.config);
  const survey = config?.plant_survey_data ?? {};
  const plant = survey.plant_info;
  const meta = survey.survey_metadata;

  const [importedSummary, setImportedSummary] = useState<string | null>(null);

  const handleSurveyImport = useCallback(
    (raw: PlantSurvey) => {
      try {
        const result = parsePlantSurvey(raw);
        setLocalConfig((prev) => {
          if (!prev) return prev;
          return { ...prev, sensors_config: result.config };
        });
        setImportedSummary(
          `${result.plantName}: ${result.stats.totalSensors} ${language === 'es' ? 'sensores en' : 'sensors in'} ${result.stats.processCount} ${language === 'es' ? 'procesos' : 'processes'}`,
        );
      } catch (err) {
        setImportedSummary(`Error: ${(err as Error).message}`);
      }
    },
    [setLocalConfig, language],
  );

  if (!config) {
    return (
      <Card padding="lg" className="text-center">
        <ClipboardList className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
        <p className="text-[var(--text-secondary)]">
          {language === 'es' ? 'No hay configuracion cargada' : 'No configuration loaded'}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card padding="lg">
        <h3 className="font-semibold text-[var(--text-primary)] mb-1">
          {language === 'es' ? 'Cliente y planta' : 'Client and plant'}
        </h3>
        <p className="text-xs text-[var(--text-secondary)] mb-4">
          {language === 'es'
            ? 'Datos importados del survey de planta. Solo lectura.'
            : 'Data imported from the plant survey. Read-only.'}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label={language === 'es' ? 'Cliente' : 'Client'}
            value={survey.client_name}
          />
          <Field
            label={language === 'es' ? 'Planta' : 'Plant'}
            value={plant?.plant_name}
          />
          <Field
            label={language === 'es' ? 'Direccion' : 'Address'}
            value={plant?.location?.address}
          />
          <Field
            label={language === 'es' ? 'Municipio' : 'Municipality'}
            value={plant?.location?.municipality}
          />
          <Field
            label={language === 'es' ? 'Provincia' : 'Province'}
            value={plant?.location?.province}
          />
          <Field
            label={language === 'es' ? 'Pais' : 'Country'}
            value={plant?.location?.country}
          />
        </div>
      </Card>

      <Card padding="lg">
        <h3 className="font-semibold text-[var(--text-primary)] mb-3">SCADA</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label={language === 'es' ? 'Fabricante' : 'Vendor'} value={plant?.scada_system?.vendor} />
          <Field label={language === 'es' ? 'Protocolo' : 'Protocol'} value={plant?.scada_system?.protocol} />
          <Field label={language === 'es' ? 'Historian' : 'Historian'} value={plant?.scada_system?.historian} />
          <Field
            label={language === 'es' ? 'Exportacion' : 'Export capability'}
            value={plant?.scada_system?.export_capability}
          />
        </div>
      </Card>

      <Card padding="lg">
        <h3 className="font-semibold text-[var(--text-primary)] mb-3">
          {language === 'es' ? 'Metadatos del survey' : 'Survey metadata'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label={language === 'es' ? 'Fecha del survey' : 'Survey date'} value={meta?.survey_date} />
          <Field label={language === 'es' ? 'Tecnico' : 'Technician'} value={meta?.technician_name} />
          <Field
            label={language === 'es' ? 'Contacto del cliente' : 'Client contact'}
            value={meta?.client_contact_name}
          />
          <Field
            label={language === 'es' ? 'Rol del contacto' : 'Contact role'}
            value={meta?.client_contact_role}
          />
        </div>
        {meta?.notes && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              {language === 'es' ? 'Notas' : 'Notes'}
            </p>
            <p className="text-sm text-[var(--text-primary)] mt-1 whitespace-pre-line">{meta.notes}</p>
          </div>
        )}
      </Card>

      <Card padding="lg">
        <h3 className="font-semibold text-[var(--text-primary)] mb-1">
          {language === 'es' ? 'Reimportar survey' : 'Re-import survey'}
        </h3>
        <p className="text-xs text-[var(--text-secondary)] mb-3">
          {language === 'es'
            ? 'Sube un JSON nuevo para regenerar sensors_config. Pulsa Guardar Cambios para persistir.'
            : 'Upload a new JSON to regenerate sensors_config. Click Save Changes to persist.'}
        </p>
        <JsonUploadZone onImport={handleSurveyImport} />
        {importedSummary && (
          <p className="mt-2 text-xs text-[var(--text-secondary)]">
            {language === 'es' ? 'Importado: ' : 'Imported: '}
            <span className="text-[var(--text-primary)]">{importedSummary}</span>
          </p>
        )}
      </Card>
    </div>
  );
}
