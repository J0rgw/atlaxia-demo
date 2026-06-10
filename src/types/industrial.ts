/**
 * ISA Industrial Sensor Architecture Types
 * Following ISA-18.2 (Alarm Management) and ISA 5.1 (Instrumentation Symbols)
 */

// ISA 5.1 Instrument Types
export enum InstrumentType {
  // Transmitters
  LEVEL_TRANSMITTER = 'LIT',
  FLOW_TRANSMITTER = 'FIT',
  PRESSURE_TRANSMITTER = 'PIT',
  DIFF_PRESSURE_TRANSMITTER = 'DPIT',
  ANALYTICAL_TRANSMITTER = 'AIT',

  // Actuators
  MOTORIZED_VALVE = 'MV',
  PUMP = 'P',
  UV_SYSTEM = 'UV',

  // Switches
  LEVEL_SWITCH = 'LS',
  LEVEL_SWITCH_HIGH = 'LSH',
  LEVEL_SWITCH_LOW = 'LSL',
}

// ISA-18.2 Alarm Priority Levels
export type AlarmPriority = 'EMERGENCY' | 'HIGH' | 'MEDIUM' | 'LOW';

// Alarm Level Type (HH/H/L/LL)
export type AlarmLevel = 'HH' | 'H' | 'L' | 'LL';

// Data Quality (OPC UA standard)
export type DataQuality = 'GOOD' | 'BAD' | 'UNCERTAIN';

// Criticality levels for operational context
export type Criticality = 'HIGH' | 'MEDIUM' | 'LOW';

// Seasonality types for AI forecasting
export type Seasonality = 'daily' | 'weekly' | 'monthly' | 'none';

// Anomaly types
export type AnomalyType = 'point' | 'contextual' | 'collective';

/**
 * ISA-18.2 Alarm Limits Configuration
 * HH = High-High (Emergency)
 * H = High (Warning)
 * L = Low (Warning)
 * LL = Low-Low (Emergency)
 */
export interface AlarmLimits {
  HH?: number; // High-High limit (emergency)
  H?: number;  // High limit (warning)
  L?: number;  // Low limit (warning)
  LL?: number; // Low-Low limit (emergency)
}

/**
 * Operating limits for sensor
 */
export interface OperatingLimits {
  normal: { min: number; max: number };
  design: { min: number; max: number };
}

/**
 * Engineering unit configuration
 */
export interface EngineeringUnits {
  unit: string;           // SI unit (mm, m3/h, kPa, etc.)
  precision: number;      // Decimal places
  displayFormat?: string; // Format string "{value} {unit}"
}

/**
 * Sensor description for HMI display
 */
export interface SensorDescription {
  short: string;    // Short label for cards (e.g., "Nivel Tanque P1")
  long: string;     // Full description for tooltips
  equipment: string; // Associated equipment tag (e.g., "T-101")
}

/**
 * AI/ML metadata for forecasting and anomaly detection
 */
export interface AIMetadata {
  featureGroup: string;        // Grouping for ML features (e.g., "tank_levels")
  correlatedWith: string[];    // Correlated sensor tags
  seasonality: Seasonality;    // Time series seasonality
  forecastHorizon: number;     // Forecast horizon in minutes
  anomalyThreshold: number;    // Anomaly detection threshold (0-1)
  enabled: boolean;            // Whether AI is enabled for this sensor
}

/**
 * Operational context for sensor
 */
export interface OperationalContext {
  criticality: Criticality;    // How critical is this sensor
  responseTime: number;        // Expected response time in seconds
  safetyRelated: boolean;      // Is this a safety instrument
  interlocks: string[];        // Associated interlock tags
}

/**
 * Complete ISA Industrial Sensor Configuration
 */
export interface IndustrialSensor {
  // Identification (ISA 5.1)
  tag: string;                      // Sensor tag (e.g., LIT101)
  processArea: string;              // Process area (P1-P6)
  instrumentType: InstrumentType;   // Type of instrument

  // Description
  description: SensorDescription;

  // Engineering units
  engineering: EngineeringUnits;

  // ISA-18.2 Alarm limits
  alarmLimits: AlarmLimits;

  // Operating limits
  operatingLimits: OperatingLimits;

  // AI/ML metadata
  ai: AIMetadata;

  // Operational context
  operational: OperationalContext;

  // ThingsBoard mapping
  thingsboardKey?: string;
}

/**
 * Real-time sensor data point
 */
