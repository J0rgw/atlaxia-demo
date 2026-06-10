# Fase 2: Wizard de Setup - Documentacion Extendida

## Objetivo Principal

El wizard de setup es una interfaz de usuario que **genera y envia un JSON de configuracion** al backend. Este JSON se almacena en la tabla `installation_config` y define como funcionara la aplicacion para esa instalacion especifica.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   WIZARD FRONTEND                          BACKEND                       │
│   ┌──────────────────┐                    ┌──────────────────────────┐  │
│   │                  │                    │                          │  │
│   │  Paso 1: Nombre  │                    │  installation_config     │  │
│   │  Paso 2: Sensors │    POST /setup     │  ┌────────────────────┐  │  │
│   │  Paso 3: Pages   │  ───────────────▶  │  │ installation_name  │  │  │
│   │  Paso 4: Admin   │                    │  │ sensors_config {}  │  │  │
│   │  Paso 5: Confirm │                    │  │ pages_config {}    │  │  │
│   │                  │                    │  │ theme_* colors     │  │  │
│   └──────────────────┘                    │  └────────────────────┘  │  │
│                                           │                          │  │
│                                           └──────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## El JSON de Configuracion

El wizard genera un objeto JSON que se envia al endpoint `POST /api/installation/setup`. Este es el **unico proposito** del wizard: construir este JSON paso a paso.

### Estructura del JSON Final

```json
{
  "installation": {
    "name": "EDAR Madrid Sur",
    "logo_url": "/uploads/logo-edar.png",
    "theme": {
      "primary": "#0D9488",
      "secondary": "#0EA5E9",
      "accent": "#F59E0B"
    }
  },
  "sensors_config": {
    "categories": [
      {
        "id": "caudal",
        "name": "Caudal",
        "expanded": true,
        "sensors": ["caudal_area_1", "caudal_101", "caudal_201"]
      },
      {
        "id": "presion",
        "name": "Presion",
        "expanded": false,
        "sensors": ["presion_001", "presion_002"]
      }
    ],
    "mapping": {
      "caudal_area_1": {
        "thingsboard_key": "1_FIT_001_PV.Value",
        "display_name": "Caudal Area 1",
        "unit": "m3/h",
        "min": 0,
        "max": 100
      },
      "caudal_101": {
        "thingsboard_key": "2_FIC_101_PV.Value",
        "display_name": "Caudal 101",
        "unit": "m3/h"
      },
      "presion_001": {
        "thingsboard_key": "2_PIT_001_PV.Value",
        "display_name": "Presion 001",
        "unit": "bar"
      }
    },
    "defaultSelected": ["caudal_area_1", "presion_001"]
  },
  "pages_config": {
    "enabled": ["overview", "variables", "network", "settings"],
    "default": "overview"
  },
  "admin_user": {
    "username": "admin_edar",
    "email": "admin@edarmadrid.es",
    "password": "SecurePassword123"
  }
}
```

---

## Flujo de Datos

### 1. Carga Inicial

Cuando el usuario accede a `/setup`, el frontend:

```
1. GET /api/installation/status
   → Verifica que setup_completed = false
   → Si es true, redirige a /login

2. GET /api/thingsboard/sensors (o /api/telemetry/snapshot)
   → Carga lista de sensores disponibles desde ThingsBoard
   → Estos son los sensores que el tecnico puede seleccionar
```

### 2. Durante el Wizard

El wizard mantiene un **estado local** que se va construyendo:

```typescript
// Estado del wizard (en memoria)
const [wizardData, setWizardData] = useState<SetupData>({
  installation: {
    name: '',
    logo_url: null,
    theme: { primary: '#0D9488', secondary: '#0EA5E9', accent: '#F59E0B' }
  },
  sensors_config: {
    categories: [],
    mapping: {},
    defaultSelected: []
  },
  pages_config: {
    enabled: ['overview', 'variables', 'network', 'settings'],
    default: 'overview'
  },
  admin_user: {
    username: '',
    email: '',
    password: ''
  }
});
```

### 3. Al Completar

```
POST /api/installation/setup
Body: wizardData (el JSON completo)

→ Backend guarda en installation_config
→ Backend crea usuario admin
→ Frontend redirige a /login
```

---

## Desglose por Paso

### PASO 1: Identidad de la Instalacion

**Objetivo:** Poblar `installation` en el JSON

```
┌─────────────────────────────────────────────────────────────┐
│  [1/5] IDENTIDAD DE LA INSTALACION                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Nombre de la instalacion *                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ EDAR Madrid Sur                                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Logo (opcional)                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ [Seleccionar archivo...]  logo-edar.png             │    │
│  └─────────────────────────────────────────────────────┘    │
│  Vista previa: [imagen]                                      │
│                                                              │
│  Colores del tema                                            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ Primario     │ │ Secundario   │ │ Acento       │        │
│  │ [#0D9488] ██ │ │ [#0EA5E9] ██ │ │ [#F59E0B] ██ │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│                                                              │
│                                        [Siguiente →]        │
└─────────────────────────────────────────────────────────────┘
```

