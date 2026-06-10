import type { ProcessCategory, SensorRange } from '@/types';

// SWaT Sensor Ranges based on README_SWAT.md documentation
export const SENSOR_RANGES: Record<string, SensorRange> = {
  // P1 - Captacion
  'LIT101': { min: 500, max: 800, unit: 'mm', warningMin: 490, warningMax: 834 },
  'FIT101': { min: 0, max: 4.5, unit: 'm3/h', warningMin: 0, warningMax: 5 },

  // P2 - Dosificacion Quimica
  'AIT201': { min: 6.5, max: 8.5, unit: 'pH', warningMin: 6.0, warningMax: 9.0 },
  'AIT202': { min: 200, max: 800, unit: 'mV', warningMin: 150, warningMax: 850 },
  'AIT203': { min: 100, max: 500, unit: 'uS/cm', warningMin: 50, warningMax: 600 },
  'FIT201': { min: 0, max: 3, unit: 'm3/h', warningMin: 0, warningMax: 3.5 },

  // P3 - Ultrafiltracion
  'LIT301': { min: 800, max: 1000, unit: 'mm', warningMin: 750, warningMax: 1050 },
  'FIT301': { min: 0, max: 3, unit: 'm3/h', warningMin: 0, warningMax: 3.5 },
  'DPIT301': { min: 0, max: 50, unit: 'kPa', warningMin: 0, warningMax: 60 },
  'AIT301': { min: 6.5, max: 8.5, unit: 'pH', warningMin: 6.0, warningMax: 9.0 },
  'AIT302': { min: 200, max: 800, unit: 'mV', warningMin: 150, warningMax: 850 },
  'AIT303': { min: 100, max: 500, unit: 'uS/cm', warningMin: 50, warningMax: 600 },

  // P4 - Decloracion UV
  'LIT401': { min: 780, max: 1000, unit: 'mm', warningMin: 750, warningMax: 1050 },
  'FIT401': { min: 0, max: 3, unit: 'm3/h', warningMin: 0, warningMax: 3.5 },
  'AIT401': { min: 0, max: 5, unit: 'mg/L', warningMin: 0, warningMax: 6 },
  'AIT402': { min: 200, max: 800, unit: 'mV', warningMin: 150, warningMax: 850 },

  // P5 - Osmosis Inversa
  'FIT501': { min: 0, max: 2, unit: 'm3/h', warningMin: 0, warningMax: 2.5 },
  'FIT502': { min: 0, max: 1, unit: 'm3/h', warningMin: 0, warningMax: 1.5 },
  'FIT503': { min: 0, max: 1, unit: 'm3/h', warningMin: 0, warningMax: 1.5 },
  'FIT504': { min: 0, max: 1, unit: 'm3/h', warningMin: 0, warningMax: 1.5 },
  'AIT501': { min: 6.5, max: 8.5, unit: 'pH', warningMin: 6.0, warningMax: 9.0 },
  'AIT502': { min: 200, max: 800, unit: 'mV', warningMin: 150, warningMax: 850 },
  'AIT503': { min: 100, max: 500, unit: 'uS/cm', warningMin: 50, warningMax: 600 },
  'AIT504': { min: 100, max: 500, unit: 'uS/cm', warningMin: 50, warningMax: 600 },
  'PIT501': { min: 0, max: 500, unit: 'kPa', warningMin: 0, warningMax: 550 },
  'PIT502': { min: 0, max: 500, unit: 'kPa', warningMin: 0, warningMax: 550 },
  'PIT503': { min: 0, max: 500, unit: 'kPa', warningMin: 0, warningMax: 550 },

  // P6 - Retrolavado
  'FIT601': { min: 0, max: 5, unit: 'm3/h', warningMin: 0, warningMax: 6 },
};

