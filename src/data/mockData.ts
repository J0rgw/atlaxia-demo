import type {
  KPIData,
  ProductionData,
  CalendarDay,
  EventLog,
  AnomalyData,
  ControlIndicators,
  NetworkDevice,
  NetworkAlert,
  TelemetryValue,
} from '@/types';

// TODO(jorge): remove — orphan after BFF v2.1 wiring (criticality KPI now built from inference).
export const mockKPIs: KPIData[] = [
  {
    id: 'status',
    icon: 'efficiency',
    title: 'Estado del Sistema',
    titleKey: 'systemStatus',
    value: '94.2%',
    trend: { direction: 'up', value: 'operacion normal', valueKey: 'normalOperation' },
    variant: 'teal',
  },
  {
    id: 'devices',
    icon: 'units',
    title: 'Dispositivos en Linea',
    titleKey: 'devicesOnline',
    value: '124 / 127',
    subtitle: '34 sensores monitorizados',
    subtitleKey: 'sensorsMonitored',
    variant: 'green',
  },
  {
    id: 'criticality',
    icon: 'alerts',
    title: 'Nivel de Criticidad',
    titleKey: 'criticalityLevel',
    value: 'Nivel 2',
    subtitle: '2 alertas activas',
    variant: 'neutral',
  },
];

const productionDay = (() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
})();
const HOUR_MS = 60 * 60 * 1000;
export const mockProductionData: ProductionData[] = [
  { timestamp: productionDay + 0 * HOUR_MS, outputVolume: 45, energyConsumption: 1 },
  { timestamp: productionDay + 4 * HOUR_MS, outputVolume: 52, energyConsumption: 1 },
  { timestamp: productionDay + 8 * HOUR_MS, outputVolume: 78, energyConsumption: 2 },
  { timestamp: productionDay + 12 * HOUR_MS, outputVolume: 95, energyConsumption: 2 },
  { timestamp: productionDay + 16 * HOUR_MS, outputVolume: 88, energyConsumption: 2 },
  { timestamp: productionDay + 20 * HOUR_MS, outputVolume: 62, energyConsumption: 1 },
];

export const mockCalendarDays: CalendarDay[] = [
  { id: 'M1', status: 'ok' },
  { id: 'M2', status: 'ok' },
  { id: 'M3', status: 'warning' },
  { id: 'M4', status: 'ok' },
  { id: 'M5', status: 'ok' },
  { id: 'M6', status: 'ok' },
  { id: 'P1', status: 'ok' },
  { id: 'P2', status: 'ok' },
  { id: 'P3', status: 'ok' },
  { id: 'P4', status: 'warning' },
  { id: 'P5', status: 'ok' },
  { id: 'P6', status: 'ok' },
  { id: 'S1', status: 'ok' },
  { id: 'S2', status: 'ok' },
  { id: 'S3', status: 'ok' },
  { id: 'S4', status: 'ok' },
  { id: 'S5', status: 'offline' },
  { id: 'S6', status: 'offline' },
];

export const mockEventLogs: EventLog[] = [
  { id: '1', name: 'Sensor Caudal Principal', timestamp: '12:34:56', status: 'success' },
  { id: '2', name: 'PLC Tratamiento Agua', timestamp: '12:34:52', status: 'success' },
  { id: '3', name: 'Monitor Redox', timestamp: '12:34:49', status: 'error', statusText: 'Timeout' },
  { id: '4', name: 'Sistema SCADA', timestamp: '12:34:44', status: 'success' },
  { id: '5', name: 'Sensor Temp. Biologico', timestamp: '12:34:40', status: 'success' },
];

export const mockControlIndicators: ControlIndicators = {
  calidad: 0.96,
  caudal: 0.85,
  ciberseguridad: 0.3,
  factorHumano: 0.19,
  temperatura: 0.5,
  timestamp: Date.now(),
};

export const mockNetworkDevices: NetworkDevice[] = [
  {
    id: '1',
    name: 'PC Personal',
    type: 'PC',
    macAddress: '00:1B:44:11:3A:B7',
    ipAddress: '192.228.17.57',
    importance: 'Alta',
    status: { authorized: true, critical: false, repairable: true },
  },
  {
    id: '2',
    name: 'PLC Principal',
    type: 'PLC',
    macAddress: '00:1B:44:11:3A:B8',
    ipAddress: '192.228.17.58',
    importance: 'Alta',
    status: { authorized: true, critical: true, repairable: true },
  },
  {
    id: '3',
    name: 'Router Edge',
    type: 'Router',
    macAddress: '00:1B:44:11:3A:B9',
    ipAddress: '192.228.17.1',
    importance: 'Alta',
    status: { authorized: true, critical: true, repairable: false },
  },
  {
    id: '4',
    name: 'Switch Industrial',
    type: 'Switch',
    macAddress: '00:1B:44:11:3A:BA',
    ipAddress: '192.228.17.2',
    importance: 'Media',
    status: { authorized: true, critical: false, repairable: true },
  },
  {
    id: '5',
    name: 'SCADA Server',
    type: 'SCADA',
    macAddress: '00:1B:44:11:3A:BB',
    ipAddress: '192.228.17.100',
    importance: 'Alta',
    status: { authorized: true, critical: true, repairable: true },
  },
  {
    id: '6',
    name: 'Dispositivo Desconocido',
    type: 'PC',
    macAddress: '00:1B:44:11:3A:BC',
    ipAddress: '192.228.17.200',
    importance: 'Baja',
    status: { authorized: false, critical: false, repairable: false },
  },
];

