/**
 * useSensorsConfig Hook
 * Provides config-driven sensor configuration from installation settings.
 * Falls back to hardcoded defaults when no installation config exists.
 *
 * This enables multi-client support by reading sensor mappings from the
 * installation configuration instead of hardcoded SWAT-specific files.
 */

import { useMemo, useCallback } from 'react';
import { useInstallationStore } from '@/stores/installationStore';
import type { SensorsConfig, SensorMapping, SensorCategory, ProcessTopology } from '@/types/installation';
import {
  SENSOR_MAPPING,
  SENSOR_REVERSE_MAPPING,
} from '@/config/sensors';
import { INDUSTRIAL_SENSORS, PROCESS_AREAS } from '@/config/industrial-sensors';

/**
 * Extended sensor mapping with ISA-compliant fields
 */
export interface ExtendedSensorMapping extends SensorMapping {
  alarm_hh?: number;
  alarm_h?: number;
  alarm_l?: number;
  alarm_ll?: number;
  criticality?: 'HIGH' | 'MEDIUM' | 'LOW';
  process_area?: string;
}

/**
 * Extended sensors config with ISA fields
 */
export interface ExtendedSensorsConfig extends Omit<SensorsConfig, 'mapping'> {
  mapping: Record<string, ExtendedSensorMapping>;
}

/**
 * Build default sensors config from hardcoded SWAT files.
 * This serves as the fallback when no installation config exists.
 */
function buildDefaultSensorsConfig(): ExtendedSensorsConfig {
  const mapping: Record<string, ExtendedSensorMapping> = {};

  // Build mapping from INDUSTRIAL_SENSORS (has full ISA data)
  for (const [tag, sensor] of Object.entries(INDUSTRIAL_SENSORS)) {
    mapping[tag] = {
      thingsboard_key: sensor.thingsboardKey || SENSOR_MAPPING[tag] || tag,
      display_name: sensor.description.short,
      unit: sensor.engineering.unit,
      min: sensor.operatingLimits.normal.min,
      max: sensor.operatingLimits.normal.max,
      alarm_hh: sensor.alarmLimits.HH,
      alarm_h: sensor.alarmLimits.H,
      alarm_l: sensor.alarmLimits.L,
      alarm_ll: sensor.alarmLimits.LL,
      criticality: sensor.operational.criticality,
      process_area: sensor.processArea,
    };
  }

  // Add actuators from PROCESS_AREAS (not in INDUSTRIAL_SENSORS but part of the plant)
  for (const area of Object.values(PROCESS_AREAS)) {
    for (const actuator of area.actuators) {
      if (!mapping[actuator]) {
        mapping[actuator] = {
          thingsboard_key: SENSOR_MAPPING[actuator] || actuator,
          display_name: actuator,
          unit: 'status',
          process_area: area.id,
        };
      }
    }
  }

  // Add remaining SENSOR_MAPPING entries not yet in mapping (e.g., stage 2/3 extras)
  for (const [tag, tbKey] of Object.entries(SENSOR_MAPPING)) {
    if (!mapping[tag] && /^[A-Z]+\d{3,4}[A-Z]?$/.test(tag)) {
      mapping[tag] = {
        thingsboard_key: tbKey,
        display_name: tag,
        unit: tag.match(/^(MV|P\d|UV)/) ? 'status' : undefined,
      };
    }
  }

  // Build categories from PROCESS_AREAS
  const categories: SensorCategory[] = Object.values(PROCESS_AREAS).map((area) => ({
    id: area.id,
    name: area.fullName,
    expanded: area.id === 'P1',
    sensors: [...area.sensors, ...area.actuators],
  }));

  // Default selected sensors
  const defaultSelected = ['LIT101', 'FIT101', 'AIT201'];

  // Plant-agnostic fallback topology: linear chain of whatever categories
  // we just built. Real topologies (with branches like Backwash) come from
  // the survey via plantSurveyParser.buildTopology() and are persisted in
  // installation_config.sensors_config.topology.
  const topology: ProcessTopology = {
    mainFlow: categories.map((c) => c.id),
    branches: [],
  };

  return {
    categories,
    mapping,
    defaultSelected,
    topology,
  };
}

// Cached default config to avoid rebuilding on every render
let cachedDefaultConfig: ExtendedSensorsConfig | null = null;