// Process Categories organized by SWaT P1-P6 structure
export const PROCESS_CATEGORIES: ProcessCategory[] = [
  {
    id: 'P1',
    name: 'P1 - Captacion',
    description: 'Raw Water Intake - Control de entrada de agua cruda',
    sensors: ['LIT101', 'FIT101'],
    actuators: ['MV101', 'P101', 'P102'],
    expanded: true,
  },
  {
    id: 'P2',
    name: 'P2 - Dosificacion',
    description: 'Chemical Dosing - Desinfeccion con cloro y ajuste pH',
    sensors: ['AIT201', 'AIT202', 'AIT203', 'FIT201'],
    actuators: ['MV201', 'P201', 'P202', 'P203', 'P204', 'P205', 'P206', 'P207', 'P208'],
    expanded: false,
  },
  {
    id: 'P3',
    name: 'P3 - Ultrafiltracion',
    description: 'Ultrafiltration - Filtracion por membrana UF',
    sensors: ['LIT301', 'FIT301', 'DPIT301', 'AIT301', 'AIT302', 'AIT303'],
    actuators: ['MV301', 'MV302', 'MV303', 'MV304', 'P301', 'P302'],
    expanded: false,
  },
  {
    id: 'P4',
    name: 'P4 - Decloracion UV',
    description: 'Dechlorination - Eliminacion de cloro residual con UV',
    sensors: ['LIT401', 'FIT401', 'AIT401', 'AIT402'],
    actuators: ['UV401', 'P401', 'P402', 'P403', 'P404'],
    expanded: false,
  },
  {
    id: 'P5',
    name: 'P5 - Osmosis Inversa',
    description: 'Reverse Osmosis - Purificacion final por RO',
    sensors: ['FIT501', 'FIT502', 'FIT503', 'FIT504', 'AIT501', 'AIT502', 'AIT503', 'AIT504', 'PIT501', 'PIT502', 'PIT503'],
    actuators: ['P501', 'P502', 'MV501', 'MV502', 'MV503', 'MV504'],
    expanded: false,
  },
  {
    id: 'P6',
    name: 'P6 - Retrolavado',
    description: 'Backwash - Limpieza de membranas UF',
    sensors: ['FIT601'],
    actuators: ['P601', 'P602', 'P603'],
    expanded: false,
  },
];

