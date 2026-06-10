import type { TranslationKey } from '@/stores/languageStore';
import type { KPIData, AnomalyData, EventLog as EventLogType } from '@/types';
import type { ProcessAreaStatus, ActiveAlarm } from '@/types/industrial';
import type { InferenceMessage, LevelName, InferenceHealthSummary, HealthState } from '@/types/inference';
import { levelToVariant } from '@/lib/inferenceLevel';

type TranslationFn = (key: TranslationKey) => string;

// --- KPI transforms ---

interface AlarmsData {
  total_alarms: number;
  by_priority: Record<string, number>;
}

interface DevicesOnlineData {
  online: number;
  total: number;
  /** True when the freshness-based hook has at least one timestamp recorded. */
  ready: boolean;
}

const PIPELINE_STATE_LABEL: Record<HealthState, TranslationKey> = {
  ok: 'pipelineOk',
  warmup: 'pipelineWarmup',
  degraded: 'pipelineDegraded',
  outage: 'pipelineOutage',
};

const PIPELINE_STATE_VARIANT: Record<HealthState, KPIData['variant']> = {
  ok: 'green',
  warmup: 'sky',
  degraded: 'warning',
  outage: 'critical',
};

function formatAge(seconds: number | null | undefined): string | undefined {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return undefined;
  if (seconds < 60) return `hace ${Math.round(seconds)}s`;
  if (seconds < 3600) return `hace ${Math.round(seconds / 60)}m`;
  return `hace ${Math.round(seconds / 3600)}h`;
}

/**
 * Pipeline health KPI — replaces the legacy "Estado del Sistema 59%" card
 * (a meaningless average of fake indicators) with a real ETL→Inference
 * liveness signal. Driven by /api/inference/health-summary.
 */
export function buildPipelineHealthKPI(
  health: InferenceHealthSummary,
  t: TranslationFn,
): KPIData {
  const stateKey = PIPELINE_STATE_LABEL[health.state] ?? 'pipelineUnknown';
  const age = formatAge(health.last_webhook_age_seconds);
  const modelsLabel = `${health.models_loaded_count} ${health.models_loaded_count === 1 ? 'modelo' : 'modelos'}`;

  return {
    id: 'health',
    icon: 'efficiency',
    title: t('systemStatus'),
    titleKey: 'systemStatus',
    value: t(stateKey),
    valueSecondary: age,
    subtitle: modelsLabel,
    variant: PIPELINE_STATE_VARIANT[health.state] ?? 'neutral',
  };
}

const PRIORITY_LABELS: [string, string][] = [
  ['EMERGENCY', 'emergencia'],
  ['HIGH', 'alta'],
  ['MEDIUM', 'media'],
  ['LOW', 'baja'],
];

export function buildAlarmsKPI(data: AlarmsData, t: TranslationFn): KPIData {
  const { total_alarms, by_priority } = data;
  const parts = PRIORITY_LABELS
    .filter(([key]) => by_priority[key] > 0)
    .map(([key, label]) => `${by_priority[key]} ${label}`);

  return {
    id: 'alarms',
    icon: 'alerts',
    title: t('activeAlarms'),
    titleKey: 'activeAlarms',
    value: String(total_alarms),
    subtitle: total_alarms > 0 ? parts.join(', ') : t('noAlarms'),
    variant: total_alarms === 0 ? 'green' : 'neutral',
  };
}

export function buildCriticalityKPI(
  msg: InferenceMessage | null,
  t: TranslationFn,
): KPIData {
  if (!msg || !msg.show_verdict || msg.level_global < 0) {
    return {
      id: 'criticality',
      icon: 'alerts',
      title: t('criticalityLevel'),
      titleKey: 'criticalityLevel',
      value: msg && !msg.show_verdict ? t('calibrationPending') : '—',
      subtitle: msg?.model_name,
      variant: 'neutral',
    };
  }
  const levelName: LevelName = msg.level_global_name;
  return {
    id: 'criticality',
    icon: 'alerts',
    title: t('criticalityLevel'),
    titleKey: 'criticalityLevel',
    value: `${t('level')} ${msg.level_global}`,
    valueSecondary: t(levelName as TranslationKey),
    valueSecondaryKey: levelName as TranslationKey,
    subtitle: msg.model_name,
    variant: levelToVariant(msg.level_global),
  };
}

