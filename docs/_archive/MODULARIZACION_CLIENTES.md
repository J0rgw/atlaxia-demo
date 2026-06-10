# Estudio de Modularizacion para Clientes

## Resumen Ejecutivo

Este documento define la estrategia de modularizacion del frontend TrueData para adaptarlo a diferentes clientes industriales. La solucion elegida es **API-Driven Configuration**, donde el backend centraliza toda la configuracion del cliente y la entrega al frontend de forma segura.


## 1. Arquitectura Elegida: API-Driven Configuration

### 1.1 Concepto

El backend es la unica fuente de verdad para la configuracion de cada cliente. El frontend solicita su configuracion al autenticarse y adapta dinamicamente:

- Identidad visual (logo, colores, nombre)
- Sensores disponibles y sus categorias
- Paginas habilitadas
- Funcionalidades activas
- Parametros especificos de la industria

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Cliente   │────▶│   Backend   │────▶│ ThingsBoard │
│  (Frontend) │     │    (BFF)    │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │
       │  GET /api/client  │
       │   /config         │
       │◀──────────────────│
       │                   │
       │   Configuracion   │
       │   del cliente     │
       │                   │
```

### 1.2 Ventajas de esta Arquitectura

| Aspecto | Beneficio |
|---------|-----------|
| **Seguridad** | Configuracion no expuesta en frontend |
| **Centralizacion** | Una sola fuente de verdad |
| **Dinamismo** | Cambios sin redeploy del frontend |
| **Auditoria** | Log de cambios de configuracion |
| **Multi-tenant** | Un frontend, multiples clientes |
| **Control de acceso** | Configuracion ligada a autenticacion |
| **Escalabilidad** | Facil agregar nuevos clientes |

### 1.3 Flujo de Configuracion

```
1. Usuario accede al frontend
2. Frontend solicita login
3. Backend autentica y retorna:
   - Token de sesion
   - Datos del usuario
   - Licencia activa
   - Configuracion del cliente (NUEVO)
4. Frontend aplica configuracion:
   - Carga tema/colores
   - Configura sensores disponibles
   - Habilita/oculta paginas
   - Muestra branding del cliente
5. Usuario navega con experiencia personalizada
```

---

## 2. Modelo de Datos

### 2.1 Entidad: ClientConfiguration

```python
# Backend: /bff/src/db/models.py

class ClientConfiguration(Base):
    __tablename__ = "client_configurations"

    id = Column(Integer, primary_key=True)
    license_id = Column(Integer, ForeignKey("licenses.id"), unique=True)

    # Branding
    client_name = Column(String(100), nullable=False)
    client_code = Column(String(50), unique=True, nullable=False)
    logo_url = Column(String(255), nullable=True)
    favicon_url = Column(String(255), nullable=True)

    # Tema
    theme_primary = Column(String(7), default="#0D9488")
    theme_secondary = Column(String(7), default="#0EA5E9")
    theme_accent = Column(String(7), default="#F59E0B")

    # Industria
    industry_type = Column(String(50), default="generic")

    # Configuracion JSON flexible
    sensors_config = Column(JSON, nullable=False)
    pages_config = Column(JSON, nullable=False)
    features_config = Column(JSON, nullable=False)
    dashboard_config = Column(JSON, nullable=True)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)

    # Relacion
    license = relationship("License", back_populates="client_config")
