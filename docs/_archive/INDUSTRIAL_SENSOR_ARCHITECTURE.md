# Arquitectura Industrial de Sensores Inteligentes (ISA-Ready)

## Resumen

Este documento describe la implementacion de una arquitectura profesional IoT/SCADA para la visualizacion de sensores, siguiendo los estandares industriales ISA-18.2 (Gestion de Alarmas) e ISA 5.1 (Simbolos de Instrumentacion).

## Objetivo

Refactorizar la visualizacion de sensores con una arquitectura que:
- Maximice la legibilidad para operarios
- Prepare la integracion nativa del modulo de IA/Forecasting
- Siga estandares industriales reconocidos

---

## Arquitectura Implementada

### 1. Modelo de Datos ISA-Compliant

#### Frontend Types (`front/src/types/industrial.ts`)

```typescript
interface IndustrialSensor {
  // Identificacion ISA 5.1
  tag: string;                    // LIT101
  processArea: string;            // P1
  instrumentType: InstrumentType; // LEVEL_TRANSMITTER

  // Descripcion legible
  description: {
    short: string;                // "Nivel Tanque P1"
    long: string;                 // Descripcion completa
    equipment: string;            // "T-101"
  };

  // Unidades de ingenieria (SI)
  engineering: {
    unit: string;                 // "mm"
    precision: number;            // 2 decimales
  };

  // Limites de alarma ISA-18.2
  alarmLimits: {
    HH?: number;                  // High-High (emergencia)
    H?: number;                   // High (warning)
    L?: number;                   // Low (warning)
    LL?: number;                  // Low-Low (emergencia)
  };

  // Limites operativos
  operatingLimits: {
    normal: { min: number; max: number };
    design: { min: number; max: number };
  };

  // Metadatos AI
  ai: {
    featureGroup: string;         // "tank_levels"
    correlatedWith: string[];     // ["FIT101", "P101"]
    seasonality: string;          // "daily" | "weekly" | "none"
    forecastHorizon: number;      // minutos
    anomalyThreshold: number;     // 0.85
    enabled: boolean;
  };

  // Contexto operativo
  operational: {
    criticality: 'HIGH' | 'MEDIUM' | 'LOW';
    responseTime: number;         // segundos
    safetyRelated: boolean;
    interlocks: string[];         // ["P101_STOP", "MV101_CLOSE"]
  };
}
```

#### Tipos de Instrumentos ISA 5.1

| Codigo | Tipo | Descripcion |
|--------|------|-------------|
| LIT | Level Transmitter | Transmisor de nivel |
| FIT | Flow Transmitter | Transmisor de caudal |
| PIT | Pressure Transmitter | Transmisor de presion |
| DPIT | Differential Pressure | Presion diferencial |
| AIT | Analytical Transmitter | Analitico (pH, ORP, conductividad) |
| MV | Motorized Valve | Valvula motorizada |
| P | Pump | Bomba |
| UV | UV System | Sistema UV |

---

### 2. Sistema de Alarmas ISA-18.2

#### Niveles de Alarma

```
      HH (High-High)  ----  EMERGENCIA (rojo pulsante)
       |
      H (High)        ----  WARNING (amarillo)
       |
   [  NORMAL  ]       ----  OK (verde)
       |
      L (Low)         ----  WARNING (amarillo)
       |
      LL (Low-Low)    ----  EMERGENCIA (rojo pulsante)
```

#### Prioridades

| Prioridad | Color | Accion |
|-----------|-------|--------|
| EMERGENCY | Rojo pulsante | Accion inmediata requerida |
| HIGH | Naranja | Atencion urgente |
| MEDIUM | Amarillo | Monitorear |
| LOW | Azul | Informativo |

#### Componente AlarmBanner

Ubicacion: `front/src/components/sensors/AlarmBanner.tsx`

Caracteristicas:
- Ordenamiento por prioridad (EMERGENCY primero)
- Rotacion automatica de alarmas cuando esta colapsado
- Accion sugerida para cada alarma
- Boton de reconocimiento (ACK)
- Animacion pulsante para emergencias

---

### 3. Configuracion de Sensores SWaT

Ubicacion: `front/src/config/industrial-sensors.ts`

#### Sensores Configurados por Proceso

| Proceso | Sensores | Descripcion |
|---------|----------|-------------|
| P1 - Captacion | LIT101, FIT101 | Entrada de agua cruda |
| P2 - Dosificacion | AIT201, AIT202, AIT203, FIT201 | Dosificacion quimica |
| P3 - Ultrafiltracion | LIT301, FIT301, DPIT301, AIT301-303 | Filtracion UF |
| P4 - Decloracion UV | LIT401, FIT401, AIT401, AIT402 | Tratamiento UV |
| P5 - Osmosis Inversa | FIT501-504, AIT501-504, PIT501-503 | Purificacion RO |
| P6 - Retrolavado | FIT601 | Limpieza membranas |

