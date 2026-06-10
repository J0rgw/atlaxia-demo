# Sensors

ISA-compliant sensor catalog, runtime configuration, and the contract with backend training/inference.

> **Supersedes:** `_archive/INDUSTRIAL_SENSOR_ARCHITECTURE.md`, `_archive/FRONTEND_DESIGN_DECISIONS.md` (data-layer sections).

## Two-tier configuration

The frontend reads sensor configuration from two sources, in order:

1. **Installation config** — `installation_config.sensors_config`, built by the setup wizard (typically from a plant-survey JSON). This is the authoritative runtime source per installation.
2. **Hardcoded SWaT defaults** — `src/config/industrial-sensors.ts` + `src/config/sensors.ts`. Used as a fallback when no installation config is loaded (dev, demo, or before login).

`src/hooks/useSensorsConfig.ts` decides at runtime: if `installation.sensors_config.mapping` is non-empty, use it; otherwise build the fallback from the hardcoded files. It exposes `usingDefaults: boolean` so the UI can warn.

```ts
const { sensorsConfig, usingDefaults, getSensorMapping, getAlarmLimits, ... } = useSensorsConfig();
```

This is the **only** sensor accessor components should use. Don't import `INDUSTRIAL_SENSORS` directly in components — it bakes in SWaT and ignores per-installation overrides.

## ISA standards in play

| Standard | Use |
|---|---|
| **ISA 5.1** (Instrumentation Symbols) | Tag naming and instrument types (`LIT`, `FIT`, `PIT`, `AIT`, `DPIT`, `MV`, `P`, `UV`, `LS`, `LSH`, `LSL`) — enum in `src/types/industrial.ts:InstrumentType` |
| **ISA-18.2** (Alarm Management) | Four-limit alarm model (`HH`/`H`/`L`/`LL`), priority levels (`EMERGENCY`/`HIGH`/`MEDIUM`/`LOW`) |
| **ISA-101** (HMI Design) | Status color taxonomy (`normal`/`advisory`/`warning`/`critical`/`emergency`) — see `src/styles/themes/scada.css`. Frontend rendering only; data model uses ISA-18.2 |
| **OPC UA** (Data Quality) | Quality flag (`GOOD`/`BAD`/`UNCERTAIN`) on telemetry points |

## SensorMapping schema

Authoritative type in `src/types/installation.ts`. Per sensor:

```ts
{
  thingsboard_key: string;           // raw key from ThingsBoard telemetry
  display_name: string;              // human label

  // Engineering
  unit?: string;                     // SI unit (mm, m3/h, kPa, ...)
  min?: number;                      // normal operating range
  max?: number;

  // ISA-18.2 alarm limits
  alarm_hh?: number;                 // High-High (emergency)
  alarm_h?: number;                  // High (warning)
  alarm_l?: number;                  // Low (warning)
  alarm_ll?: number;                 // Low-Low (emergency)

  // Industrial metadata
  criticality?: 'HIGH' | 'MEDIUM' | 'LOW';
  process_area?: string;             // P1, P2, ... (matches SensorsConfig.categories[].id)

  // Plant-survey metadata
  sensor_type?: string;
  variable_type?: 'continuous' | 'binary' | 'categorical';
  instrument_role?: 'sensor' | 'actuator' | 'setpoint' | 'alarm';
  description?: string;
  causality?: 'endogenous' | 'exogenous';
  categorical_values?: string[];
  equipment_name?: string;
  preprocessing?: string;
  known_data_issues?: string;
  notes?: string;
}
```

`ExtendedSensorMapping` (in `useSensorsConfig.ts`) is the same type with the alarm/criticality/area fields hoisted to required-but-optional — purely a TS narrowing convenience.

## SensorsConfig schema

```ts
{
  categories: SensorCategory[];                  // process groupings
  mapping: Record<tag, SensorMapping>;
  defaultSelected: string[];                     // sensors checked by default in UI selectors
  topology?: {
    mainFlow: string[];                          // ordered process IDs (P1 -> P2 -> ...)
    branches: { processId, connectsTo, label }[];
    nodes?: ProcessNode[];                       // optional explicit graph
    edges?: ProcessEdge[];
  };
}
```

The topology drives the process-flow widgets (`ProcessStrip`, `ProcessFlowWidget`). When the plant survey provides explicit `nodes`/`edges`, they take precedence over the linear `mainFlow`/`branches` shorthand.

## Hardcoded SWaT fallback

