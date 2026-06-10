# Decisiones de Diseno Frontend

## Resumen

Este documento explica las decisiones de diseno tomadas en la refactorizacion del frontend para organizar sensores por proceso (P1-P6) segun la estructura SWaT.

---

## 1. Estructura de Datos Centralizada

**Archivo:** `src/config/sensors.ts`

```
+-------------------------------------------------------------+
|  SENSOR_RANGES      -> Rangos normales/warning por sensor   |
|  PROCESS_CATEGORIES -> P1-P6 con sensores y actuadores      |
|  SENSOR_MAPPING     -> SWaT name <-> ThingsBoard key        |
+-------------------------------------------------------------+
```

### Razon

- **Single Source of Truth**: Toda la configuracion de sensores en un archivo evita duplicacion y facilita mantenimiento
- **Rangos en cliente**: Los rangos `min/max/warningMin/warningMax` permiten calcular estado (normal/warning/critical) sin llamadas al backend
- **Mapeo bidireccional**: `SENSOR_MAPPING` y `SENSOR_REVERSE_MAPPING` porque ThingsBoard usa claves como `1_LT_001_PV.Value` pero queremos mostrar `LIT101` (nomenclatura SWaT)

### Ejemplo

```typescript
export const SENSOR_RANGES: Record<string, SensorRange> = {
  'LIT101': { min: 500, max: 800, unit: 'mm', warningMin: 490, warningMax: 834 },
  'FIT101': { min: 0, max: 4.5, unit: 'm3/h', warningMin: 0, warningMax: 5 },
  // ...
};

export const PROCESS_CATEGORIES: ProcessCategory[] = [
  {
    id: 'P1',
    name: 'P1 - Captacion',
    description: 'Raw Water Intake - Control de entrada de agua cruda',
    sensors: ['LIT101', 'FIT101'],
    actuators: ['MV101', 'P101', 'P102'],
    expanded: true,
  },
  // P2-P6...
];
```

---

## 2. Sistema de Estados de 3 Niveles

```typescript
export type ProcessStatus = 'normal' | 'warning' | 'critical';

export function getSensorStatus(sensorKey: string, value: number): ProcessStatus
```

### Razon

| Nivel | Color | Significado |
|-------|-------|-------------|
| `normal` | Verde | Valor dentro del rango operativo |
| `warning` | Amarillo | Valor cerca del limite (buffer de seguridad) |
| `critical` | Rojo | Valor fuera de rangos aceptables |

- **Simplicidad visual**: Solo 3 colores (verde/amarillo/rojo) son faciles de entender para operarios
- **Rango warning como buffer**: El rango warning (ej: 490-500 para LIT101 que tiene normal 500-800) da alerta temprana antes de llegar a critico
- **Propagacion hacia arriba**: El estado del proceso se calcula como el **peor estado** de sus sensores

### Logica de Calculo

```typescript
function calculateProcessStatus(process, sensorValues): ProcessStatus {
  // Si cualquier sensor es critico -> proceso critico
  // Si cualquier sensor es warning -> proceso warning
  // Si todos son normales -> proceso normal
}
```

---

## 3. Componente ProcessCategoryPanel

**Archivo:** `src/components/variables/ProcessCategoryPanel.tsx`

### Estructura Visual

```
+------------------------------------------+
|  PROCESOS SWaT                           |
|  123 sensores en 6 procesos              |
+------------------------------------------+
|  Estado: [P1 ok] [P2 ok] [P3 !] ...      |  <- Header de estado rapido
+------------------------------------------+
|  [Buscar sensor...]                      |  <- Filtro de busqueda
+------------------------------------------+
|  * Favoritos (3)                         |  <- Seccion de favoritos
|  v P1 - Captacion                   ok   |
|    [Sensores]                            |
|      o LIT101  746.63 mm [500-800]       |
|      o FIT101  0.50 m3/h [0-4.5]         |
|    [Actuadores]                          |
|      o MV101  1                          |
|  > P2 - Dosificacion               (4)   |
|  > P3 - Ultrafiltracion       ! 1  (6)   |  <- Badge de alertas
+------------------------------------------+
```

### Decisiones de UI

| Elemento | Decision | Razon |
|----------|----------|-------|
| **Acordeon expandible** | Solo un proceso expandido a la vez (opcional) | Reduce carga cognitiva - operario ve solo el proceso relevante |
| **Header de estado rapido** | Badges P1-P6 con color de estado | Vista de un vistazo de todos los procesos sin expandir |
| **Click en header de estado** | Expande solo ese proceso | Navegacion rapida a proceso con problemas |
| **Subsecciones Sensores/Actuadores** | Agrupacion dentro de cada proceso | Diferencia visual entre dispositivos de medicion y control |
| **Iconos diferenciados** | `Gauge` para sensores, `ToggleRight` para actuadores | Distincion visual inmediata |
| **Badge de alertas cuando colapsado** | Muestra contador de warnings/criticals | Operario ve que hay problema sin expandir |

