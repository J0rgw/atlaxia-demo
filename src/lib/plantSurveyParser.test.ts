import { describe, it, expect } from 'vitest'
import { parsePlantSurvey, validatePlantSurvey } from './plantSurveyParser'
import type { PlantSurvey } from '@/types/plantSurvey'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeMinimalSurvey(overrides?: Partial<PlantSurvey>): PlantSurvey {
  return {
    schema_version: '1.0',
    client_name: 'TestClient',
    plants: [
      {
        plant_name: 'TestPlant',
        processes: [
          {
            process_name: 'P1 Intake',
            sensors: [
              {
                sensor_name: 'FIT101',
                sensor_alias: 'Flow Inlet',
                sensor_type: 'flow',
                unit: 'm3/h',
                description: 'Main inlet flow',
                variable_type: 'continuous',
                instrument_role: 'sensor',
                min_value: 0,
                max_value: 100,
                causality: 'interna',
              },
              {
                sensor_name: 'MV101',
                variable_type: 'binary',
                instrument_role: 'actuator',
                equipment_name: 'Pump-1',
              },
            ],
          },
          {
            process_name: 'P2 Treatment',
            sensors: [
              {
                sensor_name: 'AIT201',
                variable_type: 'continuous',
                sensor_type: 'pH',
                unit: 'pH',
                instrument_role: 'sensor',
              },
            ],
          },
        ],
      },
    ],
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// parsePlantSurvey
// ---------------------------------------------------------------------------

describe('parsePlantSurvey', () => {
  it('parses a valid survey and returns correct structure', () => {
    const survey = makeMinimalSurvey()
    const result = parsePlantSurvey(survey)

    expect(result.clientName).toBe('TestClient')
    expect(result.plantName).toBe('TestPlant')
    expect(result.config.categories).toHaveLength(2)
    expect(result.config.defaultSelected).toEqual([])
  })

  it('creates categories from processes with slugified ids', () => {
    const result = parsePlantSurvey(makeMinimalSurvey())
    const ids = result.config.categories.map((c) => c.id)

    expect(ids).toContain('p1_intake')
    expect(ids).toContain('p2_treatment')
  })

  it('maps sensors into the mapping dict with correct keys', () => {
    const result = parsePlantSurvey(makeMinimalSurvey())
    const keys = Object.keys(result.config.mapping)

    expect(keys).toContain('fit101')
    expect(keys).toContain('mv101')
    expect(keys).toContain('ait201')
  })

  it('maps sensor fields correctly', () => {
    const result = parsePlantSurvey(makeMinimalSurvey())
    const fit101 = result.config.mapping['fit101']

    expect(fit101.thingsboard_key).toBe('FIT101')
    expect(fit101.display_name).toBe('Flow Inlet')
    expect(fit101.unit).toBe('m3/h')
    expect(fit101.min).toBe(0)
    expect(fit101.max).toBe(100)
    expect(fit101.process_area).toBe('P1 Intake')
    expect(fit101.sensor_type).toBe('flow')
    expect(fit101.variable_type).toBe('continuous')
    expect(fit101.instrument_role).toBe('sensor')
    expect(fit101.description).toBe('Main inlet flow')
    expect(fit101.causality).toBe('endogenous')
  })

  it('maps causality values correctly (interna -> endogenous, externa -> exogenous)', () => {
    const survey = makeMinimalSurvey()
    survey.plants[0].processes[0].sensors[0].causality = 'externa'
    const result = parsePlantSurvey(survey)

    expect(result.config.mapping['fit101'].causality).toBe('exogenous')
  })

  it('maps variable_type "discrete" to "continuous"', () => {
    const survey = makeMinimalSurvey()
    survey.plants[0].processes[0].sensors[0].variable_type = 'discrete'
    const result = parsePlantSurvey(survey)

    expect(result.config.mapping['fit101'].variable_type).toBe('continuous')
  })

  it('maps variable_type "qualitative" to "categorical"', () => {
    const survey = makeMinimalSurvey()
    survey.plants[0].processes[0].sensors[0].variable_type = 'qualitative'
    const result = parsePlantSurvey(survey)

    expect(result.config.mapping['fit101'].variable_type).toBe('categorical')
  })

  it('computes correct stats', () => {
    const result = parsePlantSurvey(makeMinimalSurvey())
    const { stats } = result

    expect(stats.totalSensors).toBe(3)
    expect(stats.processCount).toBe(2)
    expect(stats.perProcess['P1 Intake']).toBe(2)
    expect(stats.perProcess['P2 Treatment']).toBe(1)
    expect(stats.bySensorType['flow']).toBe(1)
    expect(stats.bySensorType['pH']).toBe(1)
    expect(stats.byVariableType['continuous']).toBe(2)
    expect(stats.byVariableType['binary']).toBe(1)
    expect(stats.byInstrumentRole['sensor']).toBe(2)
    expect(stats.byInstrumentRole['actuator']).toBe(1)
    expect(stats.hasEquipment).toBe(true)
  })

  it('sets hasEquipment to false when no sensor has equipment_name', () => {
    const survey = makeMinimalSurvey()
    // Remove equipment_name from the only sensor that has it
    delete survey.plants[0].processes[0].sensors[1].equipment_name
    const result = parsePlantSurvey(survey)

    expect(result.stats.hasEquipment).toBe(false)
  })

  it('uses sensor_name as display_name when sensor_alias is absent', () => {
    const survey = makeMinimalSurvey()
    delete survey.plants[0].processes[0].sensors[0].sensor_alias
    const result = parsePlantSurvey(survey)

    expect(result.config.mapping['fit101'].display_name).toBe('FIT101')
  })

  it('includes survey_metadata when present', () => {
    const survey = makeMinimalSurvey({
      survey_metadata: {
        survey_date: '2026-01-15',
        technician_name: 'Juan',
      },
    })
    const result = parsePlantSurvey(survey)

    expect(result.surveyMetadata).toEqual({
      survey_date: '2026-01-15',
      technician_name: 'Juan',
    })
  })

  it('returns null surveyMetadata when not present', () => {
    const result = parsePlantSurvey(makeMinimalSurvey())

    expect(result.surveyMetadata).toBeNull()
  })

  it('returns plantInfo with location data', () => {
    const survey = makeMinimalSurvey()
    survey.plants[0].location = {
      address: 'Calle Industrial 1',
      municipality: 'Cartagena',
      province: 'Murcia',
      country: 'Spain',
    }
    const result = parsePlantSurvey(survey)

    expect(result.plantInfo?.plant_name).toBe('TestPlant')
    expect(result.plantInfo?.location?.municipality).toBe('Cartagena')
  })

  it('throws when plantIndex is out of bounds', () => {
    const survey = makeMinimalSurvey()

    expect(() => parsePlantSurvey(survey, 5)).toThrowError(
      /Plant index 5 not found/
    )
  })

  it('handles sensors with null min_value/max_value as undefined', () => {
    const survey = makeMinimalSurvey()
    survey.plants[0].processes[0].sensors[0].min_value = null
    survey.plants[0].processes[0].sensors[0].max_value = null
    const result = parsePlantSurvey(survey)

    expect(result.config.mapping['fit101'].min).toBeUndefined()
    expect(result.config.mapping['fit101'].max).toBeUndefined()
  })

  it('links sensor ids to the correct category', () => {
    const result = parsePlantSurvey(makeMinimalSurvey())
    const p1 = result.config.categories.find((c) => c.id === 'p1_intake')

    expect(p1?.sensors).toContain('fit101')
    expect(p1?.sensors).toContain('mv101')
    expect(p1?.sensors).not.toContain('ait201')
  })

  it('sets all categories to expanded by default', () => {
    const result = parsePlantSurvey(makeMinimalSurvey())

    for (const category of result.config.categories) {
      expect(category.expanded).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// buildTopology (via parsePlantSurvey)
// ---------------------------------------------------------------------------

describe('parsePlantSurvey topology', () => {
  it('returns undefined topology when no siguiente_proceso/rama_de present', () => {
    const result = parsePlantSurvey(makeMinimalSurvey())

    expect(result.config.topology).toBeUndefined()
  })

  // Mirrors the structure of JSON/swat_plant_survey_2026-03-10.json:
  // five linear processes (Raw Water Intake -> ... -> Reverse Osmosis (RO))
  // plus a Backwash branch hanging off Ultrafiltration (UF).
  function makeSwatLikeSurvey(): PlantSurvey {
    const sensor = {
      sensor_name: 'X',
      variable_type: 'continuous' as const,
      instrument_role: 'sensor' as const,
    }
    return {
      schema_version: '1.0.0',
      client_name: 'SWAT',
      plants: [
        {
          plant_name: 'SWATconTODO',
          processes: [
            { process_name: 'Raw Water Intake', siguiente_proceso: 'Chemical Dosing', sensors: [{ ...sensor, sensor_name: 'A' }] },
            { process_name: 'Chemical Dosing', siguiente_proceso: 'Ultrafiltration (UF)', sensors: [{ ...sensor, sensor_name: 'B' }] },
            { process_name: 'Ultrafiltration (UF)', siguiente_proceso: 'Dechlorination (UV)', sensors: [{ ...sensor, sensor_name: 'C' }] },
            { process_name: 'Dechlorination (UV)', siguiente_proceso: 'Reverse Osmosis (RO)', sensors: [{ ...sensor, sensor_name: 'D' }] },
            { process_name: 'Reverse Osmosis (RO)', sensors: [{ ...sensor, sensor_name: 'E' }] },
            { process_name: 'Backwash', rama_de: 'Ultrafiltration (UF)', sensors: [{ ...sensor, sensor_name: 'F' }] },
          ],
        },
      ],
    }
  }

  it('walks siguiente_proceso into mainFlow with slugified ids', () => {
    const result = parsePlantSurvey(makeSwatLikeSurvey())

    expect(result.config.topology?.mainFlow).toEqual([
      'raw_water_intake',
      'chemical_dosing',
      'ultrafiltration_uf',
      'dechlorination_uv',
      'reverse_osmosis_ro',
    ])
  })

  it('emits rama_de processes as branches with connectsTo + label', () => {
    const result = parsePlantSurvey(makeSwatLikeSurvey())

    expect(result.config.topology?.branches).toEqual([
      { processId: 'backwash', connectsTo: 'ultrafiltration_uf', label: 'Backwash' },
    ])
  })

  it('keeps branch processes out of mainFlow', () => {
    const result = parsePlantSurvey(makeSwatLikeSurvey())

    expect(result.config.topology?.mainFlow).not.toContain('backwash')
  })

  it('emits a nodes + edges graph alongside the legacy view', () => {
    const result = parsePlantSurvey(makeSwatLikeSurvey())
    const topo = result.config.topology

    expect(topo?.nodes).toBeDefined()
    expect(topo?.edges).toBeDefined()
    expect(topo?.nodes?.map((n) => n.id)).toContain('backwash')
    expect(topo?.edges?.some((e) => e.from === 'ultrafiltration_uf' && e.to === 'backwash')).toBe(true)
  })

  it('tags the Backwash → UF return edge as recycle (cycle detection)', () => {
    const sensor = { sensor_name: 'X', variable_type: 'continuous' as const }
    const survey: PlantSurvey = {
      schema_version: '1.1.0',
      client_name: 'X',
      plants: [{
        plant_name: 'P',
        processes: [
          { process_name: 'Intake', siguiente_proceso: 'UF', sensors: [{ ...sensor, sensor_name: 'a' }] },
          { process_name: 'UF', siguiente_proceso: 'UV', sensors: [{ ...sensor, sensor_name: 'b' }] },
          { process_name: 'UV', sensors: [{ ...sensor, sensor_name: 'c' }] },
          { process_name: 'Backwash', rama_de: 'UF', siguiente_proceso: 'UF', sensors: [{ ...sensor, sensor_name: 'd' }] },
        ],
      }],
    }
    const result = parsePlantSurvey(survey)
    const recycle = result.config.topology?.edges?.find((e) => e.from === 'backwash' && e.to === 'uf')

    expect(recycle).toBeDefined()
    expect(recycle?.kind).toBe('recycle')
  })

  it('accepts array form for siguiente_proceso (split)', () => {
    const sensor = { sensor_name: 'X', variable_type: 'continuous' as const }
    const survey: PlantSurvey = {
      schema_version: '1.1.0',
      client_name: 'X',
      plants: [{
        plant_name: 'P',
        processes: [
          { process_name: 'A', siguiente_proceso: ['B', 'C'], sensors: [{ ...sensor, sensor_name: 'a' }] },
          { process_name: 'B', sensors: [{ ...sensor, sensor_name: 'b' }] },
          { process_name: 'C', sensors: [{ ...sensor, sensor_name: 'c' }] },
        ],
      }],
    }
    const result = parsePlantSurvey(survey)
    const edges = result.config.topology?.edges ?? []

    expect(edges.some((e) => e.from === 'a' && e.to === 'b')).toBe(true)
    expect(edges.some((e) => e.from === 'a' && e.to === 'c')).toBe(true)
  })

  it('accepts array form for rama_de (multi-parent)', () => {
    const sensor = { sensor_name: 'X', variable_type: 'continuous' as const }
    const survey: PlantSurvey = {
      schema_version: '1.1.0',
      client_name: 'X',
      plants: [{
        plant_name: 'P',
        processes: [
          { process_name: 'A', siguiente_proceso: 'C', sensors: [{ ...sensor, sensor_name: 'a' }] },
          { process_name: 'B', siguiente_proceso: 'C', sensors: [{ ...sensor, sensor_name: 'b' }] },
          { process_name: 'Buffer', rama_de: ['A', 'B'], sensors: [{ ...sensor, sensor_name: 'd' }] },
          { process_name: 'C', sensors: [{ ...sensor, sensor_name: 'c' }] },
        ],
      }],
    }
    const result = parsePlantSurvey(survey)
    const edges = result.config.topology?.edges ?? []

    expect(edges.some((e) => e.from === 'a' && e.to === 'buffer')).toBe(true)
    expect(edges.some((e) => e.from === 'b' && e.to === 'buffer')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// validatePlantSurvey
// ---------------------------------------------------------------------------

describe('validatePlantSurvey', () => {
  it('returns valid for a well-formed survey', () => {
    const result = validatePlantSurvey(makeMinimalSurvey())

    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('rejects null input', () => {
    const result = validatePlantSurvey(null)

    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/JSON valido/)
  })

  it('rejects undefined input', () => {
    const result = validatePlantSurvey(undefined)

    expect(result.valid).toBe(false)
  })

  it('rejects a string instead of object', () => {
    const result = validatePlantSurvey('not an object')

    expect(result.valid).toBe(false)
  })

  it('rejects missing schema_version', () => {
    const data = { client_name: 'X', plants: [{ plant_name: 'P', processes: [{ process_name: 'A', sensors: [{ sensor_name: 'S1', variable_type: 'continuous' }] }] }] }
    const result = validatePlantSurvey(data)

    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/schema_version/)
  })

  it('rejects missing client_name', () => {
    const data = { schema_version: '1.0', plants: [{ plant_name: 'P', processes: [{ process_name: 'A', sensors: [{ sensor_name: 'S1' }] }] }] }
    const result = validatePlantSurvey(data)

    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/client_name/)
  })

  it('rejects empty plants array', () => {
    const data = { schema_version: '1.0', client_name: 'X', plants: [] }
    const result = validatePlantSurvey(data)

    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/planta/)
  })

  it('rejects missing plant_name', () => {
    const data = {
      schema_version: '1.0',
      client_name: 'X',
      plants: [{ processes: [{ process_name: 'A', sensors: [{ sensor_name: 'S1' }] }] }],
    }
    const result = validatePlantSurvey(data)

    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/plant_name/)
  })

  it('rejects empty processes', () => {
    const data = {
      schema_version: '1.0',
      client_name: 'X',
      plants: [{ plant_name: 'P', processes: [] }],
    }
    const result = validatePlantSurvey(data)

    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/proceso/)
  })

  it('rejects process without process_name', () => {
    const data = {
      schema_version: '1.0',
      client_name: 'X',
      plants: [{ plant_name: 'P', processes: [{ sensors: [{ sensor_name: 'S1' }] }] }],
    }
    const result = validatePlantSurvey(data)

    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/process_name/)
  })

  it('rejects when total sensors is zero', () => {
    const data = {
      schema_version: '1.0',
      client_name: 'X',
      plants: [{ plant_name: 'P', processes: [{ process_name: 'A', sensors: [] }] }],
    }
    const result = validatePlantSurvey(data)

    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/sensor/)
  })
})