// Mapping from display names to ThingsBoard keys
export const SENSOR_MAPPING: Record<string, string> = {
  // P1 - Captacion
  'LIT101': '1_LT_001_PV.Value',
  'FIT101': '1_FIT_001_PV.Value',
  'MV101': '1_MV_001_STATUS.Value',
  'P101': '1_P_001_STATUS.Value',
  'P102': '1_P_002_STATUS.Value',

  // P2 - Dosificacion
  'AIT201': '1_AIT_001_PV.Value',
  'AIT202': '1_AIT_002_PV.Value',
  'AIT203': '1_AIT_003_PV.Value',
  'FIT201': '2_FIC_201_PV.Value',
  'MV201': '1_MV_002_STATUS.Value',
  'P201': '1_P_003_STATUS.Value',
  'P202': '1_P_004_STATUS.Value',

  // P3 - Ultrafiltracion
  'LIT301': 'LIT301.Pv.Value',
  'FIT301': '2_FIC_101_PV.Value',
  'DPIT301': '2_DPIT_001_PV.Value',
  'AIT301': 'AIT301.Pv.Value',
  'AIT302': 'AIT302.Pv.Value',
  'AIT303': 'AIT303.Pv.Value',
  'MV301': '1_MV_003_STATUS.Value',
  'MV302': '1_MV_004_STATUS.Value',

  // P4 - Decloracion UV
  'LIT401': 'LIT401.Pv.Value',
  'FIT401': 'FIT401.Pv.Value',
  'AIT401': 'AIT401.Pv.Value',
  'AIT402': 'AIT402.Pv.Value',

  // P5 - Osmosis Inversa
  'FIT501': 'FIT501.Pv.Value',
  'FIT502': '2_FIT_001_PV.Value',
  'FIT503': '3_FIT_001_PV.Value',
  'FIT504': '3_FIT_001_PV.Value',  // May share with FIT503 if not available
  'AIT501': '2_AIT_001_PV.Value',
  'AIT502': '2_AIT_002_PV.Value',
  'AIT503': '3_AIT_001_PV.Value',
  'AIT504': '3_AIT_001_PV.Value',  // May share with AIT503 if not available
  'PIT501': '2_PIT_001_PV.Value',
  'PIT502': '2_PIT_002_PV.Value',
  'PIT503': '2_PIC_003_PV.Value',

  // P6 - Retrolavado
  'FIT601': 'FIT601.Pv.Value',

  // Additional Stage 2/3 sensors and actuators
  'MV201B': '2_MV_001_STATUS.Value',
  'MV202': '2_MV_002_STATUS.Value',
  'P201B': '2_P_001_STATUS.Value',
  'LIT501': '3_LT_001_PV.Value',  // RO tank level
  'MV301B': '3_MV_001_STATUS.Value',
  'MV302B': '3_MV_002_STATUS.Value',
  'MV303': '3_MV_003_STATUS.Value',
  'P301B': '3_P_001_STATUS.Value',

  // Legacy mappings for backward compatibility
  'Caudal Area 1': '1_FIT_001_PV.Value',
  'Control Caudal 101': '2_FIC_101_CO.Value',
  'Caudal 101 PV': '2_FIC_101_PV.Value',
  'Caudal 101 Setpoint': '2_FIC_101_SP.Value',
  'Control Caudal 201': '2_FIC_201_CO.Value',
  'Caudal 201 PV': '2_FIC_201_PV.Value',
  'Diferencial Presion 001': '2_DPIT_001_PV.Value',
  'Control Presion 003': '2_PIC_003_CO.Value',
  'Presion 003 PV': '2_PIC_003_PV.Value',
  'Presion 003 Setpoint': '2_PIC_003_SP.Value',
  'Presion 001': '2_PIT_001_PV.Value',
  'Presion 002': '2_PIT_002_PV.Value',
  'Alarma Nivel 001': '1_LS_001_AL.Value',
  'Alarma Nivel 002': '1_LS_002_AL.Value',
  'Nivel Tanque 001': '1_LT_001_PV.Value',
  'Alarma Alta Nivel 101': '2_LS_101_AH.Value',
  'Analisis 001': '1_AIT_001_PV.Value',
  'Analisis 002': '1_AIT_002_PV.Value',
  'Analisis 003': '1_AIT_003_PV.Value',
  'Analisis 004': '1_AIT_004_PV.Value',
  'Analisis 005': '1_AIT_005_PV.Value',
  'Analisis 2A-001': '2A_AIT_001_PV.Value',
  'Valvula Motor 001': '1_MV_001_STATUS.Value',
  'Valvula Motor 002': '1_MV_002_STATUS.Value',
  'Valvula Motor 003': '1_MV_003_STATUS.Value',
  'Valvula Motor 004': '1_MV_004_STATUS.Value',
  'Bomba 001': '1_P_001_STATUS.Value',
  'Bomba 002': '1_P_002_STATUS.Value',
  'Bomba 003': '1_P_003_STATUS.Value',
  'Bomba 004': '1_P_004_STATUS.Value',
  'Analisis 301': 'AIT301.Pv.Value',
  'Analisis 302': 'AIT302.Pv.Value',
  'Analisis 303': 'AIT303.Pv.Value',
  'Analisis 401': 'AIT401.Pv.Value',
  'Analisis 402': 'AIT402.Pv.Value',
};

// Build reverse mapping with priority for SWaT names (not legacy names)
// SWaT names follow pattern: letters + 3 digits (e.g., LIT101, AIT201)
const isSwatName = (name: string): boolean => /^[A-Z]+\d{3}$/.test(name);

export const SENSOR_REVERSE_MAPPING: Record<string, string> = (() => {
  const result: Record<string, string> = {};

  // First pass: add all mappings
  for (const [name, tbKey] of Object.entries(SENSOR_MAPPING)) {
    // If this TB key already has a SWaT name, don't overwrite with legacy
    if (result[tbKey] && isSwatName(result[tbKey]) && !isSwatName(name)) {
      continue;
    }
    result[tbKey] = name;
  }

  return result;
})();