export function buildDevicesKPI(
  data: DevicesOnlineData,
  t: TranslationFn,
): KPIData {
  const { online, total, ready } = data;
  const allOnline = ready && online === total && total > 0;
  const noneOnline = ready && online === 0 && total > 0;
  const variant: KPIData['variant'] = !ready
    ? 'neutral'
    : noneOnline
      ? 'critical'
      : allOnline
        ? 'green'
        : 'warning';

  const subtitle = ready
    ? allOnline
      ? `${total} sensores`
      : `${total - online} ${t('offline')}`
    : undefined;

  return {
    id: 'devices',
    icon: 'units',
    title: t('devicesOnline'),
    titleKey: 'devicesOnline',
    value: `${online} / ${total}`,
    subtitle,
    variant,
  };
}

// --- Event log transforms ---

interface AlarmItem {
  sensor_tag: string;
  description: string;
  timestamp: number;
  priority: string;
}

interface AlertItem {
  id: number | string;
  name: string;
  timestamp: number;
  type: string;
}

const TIME_FORMAT: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
};

const ALERT_STATUS_MAP: Record<string, 'success' | 'error' | 'pending'> = {
  Emergencia: 'error',
  Alerta: 'pending',
  Aviso: 'success',
};

export function buildEventLog(
  alarms: AlarmItem[] | undefined,
  networkAlerts: AlertItem[] | undefined,
  maxItems = 8,
): EventLogType[] {
  const items: EventLogType[] = [];

  if (alarms) {
    for (const alarm of alarms) {
      items.push({
        id: `alarm-${alarm.sensor_tag}`,
        name: alarm.description,
        timestamp: new Date(alarm.timestamp).toLocaleTimeString(undefined, TIME_FORMAT),
        status: alarm.priority === 'EMERGENCY' || alarm.priority === 'HIGH' ? 'error' : 'pending',
        statusText: alarm.priority,
      });
    }
  }

  if (networkAlerts) {
    for (const alert of networkAlerts.slice(0, 10)) {
      items.push({
        id: `net-${alert.id}`,
        name: alert.name,
        timestamp: new Date(alert.timestamp).toLocaleTimeString(undefined, TIME_FORMAT),
        status: ALERT_STATUS_MAP[alert.type] || 'pending',
        statusText: alert.type,
      });
    }
  }

  items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return items.slice(0, maxItems);
}

// --- Calendar transforms ---

export function buildCalendarAnomalies(
  anomaliesData: { anomalies: AnomalyData[]; timestamp: number } | undefined,
): AnomalyData[] {
  if (!anomaliesData?.anomalies) return [];
  return anomaliesData.anomalies
    .filter((a) => a.isAnomaly)
    .map((a) => ({ ...a, timestamp: anomaliesData.timestamp }));
}

// --- Process flow transforms ---

interface ProcessAreaAPI {
  id: string;
  name: string;
  status: string;
  active_alarms?: Array<{
    sensor_tag: string;
    level: string;
    priority: string;
    value: number;
    limit: number;
    timestamp: number;
    acknowledged: boolean;
    description: string;
    process_area: string;
    suggested_action?: string;
  }>;
  sensor_count: number;
  sensors_in_alarm: number;
}

export function buildProcessFlowStatuses(
  data: { process_areas: ProcessAreaAPI[]; timestamp: number } | undefined,
): ProcessAreaStatus[] {
  if (!data?.process_areas) return [];
  return data.process_areas.map((area) => ({
    id: area.id,
    name: area.name,
    status: area.status as ProcessAreaStatus['status'],
    activeAlarms: (area.active_alarms || []).map((a) => ({
      sensorTag: a.sensor_tag,
      level: a.level,
      priority: a.priority,
      value: a.value,
      limit: a.limit,
      timestamp: a.timestamp,
      acknowledged: a.acknowledged,
      description: a.description,
      processArea: a.process_area,
      suggestedAction: a.suggested_action,
    })) as ActiveAlarm[],
    sensorCount: area.sensor_count,
    sensorsInAlarm: area.sensors_in_alarm,
    lastUpdate: data.timestamp,
  }));
}