`src/config/industrial-sensors.ts` has the `INDUSTRIAL_SENSORS` catalog — currently **28 sensors** (the file header still says "51" — it's stale, the actual count is 28 + actuators from `PROCESS_AREAS`). Process areas:

| ID | Stage |
|---|---|
| P1 | Captación (raw water intake) |
| P2 | Dosificación química |
| P3 | Filtración por ultrafiltración |
| P4 | Tanque de agua tratada |
| P5 | Ósmosis inversa |
| P6 | Almacenamiento/distribución |

`src/config/sensors.ts` has the ThingsBoard key mapping:

- `SENSOR_MAPPING` — ISA tag → raw TB key (e.g. `LIT101` → `lit101_pv`)
- `SENSOR_REVERSE_MAPPING` — inverse, built from `SENSOR_MAPPING` at load
- `SENSOR_RANGES` — operating ranges for quick lookups
- `PROCESS_CATEGORIES` — sensor groupings by stage

All of these are used **only** when no installation config exists. In production each customer has their own `sensors_config` from the setup wizard.

## Runtime helpers (useSensorsConfig)

```ts
const {
  sensorsConfig,                  // ExtendedSensorsConfig
  usingDefaults,                  // boolean — true when no installation config
  topology,                       // ProcessTopology | undefined

  // Lookup
  isSensorConfigured(tag),
  getSensorMapping(tag),          // ExtendedSensorMapping | undefined
  getConfiguredTags(),

  // Display
  getDisplayLabel(tag),           // 'fit101_pv' -> 'FIT101'
  mapToDisplayName(rawKey),       // robust ThingsBoard key -> ISA tag

  // Engineering
  getSensorRange(tag),            // { min?, max?, unit? }
  getAlarmLimits(tag),            // { hh?, h?, l?, ll? }

  // Grouping
  categories,                     // SensorCategory[]
  getSensorsByProcessArea(id),
} = useSensorsConfig();
```

### `mapToDisplayName` — fallback ladder

Telemetry arrives with raw keys; the UI wants ISA tags. `mapToDisplayName(raw)` tries, in order:

1. Identity — if `raw` is already a configured tag, return as-is.
2. Strip device prefix — `Device.SensorKey` → `SensorKey` (only when name contains `_Sensors.`).
3. Direct reverse-map lookup.
4. Strip common suffixes (`_PV`, `_STATUS`, `_ALARM`, `_STATE`, `.Value`, `.Pv.Value`).
5. ISA pattern match — extract `LIT|FIT|AIT|PIT|DPIT|MV|P|UV` + digits and look up.
6. If `usingDefaults`, fall back to legacy `SENSOR_REVERSE_MAPPING` (includes actuators).

If none match, returns `undefined`. Callers should treat that as "ignore this telemetry key" — it's not in the configured set.

## Plant-survey importer

`src/lib/plantSurveyParser.ts:parsePlantSurvey()` is the bridge between a customer's plant survey JSON and a `SensorsConfig`. It produces:

```ts
{
  config: SensorsConfig,        // mapping + categories + topology
  clientName: string,
  surveyMetadata: PlantSurveyMetadata,
  plantInfo: PlantSurveyPlantInfo,
  stats: ParseStats
}
```

The wizard's Sensors step calls this through `installationStore.importFromPlantSurvey()`. The parser also builds the topology graph from documented connections.

The survey is the place where per-customer details land: `variable_type`, `instrument_role`, `causality`, `categorical_values`, `equipment_name`, alarm limits. None of these need to come from a survey — they can be edited in the wizard's Sensors step — but the survey is the path of least resistance.

## Backend contract (training/inference)

The frontend's sensor model is the **input** to ML training and inference. The backend enforces invariants that the frontend must respect:

- **BINARY = exactly 2 distinct integer values, regardless of range.** `{0,1}` and `{3,5}` both classify as binary; MinMax maps them uniformly to `[0,1]`. Plant survey `variable_type` overrides always win over inference-time guessing.
- **Asymmetric layout cardinality.** Inference rejects EXTRA sensors not in the trained layout (`ValueError`), but tolerates MISSING ones via `raw=0.0` imputation + WARN. So *adding* sensors to a configured install requires retraining; *losing* one degrades gracefully.
- **Training refuses to run on PG (the data pipeline) without an explicit normal-regime boundary.** The frontend doesn't enforce this — but if you ship a `sensors_config` that includes simulated attack data, training will fail until `manifest.normal_rows` or `normal_duration_hours` is set.

These rules are restated here because the frontend's choices (which sensors to include, how to classify variable types, when to add/remove sensors) feed directly into them. See project root `CLAUDE.md` "Absolute Rules" for the canonical wording.

## Status taxonomy (UI)

ISA-101 five-level model in `src/styles/themes/scada.css`:

```
--status-normal     (operating within range)
--status-advisory   (informational, no alarm)
--status-warning    (H or L crossed)
--status-critical   (HH or LL crossed, high-priority)
--status-emergency  (immediate intervention)
```

Each has a `*-muted` variant for backgrounds. Components consume via `var(--status-*)`, never raw Tailwind color classes (`text-amber-500`, `bg-emerald-100`, etc. are explicit anti-patterns — see `src/front/CLAUDE.md`).

`Badge.tsx` and the chart palette (`src/lib/echarts-theme.ts`) drive all status rendering through these tokens.

## Editing or extending

- **Add a sensor field** → extend `SensorMapping` in `src/types/installation.ts`. If it should round-trip through the survey, branch in `plantSurveyParser.ts`. If it should be settable in the wizard, surface in `SensorRow.tsx`.
- **Add an instrument type** → extend `InstrumentType` enum in `src/types/industrial.ts` and the regex set in `useSensorsConfig.mapToDisplayName`.
- **New process area** → no enum to update; `process_area` is a free-form string. The category just needs an entry in `sensors_config.categories` (which the survey importer does automatically).
- **Override SWaT defaults globally** → don't. Add a survey-based config for each install. The hardcoded files are a dev convenience, not a target.