// Get process by sensor key (SWaT name)
export function getProcessBySensor(sensorKey: string): ProcessCategory | undefined {
  return PROCESS_CATEGORIES.find(
    (process) =>
      process.sensors.includes(sensorKey) || process.actuators.includes(sensorKey)
  );
}

// Get process by ID
export function getProcessById(processId: string): ProcessCategory | undefined {
  return PROCESS_CATEGORIES.find((process) => process.id === processId);
}

// Get all sensors from all processes
export function getAllProcessSensors(): string[] {
  return PROCESS_CATEGORIES.flatMap((p) => [...p.sensors, ...p.actuators]);
}

// Get sensor range
export function getSensorRange(sensorKey: string): SensorRange | undefined {
  return SENSOR_RANGES[sensorKey];
}

// Check if value is within normal range
export function isValueNormal(sensorKey: string, value: number): boolean {
  const range = SENSOR_RANGES[sensorKey];
  if (!range) return true;
  return value >= range.min && value <= range.max;
}

// Check if value is in warning range
export function isValueWarning(sensorKey: string, value: number): boolean {
  const range = SENSOR_RANGES[sensorKey];
  if (!range) return false;
  const warningMin = range.warningMin ?? range.min;
  const warningMax = range.warningMax ?? range.max;
  return (value < range.min && value >= warningMin) || (value > range.max && value <= warningMax);
}

// Check if value is critical (outside warning range)
export function isValueCritical(sensorKey: string, value: number): boolean {
  const range = SENSOR_RANGES[sensorKey];
  if (!range) return false;
  const warningMin = range.warningMin ?? range.min;
  const warningMax = range.warningMax ?? range.max;
  return value < warningMin || value > warningMax;
}

// Get sensor status based on value
export function getSensorStatus(sensorKey: string, value: number): 'normal' | 'warning' | 'critical' {
  if (isValueCritical(sensorKey, value)) return 'critical';
  if (isValueWarning(sensorKey, value)) return 'warning';
  return 'normal';
}

// Map ThingsBoard key to SWaT name
export function mapToSwatName(thingsboardKey: string): string | undefined {
  // Strip device name prefix if present (e.g., "SWAT_Sensors.1_LT_001_PV.Value" -> "1_LT_001_PV.Value")
  let normalizedKey = thingsboardKey;
  const dotIndex = thingsboardKey.indexOf('.');
  if (dotIndex > 0 && thingsboardKey.includes('_Sensors.')) {
    normalizedKey = thingsboardKey.substring(dotIndex + 1);
  }

  // First try reverse mapping with normalized key
  const swatName = SENSOR_REVERSE_MAPPING[normalizedKey];
  if (swatName) return swatName;

  // Also try original key in case it's already normalized
  if (normalizedKey !== thingsboardKey) {
    const originalSwatName = SENSOR_REVERSE_MAPPING[thingsboardKey];
    if (originalSwatName) return originalSwatName;
  }

  // Try pattern matching for common prefixes
  const patterns: Array<{ pattern: RegExp; prefix: string }> = [
    { pattern: /LIT(\d+)/i, prefix: 'LIT' },
    { pattern: /FIT(\d+)/i, prefix: 'FIT' },
    { pattern: /AIT(\d+)/i, prefix: 'AIT' },
    { pattern: /PIT(\d+)/i, prefix: 'PIT' },
    { pattern: /DPIT(\d+)/i, prefix: 'DPIT' },
    { pattern: /MV(\d+)/i, prefix: 'MV' },
    { pattern: /P(\d+)/i, prefix: 'P' },
    { pattern: /UV(\d+)/i, prefix: 'UV' },
  ];

  for (const { pattern, prefix } of patterns) {
    const match = normalizedKey.match(pattern);
    if (match) {
      return `${prefix}${match[1]}`;
    }
  }

  return undefined;
}
