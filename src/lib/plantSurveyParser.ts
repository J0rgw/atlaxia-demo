/**
 * Parses a PlantSurvey JSON into SensorsConfig structure.
 * Pure function: no side effects.
 */

import type { PlantSurvey, PlantSurveySensor } from '@/types/plantSurvey';
import type {
  SensorCategory,
  SensorMapping,
  SensorsConfig,
  ProcessTopology,
  ProcessNode,
  ProcessEdge,
  PlantSurveyMetadata,
  PlantSurveyPlantInfo,
} from '@/types/installation';
import { classifyEdges, longestPath } from './processGraph';

export interface ParseStats {
  totalSensors: number;
  processCount: number;
  bySensorType: Record<string, number>;
  byVariableType: Record<string, number>;
  byInstrumentRole: Record<string, number>;
  perProcess: Record<string, number>;
  hasEquipment: boolean;
}

export interface ParseResult {
  config: SensorsConfig;
  stats: ParseStats;
  plantName: string;
  clientName: string;
  surveyMetadata: PlantSurveyMetadata | null;
  plantInfo: PlantSurveyPlantInfo | null;
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function generateSensorId(sensorName: string): string {
  return sensorName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

function mapCausality(c?: string): 'endogenous' | 'exogenous' | undefined {
  if (c === 'interna') return 'endogenous';
  if (c === 'externa') return 'exogenous';
  return c as 'endogenous' | 'exogenous' | undefined;
}

function mapVariableType(vt: string): 'continuous' | 'binary' | 'categorical' {
  switch (vt) {
    case 'continuous': return 'continuous';
    case 'binary': return 'binary';
    case 'discrete': return 'continuous';
    case 'qualitative': return 'categorical';
    default: return 'continuous';
  }
}

function mapSensor(sensor: PlantSurveySensor, processName: string): SensorMapping {
  return {
    thingsboard_key: sensor.sensor_name,
    display_name: sensor.sensor_alias || sensor.sensor_name,
    unit: sensor.unit,
    min: sensor.min_value ?? undefined,
    max: sensor.max_value ?? undefined,
    process_area: processName,
    sensor_type: sensor.sensor_type,
    variable_type: mapVariableType(sensor.variable_type),
    instrument_role: sensor.instrument_role,
    description: sensor.description,
    causality: mapCausality(sensor.causality as string),
    categorical_values: sensor.categorical_values,
    equipment_name: sensor.equipment_name,
    preprocessing: sensor.preprocessing ?? undefined,
    known_data_issues: sensor.known_data_issues ?? undefined,
    notes: sensor.notes ?? undefined,
  };
}

function asList(v: string | string[] | null | undefined): string[] {
  if (v == null) return [];
  return Array.isArray(v) ? v.filter((s) => !!s) : v ? [v] : [];
}

function buildTopology(
  processes: PlantSurvey['plants'][0]['processes'],
  slugifyFn: (s: string) => string,
): ProcessTopology | undefined {
  const hasTopologyData = processes.some(
    (p) => asList(p.siguiente_proceso).length > 0 || asList(p.rama_de).length > 0,
  );
  if (!hasTopologyData) return undefined;

  const nameToSlug = new Map<string, string>();
  for (const p of processes) nameToSlug.set(p.process_name, slugifyFn(p.process_name));
  const resolve = (name: string) => nameToSlug.get(name) || slugifyFn(name);

  // ---- Graph view: build nodes + edges, then classify cycles ----
  const nodes: ProcessNode[] = processes.map((p) => ({
    id: resolve(p.process_name),
    label: p.process_name,
    kind: 'process',
    meta: p.process_description ? { description: p.process_description } : undefined,
  }));

  const rawEdges: ProcessEdge[] = [];
  for (const p of processes) {
    const from = resolve(p.process_name);
    for (const next of asList(p.siguiente_proceso)) {
      const to = resolve(next);
      rawEdges.push({ id: `flow_${from}__${to}`, from, to, kind: 'flow' });
    }
    for (const parent of asList(p.rama_de)) {
      const parentId = resolve(parent);
      // Parent → branch as a flow edge; the branch may also point back via
      // siguiente_proceso, in which case cycle detection retags it as recycle.
      rawEdges.push({
        id: `flow_${parentId}__${from}`,
        from: parentId,
        to: from,
        kind: 'flow',
        label: p.process_name,
      });
    }
  }

  // Dedupe edges by id (a branch's parent flow + the parent's own
  // siguiente_proceso pointing at the branch would otherwise emit twice).
  const seenEdgeIds = new Set<string>();
  const dedupedEdges = rawEdges.filter((e) => {
    if (seenEdgeIds.has(e.id)) return false;
    seenEdgeIds.add(e.id);
    return true;
  });

  const edges = classifyEdges(dedupedEdges);

  // ---- Legacy view: mainFlow + branches derived from the graph ----
  const mainFlow = longestPath(nodes, edges);
  const mainSet = new Set(mainFlow);

  const branches: ProcessTopology['branches'] = [];
  for (const e of edges) {
    if (e.kind !== 'flow' && e.kind !== 'recycle' && e.kind !== 'feedback') continue;
    // Side branch: target is a process node not on the main trunk.
    if (e.kind === 'flow' && mainSet.has(e.from) && !mainSet.has(e.to)) {
      branches.push({ processId: e.to, connectsTo: e.from, label: e.label });
    }
    // Feedback/recycle: source is on the trunk, target is also on the trunk.
    if ((e.kind === 'feedback' || e.kind === 'recycle') && mainSet.has(e.from) && mainSet.has(e.to)) {
      branches.push({ processId: e.from, connectsTo: e.to, label: e.label });
    }
  }

  return { mainFlow, branches, nodes, edges };
}

export function parsePlantSurvey(survey: PlantSurvey, plantIndex = 0): ParseResult {
  const plant = survey.plants[plantIndex];
  if (!plant) {
    throw new Error(`Plant index ${plantIndex} not found. Available: ${survey.plants.length}`);
  }

  const categories: SensorCategory[] = [];
  const mapping: Record<string, SensorMapping> = {};
  const stats: ParseStats = {
    totalSensors: 0,
    processCount: plant.processes.length,
    bySensorType: {},
    byVariableType: {},
    byInstrumentRole: {},
    perProcess: {},
    hasEquipment: false,
  };

  for (const process of plant.processes) {
    const categoryId = slugify(process.process_name);
    const sensorIds: string[] = [];

    for (const sensor of process.sensors) {
      const sensorId = generateSensorId(sensor.sensor_name);
      mapping[sensorId] = mapSensor(sensor, process.process_name);
      sensorIds.push(sensorId);

      stats.totalSensors++;
      if (sensor.sensor_type) {
        stats.bySensorType[sensor.sensor_type] = (stats.bySensorType[sensor.sensor_type] || 0) + 1;
      }
      stats.byVariableType[sensor.variable_type] = (stats.byVariableType[sensor.variable_type] || 0) + 1;
      if (sensor.instrument_role) {
        stats.byInstrumentRole[sensor.instrument_role] = (stats.byInstrumentRole[sensor.instrument_role] || 0) + 1;
      }
      if (sensor.equipment_name) {
        stats.hasEquipment = true;
      }
    }

    stats.perProcess[process.process_name] = sensorIds.length;

    categories.push({
      id: categoryId,
      name: process.process_name,
      expanded: true,
      sensors: sensorIds,
    });
  }

  // Build topology from siguiente_proceso / rama_de fields
  const topology = buildTopology(plant.processes, slugify);

  return {
    config: {
      categories,
      mapping,
      defaultSelected: [],
      topology,
    },
    stats,
    plantName: plant.plant_name,
    clientName: survey.client_name,
    surveyMetadata: survey.survey_metadata ?? null,
    plantInfo: {
      plant_name: plant.plant_name,
      location: plant.location ?? undefined,
      industrial_diagram: plant.industrial_diagram ?? undefined,
      scada_system: plant.scada_system ?? undefined,
    },
  };
}

export function validatePlantSurvey(data: unknown): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'El archivo no contiene un JSON valido' };
  }

  const obj = data as Record<string, unknown>;

  if (!obj.schema_version || typeof obj.schema_version !== 'string') {
    return { valid: false, error: 'Falta schema_version en el JSON' };
  }

  if (!obj.client_name || typeof obj.client_name !== 'string') {
    return { valid: false, error: 'Falta client_name en el JSON' };
  }

  if (!Array.isArray(obj.plants) || obj.plants.length === 0) {
    return { valid: false, error: 'El JSON debe contener al menos una planta en "plants"' };
  }

  const plant = obj.plants[0] as Record<string, unknown>;
  if (!plant.plant_name) {
    return { valid: false, error: 'La planta debe tener un plant_name' };
  }

  if (!Array.isArray(plant.processes) || plant.processes.length === 0) {
    return { valid: false, error: 'La planta debe contener al menos un proceso' };
  }

  let totalSensors = 0;
  for (const proc of plant.processes as Record<string, unknown>[]) {
    if (!proc.process_name) {
      return { valid: false, error: 'Cada proceso debe tener process_name' };
    }
    if (Array.isArray(proc.sensors)) {
      totalSensors += proc.sensors.length;
    }
  }

  if (totalSensors === 0) {
    return { valid: false, error: 'La planta debe contener al menos un sensor' };
  }

  return { valid: true };
}
