# Documentacion Frontend - proTrueData (ATLAXIA)

| Campo | Valor |
|-------|-------|
| Version | 1.0.0 |
| Ultima actualizacion | Enero 2026 |
| Stack | React 18.3 + TypeScript + Vite |
| Estilos | Tailwind CSS + Radix UI |
| Estado Global | Zustand |

---

## Indice de Contenidos

1. [Introduccion](#1-introduccion)
   - 1.1 [Proposito del Sistema](#11-proposito-del-sistema)
   - 1.2 [Stack Tecnologico](#12-stack-tecnologico)
   - 1.3 [Arquitectura Feature-Based](#13-arquitectura-feature-based)
2. [Estructura de Carpetas](#2-estructura-de-carpetas)
3. [Sistema de Enrutamiento](#3-sistema-de-enrutamiento)
4. [Documentacion por Paginas](#4-documentacion-por-paginas)
   - 4.1 [OverviewPage](#41-overviewpage)
   - 4.2 [VariablesPage](#42-variablespage)
   - 4.3 [NetworkStatusPage](#43-networkstatuspage)
   - 4.4 [AnomaliesPage](#44-anomaliespage)
   - 4.5 [ControlPage](#45-controlpage)
5. [Documentacion de Componentes](#5-documentacion-de-componentes)
   - 5.1 [Componentes UI Base](#51-componentes-ui-base)
   - 5.2 [Componentes de Layout](#52-componentes-de-layout)
   - 5.3 [Componentes de Dashboard](#53-componentes-de-dashboard)
   - 5.4 [Componentes de Network](#54-componentes-de-network)
   - 5.5 [Componentes de Variables](#55-componentes-de-variables)
   - 5.6 [Componentes de Anomalies](#56-componentes-de-anomalies)
   - 5.7 [Componentes de Control](#57-componentes-de-control)
   - 5.8 [Componentes de Filters](#58-componentes-de-filters)
6. [Endpoints y Mapeo de Datos](#6-endpoints-y-mapeo-de-datos)
7. [Sistema de Internacionalizacion](#7-sistema-de-internacionalizacion)
8. [Guias de Modificacion](#8-guias-de-modificacion)
9. [Tipos e Interfaces](#9-tipos-e-interfaces)
10. [Utilidades y Helpers](#10-utilidades-y-helpers)
11. [Configuraciones](#11-configuraciones)
12. [Estilos y Temas](#12-estilos-y-temas)
13. [Apendices](#13-apendices)

---

## 1. Introduccion

### 1.1 Proposito del Sistema

ATLAXIA es un sistema de monitoreo industrial para plantas de tratamiento de agua. La interfaz de usuario proporciona:

- **Dashboard en tiempo real** con KPIs y graficos de caudal
- **Visualizacion de sensores** con series temporales por categoria
- **Monitoreo de red** con dispositivos y alertas de seguridad
- **Deteccion de anomalias** basada en indicadores de comportamiento
- **Sistema de control** con visualizacion radar de indicadores clave

### 1.2 Stack Tecnologico

| Tecnologia | Version | Proposito |
|------------|---------|-----------|
| React | 18.3.1 | Biblioteca de UI |
| TypeScript | 5.6.3 | Tipado estatico |
| Vite | 6.0.5 | Build tool y dev server |
| Tailwind CSS | 3.4.17 | Framework de estilos utility-first |
| Radix UI | 1.x | Componentes accesibles sin estilos |
| Recharts | 2.14.1 | Graficos y visualizaciones |
| Zustand | 5.0.2 | Estado global minimalista |
| React Router | 6.28.0 | Enrutamiento SPA |
| TanStack Query | 5.62.7 | Gestion de datos async (pendiente integracion) |
| TanStack Table | 8.20.5 | Tablas con sorting y filtrado |
| date-fns | 4.1.0 | Manipulacion de fechas |
| Lucide React | 0.468.0 | Iconografia |
| clsx + tailwind-merge | - | Utilidades para clases CSS |

### 1.3 Arquitectura Feature-Based

El proyecto utiliza una arquitectura **Feature-Based** (basada en dominios funcionales) en lugar de Atomic Design. Los componentes estan organizados por funcionalidad:

**Ventajas de esta arquitectura:**
- Localizacion rapida de codigo por funcionalidad
- Escalabilidad al agregar nuevos dominios
- Componentes UI reutilizables centralizados en `ui/`
- Separacion clara entre presentacion y logica de negocio

---

## 2. Estructura de Carpetas

```
front/
├── src/
│   ├── components/
│   │   ├── ui/              # Componentes base reutilizables
│   │   ├── layout/          # Estructura de la aplicacion
│   │   ├── dashboard/       # Componentes del Overview
│   │   ├── network/         # Componentes de estado de red
│   │   ├── variables/       # Componentes de sensores
│   │   ├── anomalies/       # Componentes de deteccion
│   │   ├── control/         # Componentes de control
│   │   └── filters/         # Panel de filtros
│   ├── pages/               # Paginas/Vistas principales
│   ├── types/               # Interfaces TypeScript
│   ├── stores/              # Stores de Zustand
│   ├── config/              # Configuraciones estaticas
│   ├── data/                # Datos mock
│   ├── lib/                 # Utilidades y helpers
│   ├── hooks/               # Custom hooks (preparado)
│   ├── assets/              # Recursos estaticos
│   ├── App.tsx              # Componente raiz con rutas
│   ├── main.tsx             # Punto de entrada
│   └── index.css            # Estilos globales
├── public/                  # Assets publicos
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── postcss.config.js
```

### Descripcion de Carpetas

| Carpeta | Descripcion | Archivos Clave |
|---------|-------------|----------------|
| `components/ui/` | Componentes atomicos reutilizables sin logica de negocio | Button, Card, Input, Badge, Switch, Checkbox, Tooltip, StatusDot |
| `components/layout/` | Estructura principal de la aplicacion | AppLayout, Sidebar, Header, LanguageToggle, NotificationsDropdown |
| `components/dashboard/` | Widgets del dashboard principal | KPICard, ComboChart, CalendarGrid, EventLog, LiveIndicator |
| `components/network/` | Visualizacion de dispositivos y alertas de red | HardwareOverview, DevicesTable, AlertsTable, StatusLegend |
| `components/variables/` | Visualizacion de datos de sensores | SensorCategoryPanel, TimeSeriesChart |
| `components/anomalies/` | Deteccion y listado de anomalias | AnomaliesTable |
| `components/control/` | Panel de control con indicadores | RadarChart, IndicatorsPanel |
| `components/filters/` | Filtros de datos | FiltersPanel |
| `pages/` | Contenedores de pagina que componen componentes | OverviewPage, VariablesPage, NetworkStatusPage, AnomaliesPage, ControlPage |
| `types/` | Definiciones TypeScript de todas las interfaces | index.ts con 20+ interfaces |
| `stores/` | Estado global con Zustand | languageStore (idioma ES/EN) |
| `config/` | Configuracion estatica de la aplicacion | sensors.ts (34 sensores), navigation.ts (menu) |
| `data/` | Datos mock para desarrollo | mockData.ts |
| `lib/` | Funciones utilitarias compartidas | utils.ts (cn, formatters), calendarUtils.ts |

---

## 3. Sistema de Enrutamiento

Archivo: `src/App.tsx`

| Ruta | Componente | Descripcion | Estado |
|------|------------|-------------|--------|
| `/` | `OverviewPage` | Dashboard principal con KPIs, graficos y calendario | Implementado |
| `/variables` | `VariablesPage` | Visualizacion de datos de sensores con graficos | Implementado |
| `/network` | `NetworkStatusPage` | Estado de dispositivos de red y alertas | Implementado |
| `/anomalies` | `AnomaliesPage` | Tabla de deteccion de anomalias | Implementado |
| `/control` | `ControlPage` | Panel de control con radar chart | Implementado |
| `/machines` | `PlaceholderPage` | Estado de maquinas | Pendiente |
| `/logs` | `PlaceholderPage` | Registros del sistema | Pendiente |
| `/alerts` | `PlaceholderPage` | Alertas del sistema | Pendiente |
| `/settings` | `PlaceholderPage` | Configuracion | Pendiente |

**Estructura del enrutador:**

```tsx
<AppLayout>
  <Routes>
    <Route path="/" element={<OverviewPage />} />
    <Route path="/variables" element={<VariablesPage />} />
    // ...otras rutas
  </Routes>
</AppLayout>
```

---

## 4. Documentacion por Paginas

### 4.1 OverviewPage

**Archivo:** `src/pages/OverviewPage.tsx`

**Ruta:** `/`

**Descripcion:** Dashboard principal del sistema ATLAXIA. Muestra KPIs, grafico de caudal en tiempo real, calendario con eventos y log de eventos del sistema.

**Componentes utilizados:**

| Componente | Ubicacion | Props | Endpoint Backend |
|------------|-----------|-------|------------------|
| KPICard | `dashboard/KPICard.tsx` | `data: KPIData` | GET /api/telemetry/snapshot |
| ComboChart | `dashboard/ComboChart.tsx` | `data: ProductionData[]` | GET /api/telemetry/history |
| CalendarGrid | `dashboard/CalendarGrid.tsx` | `anomalies, alerts, onDayClick` | GET /api/anomalies + GET /api/network/alerts |
| EventLog | `dashboard/EventLog.tsx` | `events: EventLog[]` | (mock data) |
| FiltersPanel | `filters/FiltersPanel.tsx` | (sin props) | N/A (estado local) |

**Layout:**

| Fila | Columna 1 | Columna 2 | Columna 3 |
|------|-----------|-----------|-----------|
| 1 | KPICard (Estado Sistema) | KPICard (Dispositivos) | KPICard (Criticidad) |
| 2 | ComboChart (3 columnas) | - | FiltersPanel (sidebar) |
| 3 | CalendarGrid | EventLog | FiltersPanel (continua) |

**Estado local:**

```tsx
const { anomalies: calendarAnomalies, alerts: calendarAlerts } = useMemo(
  () => generateMockCalendarEvents(),
  []
);
```

---

### 4.2 VariablesPage

**Archivo:** `src/pages/VariablesPage.tsx`

**Ruta:** `/variables`

**Descripcion:** Visualizacion de datos historicos de sensores organizados por categoria. Permite seleccionar multiples sensores y ver sus graficos de series temporales.

**Componentes utilizados:**

| Componente | Ubicacion | Props | Endpoint Backend |
|------------|-----------|-------|------------------|
| SensorCategoryPanel | `variables/SensorCategoryPanel.tsx` | `selectedSensors, onSensorToggle` | N/A (config local) |
| TimeSeriesChart | `variables/TimeSeriesChart.tsx` | `sensorName, data: TelemetryValue[]` | GET /api/telemetry/history |

**Layout:**

| Columna Izquierda (w-72) | Columna Derecha (flex-1) |
|--------------------------|--------------------------|
| SensorCategoryPanel | TimeSeriesChart x N (uno por sensor) |

**Estado local:**

```tsx
const [selectedSensors, setSelectedSensors] = useState<string[]>([
  'Caudal entrada a biologico',
  'Potencia CCM',
]);

const telemetryData = useMemo(() => {
  const sensorKeys = selectedSensors.map((name) => SENSOR_MAPPING[name]).filter(Boolean);
  return generateMockTelemetryForSensors(sensorKeys);
}, [selectedSensors]);
```

**Handlers:**

```tsx
const handleSensorToggle = (sensorName: string) => {
  setSelectedSensors((prev) =>
    prev.includes(sensorName)
      ? prev.filter((s) => s !== sensorName)
      : [...prev, sensorName]
  );
};
```

---

### 4.3 NetworkStatusPage

**Archivo:** `src/pages/NetworkStatusPage.tsx`

**Ruta:** `/network`

**Descripcion:** Monitoreo de dispositivos de red (PC, PLC, Router, Switch, SCADA) y alertas de seguridad de red.

**Componentes utilizados:**

| Componente | Ubicacion | Props | Endpoint Backend |
|------------|-----------|-------|------------------|
| HardwareOverview | `network/HardwareOverview.tsx` | `devices: NetworkDevice[]` | GET /api/network/devices |
| StatusLegend | `network/StatusLegend.tsx` | (sin props) | N/A |
| DevicesTable | `network/DevicesTable.tsx` | `devices: NetworkDevice[]` | GET /api/network/devices |
| AlertsTable | `network/AlertsTable.tsx` | `alerts: NetworkAlert[]` | GET /api/network/alerts |

**Layout:**

| Fila | Contenido |
|------|-----------|
| 1 | HardwareOverview (izq) + StatusLegend (der) |
| 2 | DevicesTable (ancho completo) |
| 3 | AlertsTable (ancho completo) |

---

### 4.4 AnomaliesPage

**Archivo:** `src/pages/AnomaliesPage.tsx`

**Ruta:** `/anomalies`

**Descripcion:** Tabla de deteccion de anomalias con indicadores de comportamiento. Las filas con anomalias detectadas (indicador >= threshold) se resaltan.

**Componentes utilizados:**

| Componente | Ubicacion | Props | Endpoint Backend |
|------------|-----------|-------|------------------|
| AnomaliesTable | `anomalies/AnomaliesTable.tsx` | `anomalies: AnomalyData[], threshold: number` | GET /api/anomalies |

**Layout:**

| Fila | Contenido |
|------|-----------|
| 1 | Encabezado: Titulo + Descripcion |
| 2 | AnomaliesTable (ancho completo) |

**Configuracion:**
- `threshold`: 0.7 (valor por defecto para deteccion de anomalias)

---

### 4.5 ControlPage

**Archivo:** `src/pages/ControlPage.tsx`

**Ruta:** `/control`

**Descripcion:** Panel de control con visualizacion radar de 5 indicadores clave: Calidad, Caudal, Ciberseguridad, Factor Humano y Temperatura.

**Componentes utilizados:**

| Componente | Ubicacion | Props | Endpoint Backend |
|------------|-----------|-------|------------------|
| RadarChart | `control/RadarChart.tsx` | `data: ControlIndicators` | GET /api/control/indicators |
| IndicatorsPanel | `control/IndicatorsPanel.tsx` | `data: ControlIndicators` | GET /api/control/indicators |
| Badge | `ui/Badge.tsx` | `variant, className` | N/A |

**Layout:**

| Columna 1-2 (col-span-2) | Columna 3 |
|--------------------------|-----------|
| RadarChart | IndicatorsPanel |

---

## 5. Documentacion de Componentes

### 5.1 Componentes UI Base

Ubicacion: `src/components/ui/`

#### Button

**Archivo:** `Button.tsx`

| Prop | Tipo | Default | Descripcion |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'danger'` | `'primary'` | Variante visual |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Tamano del boton |
| `children` | `ReactNode` | - | Contenido del boton |
| `...props` | `ButtonHTMLAttributes` | - | Props nativas de button |

**Variantes:**
- `primary`: Fondo teal, texto blanco
- `secondary`: Fondo blanco, borde gris
- `ghost`: Transparente, hover gris
- `danger`: Fondo rojo, texto blanco

**Ejemplo:**

```tsx
<Button variant="primary" size="md" onClick={handleClick}>
  Aplicar Filtros
</Button>
```

---

#### Card, CardHeader, CardTitle, CardContent

**Archivo:** `Card.tsx`

| Prop | Tipo | Default | Descripcion |
|------|------|---------|-------------|
| `padding` | `'none' \| 'sm' \| 'md' \| 'lg'` | `'md'` | Padding interno |
| `className` | `string` | - | Clases adicionales |

**Subcomponentes:**
- `CardHeader`: Contenedor flex con `justify-between` y `mb-4`
- `CardTitle`: Elemento `h3` con estilos de titulo
- `CardContent`: Contenedor de contenido

**Ejemplo:**

```tsx
<Card padding="md">
  <CardHeader>
    <CardTitle>Titulo de la Tarjeta</CardTitle>
    <Badge>Info</Badge>
  </CardHeader>
  <CardContent>
    Contenido aqui
  </CardContent>
</Card>
```

---

#### Badge

**Archivo:** `Badge.tsx`

| Prop | Tipo | Default | Descripcion |
|------|------|---------|-------------|
| `variant` | `'default' \| 'success' \| 'warning' \| 'danger' \| 'info'` | `'default'` | Variante de color |
| `className` | `string` | - | Clases adicionales |

---

#### Input

**Archivo:** `Input.tsx`

| Prop | Tipo | Default | Descripcion |
|------|------|---------|-------------|
| `type` | `string` | `'text'` | Tipo de input |
| `placeholder` | `string` | - | Placeholder |
| `...props` | `InputHTMLAttributes` | - | Props nativas |

---

#### Switch

**Archivo:** `Switch.tsx`

| Prop | Tipo | Default | Descripcion |
|------|------|---------|-------------|
| `checked` | `boolean` | - | Estado del switch |
| `onCheckedChange` | `(checked: boolean) => void` | - | Callback al cambiar |
| `disabled` | `boolean` | `false` | Deshabilitado |

---

#### Checkbox

**Archivo:** `Checkbox.tsx`

| Prop | Tipo | Default | Descripcion |
|------|------|---------|-------------|
| `checked` | `boolean` | - | Estado del checkbox |
| `onCheckedChange` | `(checked: boolean) => void` | - | Callback al cambiar |

---

#### StatusDot

**Archivo:** `StatusDot.tsx`

| Prop | Tipo | Default | Descripcion |
|------|------|---------|-------------|
| `status` | `'success' \| 'error' \| 'pending'` | - | Estado visual |

---

#### Tooltip

**Archivo:** `Tooltip.tsx`

Wrapper sobre Radix UI Tooltip con subcomponentes:
- `TooltipProvider`
- `TooltipTrigger`
- `TooltipContent`

---

### 5.2 Componentes de Layout

Ubicacion: `src/components/layout/`

#### AppLayout

**Archivo:** `AppLayout.tsx`

| Prop | Tipo | Descripcion |
|------|------|-------------|
| `children` | `ReactNode` | Contenido de la pagina |

**Estructura:**

```
+------------------+------------------------------+
|                  |           Header             |
|     Sidebar      +------------------------------+
|     (fixed)      |                              |
|                  |           {children}         |
|                  |           (main)             |
+------------------+------------------------------+
```

---

#### Sidebar

**Archivo:** `Sidebar.tsx`

**Caracteristicas:**
- Ancho fijo: 240px (`w-60`)
- Posicion: fixed left-0
- Navegacion desde `config/navigation.ts`
- Marca item activo con `useLocation()`
- Footer con indicador "Sistema En Linea" (pulso verde)

**Secciones:**
1. Sin titulo: Overview, Machine Status, Logs
2. "HERRAMIENTAS DE ANALISIS": Variables, Network Status, Alerts
3. "MONITOREO": Anomalies, Control, Settings

---

#### Header

**Archivo:** `Header.tsx`

**Elementos:**
- Barra de busqueda (Input con icono Search)
- LanguageToggle (ES/EN)
- NotificationsDropdown (menu de notificaciones)
- Perfil de usuario (avatar + nombre)

---

#### LanguageToggle

**Archivo:** `LanguageToggle.tsx`

Alterna entre idiomas ES y EN usando `useLanguageStore`.

---

#### NotificationsDropdown

**Archivo:** `NotificationsDropdown.tsx`

Menu desplegable con notificaciones del sistema. Usa Radix UI DropdownMenu.

---

### 5.3 Componentes de Dashboard

Ubicacion: `src/components/dashboard/`

#### KPICard

**Archivo:** `KPICard.tsx`

| Prop | Tipo | Descripcion |
|------|------|-------------|
| `data` | `KPIData` | Datos del KPI |

**Interface KPIData:**

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | `string` | Identificador unico |
| `icon` | `'efficiency' \| 'units' \| 'alerts'` | Icono a mostrar |
| `title` | `string` | Titulo del KPI |
| `titleKey` | `TranslationKey?` | Clave de traduccion |
| `value` | `string` | Valor principal |
| `subtitle` | `string?` | Texto secundario |
| `trend` | `{ direction, value }?` | Tendencia (up/down) |
| `variant` | `'teal' \| 'green' \| 'sky' \| 'neutral'` | Esquema de colores |

**Variantes de color:**
- `teal`: Gradiente teal (principal)
- `green`: Gradiente verde (exito)
- `sky`: Gradiente azul cielo
- `neutral`: Fondo blanco

---

#### ComboChart

**Archivo:** `ComboChart.tsx`

| Prop | Tipo | Descripcion |
|------|------|-------------|
| `data` | `ProductionData[]` | Datos de produccion |

**Caracteristicas:**
- Grafico combinado: Barras + Linea (Recharts)
- Dual Y-axis (izquierda: Caudal, derecha: Criticidad)
- Barras: `outputVolume` (teal #0D9488)
- Linea: `energyConsumption` (sky #0EA5E9)
- Incluye LiveIndicator en header
- Tooltip oscuro personalizado

---

#### CalendarGrid

**Archivo:** `CalendarGrid.tsx`

| Prop | Tipo | Default | Descripcion |
|------|------|---------|-------------|
| `anomalies` | `AnomalyData[]?` | `[]` | Anomalias para el calendario |
| `alerts` | `NetworkAlert[]?` | `[]` | Alertas para el calendario |
| `anomalyThreshold` | `number?` | `0.7` | Umbral de anomalia |
| `initialDate` | `Date?` | `new Date()` | Fecha inicial |
| `onDayClick` | `(date, events) => void?` | - | Click en dia |
| `onMonthChange` | `(date) => void?` | - | Cambio de mes |
| `showLegend` | `boolean?` | `true` | Mostrar leyenda |

**Subcomponentes:**
- `CalendarHeader`: Navegacion de meses
- `CalendarDayCell`: Celda individual de dia
- `CalendarLegend`: Leyenda de colores

---

#### EventLog

**Archivo:** `EventLog.tsx`

| Prop | Tipo | Descripcion |
|------|------|-------------|
| `events` | `EventLog[]` | Lista de eventos |

---

#### LiveIndicator

**Archivo:** `LiveIndicator.tsx`

| Prop | Tipo | Default | Descripcion |
|------|------|---------|-------------|
| `isLive` | `boolean?` | `true` | Estado de conexion |

Muestra "LIVE" (verde pulsante) o "OFFLINE" (gris).

---

### 5.4 Componentes de Network

Ubicacion: `src/components/network/`

#### HardwareOverview

**Archivo:** `HardwareOverview.tsx`

| Prop | Tipo | Descripcion |
|------|------|-------------|
| `devices` | `NetworkDevice[]` | Lista de dispositivos |

Muestra conteo de dispositivos por tipo: PC, PLC, Router, Switch, SCADA.

---

#### DevicesTable

**Archivo:** `DevicesTable.tsx`

| Prop | Tipo | Descripcion |
|------|------|-------------|
| `devices` | `NetworkDevice[]` | Lista de dispositivos |

**Columnas de la tabla:**

| Columna | Descripcion |
|---------|-------------|
| Status | 3 indicadores: Autorizado, Critico, Reparable |
| Nombre | Nombre del dispositivo |
| Tipo | PC, PLC, Router, Switch, SCADA |
| MAC | Direccion MAC (monoespaciado) |
| IP | Direccion IP (monoespaciado) |
| Importancia | Badge: Alta (rojo), Media (ambar), Baja (gris) |

---

#### AlertsTable

**Archivo:** `AlertsTable.tsx`

| Prop | Tipo | Descripcion |
|------|------|-------------|
| `alerts` | `NetworkAlert[]` | Lista de alertas |

**Columnas:**
- Tipo (badge color)
- Nombre
- MAC Origen / Destino
- IP Origen / Destino
- Fecha

---

#### StatusLegend

**Archivo:** `StatusLegend.tsx`

Leyenda visual que explica los 3 estados del StatusIndicator:
- Autorizado / No Autorizado
- Critico / No Critico
- Reparable / No Reparable

---

### 5.5 Componentes de Variables

Ubicacion: `src/components/variables/`

#### SensorCategoryPanel

**Archivo:** `SensorCategoryPanel.tsx`

| Prop | Tipo | Descripcion |
|------|------|-------------|
| `selectedSensors` | `string[]` | Sensores seleccionados |
| `onSensorToggle` | `(sensorName: string) => void` | Callback al toggle |

**Caracteristicas:**
- Header azul con titulo
- Categorias expandibles/colapsables
- Checkboxes para cada sensor
- Contador de sensores por categoria
- Scroll vertical con scrollbar personalizado

**Categorias (7 total, 34 sensores):**
- Caudal (7 sensores)
- Potencia (2 sensores)
- Temperatura (4 sensores)
- Redox (3 sensores)
- Gases (2 sensores)
- Quimicos (9 sensores)
- Otros (3 sensores)

---

#### TimeSeriesChart

**Archivo:** `TimeSeriesChart.tsx`

| Prop | Tipo | Descripcion |
|------|------|-------------|
| `sensorName` | `string` | Nombre del sensor |
| `data` | `TelemetryValue[]` | Datos de telemetria |

**Caracteristicas:**
- Grafico de linea Recharts
- Eje X: Timestamp formateado
- Eje Y: Valor del sensor
- Linea teal (#0D9488)
- Tooltip oscuro personalizado

---

### 5.6 Componentes de Anomalies

Ubicacion: `src/components/anomalies/`

#### AnomaliesTable

**Archivo:** `AnomaliesTable.tsx`

| Prop | Tipo | Default | Descripcion |
|------|------|---------|-------------|
| `anomalies` | `AnomalyData[]` | - | Datos de anomalias |
| `threshold` | `number?` | `0.7` | Umbral de deteccion |

**Columnas:**

| Columna | Descripcion |
|---------|-------------|
| Categoria | Categoria del sensor |
| Variable | Nombre de la variable |
| Valor Actual | Valor actual con 4 decimales |
| Separacion Comportamiento | Desviacion del comportamiento esperado |
| Indicador Anomalia | Badge rojo si >= threshold, gris si < |

**Caracteristicas:**
- Filas ordenadas por `anomalyIndicator` descendente
- Fila resaltada (bg-sky-50) si `isAnomaly=true`
- Subtitulo con threshold e instrucciones

---

### 5.7 Componentes de Control

Ubicacion: `src/components/control/`

#### RadarChart

**Archivo:** `RadarChart.tsx`

| Prop | Tipo | Descripcion |
|------|------|-------------|
| `data` | `ControlIndicators` | Indicadores de control |

**Caracteristicas:**
- Grafico radar (arana) con 5 ejes
- Ejes: Calidad, Caudal, Ciberseguridad, Factor Humano, Temperatura
- Rango: 0-1 (normalizado)
- Color: Teal (#0D9488)
- Relleno con opacidad 0.3

---

#### IndicatorsPanel

**Archivo:** `IndicatorsPanel.tsx`

| Prop | Tipo | Descripcion |
|------|------|-------------|
| `data` | `ControlIndicators` | Indicadores de control |

Lista de 5 indicadores con etiqueta y valor (formato monoespaciado, 2 decimales).

---

### 5.8 Componentes de Filters

Ubicacion: `src/components/filters/`

#### FiltersPanel

**Archivo:** `FiltersPanel.tsx`

Componente standalone con estado interno para filtros de datos.

**Secciones:**

| Seccion | Tipo | Opciones |
|---------|------|----------|
| Rango de Fechas | Botones | 24h, 7 Dias, Otro |
| Fuente de Datos | Checkboxes | Sensores Caudal, Temperatura, Quimicos |
| Metricas | Switches | Temperatura, Presion, Vibracion |
| Tipo Visualizacion | Botones icon | Linea, Barra, Area, Scatter |
| Alertas Umbral | Inputs | Temp. Maxima, Presion Maxima |

**Estado interno:**

```tsx
interface FiltersState {
  dateRange: '24h' | '7d' | 'custom';
  dataSources: string[];
  metricToggles: { temperature, pressure, vibration: boolean };
  visualizationType: 'line' | 'bar' | 'area' | 'scatter';
  thresholds: { maxTemperature, maxPressure: number };
}
```

---

## 6. Endpoints y Mapeo de Datos

### Estado Actual de Integracion

El frontend actualmente utiliza **datos mock** (`src/data/mockData.ts`). La integracion con el backend (FastAPI) esta pendiente usando TanStack Query.

### Tabla de Endpoints

| Endpoint | Metodo | Descripcion | Componentes | Estado |
|----------|--------|-------------|-------------|--------|
| `/api/telemetry/sensors` | GET | Lista de sensores disponibles | SensorCategoryPanel | Pendiente |
| `/api/telemetry/snapshot` | GET | Valores actuales de sensores | KPICard | Pendiente |
| `/api/telemetry/history` | GET | Datos historicos de sensores | ComboChart, TimeSeriesChart | Pendiente |
| `/api/anomalies` | GET | Lista de anomalias detectadas | AnomaliesTable, CalendarGrid | Pendiente |
| `/api/control/indicators` | GET | Indicadores de control | RadarChart, IndicatorsPanel | Pendiente |
| `/api/network/devices` | GET | Lista de dispositivos de red | HardwareOverview, DevicesTable | Pendiente |
| `/api/network/alerts` | GET | Alertas de red | AlertsTable, CalendarGrid | Pendiente |
| `/api/auth/login` | POST | Autenticacion JWT | (Pendiente implementar) | Pendiente |

### Estructura de Respuestas API

#### GET /api/telemetry/sensors

```json
{
  "sensors": [
    { "key": "FT1", "name": "Caudal entrada a biologico", "category": "Caudal" }
  ],
  "categories": ["Caudal", "Potencia", "Temperatura"],
  "lastUpdate": 1704672000000,
  "total": 34
}
```

#### GET /api/telemetry/history

Query params: `keys`, `startTs`, `endTs`, `aggregation`

```json
{
  "data": {
    "FT1": [{ "ts": 1704672000000, "value": 45.67 }]
  },
  "startTs": 1704672000000,
  "endTs": 1704758400000
}
```

#### GET /api/anomalies

Query params: `category`, `threshold`

```json
{
  "anomalies": [
    {
      "sensorKey": "FT1",
      "sensorName": "Caudal entrada a biologico",
      "category": "Caudal",
      "currentValue": 45.67,
      "behaviorSeparation": 0.234,
      "anomalyIndicator": 0.812,
      "isAnomaly": true
    }
  ],
  "threshold": 0.7,
  "timestamp": 1704672000000
}
```

#### GET /api/control/indicators

```json
{
  "indicators": {
    "calidad": 0.85,
    "caudal": 0.72,
    "ciberseguridad": 0.95,
    "factorHumano": 0.88,
    "temperatura": 0.78
  },
  "timestamp": 1704672000000,
  "status": "normal"
}
```

#### GET /api/network/devices

```json
{
  "devices": [
    {
      "id": "dev-001",
      "name": "PLC Principal",
      "type": "PLC",
      "macAddress": "00:1A:2B:3C:4D:5E",
      "ipAddress": "192.168.1.100",
      "importance": "Alta",
      "status": {
        "authorized": true,
        "critical": true,
        "repairable": false
      }
    }
  ],
  "total": 127
}
```

---

## 7. Sistema de Internacionalizacion

### Implementacion

**Archivo:** `src/stores/languageStore.ts`

El sistema soporta dos idiomas: Espanol (ES) e Ingles (EN).

### Store de Idioma

```tsx
interface LanguageState {
  language: 'es' | 'en';
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'es', // Espanol por defecto
      setLanguage: (language) => set({ language }),
      toggleLanguage: () => set((state) => ({
        language: state.language === 'es' ? 'en' : 'es',
      })),
    }),
    { name: 'atlaxia-language' }
  )
);
```

### Hook de Traduccion

```tsx
export function useTranslation() {
  const language = useLanguageStore((state) => state.language);

  const t = (key: TranslationKey): string => {
    return translations[language][key] || key;
  };

  return { t, language };
}
```

### Uso en Componentes

```tsx
import { useTranslation } from '@/stores/languageStore';

function MyComponent() {
  const { t, language } = useTranslation();

  return (
    <div>
      <h1>{t('overview')}</h1>
      <p>{t('systemOnline')}</p>
    </div>
  );
}
```

### Claves de Traduccion Disponibles

| Categoria | Claves |
|-----------|--------|
| Header | `search`, `admin`, `administrator` |
| Navegacion | `overview`, `plant`, `logs`, `telemetry`, `sniffer`, `policies`, `alerts`, `anomalies`, `control`, `settings` |
| KPIs | `systemStatus`, `devicesOnline`, `criticalityLevel`, `activeDevices`, `totalDevices` |
| Dashboard | `realtimeAnalysis`, `outputVolume`, `energyConsumption`, `recentApiLogs` |
| Filtros | `dataParameters`, `dateRange`, `dataSource`, `metricToggles`, `visualizationType`, `applyFilters` |
| Red | `hardwareDevices`, `networkDevices`, `networkAlerts`, `authorized`, `critical`, `repairable` |
| Anomalias | `anomalyDetection`, `category`, `variableName`, `currentValue`, `anomalyIndicator` |
| Control | `quality`, `flow`, `cybersecurity`, `humanFactor`, `temperature` |

---

## 8. Guias de Modificacion

### 8.1 Como Agregar un Nuevo Componente UI

1. **Crear archivo** en `src/components/ui/NuevoComponente.tsx`
2. **Implementar** con `forwardRef` si es interactivo
3. **Usar `cn()`** para combinar clases de Tailwind
4. **Exportar** desde `src/components/ui/index.ts`

**Plantilla:**

```tsx
import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface NuevoComponenteProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'alternate';
}

const NuevoComponente = forwardRef<HTMLDivElement, NuevoComponenteProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'base-styles',
          variant === 'alternate' && 'alternate-styles',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

NuevoComponente.displayName = 'NuevoComponente';

export { NuevoComponente };
```

**Actualizar index.ts:**

```tsx
export { NuevoComponente } from './NuevoComponente';
```

---

### 8.2 Como Agregar una Nueva Pagina

1. **Crear archivo** en `src/pages/NuevaPagina.tsx`
2. **Agregar ruta** en `src/App.tsx`
3. **Agregar item de navegacion** en `src/config/navigation.ts`
4. **Agregar traducciones** en `src/stores/languageStore.ts`

**Paso 1 - Crear pagina:**

```tsx
// src/pages/NuevaPagina.tsx
export function NuevaPagina() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Nueva Pagina</h1>
      {/* Contenido */}
    </div>
  );
}
```

**Paso 2 - Agregar ruta (App.tsx):**

```tsx
import { NuevaPagina } from '@/pages/NuevaPagina';

// En Routes:
<Route path="/nueva-ruta" element={<NuevaPagina />} />
```

**Paso 3 - Agregar navegacion (navigation.ts):**

```tsx
import { IconoLucide } from 'lucide-react';

// En el array de items:
{ icon: IconoLucide, labelKey: 'nuevaPagina', href: '/nueva-ruta' }
```

**Paso 4 - Agregar traducciones (languageStore.ts):**

```tsx
// En translations.es:
nuevaPagina: 'Nueva Pagina',

// En translations.en:
nuevaPagina: 'New Page',
```

---

### 8.3 Como Agregar un Componente de Feature

1. **Crear carpeta** si no existe: `src/components/nuevo-feature/`
2. **Crear componente** principal
3. **Crear index.ts** para exportaciones
4. **Importar interfaces** desde `src/types/index.ts`

**Estructura:**

```
src/components/nuevo-feature/
├── NuevoComponente.tsx
├── OtroComponente.tsx
└── index.ts
```

**index.ts:**

```tsx
export { NuevoComponente } from './NuevoComponente';
export { OtroComponente } from './OtroComponente';
```

---

### 8.4 Como Conectar a un Endpoint Real

Patron recomendado usando TanStack Query:

**Paso 1 - Crear hook en `src/hooks/`:**

```tsx
// src/hooks/useAnomalies.ts
import { useQuery } from '@tanstack/react-query';

interface AnomaliesResponse {
  anomalies: AnomalyData[];
  threshold: number;
  timestamp: number;
}

export function useAnomalies(threshold: number = 0.7) {
  return useQuery<AnomaliesResponse>({
    queryKey: ['anomalies', threshold],
    queryFn: async () => {
      const response = await fetch(`/api/anomalies?threshold=${threshold}`);
      if (!response.ok) throw new Error('Error fetching anomalies');
      return response.json();
    },
    staleTime: 5000,        // 5 segundos
    refetchInterval: 20000, // Refetch cada 20 segundos
  });
}
```

**Paso 2 - Usar en componente:**

```tsx
import { useAnomalies } from '@/hooks/useAnomalies';

function AnomaliesPage() {
  const { data, isLoading, error } = useAnomalies(0.7);

  if (isLoading) return <Loading />;
  if (error) return <Error message={error.message} />;

  return <AnomaliesTable anomalies={data.anomalies} threshold={data.threshold} />;
}
```

---

### 8.5 Como Agregar una Nueva Traduccion

1. **Abrir** `src/stores/languageStore.ts`
2. **Agregar en `translations.es`:**

```tsx
nuevaClave: 'Texto en espanol',
```

3. **Agregar en `translations.en`:**

```tsx
nuevaClave: 'Text in English',
```

4. **Usar en componente:**

```tsx
const { t } = useTranslation();
<span>{t('nuevaClave')}</span>
```

---

### 8.6 Como Agregar un Nuevo Sensor

1. **Agregar en `SENSOR_MAPPING`** (sensors.ts):

```tsx
'Nombre Legible del Sensor': 'CODIGO_SENSOR',
```

2. **Agregar a la categoria correspondiente** en `SENSOR_CATEGORIES`:

```tsx
{
  id: 'categoria',
  name: 'Categoria',
  sensors: [
    // ... sensores existentes
    'Nombre Legible del Sensor', // Nuevo
  ],
},
```

---

## 9. Tipos e Interfaces

**Archivo:** `src/types/index.ts`

### Telemetria

| Interface | Campos | Descripcion |
|-----------|--------|-------------|
| `TelemetryValue` | `ts: number`, `value: number` | Punto de telemetria |
| `DeviceTelemetry` | `deviceId`, `deviceName`, `telemetry` | Telemetria de dispositivo |
| `TelemetrySnapshot` | `timestamp`, `sensors: Record<string, number>` | Snapshot actual |

### Anomalias

| Interface | Campos | Descripcion |
|-----------|--------|-------------|
| `AnomalyData` | `sensorKey`, `sensorName`, `category`, `currentValue`, `behaviorSeparation`, `anomalyIndicator`, `isAnomaly`, `timestamp?` | Datos de anomalia |

### Control

| Interface | Campos | Descripcion |
|-----------|--------|-------------|
| `ControlIndicators` | `calidad`, `caudal`, `ciberseguridad`, `factorHumano`, `temperatura`, `timestamp` | Indicadores de control (0-1) |

### Red

| Interface | Campos | Descripcion |
|-----------|--------|-------------|
| `NetworkDevice` | `id`, `name`, `type`, `macAddress`, `ipAddress`, `importance`, `status` | Dispositivo de red |
| `NetworkAlert` | `id`, `type`, `name`, `macOrigin`, `macDestination`, `ipOrigin`, `ipDestination`, `date`, `timestamp` | Alerta de red |

### KPIs

| Interface | Campos | Descripcion |
|-----------|--------|-------------|
| `KPIData` | `id`, `icon`, `title`, `titleKey?`, `value`, `subtitle?`, `trend?`, `variant` | Datos de KPI |
| `ProductionData` | `timestamp`, `outputVolume`, `energyConsumption` | Datos de produccion |

### Calendario

| Interface | Campos | Descripcion |
|-----------|--------|-------------|
| `CalendarEvent` | `id`, `type`, `name`, `severity`, `timestamp` | Evento de calendario |
| `CalendarDayEvents` | `date`, `dateKey`, `anomalyCount`, `emergencyCount`, `alertCount`, `events` | Eventos de un dia |
| `CalendarDayData` | `date`, `dayOfMonth`, `isCurrentMonth`, `isToday`, `events` | Datos de celda de dia |

### Filtros

| Interface | Campos | Descripcion |
|-----------|--------|-------------|
| `FiltersState` | `dateRange`, `dataSources`, `metricToggles`, `visualizationType`, `thresholds` | Estado de filtros |

### Configuracion

| Interface | Campos | Descripcion |
|-----------|--------|-------------|
| `SensorCategory` | `id`, `name`, `sensors`, `expanded?` | Categoria de sensor |
| `EventLog` | `id`, `name`, `timestamp`, `status`, `statusText?` | Log de evento |

---

## 10. Utilidades y Helpers

### lib/utils.ts

| Funcion | Parametros | Retorno | Descripcion |
|---------|------------|---------|-------------|
| `cn()` | `...inputs: ClassValue[]` | `string` | Combina clases CSS (clsx + tailwind-merge) |
| `formatNumber()` | `value: number, decimals?: number` | `string` | Formatea numeros con locale ES |
| `formatPercentage()` | `value: number` | `string` | Formatea como porcentaje |
| `formatTimestamp()` | `timestamp: number` | `string` | Formatea hora (HH:mm:ss) |
| `formatDate()` | `timestamp: number` | `string` | Formatea fecha (DD/MM/YYYY) |
| `formatDateTime()` | `timestamp: number` | `string` | Formatea fecha y hora |
| `generateId()` | - | `string` | Genera ID aleatorio |

### lib/calendarUtils.ts

| Funcion | Parametros | Retorno | Descripcion |
|---------|------------|---------|-------------|
| `getDateKey()` | `date: Date` | `string` | Clave de fecha (YYYY-MM-DD) |
| `aggregateEventsByDate()` | `anomalies, alerts, threshold` | `Map<string, CalendarDayEvents>` | Agrupa eventos por fecha |
| `generateCalendarGrid()` | `currentDate, eventsByDate` | `CalendarDayData[][]` | Genera grid del calendario |
| `getBackgroundClass()` | `events: CalendarDayEvents \| null` | `string` | Clase CSS segun eventos |

---

## 11. Configuraciones

### 11.1 Sensores (config/sensors.ts)

**SENSOR_MAPPING:** Mapeo nombre legible → codigo sensor (34 sensores)

```tsx
{
  'Caudal entrada a biologico': 'FT1',
  'Potencia CCM': 'POT_CCM',
  'Turbidez': 'TURB1',
  // ... 31 sensores mas
}
```

**SENSOR_CATEGORIES:** Agrupacion por categoria

| Categoria | ID | Cantidad |
|-----------|----|----------|
| Caudal | `caudal` | 7 |
| Potencia | `potencia` | 2 |
| Temperatura | `temperatura` | 4 |
| Redox | `redox` | 3 |
| Gases | `gases` | 2 |
| Quimicos | `quimicos` | 9 |
| Otros | `otros` | 3 |

**Funciones auxiliares:**
- `getCategoryBySensor(sensorName)`: Retorna categoria del sensor
- `getAllSensors()`: Retorna array con todos los sensores

---

### 11.2 Navegacion (config/navigation.ts)

**Estructura:**

```tsx
interface NavItem {
  icon: LucideIcon;
  labelKey: TranslationKey;
  href: string;
}

interface NavSection {
  titleKey?: TranslationKey;
  items: NavItem[];
}
```

**Secciones:**

| Seccion | Titulo | Items |
|---------|--------|-------|
| 1 | (sin titulo) | Overview, Machine Status, Logs |
| 2 | `analyticsTools` | Variables, Network Status, Alerts |
| 3 | `monitoring` | Anomalies, Control, Settings |

---

## 12. Estilos y Temas

### Colores Principales (Tailwind)

| Token | Color | Hex | Uso |
|-------|-------|-----|-----|
| `primary-*` | Teal | #0D9488 | Acciones principales, brand |
| `secondary-*` | Sky | #0EA5E9 | Acciones secundarias |
| `slate-*` | Gris | - | Textos, fondos |
| `emerald-*` | Verde | - | Estados exitosos |
| `red-*` | Rojo | - | Errores, alertas criticas |
| `amber-*` | Ambar | - | Advertencias |

### Configuracion Tailwind (tailwind.config.js)

**Colores personalizados:**

```js
colors: {
  primary: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    // ... hasta 900
    600: '#0d9488',
    700: '#0f766e',
  }
}
```

**Sombras:**

```js
boxShadow: {
  card: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
}
```

**Animaciones:**

```js
animation: {
  'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
}
```

### Fuente

- Font family: Inter (sans-serif)

---

## 13. Apendices

### A. Glosario de Terminos

| Termino | Definicion |
|---------|------------|
| Telemetria | Datos de sensores en tiempo real transmitidos desde dispositivos IoT |
| Anomalia | Valor de sensor que se desvia significativamente del comportamiento esperado |
| KPI | Key Performance Indicator - Indicador clave de rendimiento |
| SCADA | Supervisory Control and Data Acquisition - Sistema de control y adquisicion de datos |
| PLC | Programmable Logic Controller - Controlador logico programable |
| Threshold | Umbral de deteccion para considerar un valor como anomalia |
| Caudal | Volumen de fluido por unidad de tiempo (m3/h) |
| Redox | Potencial de oxidacion-reduccion |

### B. Referencias

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Recharts](https://recharts.org/en-US/api)
- [Zustand](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [TanStack Query](https://tanstack.com/query/latest)
- [React Router v6](https://reactrouter.com/en/main)
- [Radix UI](https://www.radix-ui.com/docs/primitives)
- [Lucide Icons](https://lucide.dev/icons/)

### C. Changelog del Documento

| Version | Fecha | Cambios |
|---------|-------|---------|
| 1.0.0 | Enero 2026 | Version inicial del documento |

---

*Documento generado para el proyecto proTrueData - ATLAXIA*