export interface RealtimeData {
  value: number;
  timestamp: number;
  quality: DataQuality;
}

/**
 * AI Forecast prediction point
 */
export interface ForecastPoint {
  timestamp: number;
  value: number;
  confidence: number;    // 0-1 confidence level
  lowerBound: number;    // 95% confidence interval lower
  upperBound: number;    // 95% confidence interval upper
}

/**
 * AI Forecast data for a sensor
 */
export interface ForecastData {
  predictions: ForecastPoint[];
  modelVersion: string;
  lastTrained: number;
  accuracyMetrics: {
    mae: number;   // Mean Absolute Error
    rmse: number;  // Root Mean Square Error
    mape: number;  // Mean Absolute Percentage Error
  };
}

/**
 * Anomaly detection result
 */
export interface AnomalyData {
  isAnomaly: boolean;
  score: number;              // 0-1, higher = more anomalous
  type: AnomalyType;
  explanation: string;        // Human-readable explanation
  relatedSensors: string[];   // Other affected sensors
}

/**
 * Active alarm information
 */
export interface ActiveAlarm {
  sensorTag: string;
  level: AlarmLevel;
  priority: AlarmPriority;
  value: number;
  limit: number;
  timestamp: number;
  acknowledged: boolean;
  description: string;
  processArea: string;
  suggestedAction?: string;
}

/**
 * AI-Enhanced Sensor with real-time data
 */
export interface AIEnhancedSensor extends IndustrialSensor {
  // Real-time data
  realtime?: RealtimeData;

  // AI forecast (when available)
  forecast?: ForecastData;

  // Anomaly detection (when available)
  anomaly?: AnomalyData;
}

/**
 * Sensor status evaluation result
 */
export interface SensorEvaluation {
  tag: string;
  value: number;
  timestamp: number;
  status: 'normal' | 'warning' | 'critical';
  alarm?: {
    level: AlarmLevel;
    priority: AlarmPriority;
    limit: number;
    message: string;
  };
  percentOfRange: number;  // 0-100% within operating range
}

/**
 * Process area status summary
 */
export interface ProcessAreaStatus {
  id: string;           // P1, P2, etc.
  name: string;
  status: 'normal' | 'warning' | 'critical';
  activeAlarms: ActiveAlarm[];
  sensorCount: number;
  sensorsInAlarm: number;
  lastUpdate: number;
}

/**
 * Helper function to determine alarm level from value
 */
export function evaluateAlarmLevel(
  value: number,
  limits: AlarmLimits
): { level: AlarmLevel; priority: AlarmPriority } | null {
  // Check in order: HH, LL (emergency), then H, L (warning)
  if (limits.HH !== undefined && value >= limits.HH) {
    return { level: 'HH', priority: 'EMERGENCY' };
  }
  if (limits.LL !== undefined && value <= limits.LL) {
    return { level: 'LL', priority: 'EMERGENCY' };
  }
  if (limits.H !== undefined && value >= limits.H) {
    return { level: 'H', priority: 'HIGH' };
  }
  if (limits.L !== undefined && value <= limits.L) {
    return { level: 'L', priority: 'HIGH' };
  }
  return null;
}

/**
 * Helper function to get status from alarm evaluation
 */
export function getStatusFromAlarm(
  alarm: { level: AlarmLevel; priority: AlarmPriority } | null
): 'normal' | 'warning' | 'critical' {
  if (!alarm) return 'normal';
  if (alarm.priority === 'EMERGENCY') return 'critical';
  return 'warning';
}

/**
 * Helper to calculate percentage within operating range
 */
export function calculateRangePercent(
  value: number,
  limits: OperatingLimits
): number {
  const { min, max } = limits.normal;
  const range = max - min;
  if (range === 0) return 50;
  const percent = ((value - min) / range) * 100;
  return Math.max(0, Math.min(100, percent));
}

/**
 * Get alarm priority label for display
 */
export function getAlarmPriorityLabel(priority: AlarmPriority): string {
  const labels: Record<AlarmPriority, string> = {
    EMERGENCY: 'Emergencia',
    HIGH: 'Alta',
    MEDIUM: 'Media',
    LOW: 'Baja',
  };
  return labels[priority];
}

/**
 * Get alarm level label for display
 */
export function getAlarmLevelLabel(level: AlarmLevel): string {
  const labels: Record<AlarmLevel, string> = {
    HH: 'Muy Alto',
    H: 'Alto',
    L: 'Bajo',
    LL: 'Muy Bajo',
  };
  return labels[level];
}