**JSON generado en este paso:**

```json
{
  "installation": {
    "name": "EDAR Madrid Sur",
    "logo_url": "/uploads/logo-edar.png",
    "theme": {
      "primary": "#0D9488",
      "secondary": "#0EA5E9",
      "accent": "#F59E0B"
    }
  }
}
```

**Componentes React:**
- Input de texto para nombre
- File upload para logo (opcional endpoint de upload)
- Color pickers para tema

---

### PASO 2: Configurar Sensores

**Objetivo:** Poblar `sensors_config` en el JSON

Este es el paso mas complejo. El tecnico:
1. Ve todos los sensores disponibles en ThingsBoard (lado izquierdo)
2. Selecciona cuales quiere habilitar
3. Los organiza en categorias
4. Les da nombres legibles

```
┌─────────────────────────────────────────────────────────────┐
│  [2/5] CONFIGURAR SENSORES                                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  │
│  │ SENSORES DISPONIBLES    │  │ SENSORES HABILITADOS    │  │
│  │ (desde ThingsBoard)     │  │ (organizados)           │  │
│  ├─────────────────────────┤  ├─────────────────────────┤  │
│  │ Buscar: [____________]  │  │ [+ Nueva Categoria]     │  │
│  │                         │  │                         │  │
│  │ ☐ 1_AIT_001_PV.Value   │  │ ▼ Caudal               │  │
│  │ ☐ 1_AIT_002_PV.Value   │  │   • Caudal Area 1 [✎]  │  │
│  │ ☑ 1_FIT_001_PV.Value   │→ │   • Caudal 101    [✎]  │  │
│  │ ☐ 1_FIT_002_PV.Value   │  │                         │  │
│  │ ☑ 2_FIC_101_PV.Value   │→ │ ▶ Presion              │  │
│  │ ☐ 2_FIC_102_PV.Value   │  │   • Presion 001   [✎]  │  │
│  │ ☑ 2_PIT_001_PV.Value   │→ │                         │  │
│  │ ☐ 2_PIT_002_PV.Value   │  │ [Arrastrar para        │  │
│  │ ...                     │  │  reordenar]            │  │
│  └─────────────────────────┘  └─────────────────────────┘  │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│  EDITAR SENSOR: Caudal Area 1                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Clave TB: 1_FIT_001_PV.Value (readonly)             │   │
│  │ Nombre:   [Caudal Area 1        ]                   │   │
│  │ Unidad:   [m3/h    ]  Min: [0  ]  Max: [100 ]      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│                          [← Atras]  [Siguiente →]           │
└─────────────────────────────────────────────────────────────┘
```

**JSON generado en este paso:**

```json
{
  "sensors_config": {
    "categories": [
      {
        "id": "caudal",
        "name": "Caudal",
        "expanded": true,
        "sensors": ["caudal_area_1", "caudal_101"]
      },
      {
        "id": "presion",
        "name": "Presion",
        "expanded": false,
        "sensors": ["presion_001"]
      }
    ],
    "mapping": {
      "caudal_area_1": {
        "thingsboard_key": "1_FIT_001_PV.Value",
        "display_name": "Caudal Area 1",
        "unit": "m3/h",
        "min": 0,
        "max": 100
      },
      "caudal_101": {
        "thingsboard_key": "2_FIC_101_PV.Value",
        "display_name": "Caudal 101",
        "unit": "m3/h"
      },
      "presion_001": {
        "thingsboard_key": "2_PIT_001_PV.Value",
        "display_name": "Presion 001",
        "unit": "bar"
      }
    },
    "defaultSelected": ["caudal_area_1", "presion_001"]
  }
}
```

**Logica del paso:**

```typescript
// Sensores disponibles (cargados de ThingsBoard)
const [availableSensors, setAvailableSensors] = useState<string[]>([]);

// Sensores seleccionados con su configuracion
const [selectedSensors, setSelectedSensors] = useState<Map<string, SensorConfig>>();

// Categorias creadas
const [categories, setCategories] = useState<Category[]>([]);

// Cuando el usuario selecciona un sensor:
const handleSelectSensor = (tbKey: string) => {
  // 1. Crear ID interno (slug del nombre)
  const id = generateId(tbKey); // "1_FIT_001_PV.Value" -> "fit_001"

  // 2. Crear mapping inicial
  selectedSensors.set(id, {
    thingsboard_key: tbKey,
    display_name: tbKey, // El usuario puede editarlo
    unit: null,
    min: null,
    max: null
  });

  // 3. Agregarlo a "Sin categoria" por defecto
  addToUncategorized(id);
};
```