```

### 2.2 Estructura JSON: sensors_config

```json
{
  "categories": [
    {
      "id": "caudal",
      "name": "Caudal",
      "icon": "Waves",
      "color": "#0EA5E9",
      "expanded": true,
      "sensors": [
        {
          "key": "1_FIT_001_PV.Value",
          "name": "Caudal Entrada",
          "unit": "m3/h",
          "decimals": 2,
          "min": 0,
          "max": 1000,
          "alarmLow": 50,
          "alarmHigh": 900
        },
        {
          "key": "2_FIC_101_PV.Value",
          "name": "Caudal Salida",
          "unit": "m3/h",
          "decimals": 2
        }
      ]
    },
    {
      "id": "presion",
      "name": "Presion",
      "icon": "Gauge",
      "color": "#F59E0B",
      "sensors": [...]
    }
  ],
  "defaultSelected": ["1_FIT_001_PV.Value", "2_PIT_001_PV.Value"]
}
```

### 2.3 Estructura JSON: pages_config

```json
{
  "pages": {
    "overview": {
      "enabled": true,
      "visible": true,
      "order": 1,
      "customTitle": null
    },
    "variables": {
      "enabled": true,
      "visible": true,
      "order": 2
    },
    "network": {
      "enabled": true,
      "visible": true,
      "order": 3
    },
    "anomalies": {
      "enabled": true,
      "visible": false,
      "order": 4
    },
    "control": {
      "enabled": false,
      "visible": false,
      "order": 5
    },
    "settings": {
      "enabled": true,
      "visible": true,
      "order": 99,
      "adminOnly": true
    }
  },
  "defaultPage": "overview"
}
```

### 2.4 Estructura JSON: features_config

```json
{
  "realTimeUpdates": {
    "enabled": true,
    "intervalMs": 10000
  },
  "anomalyDetection": {
    "enabled": true,
    "defaultThreshold": 0.7
  },
  "dataExport": {
    "enabled": false,
    "formats": ["csv", "xlsx"]
  },
  "notifications": {
    "enabled": true,
    "email": true,
    "push": false
  },
  "multiLanguage": {
    "enabled": true,
    "languages": ["es", "en"],
    "default": "es"
  }
}
```

### 2.5 Estructura JSON: dashboard_config

```json
{
  "layout": "water-treatment",
  "kpis": [
    {
      "id": "volumen_tratado",
      "title": "Volumen Tratado",
      "sensorKey": "1_FIT_001_PV.Value",
      "aggregation": "sum",
      "period": "today",
      "unit": "m3",
      "icon": "Droplets",
      "variant": "teal"
    },
    {
      "id": "calidad_agua",
      "title": "Calidad del Agua",
      "sensorKey": "1_AIT_001_PV.Value",
      "aggregation": "avg",
      "period": "today",
      "unit": "%",
      "icon": "Sparkles",
      "variant": "green"
    }
  ],
  "charts": [
    {
      "id": "produccion_diaria",
      "type": "combo",
      "sensors": ["1_FIT_001_PV.Value", "POT_CCM"],
      "period": "7d"
    }
  ],
  "calendar": {
    "enabled": true,
    "eventTypes": ["anomaly", "maintenance", "alert"]
  }
}
```

---

## 3. API Endpoints

### 3.1 Endpoint Principal

```
GET /api/client/config
Authorization: Bearer {token}
```

**Respuesta:**

```json
{
  "client": {
    "id": 1,
    "code": "planta-madrid",
    "name": "Planta de Aguas Madrid",
    "industry": "water-treatment",
    "logoUrl": "/api/client/assets/logo.svg",
    "faviconUrl": "/api/client/assets/favicon.ico"
  },
  "theme": {
    "primary": "#0D9488",
    "secondary": "#0EA5E9",
    "accent": "#F59E0B"
  },
  "sensors": {
    "categories": [...],
    "defaultSelected": [...]
  },
  "pages": {
    "pages": {...},
    "defaultPage": "overview"
  },
  "features": {
    "realTimeUpdates": {...},
    "anomalyDetection": {...}
  },
  "dashboard": {
    "layout": "water-treatment",
    "kpis": [...],
    "charts": [...]
  }
}
```

### 3.2 Endpoints de Assets

```
GET /api/client/assets/logo.svg
GET /api/client/assets/favicon.ico
```

Los assets se sirven desde el backend, asociados a la licencia del usuario autenticado.

### 3.3 Endpoints de Administracion (Solo Superadmin)

```
GET    /api/admin/clients                    # Listar clientes
GET    /api/admin/clients/{id}/config        # Ver configuracion
PUT    /api/admin/clients/{id}/config        # Actualizar configuracion
POST   /api/admin/clients                    # Crear nuevo cliente
DELETE /api/admin/clients/{id}               # Eliminar cliente
POST   /api/admin/clients/{id}/assets        # Subir logo/favicon
```

---

## 4. Implementacion Frontend

### 4.1 Nuevo Store: clientConfigStore

```typescript
// /src/stores/clientConfigStore.ts

