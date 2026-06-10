/**
 * Installation configuration types.
 * These types define the structure of the JSON configuration
 * stored in the backend's installation_config table.
 */

// =============================================================================
// Theme Configuration
// =============================================================================

export type ThemeTemplate = 'scada' | 'modern';

export interface ThemeConfig {
  primary: string;
  secondary: string;
  accent: string;
  template: ThemeTemplate;
}

// =============================================================================
// Sensor Configuration
// =============================================================================

export interface SensorMapping {
  thingsboard_key: string;
  display_name: string;
  unit?: string;
  min?: number;
  max?: number;
  // ISA-compliant alarm limits
  alarm_hh?: number;  // High-High alarm
  alarm_h?: number;   // High alarm
  alarm_l?: number;   // Low alarm
  alarm_ll?: number;  // Low-Low alarm
  // Industrial metadata
  criticality?: 'HIGH' | 'MEDIUM' | 'LOW';
  process_area?: string;  // P1, P2, etc.
  // Plant survey metadata
  sensor_type?: string;
  variable_type?: 'continuous' | 'binary' | 'categorical';
  instrument_role?: 'sensor' | 'actuator' | 'setpoint' | 'alarm';
  description?: string;
  causality?: 'endogenous' | 'exogenous';
  categorical_values?: string[];
  equipment_name?: string;
  // Additional survey fields
  preprocessing?: string;
  known_data_issues?: string;
  notes?: string;
}

export interface SensorCategory {
  id: string;
  name: string;
  expanded: boolean;
  sensors: string[];
}

export interface BranchConfig {
  processId: string;
  connectsTo: string;
  label?: string;
}

export type NodeKind = 'process' | 'sensor' | 'source' | 'sink' | 'junction';
export type EdgeKind = 'flow' | 'feedback' | 'bypass' | 'drain' | 'sensor' | 'recycle';

export interface ProcessNode {
  id: string;
  label: string;
  kind: NodeKind;
  meta?: { description?: string; sensors?: string[] };
}

export interface ProcessEdge {
  id: string;
  from: string;
  to: string;
  kind: EdgeKind;
  label?: string;
  condition?: string;
}

export interface ProcessTopology {
  mainFlow: string[];
  branches: BranchConfig[];
  nodes?: ProcessNode[];
  edges?: ProcessEdge[];
}

export interface SensorsConfig {
  categories: SensorCategory[];
  mapping: Record<string, SensorMapping>;
  defaultSelected: string[];
  topology?: ProcessTopology;
}

// =============================================================================
// Pages Configuration
// =============================================================================

export type PageId =
  | 'overview'
  | 'data-overview'
  | 'machines'
  | 'variables'
  | 'anomalies'
  | 'network-overview'
  | 'network'
  | 'alerts'
  | 'logs'
  | 'policies'
  | 'control'
  | 'settings';

export interface PageInfo {
  id: PageId;
  name: string;
  descriptionEs: string;
  descriptionEn: string;
  adminOnly?: boolean;
}

export const AVAILABLE_PAGES: PageInfo[] = [
  { id: 'overview', name: 'Overview', descriptionEs: 'Dashboard principal con metricas generales', descriptionEn: 'Main dashboard with general metrics' },
  { id: 'data-overview', name: 'Data overview', descriptionEs: 'Resumen del modulo de datos', descriptionEn: 'Data module summary' },
  { id: 'machines', name: 'Plant realtime', descriptionEs: 'Estado actual de la planta', descriptionEn: 'Plant current state' },
  { id: 'variables', name: 'Historic telemetry', descriptionEs: 'Telemetria historica de sensores', descriptionEn: 'Historic sensor telemetry' },
  { id: 'anomalies', name: 'Data alerts', descriptionEs: 'Alertas de datos (anomalias ML)', descriptionEn: 'Data alerts (ML anomalies)' },
  { id: 'network-overview', name: 'Network overview', descriptionEs: 'Resumen del modulo de red', descriptionEn: 'Network module summary' },
  { id: 'network', name: 'Network state', descriptionEs: 'Estado actual de la red y dispositivos', descriptionEn: 'Current network and device state' },
  { id: 'alerts', name: 'Network alerts', descriptionEs: 'Alertas de red e historico', descriptionEn: 'Network alerts and history' },
  { id: 'logs', name: 'Logs', descriptionEs: 'Registro de eventos', descriptionEn: 'Event logs' },
  { id: 'policies', name: 'Policies', descriptionEs: 'Lista blanca de dispositivos y firmas Snort', descriptionEn: 'Device whitelist and Snort signatures' },
  { id: 'control', name: 'Control', descriptionEs: 'Control de procesos y actuadores', descriptionEn: 'Process and actuator control' },
  { id: 'settings', name: 'Settings', descriptionEs: 'Configuracion del sistema', descriptionEn: 'System configuration', adminOnly: true },
];