**Componentes React:**
- Lista de sensores disponibles (con busqueda)
- Lista de sensores seleccionados (con drag & drop)
- Creador de categorias
- Editor de sensor (modal o inline)

---

### PASO 3: Paginas Habilitadas

**Objetivo:** Poblar `pages_config` en el JSON

```
┌─────────────────────────────────────────────────────────────┐
│  [3/5] PAGINAS HABILITADAS                                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Selecciona las paginas que estaran disponibles:            │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [✓] Overview                                         │   │
│  │     Dashboard principal con metricas generales       │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ [✓] Variables                                        │   │
│  │     Monitoreo de sensores en tiempo real             │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ [✓] Network                                          │   │
│  │     Estado de la red y dispositivos                  │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ [ ] Anomalies                                        │   │
│  │     Deteccion de anomalias (requiere ML)             │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ [ ] Control                                          │   │
│  │     Control de procesos y actuadores                 │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ [✓] Settings                                         │   │
│  │     Configuracion (solo visible para admin)          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  Pagina por defecto: [Overview           ▼]                 │
│                                                              │
│                          [← Atras]  [Siguiente →]           │
└─────────────────────────────────────────────────────────────┘
```

**JSON generado en este paso:**

```json
{
  "pages_config": {
    "enabled": ["overview", "variables", "network", "settings"],
    "default": "overview"
  }
}
```

**Componentes React:**
- Lista de checkboxes con descripcion
- Dropdown para pagina por defecto

---

### PASO 4: Crear Administrador

**Objetivo:** Poblar `admin_user` en el JSON

```
┌─────────────────────────────────────────────────────────────┐
│  [4/5] CREAR CUENTA ADMINISTRADOR                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Esta cuenta sera el administrador principal del sistema.    │
│  Podra crear usuarios adicionales desde Settings.           │
│                                                              │
│  Nombre de usuario *                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ admin_edar                                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  Email *                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ admin@edarmadrid.es                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  Contrasena *                                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ••••••••••••                                         │   │
│  └─────────────────────────────────────────────────────┘   │
│  Minimo 8 caracteres                                         │
│                                                              │
│  Confirmar contrasena *                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ••••••••••••                                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│                          [← Atras]  [Siguiente →]           │
└─────────────────────────────────────────────────────────────┘
```

**JSON generado en este paso:**

```json
{
  "admin_user": {
    "username": "admin_edar",
    "email": "admin@edarmadrid.es",
    "password": "SecurePassword123"
  }
}
```

**Componentes React:**
- Inputs con validacion
- Verificador de fortaleza de contrasena
- Confirmacion de contrasena

---

### PASO 5: Resumen y Confirmacion

**Objetivo:** Mostrar JSON final y enviar al backend

```
┌─────────────────────────────────────────────────────────────┐
│  [5/5] RESUMEN Y CONFIRMACION                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Revisa la configuracion antes de completar:                 │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ INSTALACION                                          │   │
│  │ Nombre: EDAR Madrid Sur                              │   │
│  │ Logo: logo-edar.png                                  │   │
│  │ Tema: ██ ██ ██                                       │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ SENSORES                                             │   │
│  │ Categorias: 2 (Caudal, Presion)                      │   │
│  │ Sensores habilitados: 3                              │   │
│  │ Seleccionados por defecto: 2                         │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ PAGINAS                                              │   │
│  │ Habilitadas: Overview, Variables, Network, Settings  │   │
│  │ Por defecto: Overview                                │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ ADMINISTRADOR                                        │   │
│  │ Usuario: admin_edar                                  │   │
│  │ Email: admin@edarmadrid.es                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  [ ] Mostrar JSON completo (debug)                          │
│                                                              │
│                          [← Atras]  [Completar Setup]       │
└─────────────────────────────────────────────────────────────┘
```

**Al hacer click en "Completar Setup":**

```typescript
const handleCompleteSetup = async () => {
  setLoading(true);

  try {
    // Enviar JSON completo al backend
    const response = await api.post('/api/installation/setup', wizardData);

    if (response.success) {
      // Redirigir a login
      navigate('/login');
      toast.success('Instalacion configurada correctamente');
    }
  } catch (error) {
    toast.error('Error al configurar la instalacion');
  } finally {
    setLoading(false);
  }
};
```

---

## Estructura de Archivos Frontend