---

## 4. Sistema de Favoritos

### Implementacion

```typescript
const FAVORITES_STORAGE_KEY = 'process_sensor_favorites';

function loadFavorites(): Set<string> {
  const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
  return stored ? new Set(JSON.parse(stored)) : new Set();
}

function saveFavorites(favorites: Set<string>): void {
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...favorites]));
}
```

### Razon

- **Personalizacion por operario**: Cada operario tiene sensores que monitorea frecuentemente
- **Persistencia local**: `localStorage` mantiene favoritos entre sesiones sin backend adicional
- **Seccion destacada**: Favoritos aparecen primero, antes de los procesos
- **Toggle con estrella**: UI familiar (similar a Gmail, Slack, etc.)

---

## 5. Busqueda en Tiempo Real

### Implementacion

```typescript
const filteredSensors = useMemo(() => {
  if (!searchTerm) return sensors;
  const term = searchTerm.toLowerCase();
  return sensors.filter(s =>
    s.name.toLowerCase().includes(term) ||
    s.key.toLowerCase().includes(term) ||
    (s.swatName && s.swatName.toLowerCase().includes(term))
  );
}, [sensors, searchTerm]);
```

### Razon

- **Busca en 3 campos**: nombre display, key de ThingsBoard, y nombre SWaT
- **Casos de uso**:
  - Buscar "LIT" -> todos los sensores de nivel
  - Buscar "301" -> sensores del proceso 3
  - Buscar "presion" -> sensores de presion
- **`useMemo`**: Evita recalcular en cada render, solo cuando cambia `sensors` o `searchTerm`

---

## 6. Tipos TypeScript Estrictos

**Archivo:** `src/types/index.ts`

### Tipos Principales

```typescript
export type ProcessStatus = 'normal' | 'warning' | 'critical';

export interface ProcessCategory {
  id: string;           // P1, P2, etc.
  name: string;         // "P1 - Captacion"
  description: string;  // Para tooltip
  sensors: string[];    // Sensores del proceso
  actuators: string[];  // Actuadores del proceso
  expanded?: boolean;
  status?: ProcessStatus;
}

export interface SensorRange {
  min: number;
  max: number;
  unit: string;
  warningMin?: number;
  warningMax?: number;
}

export interface SensorStatus {
  key: string;
  value: number;
  status: ProcessStatus;
  unit?: string;
  normalRange?: { min: number; max: number };
}
```

### Razon

- **Type safety**: Errores detectados en compilacion, no en runtime
- **Documentacion implicita**: Los tipos documentan la estructura de datos esperada
- **Autocompletado en IDE**: Mejora productividad del desarrollador
- **Refactoring seguro**: El compilador detecta usos incorrectos al cambiar tipos

---

## 7. Calculo de Estado del Proceso

### Implementacion

```typescript
function calculateProcessStatus(
  process: ProcessCategory,
  sensorValues: Record<string, number>
): ProcessStatus {
  let hasWarning = false;
  let hasCritical = false;

  for (const sensorKey of process.sensors) {
    const value = sensorValues[sensorKey];
    if (value !== undefined) {
      const status = getSensorStatus(sensorKey, value);
      if (status === 'critical') hasCritical = true;
      if (status === 'warning') hasWarning = true;
    }
  }

  if (hasCritical) return 'critical';
  if (hasWarning) return 'warning';
  return 'normal';
}
```

### Razon

- **Logica de "peor caso"**: Un solo sensor critico hace todo el proceso critico
- **Solo sensores, no actuadores**: Los actuadores son binarios (on/off), no tienen rangos numericos
- **Calculo en cliente**: Evita roundtrip al servidor para cada cambio de valor
- **Valores undefined ignorados**: Sensores sin datos no afectan el estado

---

## 8. Indicadores Visuales Consistentes

### Configuracion de Colores

```typescript
const statusConfig = {
  normal: {
    icon: CheckCircle,
    color: 'text-green-500',
    bg: 'bg-green-100'
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-amber-500',
    bg: 'bg-amber-100'
  },
  critical: {
    icon: XCircle,
    color: 'text-red-500',
    bg: 'bg-red-100'
  },
};
```

### Razon

- **Consistencia visual**: El mismo icono/color significa lo mismo en toda la app
- **Iconos de Lucide**: Libreria ligera, consistente, y con iconos familiares
- **Verde/Amarillo/Rojo**: Semaforo universal que todos entienden sin entrenamiento
- **Background + foreground**: Mejor contraste y visibilidad

---

## 9. Separacion Sensores vs Actuadores

### Visualizacion

