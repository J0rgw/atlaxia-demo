/**
 * Installation Store (Zustand)
 * Manages installation configuration state for both:
 * - Setup wizard (building the config JSON)
 * - Runtime (using the config from backend)
 */

import { create } from 'zustand';
import { api } from '@/lib/api';
import type {
  InstallationConfig,
  InstallationStatus,
  InstallationBranding,
  InstallationIdentity,
  SensorsConfig,
  PagesConfig,
  AdminUserSetup,
  SetupRequest,
  ThemeConfig,
  PageId,
  PlantSurveyMetadata,
  PlantSurveyPlantInfo,
} from '@/types/installation';
import type { PlantSurvey } from '@/types/plantSurvey';
import { parsePlantSurvey } from '@/lib/plantSurveyParser';

// =============================================================================
// State Interface
// =============================================================================

interface InstallationState {
  // Installation status (from GET /api/installation/status)
  status: InstallationStatus | null;
  statusLoading: boolean;
  statusError: string | null;

  // Installation config (from GET /api/installation/config)
  config: InstallationConfig | null;
  configLoading: boolean;
  configError: string | null;

  // Public branding (from GET /api/installation/branding) — usable pre-auth
  branding: InstallationBranding | null;
  brandingLoading: boolean;
  brandingError: string | null;

  // Setup wizard state
  setupStep: number;
  setupData: {
    installation: InstallationIdentity;
    sensors_config: SensorsConfig;
    pages_config: PagesConfig;
    admin_user: AdminUserSetup;
    client_name: string;
    survey_metadata: PlantSurveyMetadata | null;
    plant_info: PlantSurveyPlantInfo | null;
  };
  setupLoading: boolean;
  setupError: string | null;

  // Provisioning state
  provisioningStatus: 'idle' | 'provisioning' | 'completed' | 'partial' | 'failed';
  provisioningError: string | null;

  // Available sensors from ThingsBoard
  availableSensors: string[];
  availableSensorsLoading: boolean;

  // Plant survey data
  plantSurveyData: PlantSurvey | null;

  // Actions - Status
  fetchStatus: () => Promise<InstallationStatus>;

  // Actions - Branding (public, no auth)
  fetchBranding: () => Promise<InstallationBranding>;

  // Actions - Config
  fetchConfig: () => Promise<void>;
  updateConfig: (updates: Partial<InstallationConfig>) => Promise<void>;

  // Actions - Setup Wizard
  setSetupStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateInstallation: (data: Partial<InstallationIdentity>) => void;
  updateSensorsConfig: (data: Partial<SensorsConfig>) => void;
  updatePagesConfig: (data: Partial<PagesConfig>) => void;
  updateAdminUser: (data: Partial<AdminUserSetup>) => void;
  submitSetup: () => Promise<{ success: boolean; error?: string }>;
  resetSetup: () => void;

  // Actions - Provisioning
  provisionThingsBoard: () => Promise<{ status: string; error?: string }>;

  // Actions - Available Sensors
  fetchAvailableSensors: () => Promise<void>;

  // Actions - Plant Survey
  setPlantSurveyData: (data: PlantSurvey | null) => void;
  importFromPlantSurvey: () => void;

  // Helpers
  isSetupComplete: () => boolean;
  canAccessPage: (pageId: string) => boolean;
  getEnabledSensors: () => SensorsConfig | null;
  getTheme: () => ThemeConfig;
}

// =============================================================================
// Initial State
// =============================================================================

