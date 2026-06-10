/**
 * ISA Industrial Sensor Configuration for SWaT Water Treatment Plant
 *
 * This file contains the complete ISA-compliant configuration for all sensors
 * following ISA-18.2 (Alarm Management) and ISA 5.1 (Instrumentation Symbols)
 */

import {
  InstrumentType,
  evaluateAlarmLevel,
  getStatusFromAlarm,
  calculateRangePercent,
} from '@/types/industrial';
import type {
  IndustrialSensor,
  AlarmLimits,
  SensorEvaluation,
  ActiveAlarm,
  AlarmLevel,
  AlarmPriority,
  ProcessAreaStatus,
} from '@/types/industrial';
import { SENSOR_MAPPING } from './sensors';

/**
 * Complete ISA Industrial Sensor Configuration
 * 51 sensors organized by process area (P1-P6)
 */
export const INDUSTRIAL_SENSORS: Record<string, IndustrialSensor> = {
  // ============================================
  // P1 - CAPTACION (Raw Water Intake)
  // ============================================
  'LIT101': {
    tag: 'LIT101',
    processArea: 'P1',
    instrumentType: InstrumentType.LEVEL_TRANSMITTER,
    description: {
      short: 'Nivel Tanque P1',
      long: 'Transmisor de nivel del tanque de agua cruda',
      equipment: 'T-101',
    },
    engineering: {
      unit: 'mm',
      precision: 1,
      displayFormat: '{value} {unit}',
    },
    alarmLimits: {
      HH: 850,   // Desbordamiento inminente
      H: 800,    // Nivel alto
      L: 500,    // Nivel bajo
      LL: 400,   // Tanque casi vacio - PARAR BOMBAS
    },
    operatingLimits: {
      normal: { min: 500, max: 800 },
      design: { min: 0, max: 1000 },
    },
    ai: {
      featureGroup: 'tank_levels',
      correlatedWith: ['FIT101', 'P101', 'P102'],
      seasonality: 'daily',
      forecastHorizon: 60,
      anomalyThreshold: 0.85,
      enabled: true,
    },
    operational: {
      criticality: 'HIGH',
      responseTime: 30,
      safetyRelated: true,
      interlocks: ['P101_STOP', 'P102_STOP', 'MV101_CLOSE'],
    },
    thingsboardKey: SENSOR_MAPPING['LIT101'],
  },

  'FIT101': {
    tag: 'FIT101',
    processArea: 'P1',
    instrumentType: InstrumentType.FLOW_TRANSMITTER,
    description: {
      short: 'Caudal Entrada P1',
      long: 'Transmisor de caudal de entrada de agua cruda',
      equipment: 'FE-101',
    },
    engineering: {
      unit: 'm3/h',
      precision: 2,
      displayFormat: '{value} {unit}',
    },
    alarmLimits: {
      HH: 5.0,   // Caudal excesivo
      H: 4.5,    // Caudal alto
      L: 0.5,    // Caudal bajo
      LL: 0.1,   // Sin flujo
    },
    operatingLimits: {
      normal: { min: 0, max: 4.5 },
      design: { min: 0, max: 6 },
    },
    ai: {
      featureGroup: 'inlet_flows',
      correlatedWith: ['LIT101', 'P101'],
      seasonality: 'daily',
      forecastHorizon: 30,
      anomalyThreshold: 0.80,
      enabled: true,
    },
    operational: {
      criticality: 'HIGH',
      responseTime: 30,
      safetyRelated: false,
      interlocks: [],
    },
    thingsboardKey: SENSOR_MAPPING['FIT101'],
  },

  // ============================================
  // P2 - DOSIFICACION QUIMICA (Chemical Dosing)
  // ============================================
  'AIT201': {
    tag: 'AIT201',
    processArea: 'P2',
    instrumentType: InstrumentType.ANALYTICAL_TRANSMITTER,
    description: {
      short: 'pH Dosificacion',
      long: 'Transmisor de pH para control de dosificacion quimica',
      equipment: 'AE-201',
    },
    engineering: {
      unit: 'pH',
      precision: 2,
      displayFormat: '{value} {unit}',
    },
    alarmLimits: {
      HH: 9.5,   // Agua muy alcalina - PELIGRO
      H: 8.5,    // pH alto
      L: 6.5,    // pH bajo
      LL: 5.5,   // Agua muy acida - PELIGRO
    },
    operatingLimits: {
      normal: { min: 6.5, max: 8.5 },
      design: { min: 0, max: 14 },
    },
    ai: {
      featureGroup: 'water_quality',
      correlatedWith: ['AIT202', 'AIT203', 'P201', 'P202'],
      seasonality: 'daily',
      forecastHorizon: 60,
      anomalyThreshold: 0.90,
      enabled: true,
    },
    operational: {
      criticality: 'HIGH',
      responseTime: 60,
      safetyRelated: true,
      interlocks: ['P201_STOP', 'P202_STOP'],
    },
    thingsboardKey: SENSOR_MAPPING['AIT201'],
  },

  'AIT202': {
    tag: 'AIT202',
    processArea: 'P2',
    instrumentType: InstrumentType.ANALYTICAL_TRANSMITTER,
    description: {
      short: 'ORP Dosificacion',
      long: 'Transmisor de potencial redox (ORP) para control de desinfeccion',
      equipment: 'AE-202',
    },
    engineering: {
      unit: 'mV',
      precision: 0,
      displayFormat: '{value} {unit}',
    },
    alarmLimits: {
      HH: 850,   // ORP muy alto
      H: 800,    // ORP alto
      L: 200,    // ORP bajo - desinfeccion insuficiente
      LL: 150,   // ORP muy bajo - ALARMA
    },
    operatingLimits: {
      normal: { min: 200, max: 800 },
      design: { min: -1000, max: 1000 },
    },
    ai: {
      featureGroup: 'water_quality',
      correlatedWith: ['AIT201', 'AIT203'],
      seasonality: 'daily',
      forecastHorizon: 60,
      anomalyThreshold: 0.85,
      enabled: true,
    },
    operational: {
      criticality: 'MEDIUM',
      responseTime: 120,
      safetyRelated: false,
      interlocks: [],
    },
    thingsboardKey: SENSOR_MAPPING['AIT202'],
  },

  'AIT203': {
    tag: 'AIT203',
    processArea: 'P2',
    instrumentType: InstrumentType.ANALYTICAL_TRANSMITTER,
    description: {
      short: 'Conductividad P2',
      long: 'Transmisor de conductividad electrica del agua',
      equipment: 'AE-203',
    },
    engineering: {
      unit: 'uS/cm',
      precision: 0,
      displayFormat: '{value} {unit}',
    },
    alarmLimits: {
      HH: 600,   // Conductividad muy alta
      H: 500,    // Conductividad alta
      L: 100,    // Conductividad baja
      LL: 50,    // Conductividad muy baja
    },
    operatingLimits: {
      normal: { min: 100, max: 500 },
      design: { min: 0, max: 2000 },
    },
    ai: {
      featureGroup: 'water_quality',
      correlatedWith: ['AIT201', 'AIT202'],
      seasonality: 'weekly',
      forecastHorizon: 120,
      anomalyThreshold: 0.80,
      enabled: true,
    },
    operational: {
      criticality: 'LOW',
      responseTime: 300,
      safetyRelated: false,
      interlocks: [],
    },
    thingsboardKey: SENSOR_MAPPING['AIT203'],
  },

  'FIT201': {
    tag: 'FIT201',
    processArea: 'P2',
    instrumentType: InstrumentType.FLOW_TRANSMITTER,
    description: {
      short: 'Caudal Dosificacion',
      long: 'Transmisor de caudal de quimicos dosificados',
      equipment: 'FE-201',
    },
    engineering: {
      unit: 'm3/h',
      precision: 3,
      displayFormat: '{value} {unit}',
    },
    alarmLimits: {
      HH: 3.5,   // Sobredosificacion
      H: 3.0,    // Dosificacion alta
      L: 0.1,    // Dosificacion baja
      LL: 0.01,  // Sin dosificacion
    },
    operatingLimits: {
      normal: { min: 0, max: 3 },
      design: { min: 0, max: 5 },
    },
    ai: {
      featureGroup: 'dosing_flows',
      correlatedWith: ['AIT201', 'P201'],
      seasonality: 'daily',
      forecastHorizon: 30,
      anomalyThreshold: 0.85,
      enabled: true,
    },
    operational: {
      criticality: 'MEDIUM',
      responseTime: 60,
      safetyRelated: false,
      interlocks: [],
    },
    thingsboardKey: SENSOR_MAPPING['FIT201'],
  },

  // ============================================
  // P3 - ULTRAFILTRACION (Ultrafiltration)
  // ============================================
  'LIT301': {
    tag: 'LIT301',
    processArea: 'P3',
    instrumentType: InstrumentType.LEVEL_TRANSMITTER,
    description: {
      short: 'Nivel Tanque UF',
      long: 'Transmisor de nivel del tanque de ultrafiltracion',
      equipment: 'T-301',
    },
    engineering: {
      unit: 'mm',
      precision: 1,
      displayFormat: '{value} {unit}',
    },
    alarmLimits: {
      HH: 1050,  // Desbordamiento
      H: 1000,   // Nivel alto
      L: 800,    // Nivel bajo
      LL: 750,   // Nivel critico bajo
    },
    operatingLimits: {
      normal: { min: 800, max: 1000 },
      design: { min: 0, max: 1200 },
    },
    ai: {
      featureGroup: 'tank_levels',
      correlatedWith: ['FIT301', 'P301', 'P302'],
      seasonality: 'daily',
      forecastHorizon: 60,
      anomalyThreshold: 0.85,
      enabled: true,
    },
    operational: {
      criticality: 'HIGH',
      responseTime: 30,
      safetyRelated: true,
      interlocks: ['P301_STOP', 'P302_STOP'],
    },
    thingsboardKey: SENSOR_MAPPING['LIT301'],
  },

  'FIT301': {
    tag: 'FIT301',
    processArea: 'P3',
    instrumentType: InstrumentType.FLOW_TRANSMITTER,
    description: {
      short: 'Caudal UF',
      long: 'Transmisor de caudal de permeado UF',
      equipment: 'FE-301',
    },
    engineering: {
      unit: 'm3/h',
      precision: 2,
      displayFormat: '{value} {unit}',
    },
    alarmLimits: {
      HH: 3.5,   // Caudal excesivo
      H: 3.0,    // Caudal alto
      L: 0.5,    // Caudal bajo
      LL: 0.1,   // Sin flujo - membrana bloqueada
    },
    operatingLimits: {
      normal: { min: 0, max: 3 },
      design: { min: 0, max: 5 },
    },
    ai: {
      featureGroup: 'filtration_flows',
      correlatedWith: ['LIT301', 'DPIT301'],
      seasonality: 'daily',
      forecastHorizon: 30,
      anomalyThreshold: 0.80,
      enabled: true,
    },
    operational: {
      criticality: 'HIGH',
      responseTime: 60,
      safetyRelated: false,
      interlocks: [],
    },
    thingsboardKey: SENSOR_MAPPING['FIT301'],
  },

  'DPIT301': {
    tag: 'DPIT301',
    processArea: 'P3',
    instrumentType: InstrumentType.DIFF_PRESSURE_TRANSMITTER,
    description: {
      short: 'Delta P Membrana',
      long: 'Transmisor de presion diferencial de membrana UF',
      equipment: 'DPE-301',
    },
    engineering: {
      unit: 'kPa',
      precision: 1,
      displayFormat: '{value} {unit}',
    },
    alarmLimits: {
      HH: 60,    // Membrana muy obstruida - RETROLAVADO URGENTE
      H: 50,     // Membrana obstruida
      L: 5,      // Presion muy baja - sin flujo
      LL: 2,     // Falla de bomba o fuga
    },
    operatingLimits: {
      normal: { min: 0, max: 50 },
      design: { min: 0, max: 100 },
    },
    ai: {
      featureGroup: 'membrane_health',
      correlatedWith: ['FIT301', 'FIT601'],
      seasonality: 'weekly',
      forecastHorizon: 240,
      anomalyThreshold: 0.90,
      enabled: true,
    },
    operational: {
      criticality: 'HIGH',
      responseTime: 120,
      safetyRelated: false,
      interlocks: ['BACKWASH_START'],
    },
    thingsboardKey: SENSOR_MAPPING['DPIT301'],
  },

  'AIT301': {
    tag: 'AIT301',
    processArea: 'P3',
    instrumentType: InstrumentType.ANALYTICAL_TRANSMITTER,
    description: {
      short: 'pH Permeado UF',
      long: 'Transmisor de pH del permeado de ultrafiltracion',
      equipment: 'AE-301',
    },
    engineering: {
      unit: 'pH',
      precision: 2,
      displayFormat: '{value} {unit}',
    },
    alarmLimits: {
      HH: 9.0,
      H: 8.5,
      L: 6.5,
      LL: 6.0,
    },
    operatingLimits: {
      normal: { min: 6.5, max: 8.5 },
      design: { min: 0, max: 14 },
    },
    ai: {
      featureGroup: 'water_quality',
      correlatedWith: ['AIT201', 'AIT302'],
      seasonality: 'daily',
      forecastHorizon: 60,
      anomalyThreshold: 0.85,
      enabled: true,
    },
    operational: {
      criticality: 'MEDIUM',
      responseTime: 120,
      safetyRelated: false,
      interlocks: [],
    },
    thingsboardKey: SENSOR_MAPPING['AIT301'],
  },

  'AIT302': {
    tag: 'AIT302',
    processArea: 'P3',
    instrumentType: InstrumentType.ANALYTICAL_TRANSMITTER,
    description: {
      short: 'ORP Permeado UF',
      long: 'Transmisor de potencial redox del permeado UF',
      equipment: 'AE-302',
    },
    engineering: {
      unit: 'mV',
      precision: 0,
      displayFormat: '{value} {unit}',
    },
    alarmLimits: {
      HH: 850,
      H: 800,
      L: 200,
      LL: 150,
    },
    operatingLimits: {
      normal: { min: 200, max: 800 },
      design: { min: -1000, max: 1000 },
    },
    ai: {
      featureGroup: 'water_quality',
      correlatedWith: ['AIT202', 'AIT301'],
      seasonality: 'daily',
      forecastHorizon: 60,
      anomalyThreshold: 0.85,
      enabled: true,
    },
    operational: {
      criticality: 'LOW',
      responseTime: 300,
      safetyRelated: false,
      interlocks: [],
    },
    thingsboardKey: SENSOR_MAPPING['AIT302'],
  },

  'AIT303': {
    tag: 'AIT303',
    processArea: 'P3',
    instrumentType: InstrumentType.ANALYTICAL_TRANSMITTER,
    description: {
      short: 'Conductividad UF',
      long: 'Transmisor de conductividad del permeado UF',
      equipment: 'AE-303',
    },
    engineering: {
      unit: 'uS/cm',
      precision: 0,
      displayFormat: '{value} {unit}',
    },
    alarmLimits: {
      HH: 600,
      H: 500,
      L: 100,
      LL: 50,
    },
    operatingLimits: {
      normal: { min: 100, max: 500 },
      design: { min: 0, max: 2000 },
    },
    ai: {
      featureGroup: 'water_quality',
      correlatedWith: ['AIT203', 'AIT301'],
      seasonality: 'weekly',
      forecastHorizon: 120,
      anomalyThreshold: 0.80,
      enabled: true,
    },
    operational: {
      criticality: 'LOW',
      responseTime: 300,
      safetyRelated: false,
      interlocks: [],
    },
    thingsboardKey: SENSOR_MAPPING['AIT303'],
  },

  // ============================================
  // P4 - DECLORACION UV (UV Dechlorination)
  // ============================================
  'LIT401': {
    tag: 'LIT401',
    processArea: 'P4',
    instrumentType: InstrumentType.LEVEL_TRANSMITTER,
    description: {
      short: 'Nivel Tanque UV',
      long: 'Transmisor de nivel del tanque de tratamiento UV',
      equipment: 'T-401',
    },
    engineering: {
      unit: 'mm',
      precision: 1,
      displayFormat: '{value} {unit}',
    },
    alarmLimits: {
      HH: 1050,
      H: 1000,
      L: 780,
      LL: 750,
    },
    operatingLimits: {
      normal: { min: 780, max: 1000 },
      design: { min: 0, max: 1200 },
    },
    ai: {
      featureGroup: 'tank_levels',
      correlatedWith: ['FIT401', 'UV401'],
      seasonality: 'daily',
      forecastHorizon: 60,
      anomalyThreshold: 0.85,
      enabled: true,
    },
    operational: {
      criticality: 'HIGH',
      responseTime: 30,
      safetyRelated: true,
      interlocks: ['UV401_OFF', 'P401_STOP'],
    },
    thingsboardKey: SENSOR_MAPPING['LIT401'],
  },

  'FIT401': {
    tag: 'FIT401',
    processArea: 'P4',
    instrumentType: InstrumentType.FLOW_TRANSMITTER,
    description: {
      short: 'Caudal UV',
      long: 'Transmisor de caudal de agua tratada con UV',
      equipment: 'FE-401',
    },
    engineering: {
      unit: 'm3/h',
      precision: 2,
      displayFormat: '{value} {unit}',
    },
    alarmLimits: {
      HH: 3.5,
      H: 3.0,
      L: 0.3,
      LL: 0.1,
    },
    operatingLimits: {
      normal: { min: 0, max: 3 },
      design: { min: 0, max: 5 },
    },
    ai: {
      featureGroup: 'uv_treatment',
      correlatedWith: ['LIT401', 'UV401', 'AIT401'],
      seasonality: 'daily',
      forecastHorizon: 30,
      anomalyThreshold: 0.80,
      enabled: true,
    },
    operational: {
      criticality: 'MEDIUM',
      responseTime: 60,
      safetyRelated: false,
      interlocks: [],
    },
    thingsboardKey: SENSOR_MAPPING['FIT401'],
  },

  'AIT401': {
    tag: 'AIT401',
    processArea: 'P4',
    instrumentType: InstrumentType.ANALYTICAL_TRANSMITTER,
    description: {
      short: 'Cloro Residual',
      long: 'Transmisor de cloro residual despues del tratamiento UV',
      equipment: 'AE-401',
    },
    engineering: {
      unit: 'mg/L',
      precision: 2,
      displayFormat: '{value} {unit}',
    },
    alarmLimits: {
      HH: 6,     // Cloro muy alto - falla UV
      H: 5,      // Cloro alto
      L: 0.5,    // Cloro bajo (normal despues de UV)
      LL: 0.1,   // Casi sin cloro (OK)
    },
    operatingLimits: {
      normal: { min: 0, max: 5 },
      design: { min: 0, max: 10 },
    },
    ai: {
      featureGroup: 'uv_treatment',
      correlatedWith: ['UV401', 'FIT401'],
      seasonality: 'daily',
      forecastHorizon: 30,
      anomalyThreshold: 0.90,
      enabled: true,
    },
    operational: {
      criticality: 'HIGH',
      responseTime: 60,
      safetyRelated: true,
      interlocks: ['UV401_ALARM'],
    },
    thingsboardKey: SENSOR_MAPPING['AIT401'],
  },

  'AIT402': {
    tag: 'AIT402',
    processArea: 'P4',
    instrumentType: InstrumentType.ANALYTICAL_TRANSMITTER,
    description: {
      short: 'ORP Post-UV',
      long: 'Transmisor de potencial redox despues del tratamiento UV',
      equipment: 'AE-402',
    },
    engineering: {
      unit: 'mV',
      precision: 0,
      displayFormat: '{value} {unit}',
    },
    alarmLimits: {
      HH: 850,
      H: 800,
      L: 200,
      LL: 150,
    },
    operatingLimits: {
      normal: { min: 200, max: 800 },
      design: { min: -1000, max: 1000 },
    },
    ai: {
      featureGroup: 'water_quality',
      correlatedWith: ['AIT302', 'AIT401'],
      seasonality: 'daily',
      forecastHorizon: 60,
      anomalyThreshold: 0.85,
      enabled: true,
    },
    operational: {
      criticality: 'LOW',
      responseTime: 300,
      safetyRelated: false,
      interlocks: [],
    },
    thingsboardKey: SENSOR_MAPPING['AIT402'],
  },

  // ============================================
  // P5 - OSMOSIS INVERSA (Reverse Osmosis)
  // ============================================
  'FIT501': {
    tag: 'FIT501',
    processArea: 'P5',
    instrumentType: InstrumentType.FLOW_TRANSMITTER,
    description: {
      short: 'Caudal Entrada RO',
      long: 'Transmisor de caudal de alimentacion a osmosis inversa',
      equipment: 'FE-501',
    },
    engineering: {
      unit: 'm3/h',
      precision: 2,
      displayFormat: '{value} {unit}',
    },
    alarmLimits: {
      HH: 2.5,
      H: 2.0,
      L: 0.3,
      LL: 0.1,
    },
    operatingLimits: {
      normal: { min: 0, max: 2 },
      design: { min: 0, max: 3 },
    },
    ai: {
      featureGroup: 'ro_flows',
      correlatedWith: ['FIT502', 'FIT503', 'PIT501'],
      seasonality: 'daily',
      forecastHorizon: 30,
      anomalyThreshold: 0.85,
      enabled: true,
    },
    operational: {
      criticality: 'HIGH',
      responseTime: 60,
      safetyRelated: false,
      interlocks: [],
    },
    thingsboardKey: SENSOR_MAPPING['FIT501'],
  },

  'FIT502': {
    tag: 'FIT502',
    processArea: 'P5',
    instrumentType: InstrumentType.FLOW_TRANSMITTER,
    description: {
      short: 'Caudal Permeado RO',
      long: 'Transmisor de caudal de permeado de osmosis inversa',
      equipment: 'FE-502',
    },
    engineering: {
      unit: 'm3/h',
      precision: 3,
      displayFormat: '{value} {unit}',
    },
    alarmLimits: {
      HH: 1.5,
      H: 1.0,
      L: 0.2,
      LL: 0.05,
    },
    operatingLimits: {
      normal: { min: 0, max: 1 },
      design: { min: 0, max: 2 },
    },
    ai: {
      featureGroup: 'ro_flows',
      correlatedWith: ['FIT501', 'FIT503', 'PIT502'],
      seasonality: 'daily',
      forecastHorizon: 30,
      anomalyThreshold: 0.85,
      enabled: true,
    },
    operational: {
      criticality: 'HIGH',
      responseTime: 60,
      safetyRelated: false,
      interlocks: [],
    },
    thingsboardKey: SENSOR_MAPPING['FIT502'],
  },

  'FIT503': {
    tag: 'FIT503',
    processArea: 'P5',
    instrumentType: InstrumentType.FLOW_TRANSMITTER,
    description: {
      short: 'Caudal Concentrado RO',
      long: 'Transmisor de caudal de concentrado (rechazo) de RO',
      equipment: 'FE-503',
    },
    engineering: {
      unit: 'm3/h',
      precision: 3,
      displayFormat: '{value} {unit}',
    },
    alarmLimits: {
      HH: 1.5,
      H: 1.0,
      L: 0.2,
      LL: 0.05,
    },
    operatingLimits: {
      normal: { min: 0, max: 1 },
      design: { min: 0, max: 2 },
    },
    ai: {
      featureGroup: 'ro_flows',
      correlatedWith: ['FIT501', 'FIT502'],
      seasonality: 'daily',
      forecastHorizon: 30,
      anomalyThreshold: 0.80,
      enabled: true,
    },
    operational: {
      criticality: 'MEDIUM',
      responseTime: 120,
      safetyRelated: false,
      interlocks: [],
    },
    thingsboardKey: SENSOR_MAPPING['FIT503'],
  },

  'FIT504': {
    tag: 'FIT504',
    processArea: 'P5',
    instrumentType: InstrumentType.FLOW_TRANSMITTER,
    description: {
      short: 'Caudal Recirculacion RO',
      long: 'Transmisor de caudal de recirculacion de osmosis inversa',
      equipment: 'FE-504',
    },
    engineering: {
      unit: 'm3/h',
      precision: 3,
      displayFormat: '{value} {unit}',
    },
    alarmLimits: {
      HH: 1.5,
      H: 1.0,
      L: 0.1,
      LL: 0.02,
    },
    operatingLimits: {
      normal: { min: 0, max: 1 },
      design: { min: 0, max: 2 },
    },
    ai: {
      featureGroup: 'ro_flows',
      correlatedWith: ['FIT501', 'P501'],
      seasonality: 'daily',
      forecastHorizon: 30,
      anomalyThreshold: 0.80,
      enabled: true,
    },
    operational: {
      criticality: 'LOW',
      responseTime: 300,
      safetyRelated: false,
      interlocks: [],
    },
    thingsboardKey: SENSOR_MAPPING['FIT504'],
  },

  'AIT501': {
    tag: 'AIT501',
    processArea: 'P5',
    instrumentType: InstrumentType.ANALYTICAL_TRANSMITTER,
    description: {
      short: 'pH Entrada RO',
      long: 'Transmisor de pH de alimentacion a osmosis inversa',
      equipment: 'AE-501',
    },
    engineering: {
      unit: 'pH',
      precision: 2,
      displayFormat: '{value} {unit}',
    },
    alarmLimits: {
      HH: 9.0,
      H: 8.5,
      L: 6.5,
      LL: 6.0,
    },
    operatingLimits: {
      normal: { min: 6.5, max: 8.5 },
      design: { min: 0, max: 14 },
    },
    ai: {
      featureGroup: 'water_quality',
      correlatedWith: ['AIT301', 'AIT503'],
      seasonality: 'daily',
      forecastHorizon: 60,
      anomalyThreshold: 0.85,
      enabled: true,
    },
    operational: {
      criticality: 'MEDIUM',
      responseTime: 120,
      safetyRelated: false,
      interlocks: [],
    },
    thingsboardKey: SENSOR_MAPPING['AIT501'],
  },

  'AIT502': {
    tag: 'AIT502',
    processArea: 'P5',
    instrumentType: InstrumentType.ANALYTICAL_TRANSMITTER,
    description: {
      short: 'ORP Entrada RO',
      long: 'Transmisor de potencial redox de alimentacion a RO',
      equipment: 'AE-502',
    },
    engineering: {
      unit: 'mV',
      precision: 0,
      displayFormat: '{value} {unit}',
    },
    alarmLimits: {
      HH: 850,
      H: 800,
      L: 200,
      LL: 150,
    },
    operatingLimits: {
      normal: { min: 200, max: 800 },
      design: { min: -1000, max: 1000 },
    },
    ai: {
      featureGroup: 'water_quality',
      correlatedWith: ['AIT402', 'AIT501'],
      seasonality: 'daily',
      forecastHorizon: 60,
      anomalyThreshold: 0.85,
      enabled: true,
    },
    operational: {
      criticality: 'LOW',
      responseTime: 300,
      safetyRelated: false,
      interlocks: [],
    },
    thingsboardKey: SENSOR_MAPPING['AIT502'],
  },

  'AIT503': {
    tag: 'AIT503',
    processArea: 'P5',
    instrumentType: InstrumentType.ANALYTICAL_TRANSMITTER,
    description: {
      short: 'Conductividad Permeado RO',
      long: 'Transmisor de conductividad del permeado de osmosis inversa',
      equipment: 'AE-503',
    },
    engineering: {
      unit: 'uS/cm',
      precision: 0,
      displayFormat: '{value} {unit}',
    },
    alarmLimits: {
      HH: 600,   // Membrana degradada
      H: 500,    // Conductividad alta
      L: 50,     // Conductividad baja (bueno)
      LL: 10,    // Muy baja - sensor posible falla
    },
    operatingLimits: {
      normal: { min: 100, max: 500 },
      design: { min: 0, max: 2000 },
    },
    ai: {
      featureGroup: 'ro_quality',
      correlatedWith: ['AIT504', 'FIT502'],
      seasonality: 'weekly',
      forecastHorizon: 240,
      anomalyThreshold: 0.90,
      enabled: true,
    },
    operational: {
      criticality: 'HIGH',
      responseTime: 120,
      safetyRelated: false,
      interlocks: [],
    },
    thingsboardKey: SENSOR_MAPPING['AIT503'],
  },

  'AIT504': {
    tag: 'AIT504',
    processArea: 'P5',
    instrumentType: InstrumentType.ANALYTICAL_TRANSMITTER,
    description: {
      short: 'Conductividad Concentrado RO',
      long: 'Transmisor de conductividad del concentrado de osmosis inversa',
      equipment: 'AE-504',
    },
    engineering: {
      unit: 'uS/cm',
      precision: 0,
      displayFormat: '{value} {unit}',
    },
    alarmLimits: {
      HH: 600,
      H: 500,
      L: 100,
      LL: 50,
    },
    operatingLimits: {
      normal: { min: 100, max: 500 },
      design: { min: 0, max: 5000 },
    },
    ai: {
      featureGroup: 'ro_quality',
      correlatedWith: ['AIT503', 'FIT503'],
      seasonality: 'weekly',
      forecastHorizon: 120,
      anomalyThreshold: 0.80,
      enabled: true,
    },
    operational: {
      criticality: 'LOW',
      responseTime: 300,
      safetyRelated: false,
      interlocks: [],
    },
    thingsboardKey: SENSOR_MAPPING['AIT504'],
  },

  'PIT501': {
    tag: 'PIT501',
    processArea: 'P5',
    instrumentType: InstrumentType.PRESSURE_TRANSMITTER,
    description: {
      short: 'Presion Entrada RO',
      long: 'Transmisor de presion de alimentacion a osmosis inversa',
      equipment: 'PE-501',
    },
    engineering: {
      unit: 'kPa',
      precision: 0,
      displayFormat: '{value} {unit}',
    },
    alarmLimits: {
      HH: 550,   // Sobrepresion - ALARMA
      H: 500,    // Presion alta
      L: 200,    // Presion baja
      LL: 100,   // Presion muy baja - falla bomba
    },
    operatingLimits: {
      normal: { min: 0, max: 500 },
      design: { min: 0, max: 700 },
    },
    ai: {
      featureGroup: 'ro_pressure',
      correlatedWith: ['PIT502', 'PIT503', 'P501'],
      seasonality: 'daily',
      forecastHorizon: 30,
      anomalyThreshold: 0.85,
      enabled: true,
    },
    operational: {
      criticality: 'HIGH',
      responseTime: 30,
      safetyRelated: true,
      interlocks: ['P501_TRIP', 'MV501_CLOSE'],
    },
    thingsboardKey: SENSOR_MAPPING['PIT501'],
  },

  'PIT502': {
    tag: 'PIT502',
    processArea: 'P5',
    instrumentType: InstrumentType.PRESSURE_TRANSMITTER,
    description: {
      short: 'Presion Permeado RO',
      long: 'Transmisor de presion de permeado de osmosis inversa',
      equipment: 'PE-502',
    },
    engineering: {
      unit: 'kPa',
      precision: 0,
      displayFormat: '{value} {unit}',
    },
    alarmLimits: {
      HH: 550,
      H: 500,
      L: 50,
      LL: 20,
    },
    operatingLimits: {
      normal: { min: 0, max: 500 },
      design: { min: 0, max: 700 },
    },
    ai: {
      featureGroup: 'ro_pressure',
      correlatedWith: ['PIT501', 'PIT503'],
      seasonality: 'daily',
      forecastHorizon: 30,
      anomalyThreshold: 0.85,
      enabled: true,
    },
    operational: {
      criticality: 'MEDIUM',
      responseTime: 60,
      safetyRelated: false,
      interlocks: [],
    },
    thingsboardKey: SENSOR_MAPPING['PIT502'],
  },

  'PIT503': {
    tag: 'PIT503',
    processArea: 'P5',
    instrumentType: InstrumentType.PRESSURE_TRANSMITTER,
    description: {
      short: 'Presion Concentrado RO',
      long: 'Transmisor de presion de concentrado de osmosis inversa',
      equipment: 'PE-503',
    },
    engineering: {
      unit: 'kPa',
      precision: 0,
      displayFormat: '{value} {unit}',
    },
    alarmLimits: {
      HH: 550,
      H: 500,
      L: 50,
      LL: 20,
    },
    operatingLimits: {
      normal: { min: 0, max: 500 },
      design: { min: 0, max: 700 },
    },
    ai: {
      featureGroup: 'ro_pressure',
      correlatedWith: ['PIT501', 'PIT502'],
      seasonality: 'daily',
      forecastHorizon: 30,
      anomalyThreshold: 0.85,
      enabled: true,
    },
    operational: {
      criticality: 'MEDIUM',
      responseTime: 60,
      safetyRelated: false,
      interlocks: [],
    },
    thingsboardKey: SENSOR_MAPPING['PIT503'],
  },

  // ============================================
  // P6 - RETROLAVADO (Backwash)
  // ============================================
  'FIT601': {
    tag: 'FIT601',
    processArea: 'P6',
    instrumentType: InstrumentType.FLOW_TRANSMITTER,
    description: {
      short: 'Caudal Retrolavado',
      long: 'Transmisor de caudal de retrolavado de membranas UF',
      equipment: 'FE-601',
    },
    engineering: {
      unit: 'm3/h',
      precision: 2,
      displayFormat: '{value} {unit}',
    },
    alarmLimits: {
      HH: 6,     // Caudal excesivo
      H: 5,      // Caudal alto
      L: 1,      // Caudal bajo - retrolavado ineficiente
      LL: 0.5,   // Retrolavado fallido
    },
    operatingLimits: {
      normal: { min: 0, max: 5 },
      design: { min: 0, max: 8 },
    },
    ai: {
      featureGroup: 'backwash',
      correlatedWith: ['DPIT301', 'P601', 'P602'],
      seasonality: 'weekly',
      forecastHorizon: 240,
      anomalyThreshold: 0.85,
      enabled: true,
    },
    operational: {
      criticality: 'MEDIUM',
      responseTime: 120,
      safetyRelated: false,
      interlocks: [],
    },
    thingsboardKey: SENSOR_MAPPING['FIT601'],
  },
};