import { create } from 'zustand';
import { api } from '@/lib/api';

interface ClientConfig {
  client: {
    id: number;
    code: string;
    name: string;
    industry: string;
    logoUrl: string | null;
    faviconUrl: string | null;
  };
  theme: {
    primary: string;
    secondary: string;
    accent: string;
  };
  sensors: {
    categories: SensorCategory[];
    defaultSelected: string[];
  };
  pages: {
    pages: Record<string, PageConfig>;
    defaultPage: string;
  };
  features: Record<string, FeatureConfig>;
  dashboard: DashboardConfig;
}

interface ClientConfigStore {
  config: ClientConfig | null;
  loading: boolean;
  error: string | null;
  fetchConfig: () => Promise<void>;
  clearConfig: () => void;
}

export const useClientConfigStore = create<ClientConfigStore>((set) => ({
  config: null,
  loading: false,
  error: null,

  fetchConfig: async () => {
    set({ loading: true, error: null });
    try {
      const config = await api.get<ClientConfig>('/api/client/config');
      set({ config, loading: false });

      // Aplicar tema dinamicamente
      applyTheme(config.theme);

      // Actualizar favicon
      if (config.client.faviconUrl) {
        updateFavicon(config.client.faviconUrl);
      }

      // Actualizar titulo de la pagina
      document.title = config.client.name;

    } catch (error) {
      set({ error: 'Error cargando configuracion', loading: false });
    }
  },

  clearConfig: () => set({ config: null }),
}));

function applyTheme(theme: ClientConfig['theme']) {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', theme.primary);
  root.style.setProperty('--color-secondary', theme.secondary);
  root.style.setProperty('--color-accent', theme.accent);
}

function updateFavicon(url: string) {
  const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
  if (link) {
    link.href = url;
  }
}
```

### 4.2 Hook: useClientConfig

```typescript
// /src/hooks/useClientConfig.ts

import { useEffect } from 'react';
import { useClientConfigStore } from '@/stores/clientConfigStore';
import { useAuthStore } from '@/stores/authStore';

export function useClientConfig() {
  const { config, loading, error, fetchConfig } = useClientConfigStore();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && !config) {
      fetchConfig();
    }
  }, [isAuthenticated, config, fetchConfig]);

  return { config, loading, error };
}

// Hooks especificos
export function useSensorsConfig() {
  const { config } = useClientConfigStore();
  return config?.sensors ?? { categories: [], defaultSelected: [] };
}

export function usePagesConfig() {
  const { config } = useClientConfigStore();
  return config?.pages ?? { pages: {}, defaultPage: 'overview' };
}

export function useFeaturesConfig() {
  const { config } = useClientConfigStore();
  return config?.features ?? {};
}

export function useDashboardConfig() {
  const { config } = useClientConfigStore();
  return config?.dashboard ?? null;
}

export function useThemeConfig() {
  const { config } = useClientConfigStore();
  return config?.theme ?? { primary: '#0D9488', secondary: '#0EA5E9', accent: '#F59E0B' };
}
```

### 4.3 Modificacion de App.tsx

```typescript
// /src/App.tsx

function App() {
  const { config, loading } = useClientConfig();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            {/* Rutas dinamicas basadas en config */}
            {config?.pages.pages.overview?.enabled && (
              <Route path="/" element={<OverviewPage />} />
            )}
            {config?.pages.pages.variables?.enabled && (
              <Route path="/variables" element={<VariablesPage />} />
            )}
            {/* ... resto de rutas */}
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}
```

### 4.4 Sidebar Dinamico

```typescript
// /src/components/layout/Sidebar.tsx

