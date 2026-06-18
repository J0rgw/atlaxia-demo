export interface TelemetryValue {
  ts: number;
  value: number;
}

export interface DeviceTelemetry {
  deviceId: string;
  deviceName: string;
  telemetry: Record<string, TelemetryValue[]>;
}

export interface TelemetrySnapshot {
  timestamp: number;
  sensors: Record<string, number>;
}

export interface AnomalyData {
  sensorKey: string;
  sensorName: string;
  category: string;
  currentValue: number;
  behaviorSeparation: number;
  anomalyIndicator: number;
  isAnomaly: boolean;
  timestamp?: number;
}

export interface ControlIndicators {
  calidad: number;
  caudal: number;
  ciberseguridad: number;
  factorHumano: number;
  temperatura: number;
  timestamp: number;
}

export interface NetworkDevice {
  id: string;
  name: string;
  type: 'PC' | 'PLC' | 'Router' | 'Switch' | 'SCADA';
  macAddress: string;
  ipAddress: string;
  importance: 'Alta' | 'Media' | 'Baja';
  status: {
    authorized: boolean;
    critical: boolean;
    repairable: boolean;
  };
}

export interface NetworkAlert {
  id: string;
  type: 'Alerta' | 'Emergencia' | 'Aviso';
  name: string;
  macOrigin: string;
  macDestination: string;
  ipOrigin: string;
  ipDestination: string;
  date: string;
  timestamp: number;
  acknowledged: boolean;
  acknowledgedAt: string | null;
}

export interface KPIData {
  id: string;
  icon: 'efficiency' | 'units' | 'alerts';
  title: string;
  titleKey?: string;
  value: string;
  /**
   * Optional second line displayed below `value`. Rendered with truncation
   * (line-clamp-1) so layout never reflows when its length changes. Used by
   * the criticality KPI to show `level_name` separately from "Nivel N".
   */
  valueSecondary?: string;
  valueSecondaryKey?: string;
  subtitle?: string;
  subtitleKey?: string;
  trend?: {
    direction: 'up' | 'down';
    value: string;
    valueKey?: string;
  };
  variant: 'teal' | 'green' | 'sky' | 'neutral' | 'warning' | 'critical';
  /** Marks the card as in skeleton state (data not arrived yet). */
  loading?: boolean;
}

export interface ProductionData {
  timestamp: number;
  outputVolume: number;
  energyConsumption: number;
}

export interface CalendarDay {
  id: string;
  status: 'ok' | 'warning' | 'offline';
}

export interface EventLog {
  id: string;
  name: string;
  timestamp: string;
  status: 'success' | 'error' | 'pending';
  statusText?: string;
  /** Network-alert severity, when the event originates from the IDS feed.
   *  Drives the unified <Badge axis="alert"> instead of the plain status pill. */
  alertType?: 'Emergencia' | 'Alerta' | 'Aviso';
  /** ISA-18.2 criticality, when the event is a SCADA alarm. Drives the unified
   *  <Badge axis="criticality"> instead of the plain status pill. */
  criticality?: 'critical' | 'high' | 'medium' | 'low' | 'normal';
}

export interface FiltersState {
  dateRange: '24h' | '7d' | 'custom';
  dataSources: string[];
  metricToggles: {
    temperature: boolean;
    pressure: boolean;
    vibration: boolean;
  };
  visualizationType: 'line' | 'bar' | 'area' | 'scatter';
  thresholds: {
    maxTemperature: number;
    maxPressure: number;
  };
}

export interface SensorCategory {
  id: string;
  name: string;
  sensors: string[];
  expanded?: boolean;
}

// Calendar Types
export type CalendarEventSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface CalendarEvent {
  id: string;
  type: 'anomaly' | 'emergency' | 'alert' | 'aviso';
  name: string;
  severity: CalendarEventSeverity;
  timestamp: number;
  source?: string;
}

export interface CalendarDayEvents {
  date: Date;
  dateKey: string;
  anomalyCount: number;
  maxAnomalyScore: number;
  emergencyCount: number;
  alertCount: number;
  avisoCount: number;
  events: CalendarEvent[];
}

export interface CalendarDayData {
  date: Date;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarDayEvents | null;
}

// Machine Sensor Types
export interface MachineTelemetryValue {
  ts: number;
  value: number;
  fecha_original?: string;
  hora_original?: string;
}

export interface MachineDeviceInfo {
  device_id: string;
  device_name: string;
  device_profile: string;
}

export interface MachineAIMetadata {
  sensor_key: string;
  normal_range?: {
    min: number;
    max: number;
  };
  warning_range?: {
    min: number;
    max: number;
  };
  anomaly_threshold?: number;
  forecast_enabled: boolean;
}

export interface MachineSensorData {
  key: string;
  name: string;
  device_id: string;
  device_name: string;
  value: number | null;
  timestamp: number;
  unit?: string;
}

export interface MachinesSnapshotResponse {
  timestamp: number;
  sensors: Record<string, number>;
  devices: MachineDeviceInfo[];
}

export interface MachineSensorsResponse {
  sensors: MachineSensorData[];
  devices: MachineDeviceInfo[];
  ai_metadata?: Record<string, MachineAIMetadata>;
  last_update: number;
  total: number;
}

// Process Category Types (SWaT P1-P6 structure)
export type ProcessStatus = 'normal' | 'warning' | 'critical';

export interface ProcessCategory {
  id: string;           // P1, P2, etc.
  name: string;         // "P1 - Captacion"
  description: string;  // Description for tooltip
  sensors: string[];    // Sensors in this process
  actuators: string[];  // Actuators in this process
  expanded?: boolean;
  status?: ProcessStatus;
}

export interface SensorStatus {
  key: string;
  value: number;
  status: ProcessStatus;
  unit?: string;
  normalRange?: { min: number; max: number };
}

export interface ProcessStatusInfo {
  processId: string;
  processName: string;
  overallStatus: ProcessStatus;
  sensorStatuses: Record<string, SensorStatus>;
  lastUpdate: number;
  forecastEnabled?: boolean;
}

export interface ProcessesStatusResponse {
  processes: ProcessStatusInfo[];
  timestamp: number;
}

// Forecasting interfaces (prepared for future module)
export interface ForecastData {
  sensorKey: string;
  predictions: Array<{ ts: number; value: number; confidence: number }>;
  normalBand: { upper: number; lower: number };
}

export interface SensorRange {
  min: number;
  max: number;
  unit: string;
  warningMin?: number;
  warningMax?: number;
}

// Re-export ISA Industrial types
export * from './industrial';

// Re-export inference contract types (BFF v2.1)
export * from './inference';

// Re-export anomaly event register types
export * from './anomalyEvents';