/**
 * Process area definitions with metadata
 */
export const PROCESS_AREAS = {
  P1: {
    id: 'P1',
    name: 'Captacion',
    fullName: 'P1 - Captacion',
    description: 'Raw Water Intake - Control de entrada de agua cruda',
    sensors: ['LIT101', 'FIT101'],
    actuators: ['MV101', 'P101', 'P102'],
    color: '#3B82F6', // blue
  },
  P2: {
    id: 'P2',
    name: 'Dosificacion',
    fullName: 'P2 - Dosificacion',
    description: 'Chemical Dosing - Desinfeccion con cloro y ajuste pH',
    sensors: ['AIT201', 'AIT202', 'AIT203', 'FIT201'],
    actuators: ['MV201', 'P201', 'P202', 'P203', 'P204', 'P205', 'P206', 'P207', 'P208'],
    color: '#8B5CF6', // purple
  },
  P3: {
    id: 'P3',
    name: 'Ultrafiltracion',
    fullName: 'P3 - Ultrafiltracion',
    description: 'Ultrafiltration - Filtracion por membrana UF',
    sensors: ['LIT301', 'FIT301', 'DPIT301', 'AIT301', 'AIT302', 'AIT303'],
    actuators: ['MV301', 'MV302', 'MV303', 'MV304', 'P301', 'P302'],
    color: '#06B6D4', // cyan
  },
  P4: {
    id: 'P4',
    name: 'Decloracion UV',
    fullName: 'P4 - Decloracion UV',
    description: 'Dechlorination - Eliminacion de cloro residual con UV',
    sensors: ['LIT401', 'FIT401', 'AIT401', 'AIT402'],
    actuators: ['UV401', 'P401', 'P402', 'P403', 'P404'],
    color: '#F59E0B', // amber
  },
  P5: {
    id: 'P5',
    name: 'Osmosis Inversa',
    fullName: 'P5 - Osmosis Inversa',
    description: 'Reverse Osmosis - Purificacion final por RO',
    sensors: ['FIT501', 'FIT502', 'FIT503', 'FIT504', 'AIT501', 'AIT502', 'AIT503', 'AIT504', 'PIT501', 'PIT502', 'PIT503'],
    actuators: ['P501', 'P502', 'MV501', 'MV502', 'MV503', 'MV504'],
    color: '#10B981', // emerald
  },
  P6: {
    id: 'P6',
    name: 'Retrolavado',
    fullName: 'P6 - Retrolavado',
    description: 'Backwash - Limpieza de membranas UF',
    sensors: ['FIT601'],
    actuators: ['P601', 'P602', 'P603'],
    color: '#EF4444', // red
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get industrial sensor configuration by tag
 */
export function getIndustrialSensor(tag: string): IndustrialSensor | undefined {
  return INDUSTRIAL_SENSORS[tag];
}

/**
 * Get all configured sensor tags
 */
export function getConfiguredSensorTags(): string[] {
  return Object.keys(INDUSTRIAL_SENSORS);
}

/**
 * Check if a sensor is configured with ISA metadata
 */
export function isSensorConfigured(tag: string): boolean {
  return tag in INDUSTRIAL_SENSORS;
}

/**
 * Get sensors by process area
 */
export function getSensorsByProcessArea(processArea: string): IndustrialSensor[] {
  return Object.values(INDUSTRIAL_SENSORS).filter(
    (sensor) => sensor.processArea === processArea
  );
}

/**
 * Evaluate sensor status based on current value
 */
export function evaluateSensor(tag: string, value: number, timestamp: number): SensorEvaluation | null {
  const sensor = INDUSTRIAL_SENSORS[tag];
  if (!sensor) return null;

  const alarmResult = evaluateAlarmLevel(value, sensor.alarmLimits);
  const status = getStatusFromAlarm(alarmResult);
  const percentOfRange = calculateRangePercent(value, sensor.operatingLimits);

  return {
    tag,
    value,
    timestamp,
    status,
    alarm: alarmResult ? {
      level: alarmResult.level,
      priority: alarmResult.priority,
      limit: getAlarmLimitValue(sensor.alarmLimits, alarmResult.level),
      message: generateAlarmMessage(sensor, value, alarmResult.level),
    } : undefined,
    percentOfRange,
  };
}

/**
 * Get the actual limit value for an alarm level
 */
function getAlarmLimitValue(limits: AlarmLimits, level: AlarmLevel): number {
  const limitMap: Record<AlarmLevel, number | undefined> = {
    HH: limits.HH,
    H: limits.H,
    L: limits.L,
    LL: limits.LL,
  };
  return limitMap[level] ?? 0;
}

/**
 * Generate human-readable alarm message
 */
function generateAlarmMessage(
  sensor: IndustrialSensor,
  value: number,
  level: AlarmLevel
): string {
  const levelLabels: Record<AlarmLevel, string> = {
    HH: 'MUY ALTO',
    H: 'ALTO',
    L: 'BAJO',
    LL: 'MUY BAJO',
  };

  return `${sensor.description.short}: Valor ${levelLabels[level]} (${value.toFixed(sensor.engineering.precision)} ${sensor.engineering.unit})`;
}

/**
 * Evaluate all sensors and return active alarms
 */
export function evaluateAllSensors(
  values: Record<string, number>,
  timestamp: number = Date.now()
): ActiveAlarm[] {
  const alarms: ActiveAlarm[] = [];

  for (const [tag, value] of Object.entries(values)) {
    const sensor = INDUSTRIAL_SENSORS[tag];
    if (!sensor) continue;

    const alarmResult = evaluateAlarmLevel(value, sensor.alarmLimits);
    if (alarmResult) {
      alarms.push({
        sensorTag: tag,
        level: alarmResult.level,
        priority: alarmResult.priority,
        value,
        limit: getAlarmLimitValue(sensor.alarmLimits, alarmResult.level),
        timestamp,
        acknowledged: false,
        description: generateAlarmMessage(sensor, value, alarmResult.level),
        processArea: sensor.processArea,
        suggestedAction: getSuggestedAction(sensor, alarmResult.level),
      });
    }
  }

  // Sort by priority (EMERGENCY first) then by timestamp
  return alarms.sort((a, b) => {
    const priorityOrder: Record<AlarmPriority, number> = {
      EMERGENCY: 0,
      HIGH: 1,
      MEDIUM: 2,
      LOW: 3,
    };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.timestamp - a.timestamp;
  });
}

/**
 * Get suggested action for an alarm
 */
function getSuggestedAction(sensor: IndustrialSensor, level: AlarmLevel): string {
  // Generate action based on sensor type and alarm level
  const actions: Record<string, Record<AlarmLevel, string>> = {
    LIT: {
      HH: 'Verificar valvulas de entrada y drenaje. Posible desbordamiento.',
      H: 'Reducir caudal de entrada o aumentar extraccion.',
      L: 'Aumentar caudal de entrada o reducir extraccion.',
      LL: 'PARAR BOMBAS inmediatamente. Verificar suministro.',
    },
    FIT: {
      HH: 'Reducir velocidad de bomba o cerrar valvula parcialmente.',
      H: 'Verificar setpoint de caudal.',
      L: 'Verificar bomba y valvulas. Posible obstruccion.',
      LL: 'Verificar bomba. Posible falla o tuberia bloqueada.',
    },
    AIT: {
      HH: 'Ajustar dosificacion quimica. Verificar calidad de entrada.',
      H: 'Reducir dosificacion o verificar sensor.',
      L: 'Aumentar dosificacion o verificar sensor.',
      LL: 'Verificar sistema de dosificacion y sensor.',
    },
    PIT: {
      HH: 'REDUCIR PRESION inmediatamente. Verificar valvulas de alivio.',
      H: 'Verificar bomba y restricciones en linea.',
      L: 'Verificar bomba. Posible cavitacion.',
      LL: 'Verificar bomba y suministro. Posible fuga.',
    },
    DPIT: {
      HH: 'Iniciar retrolavado de membrana URGENTE.',
      H: 'Programar retrolavado proximo.',
      L: 'Verificar integridad de membrana.',
      LL: 'Verificar sensores y conexiones.',
    },
  };

  const prefix = sensor.tag.replace(/\d+/g, '');
  return actions[prefix]?.[level] ?? 'Verificar condicion del equipo.';
}

/**
 * Get process area status summary
 */
export function getProcessAreaStatus(
  processId: string,
  values: Record<string, number>,
  timestamp: number = Date.now()
): ProcessAreaStatus | null {
  const area = PROCESS_AREAS[processId as keyof typeof PROCESS_AREAS];
  if (!area) return null;

  const sensors = getSensorsByProcessArea(processId);
  const activeAlarms: ActiveAlarm[] = [];
  let worstStatus: 'normal' | 'warning' | 'critical' = 'normal';

  for (const sensor of sensors) {
    const value = values[sensor.tag];
    if (value === undefined) continue;

    const alarmResult = evaluateAlarmLevel(value, sensor.alarmLimits);
    if (alarmResult) {
      const status = getStatusFromAlarm(alarmResult);
      if (status === 'critical') worstStatus = 'critical';
      else if (status === 'warning' && worstStatus !== 'critical') worstStatus = 'warning';

      activeAlarms.push({
        sensorTag: sensor.tag,
        level: alarmResult.level,
        priority: alarmResult.priority,
        value,
        limit: getAlarmLimitValue(sensor.alarmLimits, alarmResult.level),
        timestamp,
        acknowledged: false,
        description: generateAlarmMessage(sensor, value, alarmResult.level),
        processArea: processId,
        suggestedAction: getSuggestedAction(sensor, alarmResult.level),
      });
    }
  }

  return {
    id: processId,
    name: area.fullName,
    status: worstStatus,
    activeAlarms,
    sensorCount: sensors.length,
    sensorsInAlarm: activeAlarms.length,
    lastUpdate: timestamp,
  };
}

/**
 * Get all process areas status
 */
export function getAllProcessAreasStatus(
  values: Record<string, number>,
  timestamp: number = Date.now()
): ProcessAreaStatus[] {
  return Object.keys(PROCESS_AREAS)
    .map((id) => getProcessAreaStatus(id, values, timestamp))
    .filter((status): status is ProcessAreaStatus => status !== null);
}