export function Sidebar() {
  const { config } = useClientConfigStore();
  const { pages } = usePagesConfig();

  const visibleNavItems = NAV_ITEMS.filter(item => {
    const pageConfig = pages[item.id];
    return pageConfig?.enabled && pageConfig?.visible;
  }).sort((a, b) => {
    return (pages[a.id]?.order ?? 99) - (pages[b.id]?.order ?? 99);
  });

  return (
    <aside>
      {/* Logo dinamico */}
      <div className="logo">
        {config?.client.logoUrl ? (
          <img src={config.client.logoUrl} alt={config.client.name} />
        ) : (
          <span>{config?.client.name ?? 'TrueData'}</span>
        )}
      </div>

      {/* Navegacion filtrada */}
      <nav>
        {visibleNavItems.map(item => (
          <NavItem key={item.id} {...item} />
        ))}
      </nav>
    </aside>
  );
}
```

---

## 5. Implementacion Backend

### 5.1 Nuevo Router: client_config.py

```python
# /bff/src/api/client_config.py

from fastapi import APIRouter, Depends, HTTPException
from ..dependencies import get_current_active_user, get_db
from ..db.models import User, ClientConfiguration
from ..models.client_config import ClientConfigResponse

router = APIRouter()

@router.get("/config", response_model=ClientConfigResponse)
async def get_client_config(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene la configuracion del cliente basada en la licencia del usuario.
    """
    if not current_user.license_id:
        raise HTTPException(status_code=403, detail="Usuario sin licencia asignada")

    config = await db.execute(
        select(ClientConfiguration)
        .where(ClientConfiguration.license_id == current_user.license_id)
    )
    config = config.scalar_one_or_none()

    if not config:
        # Retornar configuracion por defecto
        return get_default_config(current_user.license)

    return ClientConfigResponse(
        client={
            "id": config.id,
            "code": config.client_code,
            "name": config.client_name,
            "industry": config.industry_type,
            "logoUrl": f"/api/client/assets/logo" if config.logo_url else None,
            "faviconUrl": f"/api/client/assets/favicon" if config.favicon_url else None,
        },
        theme={
            "primary": config.theme_primary,
            "secondary": config.theme_secondary,
            "accent": config.theme_accent,
        },
        sensors=config.sensors_config,
        pages=config.pages_config,
        features=config.features_config,
        dashboard=config.dashboard_config,
    )


@router.get("/assets/{asset_type}")
async def get_client_asset(
    asset_type: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Sirve assets del cliente (logo, favicon).
    """
    config = await get_client_config_by_license(db, current_user.license_id)

    if asset_type == "logo" and config.logo_url:
        return FileResponse(config.logo_url)
    elif asset_type == "favicon" and config.favicon_url:
        return FileResponse(config.favicon_url)

    raise HTTPException(status_code=404, detail="Asset no encontrado")
```

### 5.2 Migracion de Base de Datos

```sql
-- /scripts/migrations/003_client_configurations.sql

CREATE TABLE client_configurations (
    id SERIAL PRIMARY KEY,
    license_id INTEGER UNIQUE REFERENCES licenses(id) ON DELETE CASCADE,

    -- Branding
    client_name VARCHAR(100) NOT NULL,
    client_code VARCHAR(50) UNIQUE NOT NULL,
    logo_url VARCHAR(255),
    favicon_url VARCHAR(255),

    -- Tema
    theme_primary VARCHAR(7) DEFAULT '#0D9488',
    theme_secondary VARCHAR(7) DEFAULT '#0EA5E9',
    theme_accent VARCHAR(7) DEFAULT '#F59E0B',

    -- Industria
    industry_type VARCHAR(50) DEFAULT 'generic',

    -- Configuracion JSON
    sensors_config JSONB NOT NULL DEFAULT '{"categories": [], "defaultSelected": []}',
    pages_config JSONB NOT NULL DEFAULT '{"pages": {}, "defaultPage": "overview"}',
    features_config JSONB NOT NULL DEFAULT '{}',
    dashboard_config JSONB,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indice para busqueda rapida
CREATE INDEX idx_client_config_license ON client_configurations(license_id);
CREATE INDEX idx_client_config_code ON client_configurations(client_code);

-- Trigger para updated_at
CREATE TRIGGER update_client_config_timestamp
    BEFORE UPDATE ON client_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## 6. Plan de Implementacion

### Fase 1: Infraestructura Backend (Semana 1)

| Dia | Tarea | Entregable |
|-----|-------|------------|
| 1 | Crear modelo ClientConfiguration | `models.py` actualizado |
| 1 | Escribir migracion SQL | `003_client_configurations.sql` |
| 2 | Implementar endpoint GET /api/client/config | `client_config.py` |
| 2 | Implementar servicio de assets | Endpoint de assets |
| 3 | Crear configuracion por defecto | `default_config.py` |
| 3 | Tests unitarios | `test_client_config.py` |
| 4 | Documentar API | OpenAPI actualizado |
| 5 | Code review + merge | PR aprobado |

**Archivos a crear/modificar:**
```
/bff/src/
├── api/
│   └── client_config.py (NUEVO)
├── db/
│   └── models.py (MODIFICAR)
├── models/
│   └── client_config.py (NUEVO)
├── services/
│   └── client_config.py (NUEVO)
└── main.py (MODIFICAR - agregar router)

/scripts/migrations/
└── 003_client_configurations.sql (NUEVO)
```

### Fase 2: Infraestructura Frontend (Semana 2)

| Dia | Tarea | Entregable |
|-----|-------|------------|
| 1 | Crear clientConfigStore | `clientConfigStore.ts` |
| 1 | Crear tipos TypeScript | `clientConfig.ts` |
| 2 | Implementar useClientConfig hook | `useClientConfig.ts` |
| 2 | Crear LoadingScreen | `LoadingScreen.tsx` |
| 3 | Integrar en App.tsx | Carga de config al inicio |
| 3 | Aplicar tema dinamico | CSS variables dinamicas |
| 4 | Tests de integracion | Cypress tests |
| 5 | Code review + merge | PR aprobado |

**Archivos a crear/modificar:**
```
/src/
├── stores/
│   └── clientConfigStore.ts (NUEVO)
├── hooks/
│   └── useClientConfig.ts (NUEVO)
├── types/
│   └── clientConfig.ts (NUEVO)
├── components/
│   └── common/
│       └── LoadingScreen.tsx (NUEVO)
└── App.tsx (MODIFICAR)
```

### Fase 3: Migracion de Componentes (Semana 3)

| Dia | Tarea | Entregable |
|-----|-------|------------|
| 1 | Migrar Sidebar a config dinamica | Sidebar.tsx actualizado |
| 1 | Migrar Header (logo, nombre) | Header.tsx actualizado |
| 2 | Migrar sensors.ts a usar config | useSensorsConfig() |
| 2 | Migrar navigation.ts a usar config | Navegacion dinamica |
| 3 | Migrar VariablesPage | Sensores desde config |
| 3 | Migrar OverviewPage | KPIs desde config |
| 4 | Migrar resto de paginas | Todas las paginas |
| 5 | Testing E2E completo | Suite de tests |

**Archivos a modificar:**
```
/src/
├── components/layout/
│   ├── Sidebar.tsx
│   └── Header.tsx
├── pages/
│   ├── OverviewPage.tsx
│   ├── VariablesPage.tsx
│   └── ... (todas)
└── config/
    ├── sensors.ts (DEPRECAR)
    └── navigation.ts (DEPRECAR)
```

### Fase 4: Panel de Administracion (Semana 4)

| Dia | Tarea | Entregable |
|-----|-------|------------|
| 1 | Endpoints CRUD de admin | API completa |
| 2 | UI para listar clientes | AdminClientsPage |
| 3 | UI para editar configuracion | ConfigEditorPage |
| 4 | Upload de assets (logo) | Subida de archivos |
| 5 | Testing + documentacion | Documentacion admin |

**Archivos a crear:**
```
/src/pages/admin/
├── AdminClientsPage.tsx (NUEVO)
├── ClientConfigEditor.tsx (NUEVO)
└── AssetUploader.tsx (NUEVO)

/bff/src/api/
└── admin_clients.py (NUEVO)
```

### Fase 5: Presets de Industria (Semana 5)

| Dia | Tarea | Entregable |
|-----|-------|------------|
| 1-2 | Preset water-treatment | Config completa agua |
| 2-3 | Preset manufacturing | Config completa fabrica |
| 3-4 | Preset energy | Config completa energia |
| 4-5 | Wizard de setup | UI de onboarding |

**Archivos a crear:**
```
/bff/src/presets/
├── water_treatment.py
├── manufacturing.py
├── energy.py
└── __init__.py
```

---

## 7. Checklist de Implementacion

### Backend

- [ ] Modelo ClientConfiguration en SQLAlchemy
- [ ] Migracion de base de datos
- [ ] Endpoint GET /api/client/config
- [ ] Endpoint GET /api/client/assets/{type}
- [ ] Servicio de configuracion por defecto
- [ ] Endpoints CRUD de administracion
- [ ] Validacion de JSON schemas
- [ ] Tests unitarios (>80% coverage)
- [ ] Documentacion OpenAPI

### Frontend

- [ ] Store clientConfigStore con Zustand
- [ ] Tipos TypeScript para configuracion
- [ ] Hook useClientConfig y derivados
- [ ] Componente LoadingScreen
- [ ] Integracion en App.tsx
- [ ] Aplicacion dinamica de tema
- [ ] Sidebar con navegacion dinamica
- [ ] Header con branding dinamico
- [ ] Migracion de VariablesPage
- [ ] Migracion de OverviewPage
- [ ] Migracion del resto de paginas
- [ ] Tests E2E con Cypress

### Administracion

- [ ] Pagina de listado de clientes
- [ ] Editor de configuracion JSON
- [ ] Upload de assets
- [ ] Preview de configuracion
- [ ] Presets de industria

### Documentacion

- [ ] Guia de setup de nuevo cliente
- [ ] Documentacion de API
- [ ] Schemas JSON documentados
- [ ] Runbook de operaciones

---

## 8. Configuracion de Ejemplo: Cliente Real

```json
{
  "client": {
    "id": 1,
    "code": "edar-madrid-sur",
    "name": "EDAR Madrid Sur",
    "industry": "water-treatment",
    "logoUrl": "/api/client/assets/logo",
    "faviconUrl": "/api/client/assets/favicon"
  },
  "theme": {
    "primary": "#0369A1",
    "secondary": "#0EA5E9",
    "accent": "#F59E0B"
  },
  "sensors": {
    "categories": [
      {
        "id": "influente",
        "name": "Agua Influente",
        "icon": "ArrowDownToLine",
        "color": "#0EA5E9",
        "sensors": [
          {"key": "1_FIT_001_PV.Value", "name": "Caudal Entrada", "unit": "m3/h"},
          {"key": "1_AIT_001_PV.Value", "name": "pH Entrada", "unit": "pH"},
          {"key": "1_AIT_002_PV.Value", "name": "Turbidez Entrada", "unit": "NTU"}
        ]
      },
      {
        "id": "efluente",
        "name": "Agua Efluente",
        "icon": "ArrowUpFromLine",
        "color": "#22C55E",
        "sensors": [
          {"key": "2_FIT_001_PV.Value", "name": "Caudal Salida", "unit": "m3/h"},
          {"key": "2_AIT_001_PV.Value", "name": "pH Salida", "unit": "pH"},
          {"key": "2_AIT_002_PV.Value", "name": "Cloro Residual", "unit": "mg/L"}
        ]
      },
      {
        "id": "biologico",
        "name": "Tratamiento Biologico",
        "icon": "Leaf",
        "color": "#84CC16",
        "sensors": [
          {"key": "3_AIT_001_PV.Value", "name": "Oxigeno Disuelto", "unit": "mg/L"},
          {"key": "3_AIT_002_PV.Value", "name": "MLSS", "unit": "mg/L"}
        ]
      }
    ],
    "defaultSelected": ["1_FIT_001_PV.Value", "2_FIT_001_PV.Value"]
  },
  "pages": {
    "pages": {
      "overview": {"enabled": true, "visible": true, "order": 1},
      "variables": {"enabled": true, "visible": true, "order": 2},
      "network": {"enabled": true, "visible": true, "order": 3},
      "anomalies": {"enabled": true, "visible": true, "order": 4},
      "control": {"enabled": true, "visible": true, "order": 5},
      "settings": {"enabled": true, "visible": true, "order": 99, "adminOnly": true}
    },
    "defaultPage": "overview"
  },
  "features": {
    "realTimeUpdates": {"enabled": true, "intervalMs": 10000},
    "anomalyDetection": {"enabled": true, "defaultThreshold": 0.7},
    "dataExport": {"enabled": true, "formats": ["csv", "xlsx", "pdf"]},
    "notifications": {"enabled": true, "email": true, "push": false}
  },
  "dashboard": {
    "layout": "water-treatment",
    "kpis": [
      {
        "id": "volumen_diario",
        "title": "Volumen Tratado Hoy",
        "sensorKey": "1_FIT_001_PV.Value",
        "aggregation": "sum",
        "period": "today",
        "unit": "m3",
        "icon": "Droplets",
        "variant": "teal"
      },
      {
        "id": "rendimiento",
        "title": "Rendimiento Depuracion",
        "formula": "((entrada - salida) / entrada) * 100",
        "unit": "%",
        "icon": "TrendingUp",
        "variant": "green"
      }
    ]
  }
}
```

---

## 9. Seguridad

### 9.1 Validaciones

- Token JWT requerido para obtener configuracion
- Configuracion solo accesible para licencia del usuario
- Assets servidos solo a usuarios autenticados
- Validacion de JSON schema en escritura
- Sanitizacion de URLs y paths

### 9.2 Permisos

| Accion | Rol Requerido |
|--------|---------------|
| Leer configuracion propia | Usuario autenticado |
| Leer assets propios | Usuario autenticado |
| Listar todos los clientes | Superadmin |
| Editar configuracion | Superadmin |
| Crear nuevo cliente | Superadmin |
| Eliminar cliente | Superadmin |

### 9.3 Auditoria

```python
# Log de cambios de configuracion
class ConfigAuditLog(Base):
    id = Column(Integer, primary_key=True)
    client_config_id = Column(Integer, ForeignKey("client_configurations.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String(50))  # create, update, delete
    changes = Column(JSON)  # diff de cambios
    timestamp = Column(DateTime, default=datetime.utcnow)
```

---

## 10. Metricas de Exito

| Metrica | Objetivo | Medicion |
|---------|----------|----------|
| Tiempo de setup nuevo cliente | < 15 minutos | Cronometro |
| Cambios sin redeploy | 100% | Verificacion |
| Errores de configuracion en prod | 0 | Logs |
| Tiempo de carga inicial | < 2 segundos | Lighthouse |
| Cobertura de tests | > 80% | Jest/Pytest |

---

## 11. Proximos Pasos Inmediatos

1. [ ] Aprobar este documento
2. [ ] Crear rama `feature/api-driven-config`
3. [ ] Implementar Fase 1 (Backend)
4. [ ] Review y merge de Fase 1
5. [ ] Implementar Fase 2 (Frontend)
6. [ ] Testing integrado
7. [ ] Deploy a staging
8. [ ] Configurar primer cliente real

![alt text](image-1.png)
*Documento creado: Enero 2026*
*Version: 2.0*
*Arquitectura: API-Driven Configuration*