#### Ejemplo de Configuracion

```typescript
'LIT101': {
  tag: 'LIT101',
  processArea: 'P1',
  instrumentType: InstrumentType.LEVEL_TRANSMITTER,
  description: {
    short: 'Nivel Tanque P1',
    long: 'Transmisor de nivel del tanque de agua cruda',
    equipment: 'T-101',
  },
  engineering: { unit: 'mm', precision: 1 },
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
}
```

---

### 4. Componentes de Visualizacion

#### ProcessFlowDiagram

Ubicacion: `front/src/components/process/ProcessFlowDiagram.tsx`

Diagrama SVG simplificado que muestra:
- Bloques P1-P6 clickeables
- Lineas de flujo animadas
- Color de fondo segun estado (verde/amarillo/rojo)
- Badge con conteo de alarmas
- Seleccion visual del proceso

```
+------------------------------------------------------------------+
|  PLANTA DE TRATAMIENTO DE AGUA - VISTA GENERAL                   |
+------------------------------------------------------------------+
|                                                                   |
|  [AGUA CRUDA]                                                     |
|       |                                                           |
|       v                                                           |
|  +--------+    +--------+    +--------+    +--------+            |
|  |   P1   |--->|   P2   |--->|   P3   |--->|   P4   |            |
|  | INTAKE |    | DOSING |    |   UF   |    |   UV   |            |
|  |  [OK]  |    |  [OK]  |    | [WARN] |    |  [OK]  |            |
|  +--------+    +--------+    +--------+    +--------+            |
|                                  |             |                  |
|                                  v             v                  |
|                             +--------+    +--------+             |
|                             |   P6   |    |   P5   |             |
|                             | BACKW  |    |   RO   |--> [AGUA]   |
|                             |  [OK]  |    |  [OK]  |    [PURA]   |
|                             +--------+    +--------+             |
+------------------------------------------------------------------+
```

#### SensorCard

Ubicacion: `front/src/components/sensors/SensorCard.tsx`

Tarjeta enriquecida con:

```
+------------------------------------------+
|  LIT101                         [*] [i]  |  <- Tag + favorito + info
|  Nivel Tanque P1                         |  <- Descripcion corta
|                                          |
|     746.63 mm                            |  <- Valor grande, legible
|     [================    ] 93%           |  <- Barra de nivel visual
|                                          |
|  [====OK====]  Normal: 500-800           |  <- Status badge + rango
|                                          |
|  Trend: -> +2.3%   |   AI: 98% conf      |  <- Tendencia + confianza
+------------------------------------------+
```

---

### 5. Integracion en Paginas

#### MachinesPage

Ubicacion: `front/src/pages/MachinesPage.tsx`

Layout actualizado:
1. **Fila superior**: ProcessFlowDiagram + AlarmBanner
2. **Columna izquierda**: ProcessMachinePanel (seleccion de sensores)
3. **Area principal**: Toggle entre Tarjetas/Graficos

Nuevas funcionalidades:
- Filtrado por proceso (click en diagrama)
- Evaluacion ISA en tiempo real
- Vista de tarjetas con SensorCard
- Calculo de tendencias
- Persistencia de favoritos

---

### 6. Backend API

#### Modelos Pydantic

Ubicacion: `back/bff/src/models/industrial.py`

Modelos equivalentes a los tipos TypeScript:
- `IndustrialSensor`
- `AlarmLimits`
- `ActiveAlarm`
- `ProcessAreaStatus`
- `SensorEvaluation`

#### Endpoints

Ubicacion: `back/bff/src/api/sensors.py`

| Endpoint | Metodo | Descripcion |
|----------|--------|-------------|
| `/api/sensors/metadata` | GET | Configuracion ISA de todos los sensores |
| `/api/sensors/metadata/{tag}` | GET | Configuracion de un sensor especifico |
| `/api/sensors/alarms` | GET | Alarmas activas ordenadas por prioridad |
| `/api/sensors/evaluate` | GET | Evaluacion de estado de sensores |
| `/api/sensors/process-status` | GET | Estado de areas de proceso (P1-P6) |

---

## Estructura de Archivos

### Frontend