export const mockNetworkAlerts: NetworkAlert[] = [
  {
    id: '1',
    type: 'Alerta',
    name: 'Protocolo ICMP',
    macOrigin: '00:1B:44:11:3A:B7',
    macDestination: '00:1B:44:11:3A:B8',
    ipOrigin: '192.228.17.57',
    ipDestination: '192.228.17.58',
    date: '13/02/2025',
    timestamp: Date.now(),
    acknowledged: false,
    acknowledgedAt: null,
  },
  {
    id: '2',
    type: 'Emergencia',
    name: 'Acceso no autorizado',
    macOrigin: '00:1B:44:11:3A:BC',
    macDestination: '00:1B:44:11:3A:BB',
    ipOrigin: '192.228.17.200',
    ipDestination: '192.228.17.100',
    date: '13/02/2025',
    timestamp: Date.now() - 60000,
    acknowledged: false,
    acknowledgedAt: null,
  },
  {
    id: '3',
    type: 'Aviso',
    name: 'Latencia elevada',
    macOrigin: '00:1B:44:11:3A:B9',
    macDestination: '00:1B:44:11:3A:BA',
    ipOrigin: '192.228.17.1',
    ipDestination: '192.228.17.2',
    date: '12/02/2025',
    timestamp: Date.now() - 86400000,
    acknowledged: false,
    acknowledgedAt: null,
  },
];

export function generateMockTelemetry(
  _sensorKey: string,
  points = 20
): TelemetryValue[] {
  const now = Date.now();
  const data: TelemetryValue[] = [];
  let baseValue = Math.random() * 100;

  for (let i = points - 1; i >= 0; i--) {
    const variation = (Math.random() - 0.5) * 10;
    baseValue = Math.max(0, Math.min(100, baseValue + variation));
    data.push({
      ts: now - i * 10000,
      value: parseFloat(baseValue.toFixed(4)),
    });
  }

  return data;
}

export function generateMockTelemetryForSensors(
  sensorKeys: string[]
): Record<string, TelemetryValue[]> {
  const result: Record<string, TelemetryValue[]> = {};
  for (const key of sensorKeys) {
    result[key] = generateMockTelemetry(key);
  }
  return result;
}

export function generateMockCalendarEvents(
  baseDate: Date = new Date(),
  daysToGenerate: number = 60
): { anomalies: AnomalyData[]; alerts: NetworkAlert[] } {
  const anomalies: AnomalyData[] = [];
  const alerts: NetworkAlert[] = [];

  const categories = ['Caudal', 'Temperatura', 'Potencia', 'Quimicos', 'Otros'];
  const sensorNames = [
    'Sensor de flujo principal',
    'Medidor de temperatura',
    'Monitor de potencia',
    'Detector pH',
    'Sensor de turbidez',
  ];
  const alertNames = [
    'Protocolo ICMP detectado',
    'Acceso no autorizado',
    'Latencia elevada',
    'Conexion sospechosa',
    'Timeout de comunicacion',
  ];
  const alertTypes: Array<'Alerta' | 'Emergencia' | 'Aviso'> = [
    'Alerta',
    'Emergencia',
    'Aviso',
  ];

  for (let i = 0; i < daysToGenerate; i++) {
    const dayTimestamp = baseDate.getTime() - i * 86400000;
    const hasAnomalies = Math.random() > 0.7;
    const hasAlerts = Math.random() > 0.8;

    if (hasAnomalies) {
      const anomalyCount = Math.floor(Math.random() * 3) + 1;
      for (let j = 0; j < anomalyCount; j++) {
        const categoryIndex = Math.floor(Math.random() * categories.length);
        anomalies.push({
          sensorKey: `SENSOR_${i}_${j}`,
          sensorName: sensorNames[categoryIndex],
          category: categories[categoryIndex],
          currentValue: Math.random() * 100,
          behaviorSeparation: Math.random() * 10,
          anomalyIndicator: 0.7 + Math.random() * 0.3,
          isAnomaly: true,
          timestamp: dayTimestamp + Math.floor(Math.random() * 86400000),
        });
      }
    }

    if (hasAlerts) {
      const alertCount = Math.floor(Math.random() * 2) + 1;
      for (let j = 0; j < alertCount; j++) {
        const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
        const day = new Date(dayTimestamp);
        alerts.push({
          id: `alert_${i}_${j}`,
          type: alertType,
          name: alertNames[Math.floor(Math.random() * alertNames.length)],
          macOrigin: '00:1B:44:11:3A:B7',
          macDestination: '00:1B:44:11:3A:B8',
          ipOrigin: '192.228.17.57',
          ipDestination: '192.228.17.58',
          date: `${day.getDate().toString().padStart(2, '0')}/${(day.getMonth() + 1).toString().padStart(2, '0')}/${day.getFullYear()}`,
          timestamp: dayTimestamp + Math.floor(Math.random() * 86400000),
          acknowledged: false,
          acknowledgedAt: null,
        });
      }
    }
  }

  return { anomalies, alerts };
}