```
v P1 - Captacion
  [Sensores]           <- Dispositivos de medicion
    LIT101, FIT101
  [Actuadores]         <- Dispositivos de control
    MV101, P101, P102
```

### Razon

| Aspecto | Sensores | Actuadores |
|---------|----------|------------|
| **Proposito** | Miden variables | Controlan proceso |
| **Valor** | Numerico continuo | Binario (on/off) o discreto |
| **Rango** | Tienen min/max | No aplica |
| **Estado** | normal/warning/critical | Solo normal (asume funcional) |
| **Futuro** | Solo lectura | Podrian tener botones de control |

---

## 10. Arquitectura de Componentes

### Jerarquia

```
ProcessCategoryPanel (contenedor principal)
|-- ProcessStatusHeader (barra de estado rapido P1-P6)
|-- SearchInput (filtro de busqueda)
|-- FavoritesSection (acordeon de favoritos)
|-- ProcessSection x 6 (acordeon por proceso)
|   |-- SensorsSubsection
|   |   +-- SensorItem x N
|   +-- ActuatorsSubsection
|       +-- SensorItem x N
+-- UnassignedSection (sensores sin proceso asignado)
```

### Principios

- **Composicion**: Cada parte es reutilizable
- **Responsabilidad unica**: Cada componente hace una cosa bien
- **Props drilling minimo**: Estado manejado en componente padre, pasado como props
- **Funciones de render**: `renderSensorItem`, `renderProcessSection` para claridad

---

## 11. Mapeo ThingsBoard <-> SWaT

### Problema

ThingsBoard usa claves como:
- `1_LT_001_PV.Value`
- `2_FIC_101_PV.Value`
- `LIT301.Pv.Value`

Pero queremos mostrar nomenclatura SWaT:
- `LIT101`
- `FIT101`
- `LIT301`

### Solucion

```typescript
// Mapeo explicito
export const SENSOR_MAPPING: Record<string, string> = {
  'LIT101': '1_LT_001_PV.Value',
  'FIT101': '1_FIT_001_PV.Value',
  // ...
};

// Mapeo inverso generado automaticamente
export const SENSOR_REVERSE_MAPPING = Object.fromEntries(
  Object.entries(SENSOR_MAPPING).map(([k, v]) => [v, k])
);

// Funcion de mapeo con fallback a pattern matching
export function mapToSwatName(thingsboardKey: string): string | undefined {
  // 1. Intenta mapeo explicito
  const swatName = SENSOR_REVERSE_MAPPING[thingsboardKey];
  if (swatName) return swatName;

  // 2. Intenta pattern matching (LIT301.Pv.Value -> LIT301)
  const patterns = [
    { pattern: /LIT(\d+)/i, prefix: 'LIT' },
    { pattern: /FIT(\d+)/i, prefix: 'FIT' },
    // ...
  ];
  // ...
}
```

### Razon

- **Mapeo explicito**: Para sensores con nombres muy diferentes
- **Pattern matching**: Para sensores que ya contienen el nombre SWaT
- **Fallback graceful**: Si no hay mapeo, muestra la key original

---

## Resumen de Decisiones

| Area | Decision | Beneficio |
|------|----------|-----------|
| **Datos** | Config centralizada en `sensors.ts` | Mantenibilidad, single source of truth |
| **Estado** | 3 niveles (normal/warning/critical) | Simplicidad para operarios |
| **UI** | Acordeones jerarquicos por proceso | Reduce carga cognitiva |
| **Header** | Badges de estado P1-P6 | Vista rapida sin expandir |
| **Busqueda** | Multi-campo, tiempo real | Acceso rapido a cualquier sensor |
| **Favoritos** | localStorage | Personalizacion sin backend |
| **Tipos** | TypeScript estricto | Seguridad en compilacion |
| **Visual** | Colores de semaforo | Universalmente entendido |
| **Mapeo** | Bidireccional con fallback | Flexibilidad con datos reales |

---

## Preparacion para Forecasting

### Interfaces Listas

```typescript
export interface ForecastData {
  sensorKey: string;
  predictions: Array<{ ts: number; value: number; confidence: number }>;
  normalBand: { upper: number; lower: number };
}

export interface MachineAIMetadata {
  sensorKey: string;
  normalRange?: { min: number; max: number };
  warningRange?: { min: number; max: number };
  anomalyThreshold?: number;
  forecastEnabled: boolean;
}
```

### Integracion Futura

Cuando el modulo de forecasting este listo:

1. Backend devolvera `forecastEnabled: true` en `MachineAIMetadata`
2. Frontend mostrara badge "Forecasting" en sensores habilitados
3. Graficos mostraran banda de prediccion con `ForecastData.normalBand`
4. Los rangos estaticos de `SENSOR_RANGES` seran reemplazados por predicciones dinamicas