```
front/src/
├── types/
│   ├── index.ts                    # Re-exporta industrial.ts
│   └── industrial.ts               # Tipos ISA (NUEVO)
├── config/
│   ├── sensors.ts                  # Configuracion existente (mantener)
│   └── industrial-sensors.ts       # Configuracion ISA (NUEVO)
├── components/
│   ├── process/
│   │   ├── index.ts
│   │   └── ProcessFlowDiagram.tsx  # Diagrama P1-P6 (NUEVO)
│   └── sensors/
│       ├── index.ts
│       ├── AlarmBanner.tsx         # Banner de alarmas (NUEVO)
│       └── SensorCard.tsx          # Tarjeta enriquecida (NUEVO)
└── pages/
    └── MachinesPage.tsx            # Actualizado con ISA
```

### Backend

```
back/bff/src/
├── models/
│   ├── __init__.py                 # Actualizado con exports
│   └── industrial.py               # Modelos Pydantic ISA (NUEVO)
└── api/
    ├── router.py                   # Actualizado con sensors_router
    └── sensors.py                  # Endpoints ISA (NUEVO)
```

---

## Funciones Helper Disponibles

### Frontend (`industrial-sensors.ts`)

```typescript
// Obtener configuracion de sensor
getIndustrialSensor(tag: string): IndustrialSensor | undefined

// Verificar si sensor esta configurado
isSensorConfigured(tag: string): boolean

// Obtener sensores por area de proceso
getSensorsByProcessArea(processArea: string): IndustrialSensor[]

// Evaluar sensor individual
evaluateSensor(tag: string, value: number, timestamp: number): SensorEvaluation | null

// Evaluar todos los sensores y obtener alarmas
evaluateAllSensors(values: Record<string, number>, timestamp: number): ActiveAlarm[]

// Obtener estado de todas las areas de proceso
getAllProcessAreasStatus(values: Record<string, number>, timestamp: number): ProcessAreaStatus[]
```

### Frontend (`industrial.ts`)

```typescript
// Evaluar nivel de alarma
evaluateAlarmLevel(value: number, limits: AlarmLimits): { level: AlarmLevel; priority: AlarmPriority } | null

// Obtener estado desde alarma
getStatusFromAlarm(alarm): 'normal' | 'warning' | 'critical'

// Calcular porcentaje dentro del rango
calculateRangePercent(value: number, limits: OperatingLimits): number

// Etiquetas para UI
getAlarmPriorityLabel(priority: AlarmPriority): string
getAlarmLevelLabel(level: AlarmLevel): string
```

---

## Verificacion

### Frontend

```bash
cd front && npm run build
```

### Backend

```bash
# Verificar endpoint metadata
curl http://localhost:8000/api/sensors/metadata | jq '.LIT101.alarmLimits'

# Verificar alarmas activas
curl http://localhost:8000/api/sensors/alarms | jq '.alarms[0]'

# Verificar estado de procesos
curl http://localhost:8000/api/sensors/process-status | jq '.process_areas'
```

### Tests Manuales UI

1. **Diagrama de proceso**: Click en P1 -> debe resaltar y filtrar sensores P1
2. **Alarmas**: Si hay valores fuera de rango -> debe aparecer banner con alarma
3. **SensorCard**: Verificar valor grande, barra de progreso, badge de estado
4. **Toggle vista**: Cambiar entre Tarjetas y Graficos

---

## Preparacion para AI (Fase 5)

La arquitectura esta preparada para integrar el modulo de IA:

### Estructura de Datos AI-Ready

```typescript
interface AIEnhancedSensor extends IndustrialSensor {
  // Prediccion del modulo AI
  forecast?: {
    predictions: ForecastPoint[];
    modelVersion: string;
    lastTrained: number;
    accuracyMetrics: { mae, rmse, mape };
  };

  // Deteccion de anomalias
  anomaly?: {
    isAnomaly: boolean;
    score: number;
    type: 'point' | 'contextual' | 'collective';
    explanation: string;
    relatedSensors: string[];
  };
}
```

### Endpoints Preparados (implementar cuando AI este listo)

- `GET /api/ai/forecast/{tag}` - Predicciones para un sensor
- `GET /api/ai/anomalies` - Anomalias detectadas
- `POST /api/ai/train` - Entrenar modelos

---

## Notas de Implementacion

1. **Compatibilidad**: Se mantiene `sensors.ts` existente para no romper codigo legacy
2. **Solo sensores configurados**: Los sensores sin metadata ISA no aparecen en tarjetas
3. **Mapeo ThingsBoard**: Se usa `mapToSwatName()` para convertir claves TB a tags SWaT
4. **Evaluacion cliente**: La evaluacion de alarmas se hace en frontend para latencia minima
5. **Persistencia**: Favoritos se guardan en localStorage