function getDefaultConfig(): ExtendedSensorsConfig {
  if (!cachedDefaultConfig) {
    cachedDefaultConfig = buildDefaultSensorsConfig();
  }
  return cachedDefaultConfig;
}

/**
 * Result type for useSensorsConfig hook
 */
export interface SensorsConfigResult {
  /** The active sensors configuration (from installation or defaults) */
  sensorsConfig: ExtendedSensorsConfig;

  /** Whether using fallback defaults (no installation config) */
  usingDefaults: boolean;

  /** Map a raw ThingsBoard key to its display name */
  mapToDisplayName: (rawKey: string) => string | undefined;

  /** Check if a sensor tag is configured */
  isSensorConfigured: (tag: string) => boolean;

  /** Get sensor mapping by display name/tag */
  getSensorMapping: (tag: string) => ExtendedSensorMapping | undefined;

  /** Get all categories */
  categories: SensorCategory[];

  /** Get sensors by process area */
  getSensorsByProcessArea: (processArea: string) => string[];

  /** Get sensor range (min/max/unit) */
  getSensorRange: (tag: string) => { min?: number; max?: number; unit?: string } | undefined;

  /** Get alarm limits for a sensor */
  getAlarmLimits: (tag: string) => {
    hh?: number;
    h?: number;
    l?: number;
    ll?: number;
  } | undefined;

  /** Get a human-readable label for a mapping tag (e.g. "fit101_pv" -> "FIT101") */
  getDisplayLabel: (tag: string) => string;

  /** Get all configured sensor tags */
  getConfiguredTags: () => string[];

  /** Process topology (mainFlow + branches) from config */
  topology: ProcessTopology | undefined;
}

/**
 * Hook for config-driven sensor configuration.
 *
 * Priorities:
 * 1. Installation config from backend (if exists and has sensors_config)
 * 2. Hardcoded SWAT defaults (fallback)
 *
 * @returns Sensor configuration and helper functions
 */