```
src/
├── pages/
│   └── setup/
│       ├── SetupWizard.tsx         # Componente principal (maneja estado)
│       ├── steps/
│       │   ├── IdentityStep.tsx    # Paso 1: Nombre, logo, tema
│       │   ├── SensorsStep.tsx     # Paso 2: Configurar sensores
│       │   ├── PagesStep.tsx       # Paso 3: Paginas habilitadas
│       │   ├── AdminStep.tsx       # Paso 4: Crear admin
│       │   └── SummaryStep.tsx     # Paso 5: Resumen y confirmar
│       ├── components/
│       │   ├── StepIndicator.tsx   # Indicador de progreso
│       │   ├── SensorPicker.tsx    # Selector de sensores
│       │   ├── CategoryEditor.tsx  # Editor de categorias
│       │   ├── ColorPicker.tsx     # Selector de color
│       │   └── PageToggle.tsx      # Toggle de paginas
│       └── types.ts                # Tipos TypeScript
├── stores/
│   └── setupStore.ts               # Estado del wizard (Zustand)
└── hooks/
    └── useSetupWizard.ts           # Hook para logica del wizard
```

---

## Estado del Wizard (Zustand)

```typescript
// stores/setupStore.ts

interface SetupState {
  // Datos del wizard
  installation: {
    name: string;
    logo_url: string | null;
    theme: {
      primary: string;
      secondary: string;
      accent: string;
    };
  };
  sensors_config: {
    categories: Category[];
    mapping: Record<string, SensorMapping>;
    defaultSelected: string[];
  };
  pages_config: {
    enabled: string[];
    default: string;
  };
  admin_user: {
    username: string;
    email: string;
    password: string;
  };

  // Estado del wizard
  currentStep: number;
  isLoading: boolean;
  error: string | null;

  // Acciones
  setInstallation: (data: Partial<SetupState['installation']>) => void;
  setSensorsConfig: (data: Partial<SetupState['sensors_config']>) => void;
  setPagesConfig: (data: Partial<SetupState['pages_config']>) => void;
  setAdminUser: (data: Partial<SetupState['admin_user']>) => void;
  nextStep: () => void;
  prevStep: () => void;
  submitSetup: () => Promise<void>;
  reset: () => void;
}
```

---

## Validaciones por Paso

| Paso | Validaciones |
|------|-------------|
| 1. Identidad | - Nombre requerido (min 1 char) <br> - Colores en formato hex valido |
| 2. Sensores | - Al menos 1 sensor seleccionado <br> - Cada sensor tiene display_name |
| 3. Paginas | - Al menos 1 pagina habilitada <br> - Pagina default esta en enabled |
| 4. Admin | - Username min 3 chars <br> - Email valido <br> - Password min 8 chars <br> - Passwords coinciden |
| 5. Resumen | - Ninguna (solo visualizacion) |

---

## Flujo Completo

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  Usuario accede a la app por primera vez                               │
│                              │                                          │
│                              ▼                                          │
│                    GET /api/installation/status                        │
│                              │                                          │
│              ┌───────────────┴───────────────┐                         │
│              │                               │                          │
│    setup_completed=true           setup_completed=false                │
│              │                               │                          │
│              ▼                               ▼                          │
│        Redirigir a                    Mostrar Wizard                   │
│          /login                        /setup                          │
│                                              │                          │
│                                              ▼                          │
│                                   Usuario completa pasos               │
│                                              │                          │
│                                              ▼                          │
│                                 POST /api/installation/setup           │
│                                    { JSON completo }                   │
│                                              │                          │
│                                              ▼                          │
│                                   Backend guarda config                │
│                                   Backend crea usuario                 │
│                                              │                          │
│                                              ▼                          │
│                                  Redirigir a /login                    │
│                                              │                          │
│                                              ▼                          │
│                               Usuario hace login normal                │
│                                              │                          │
│                                              ▼                          │
│                              App carga config desde backend            │
│                              GET /api/installation/config              │
│                                              │                          │
│                                              ▼                          │
│                              Sidebar, sensores, tema                   │
│                              aplican segun configuracion               │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Resumen

El wizard de setup es simplemente una **interfaz para construir un JSON**. No hay magia:

1. **Paso 1** -> Llena `installation`
2. **Paso 2** -> Llena `sensors_config`
3. **Paso 3** -> Llena `pages_config`
4. **Paso 4** -> Llena `admin_user`
5. **Paso 5** -> Muestra el JSON y lo envia con `POST /api/installation/setup`

El backend recibe este JSON, lo descompone, guarda en `installation_config` y crea el usuario admin.

Despues, cuando cualquier usuario hace login, el frontend carga la configuracion con `GET /api/installation/config` y la usa para:
- Mostrar/ocultar paginas en el sidebar
- Cargar los sensores configurados en VariablesPage
- Aplicar los colores del tema

---

*Documento creado: Enero 2026*