const initialSetupData: {
  installation: InstallationIdentity;
  sensors_config: SensorsConfig;
  pages_config: PagesConfig;
  admin_user: AdminUserSetup;
  client_name: string;
  survey_metadata: PlantSurveyMetadata | null;
  plant_info: PlantSurveyPlantInfo | null;
} = {
  installation: {
    name: '',
    logo_url: null,
    theme: {
      primary: '#0D9488',
      secondary: '#0EA5E9',
      accent: '#F59E0B',
      template: 'scada',
    },
  },
  sensors_config: {
    categories: [],
    mapping: {},
    defaultSelected: [],
  },
  pages_config: {
    enabled: ['overview', 'variables', 'network', 'settings'] as PageId[],
    default: 'overview' as PageId,
  },
  admin_user: {
    username: '',
    email: '',
    password: '',
  },
  client_name: '',
  survey_metadata: null,
  plant_info: null,
};

// =============================================================================
// Store
// =============================================================================

export const useInstallationStore = create<InstallationState>((set, get) => ({
  // Initial state
  status: null,
  statusLoading: false,
  statusError: null,

  config: null,
  configLoading: false,
  configError: null,

  branding: null,
  brandingLoading: false,
  brandingError: null,

  setupStep: 0,
  setupData: { ...initialSetupData },
  setupLoading: false,
  setupError: null,

  provisioningStatus: 'idle',
  provisioningError: null,

  availableSensors: [],
  availableSensorsLoading: false,

  plantSurveyData: null,

  // ==========================================================================
  // Status Actions
  // ==========================================================================

  fetchStatus: async () => {
    set({ statusLoading: true, statusError: null });
    try {
      const status = await api.get<InstallationStatus>('/api/installation/status');
      set({ status, statusLoading: false });
      return status;
    } catch (error) {
      const message = (error as { detail?: string }).detail || 'Error al obtener estado';
      set({ statusError: message, statusLoading: false });
      throw error;
    }
  },

  // ==========================================================================
  // Branding Actions (public, used pre-auth)
  // ==========================================================================

  fetchBranding: async () => {
    set({ brandingLoading: true, brandingError: null });
    try {
      const branding = await api.get<InstallationBranding>('/api/installation/branding');
      set({ branding, brandingLoading: false });
      return branding;
    } catch (error) {
      const message = (error as { detail?: string }).detail || 'Error al obtener branding';
      set({ brandingError: message, brandingLoading: false });
      throw error;
    }
  },

  // ==========================================================================
  // Config Actions
  // ==========================================================================

  fetchConfig: async () => {
    set({ configLoading: true, configError: null });
    try {
      const config = await api.get<InstallationConfig>('/api/installation/config');
      set({ config, configLoading: false });
    } catch (error) {
      const message = (error as { detail?: string }).detail || 'Error al obtener configuracion';
      set({ configError: message, configLoading: false });
    }
  },

  updateConfig: async (updates) => {
    set({ configLoading: true, configError: null });
    try {
      const config = await api.put<InstallationConfig>('/api/installation/config', updates);
      set({ config, configLoading: false });
    } catch (error) {
      const message = (error as { detail?: string }).detail || 'Error al actualizar configuracion';
      set({ configError: message, configLoading: false });
      throw error;
    }
  },

  // ==========================================================================
  // Setup Wizard Actions
  // ==========================================================================

  setSetupStep: (step) => set({ setupStep: step }),

  nextStep: () => set((state) => ({ setupStep: Math.min(state.setupStep + 1, 4) })),

  prevStep: () => set((state) => ({ setupStep: Math.max(state.setupStep - 1, 0) })),

  updateInstallation: (data) => set((state) => ({
    setupData: {
      ...state.setupData,
      installation: { ...state.setupData.installation, ...data },
    },
  })),

  updateSensorsConfig: (data) => set((state) => ({
    setupData: {
      ...state.setupData,
      sensors_config: { ...state.setupData.sensors_config, ...data },
    },
  })),

  updatePagesConfig: (data) => set((state) => ({
    setupData: {
      ...state.setupData,
      pages_config: { ...state.setupData.pages_config, ...data },
    },
  })),

  updateAdminUser: (data) => set((state) => ({
    setupData: {
      ...state.setupData,
      admin_user: { ...state.setupData.admin_user, ...data },
    },
  })),

  submitSetup: async () => {
    const { setupData } = get();
    set({ setupLoading: true, setupError: null });

    try {
      const request: SetupRequest = {
        installation: setupData.installation,
        sensors_config: setupData.sensors_config,
        pages_config: setupData.pages_config,
        admin_user: setupData.admin_user,
        client_name: setupData.client_name || undefined,
        survey_metadata: setupData.survey_metadata || undefined,
        plant_info: setupData.plant_info || undefined,
      };

      await api.post('/api/installation/setup', request);

      // Refresh status after setup
      const status = await api.get<InstallationStatus>('/api/installation/status');
      set({
        status,
        setupLoading: false,
        setupData: { ...initialSetupData },
        setupStep: 0,
      });

      return { success: true };
    } catch (error) {
      const message = (error as { detail?: string }).detail || 'Error al completar setup';
      set({ setupError: message, setupLoading: false });
      return { success: false, error: message };
    }
  },

  resetSetup: () => set({
    setupStep: 0,
    setupData: { ...initialSetupData },
    setupError: null,
  }),

  // ==========================================================================
  // Provisioning Actions
  // ==========================================================================

  provisionThingsBoard: async () => {
    set({ provisioningStatus: 'provisioning', provisioningError: null });
    try {
      const result = await api.post<{
        status: string;
        devices_created: number;
        buckets_created: number;
        errors: string[];
      }>('/api/installation/provision', {});

      const status = result.status as 'completed' | 'partial' | 'failed';
      set({
        provisioningStatus: status,
        provisioningError: result.errors?.length ? result.errors.join('; ') : null,
      });
      return { status: result.status };
    } catch (error) {
      const message = (error as { detail?: string }).detail || 'Error al provisionar ThingsBoard';
      set({ provisioningStatus: 'failed', provisioningError: message });
      return { status: 'failed', error: message };
    }
  },

  // ==========================================================================
  // Available Sensors Actions
  // ==========================================================================

  fetchAvailableSensors: async () => {
    set({ availableSensorsLoading: true });
    try {
      // Get sensors from ThingsBoard via telemetry endpoint
      const snapshot = await api.get<{ sensors: Record<string, number> }>('/api/telemetry/snapshot');
      const sensors = Object.keys(snapshot.sensors || {});
      set({ availableSensors: sensors, availableSensorsLoading: false });
    } catch {
      set({ availableSensors: [], availableSensorsLoading: false });
    }
  },

  // ==========================================================================
  // Plant Survey Actions
  // ==========================================================================

  setPlantSurveyData: (data) => set({ plantSurveyData: data }),

  importFromPlantSurvey: () => {
    const { plantSurveyData } = get();
    if (!plantSurveyData) return;

    const { config, clientName, surveyMetadata, plantInfo } = parsePlantSurvey(plantSurveyData);
    set((state) => ({
      setupData: {
        ...state.setupData,
        sensors_config: config,
        client_name: clientName,
        survey_metadata: surveyMetadata,
        plant_info: plantInfo,
        installation: {
          ...state.setupData.installation,
          name: state.setupData.installation.name || clientName,
        },
      },
    }));
  },

  // ==========================================================================
  // Helper Functions
  // ==========================================================================

  isSetupComplete: () => {
    const { status } = get();
    return status?.setup_completed ?? false;
  },

  canAccessPage: (pageId) => {
    const { config } = get();
    if (!config) return true; // Default to true if no config
    return config.pages_config.enabled.includes(pageId as never);
  },

  getEnabledSensors: () => {
    const { config } = get();
    return config?.sensors_config ?? null;
  },

  getTheme: () => {
    const { config } = get();
    if (!config) {
      return { primary: '#0D9488', secondary: '#0EA5E9', accent: '#F59E0B', template: 'scada' };
    }
    return {
      primary: config.theme_primary,
      secondary: config.theme_secondary,
      accent: config.theme_accent,
      template: config.theme_variant,
    };
  },
}));