export function useSensorsConfig(): SensorsConfigResult {
  const config = useInstallationStore((state) => state.config);

  // Determine which config to use
  const { sensorsConfig, usingDefaults } = useMemo(() => {
    // Check if installation has a valid sensors config
    const installationSensors = config?.sensors_config;
    if (
      installationSensors &&
      typeof installationSensors === 'object' &&
      Object.keys(installationSensors.mapping || {}).length > 0
    ) {
      return {
        sensorsConfig: installationSensors as ExtendedSensorsConfig,
        usingDefaults: false,
      };
    }

    // Fall back to defaults
    return {
      sensorsConfig: getDefaultConfig(),
      usingDefaults: true,
    };
  }, [config?.sensors_config]);

  // Build reverse mapping: thingsboard_key -> display_name (tag)
  const reverseMapping = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [tag, mapping] of Object.entries(sensorsConfig.mapping)) {
      if (mapping.thingsboard_key) {
        map[mapping.thingsboard_key] = tag;
      }
    }
    return map;
  }, [sensorsConfig.mapping]);

  // Map a raw ThingsBoard key to display name
  const mapToDisplayName = useCallback(
    (rawKey: string): string | undefined => {
      // Idempotent: if the caller already passed a configured tag (e.g. the
      // parser-produced sensor id like 'fit101_pv'), trust it. Without this
      // the function would reject its own output, breaking the click-filter
      // when telemetry hasn't arrived yet and sensor.key still equals tag.
      if (sensorsConfig.mapping[rawKey]) return rawKey;

      // Strip device prefix: "DeviceName.SensorKey" -> "SensorKey"
      let normalizedKey = rawKey;
      const dotIndex = rawKey.indexOf('.');
      if (dotIndex > 0 && rawKey.includes('_Sensors.')) {
        normalizedKey = rawKey.substring(dotIndex + 1);
      }

      // Try direct lookup in reverse mapping
      let displayName = reverseMapping[normalizedKey];
      if (displayName) return displayName;

      // Try original key
      if (normalizedKey !== rawKey) {
        displayName = reverseMapping[rawKey];
        if (displayName) return displayName;
      }

      // Strip common suffixes and try again
      const suffixPatterns = [/_PV$/i, /_STATUS$/i, /_ALARM$/i, /_STATE$/i, /\.Value$/i, /\.Pv\.Value$/i];
      for (const pattern of suffixPatterns) {
        const stripped = normalizedKey.replace(pattern, '');
        if (stripped !== normalizedKey) {
          displayName = reverseMapping[stripped];
          if (displayName) return displayName;
        }
      }

      // Try pattern matching for ISA sensor names
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
          const candidateTag = `${prefix}${match[1]}`;
          if (sensorsConfig.mapping[candidateTag]) {
            return candidateTag;
          }
        }
      }

      // If using defaults, also try the legacy SENSOR_REVERSE_MAPPING
      // (includes actuators and other keys not in INDUSTRIAL_SENSORS)
      if (usingDefaults) {
        const legacyName = SENSOR_REVERSE_MAPPING[normalizedKey];
        if (legacyName) {
          return legacyName;
        }
      }

      return undefined;
    },
    [reverseMapping, sensorsConfig.mapping, usingDefaults]
  );

  // Check if a sensor tag is configured
  const isSensorConfigured = useCallback(
    (tag: string): boolean => {
      return tag in sensorsConfig.mapping;
    },
    [sensorsConfig.mapping]
  );

  // Get sensor mapping by tag
  const getSensorMapping = useCallback(
    (tag: string): ExtendedSensorMapping | undefined => {
      return sensorsConfig.mapping[tag];
    },
    [sensorsConfig.mapping]
  );

  // Get sensors by process area
  const getSensorsByProcessArea = useCallback(
    (processArea: string): string[] => {
      const category = sensorsConfig.categories.find((c) => c.id === processArea);
      if (category) {
        return category.sensors;
      }

      // Fallback: filter by mapping's process_area field
      return Object.entries(sensorsConfig.mapping)
        .filter(([, mapping]) => mapping.process_area === processArea)
        .map(([tag]) => tag);
    },
    [sensorsConfig.categories, sensorsConfig.mapping]
  );

  // Get sensor range
  const getSensorRange = useCallback(
    (tag: string): { min?: number; max?: number; unit?: string } | undefined => {
      const mapping = sensorsConfig.mapping[tag];
      if (!mapping) return undefined;

      return {
        min: mapping.min,
        max: mapping.max,
        unit: mapping.unit,
      };
    },
    [sensorsConfig.mapping]
  );

  // Get alarm limits
  const getAlarmLimits = useCallback(
    (tag: string): { hh?: number; h?: number; l?: number; ll?: number } | undefined => {
      const mapping = sensorsConfig.mapping[tag];
      if (!mapping) return undefined;

      return {
        hh: mapping.alarm_hh,
        h: mapping.alarm_h,
        l: mapping.alarm_l,
        ll: mapping.alarm_ll,
      };
    },
    [sensorsConfig.mapping]
  );

  // Get a human-readable label for a mapping tag
  const getDisplayLabel = useCallback(
    (tag: string): string => {
      const mapping = sensorsConfig.mapping[tag];
      if (!mapping) return tag;

      // Extract clean ISA name from the thingsboard_key (e.g. "FIT101_PV" -> "FIT101")
      const tbKey = mapping.thingsboard_key || tag;
      const cleaned = tbKey.replace(/_(PV|STATE|STATUS|ALARM)$/i, '').toUpperCase();
      if (cleaned && cleaned !== tbKey.toUpperCase()) return cleaned;

      // Fallback: try ISA pattern on tag itself
      const isaMatch = tag.match(/^([A-Za-z]+\d+)/);
      if (isaMatch) return isaMatch[1].toUpperCase();

      return mapping.display_name || tag;
    },
    [sensorsConfig.mapping]
  );

  // Get all configured tags
  const getConfiguredTags = useCallback((): string[] => {
    return Object.keys(sensorsConfig.mapping);
  }, [sensorsConfig.mapping]);

  return {
    sensorsConfig,
    usingDefaults,
    mapToDisplayName,
    isSensorConfigured,
    getSensorMapping,
    categories: sensorsConfig.categories,
    getSensorsByProcessArea,
    getSensorRange,
    getAlarmLimits,
    getDisplayLabel,
    getConfiguredTags,
    topology: sensorsConfig.topology,
  };
}

export default useSensorsConfig;