export interface PagesConfig {
  enabled: PageId[];
  default: PageId;
}

// =============================================================================
// Installation Identity
// =============================================================================

export interface InstallationIdentity {
  name: string;
  logo_url: string | null;
  theme: ThemeConfig;
}

// =============================================================================
// Admin User (for setup)
// =============================================================================

export interface AdminUserSetup {
  username: string;
  email: string;
  password: string;
}

// =============================================================================
// Complete Setup Request
// =============================================================================

export interface PlantSurveyMetadata {
  survey_date?: string;
  technician_name?: string;
  client_contact_name?: string;
  client_contact_role?: string;
  notes?: string;
}

export interface PlantSurveyPlantInfo {
  plant_name: string;
  location?: {
    address?: string;
    municipality?: string;
    province?: string;
    country?: string;
    coordinates?: { latitude: number; longitude: number };
  };
  industrial_diagram?: {
    available: boolean;
    format?: string;
    filename?: string;
    notes?: string;
  };
  scada_system?: {
    vendor?: string;
    protocol?: string;
    historian?: string;
    export_capability?: string;
    notes?: string;
  };
}

export interface SetupRequest {
  installation: InstallationIdentity;
  sensors_config: SensorsConfig;
  pages_config: PagesConfig;
  admin_user: AdminUserSetup;
  client_name?: string;
  survey_metadata?: PlantSurveyMetadata;
  plant_info?: PlantSurveyPlantInfo;
}

// =============================================================================
// Installation Config (from backend)
// =============================================================================

export interface InstallationConfig {
  installation_name: string;
  logo_url: string | null;
  theme_primary: string;
  theme_secondary: string;
  theme_accent: string;
  theme_variant: ThemeTemplate;
  sensors_config: SensorsConfig;
  pages_config: PagesConfig;
  features_config: Record<string, unknown>;
  setup_completed: boolean;
  setup_completed_at: string | null;
  plant_survey_data: {
    client_name?: string;
    survey_metadata?: PlantSurveyMetadata;
    plant_info?: PlantSurveyPlantInfo;
  };
}

// =============================================================================
// Installation Status (public endpoint)
// =============================================================================

export interface InstallationStatus {
  setup_completed: boolean;
  has_users: boolean;
  installation_name: string | null;
}

// Public branding payload exposed pre-auth so login + setup can render with
// the customer's identity. Backed by GET /api/installation/branding.
export interface InstallationBranding {
  setup_completed: boolean;
  installation_name: string | null;
  logo_url: string | null;
  theme_primary: string;
  theme_secondary: string;
  theme_accent: string;
  theme_variant: ThemeTemplate;
}

// =============================================================================
// License Status (placeholder)
// =============================================================================

export interface LicenseStatus {
  valid: boolean;
  bypass: boolean;
  message: string;
  expires_at: string | null;
  features: string;
}

// =============================================================================
// Setup Wizard State
// =============================================================================

export type SetupStep = 'identity' | 'sensors' | 'pages' | 'admin' | 'summary';

export const SETUP_STEPS: { id: SetupStep; title: string; description: string }[] = [
  { id: 'identity', title: 'Identidad', description: 'Nombre, logo y tema' },
  { id: 'sensors', title: 'Sensores', description: 'Configurar sensores' },
  { id: 'pages', title: 'Paginas', description: 'Paginas habilitadas' },
  { id: 'admin', title: 'Administrador', description: 'Crear cuenta admin' },
  { id: 'summary', title: 'Resumen', description: 'Revisar y completar' },
];

// =============================================================================
// Default Values
// =============================================================================

export const DEFAULT_THEME: ThemeConfig = {
  primary: '#0D9488',
  secondary: '#0EA5E9',
  accent: '#F59E0B',
  template: 'scada',
};

export const DEFAULT_PAGES_CONFIG: PagesConfig = {
  enabled: [
    'overview',
    'data-overview',
    'machines',
    'variables',
    'anomalies',
    'network-overview',
    'network',
    'alerts',
    'settings',
  ],
  default: 'overview',
};

export const DEFAULT_SENSORS_CONFIG: SensorsConfig = {
  categories: [],
  mapping: {},
  defaultSelected: [],
};
