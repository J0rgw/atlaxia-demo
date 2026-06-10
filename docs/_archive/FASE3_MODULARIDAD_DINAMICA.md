# Fase 3: Modularidad Dinamica

## Resumen

Esta fase implementa la **aplicacion dinamica** de la configuracion almacenada en el backend. Una vez completado el setup (Fase 2), el frontend debe:

1. Leer la configuracion desde `GET /api/installation/config`
2. Mostrar solo las paginas habilitadas en el Sidebar
3. Mostrar solo los sensores configurados en VariablesPage
4. Aplicar los colores del tema en toda la aplicacion

---

## Arquitectura de Flujo de Datos

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  installation_config (PostgreSQL)                                    │    │
│  │  ├── installation_name: "EDAR Madrid Sur"                           │    │
│  │  ├── theme_primary: "#0D9488"                                       │    │
│  │  ├── theme_secondary: "#0EA5E9"                                     │    │
│  │  ├── theme_accent: "#F59E0B"                                        │    │
│  │  ├── sensors_config: { categories: [...], mapping: {...} }          │    │
│  │  └── pages_config: { enabled: [...], default: "overview" }          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│                    GET /api/installation/config                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                        │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  installationStore (Zustand)                                         │    │
│  │  ├── config: InstallationConfig | null                              │    │
│  │  ├── fetchConfig(): Promise<void>                                   │    │
│  │  ├── canAccessPage(pageId): boolean                                 │    │
│  │  ├── getEnabledSensors(): SensorsConfig                             │    │
│  │  └── getTheme(): ThemeConfig                                        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                          │              │              │                     │
│              ┌───────────┘              │              └───────────┐         │
│              ▼                          ▼                          ▼         │
│  ┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐│
│  │      Sidebar        │   │    VariablesPage    │   │    ThemeProvider    ││
│  │  Lee pages_config   │   │  Lee sensors_config │   │  Aplica colores CSS ││
│  │  para mostrar menu  │   │  para mostrar datos │   │  dinamicamente      ││
│  └─────────────────────┘   └─────────────────────┘   └─────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Hook useInstallation()

### Proposito

Proveer acceso facil a la configuracion de instalacion desde cualquier componente, con funciones helper para casos de uso comunes.

### Ubicacion

```
src/hooks/useInstallation.ts
```

### Implementacion

```typescript
/**
 * useInstallation - Hook para acceder a la configuracion de instalacion
 *
 * Uso:
 * const { config, isPageEnabled, getSensorConfig, theme } = useInstallation();
 */

import { useEffect } from 'react';
import { useInstallationStore } from '@/stores/installationStore';

export function useInstallation() {
  const {
    config,
    configLoading,
    configError,
    fetchConfig,
    canAccessPage,
    getEnabledSensors,
    getTheme,
  } = useInstallationStore();

  // Cargar config al montar si no existe
  useEffect(() => {
    if (!config && !configLoading) {
      fetchConfig();
    }
  }, [config, configLoading, fetchConfig]);

  return {
    // Estado
    config,
    isLoading: configLoading,
    error: configError,

    // Helpers para paginas
    isPageEnabled: (pageId: string) => {
      if (!config) return true; // Default: permitir si no hay config
      return config.pages_config.enabled.includes(pageId as never);
    },
    defaultPage: config?.pages_config.default || 'overview',

    // Helpers para sensores
    sensorsConfig: config?.sensors_config || null,
    getSensorMapping: (sensorId: string) => {
      return config?.sensors_config.mapping[sensorId] || null;
    },
    getSensorsByCategory: (categoryId: string) => {
      const category = config?.sensors_config.categories.find(c => c.id === categoryId);
      if (!category) return [];
      return category.sensors.map(id => ({
        id,
        ...config?.sensors_config.mapping[id],
      }));
    },
    defaultSelectedSensors: config?.sensors_config.defaultSelected || [],

    // Helpers para tema
    theme: getTheme(),
    installationName: config?.installation_name || 'TrueData',
    logoUrl: config?.logo_url || null,

    // Acciones
    refresh: fetchConfig,
  };
}
```

### Ejemplos de Uso

```typescript
// En cualquier componente
function MyComponent() {
  const { isPageEnabled, theme, installationName } = useInstallation();

  // Verificar si una pagina esta habilitada
  if (!isPageEnabled('anomalies')) {
    return <div>Esta funcionalidad no esta disponible</div>;
  }

  // Usar colores del tema
  return (
    <div style={{ color: theme.primary }}>
      Bienvenido a {installationName}
    </div>
  );
}
```

---

## 2. Sidebar Dinamico

### Comportamiento Actual vs Nuevo

| Aspecto | Actual | Nuevo |
|---------|--------|-------|
| Menu items | Hardcodeados en el componente | Leidos desde `pages_config.enabled` |
| Visibilidad | Todos siempre visibles | Solo los habilitados |
| Orden | Fijo | Segun orden en `enabled[]` |
| Pagina default | "/" hardcodeado | Desde `pages_config.default` |

### Archivo a Modificar

```
src/components/layout/Sidebar.tsx
```

### Logica de Renderizado

```typescript
/**
 * Sidebar con menu dinamico basado en configuracion
 */

import { useInstallation } from '@/hooks/useInstallation';
import { AVAILABLE_PAGES } from '@/types/installation';

// Mapeo de iconos por pagina
const PAGE_ICONS: Record<string, React.ComponentType> = {
  overview: LayoutDashboard,
  variables: Activity,
  network: Network,
  anomalies: AlertTriangle,
  control: Sliders,
  settings: Settings,
};

export function Sidebar() {
  const { config, isPageEnabled, theme } = useInstallation();
  const location = useLocation();

  // Filtrar paginas habilitadas
  const enabledPages = AVAILABLE_PAGES.filter(page => isPageEnabled(page.id));

  return (
    <aside className="sidebar" style={{ '--sidebar-accent': theme.primary }}>
      {/* Logo e identidad */}
      <div className="sidebar-header">
        {config?.logo_url ? (
          <img src={config.logo_url} alt="Logo" className="sidebar-logo" />
        ) : (
          <div className="sidebar-logo-placeholder">
            <span>{config?.installation_name?.charAt(0) || 'T'}</span>
          </div>
        )}
        <span className="sidebar-title">{config?.installation_name || 'TrueData'}</span>
      </div>

      {/* Menu dinamico */}
      <nav className="sidebar-nav">
        {enabledPages.map(page => {
          const Icon = PAGE_ICONS[page.id];
          const path = page.id === 'overview' ? '/' : `/${page.id}`;
          const isActive = location.pathname === path;

          return (
            <NavLink
              key={page.id}
              to={path}
              className={cn('sidebar-item', isActive && 'active')}
            >
              {Icon && <Icon className="sidebar-icon" />}
              <span>{page.name}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
```

### Diagrama de Decision

```
┌─────────────────────────────────────────────────────────────────┐
│                    RENDERIZADO DEL SIDEBAR                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Para cada pagina en AVAILABLE_PAGES:                           │
│                                                                  │
│    ┌──────────────────────────────────────────────────────┐     │
│    │ isPageEnabled(page.id) ?                              │     │
│    └──────────────────────────────────────────────────────┘     │
│              │                           │                       │
│              ▼ SI                        ▼ NO                    │
│    ┌──────────────────┐        ┌──────────────────┐             │
│    │ Renderizar item  │        │ No renderizar    │             │
│    │ en el menu       │        │ (skip)           │             │
│    └──────────────────┘        └──────────────────┘             │
│                                                                  │
│  Resultado: Solo aparecen las paginas en pages_config.enabled   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. VariablesPage con Sensores Dinamicos

### Comportamiento Actual vs Nuevo

| Aspecto | Actual | Nuevo |
|---------|--------|-------|
| Sensores | Todos desde ThingsBoard | Solo los de `sensors_config.mapping` |
| Categorias | Sin categorias o hardcodeadas | Desde `sensors_config.categories` |
| Nombres | Key de ThingsBoard | `display_name` configurado |
| Seleccion inicial | Ninguna o hardcodeada | Desde `defaultSelected` |

### Archivo a Modificar

```
src/pages/VariablesPage.tsx
```

### Estructura de Datos de Sensores

```typescript
// Lo que viene del backend (sensors_config)
interface SensorsConfig {
  categories: [
    {
      id: "caudal",
      name: "Caudal",
      expanded: true,
      sensors: ["caudal_area_1", "caudal_101"]
    },
    {
      id: "presion",
      name: "Presion",
      expanded: false,
      sensors: ["presion_001", "presion_002"]
    }
  ],
  mapping: {
    "caudal_area_1": {
      thingsboard_key: "1_FIT_001_PV.Value",
      display_name: "Caudal Area 1",
      unit: "m3/h",
      min: 0,
      max: 100
    },
    "caudal_101": {
      thingsboard_key: "1_FIT_101_PV.Value",
      display_name: "Caudal 101",
      unit: "m3/h"
    },
    // ...
  },
  defaultSelected: ["caudal_area_1", "presion_001"]
}
```

### Logica de Integracion

```typescript
/**
 * VariablesPage - Pagina de monitoreo de variables/sensores
 *
 * Flujo:
 * 1. Obtener sensors_config desde useInstallation()
 * 2. Renderizar categorias como acordeones
 * 3. Dentro de cada categoria, mostrar sensores con display_name
 * 4. Al solicitar datos, mapear display_name -> thingsboard_key
 * 5. Al mostrar datos, mostrar con unidad configurada
 */

import { useInstallation } from '@/hooks/useInstallation';
import { useTelemetry } from '@/hooks/useTelemetry';

export function VariablesPage() {
  const { sensorsConfig, defaultSelectedSensors } = useInstallation();
  const [selectedSensors, setSelectedSensors] = useState<string[]>([]);

  // Inicializar con sensores por defecto
  useEffect(() => {
    if (defaultSelectedSensors.length > 0 && selectedSensors.length === 0) {
      setSelectedSensors(defaultSelectedSensors);
    }
  }, [defaultSelectedSensors]);

  // Mapear IDs internos a keys de ThingsBoard para la consulta
  const thingsboardKeys = selectedSensors
    .map(id => sensorsConfig?.mapping[id]?.thingsboard_key)
    .filter(Boolean);

  // Obtener datos de telemetria
  const { data: telemetryData } = useTelemetry(thingsboardKeys);

  // Renderizar
  return (
    <div className="variables-page">
      {/* Panel de seleccion de sensores */}
      <SensorSelector
        categories={sensorsConfig?.categories || []}
        mapping={sensorsConfig?.mapping || {}}
        selected={selectedSensors}
        onSelectionChange={setSelectedSensors}
      />

      {/* Panel de visualizacion */}
      <SensorDisplay
        selectedSensors={selectedSensors}
        mapping={sensorsConfig?.mapping || {}}
        telemetryData={telemetryData}
      />
    </div>
  );
}
```

### Flujo de Datos Sensor

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FLUJO DE DATOS DE SENSORES                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. CONFIGURACION (del backend)                                             │
│     sensors_config.mapping["caudal_area_1"] = {                             │
│       thingsboard_key: "1_FIT_001_PV.Value",                                │
│       display_name: "Caudal Area 1",                                        │
│       unit: "m3/h"                                                          │
│     }                                                                        │
│                                                                              │
│  2. SELECCION (usuario en UI)                                               │
│     Usuario selecciona "Caudal Area 1" en el panel                          │
│     selectedSensors = ["caudal_area_1"]                                     │
│                                                                              │
│  3. CONSULTA (a ThingsBoard)                                                │
│     Mapear: "caudal_area_1" -> "1_FIT_001_PV.Value"                         │
│     GET /api/telemetry?keys=1_FIT_001_PV.Value                              │
│                                                                              │
│  4. RESPUESTA (de ThingsBoard)                                              │
│     { "1_FIT_001_PV.Value": 45.7 }                                          │
│                                                                              │
│  5. VISUALIZACION (en UI)                                                   │
│     Mostrar: "Caudal Area 1: 45.7 m3/h"                                     │
│     (usando display_name y unit de la config)                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Sistema de Tema Dinamico

### Proposito

Aplicar los colores configurados (`theme_primary`, `theme_secondary`, `theme_accent`) en toda la aplicacion sin necesidad de recompilar.

### Estrategia: CSS Custom Properties

Usamos CSS Custom Properties (variables CSS) que se actualizan dinamicamente desde JavaScript.

### Archivo a Crear

```
src/providers/ThemeProvider.tsx
```

### Implementacion

```typescript
/**
 * ThemeProvider - Aplica los colores del tema desde la configuracion
 *
 * Funciona inyectando CSS custom properties en el :root
 * que luego son usadas por Tailwind y componentes
 */

import { useEffect } from 'react';
import { useInstallation } from '@/hooks/useInstallation';

// Utilidad para convertir hex a HSL (para Tailwind)
function hexToHsl(hex: string): string {
  // Remover # si existe
  hex = hex.replace('#', '');

  // Parsear RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, isLoading } = useInstallation();

  useEffect(() => {
    if (isLoading) return;

    // Aplicar colores como CSS custom properties
    const root = document.documentElement;

    // Colores en formato hex (para uso directo)
    root.style.setProperty('--theme-primary', theme.primary);
    root.style.setProperty('--theme-secondary', theme.secondary);
    root.style.setProperty('--theme-accent', theme.accent);

    // Colores en formato HSL (para Tailwind)
    root.style.setProperty('--theme-primary-hsl', hexToHsl(theme.primary));
    root.style.setProperty('--theme-secondary-hsl', hexToHsl(theme.secondary));
    root.style.setProperty('--theme-accent-hsl', hexToHsl(theme.accent));

  }, [theme, isLoading]);

  return <>{children}</>;
}
```

### Integracion en App.tsx

```typescript
// src/App.tsx
import { ThemeProvider } from '@/providers/ThemeProvider';

function App() {
  return (
    <ThemeProvider>
      <AppLayout>
        {/* ... routes ... */}
      </AppLayout>
    </ThemeProvider>
  );
}
```

### Uso en CSS/Tailwind

```css
/* src/index.css o tailwind.css */

/* Definir valores por defecto */
:root {
  --theme-primary: #0D9488;
  --theme-secondary: #0EA5E9;
  --theme-accent: #F59E0B;
  --theme-primary-hsl: 175 83% 29%;
  --theme-secondary-hsl: 199 89% 48%;
  --theme-accent-hsl: 38 92% 50%;
}

/* Usar en componentes */
.btn-primary {
  background-color: var(--theme-primary);
}

.sidebar-active {
  border-color: var(--theme-primary);
  color: var(--theme-primary);
}

.accent-text {
  color: var(--theme-accent);
}
```

### Configuracion de Tailwind (Opcional)

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Colores dinamicos usando CSS variables
        'theme-primary': 'hsl(var(--theme-primary-hsl) / <alpha-value>)',
        'theme-secondary': 'hsl(var(--theme-secondary-hsl) / <alpha-value>)',
        'theme-accent': 'hsl(var(--theme-accent-hsl) / <alpha-value>)',
      },
    },
  },
};
```

Con esto, podemos usar clases como:
```html
<button class="bg-theme-primary hover:bg-theme-primary/90">
  Click me
</button>
```

---

## 5. Proteccion de Rutas (ProtectedRoute)

### Modificacion Necesaria

El componente `ProtectedRoute` debe verificar no solo permisos de usuario, sino tambien si la pagina esta habilitada en la configuracion.

### Archivo a Modificar

```
src/components/auth/ProtectedRoute.tsx
```

### Logica Actualizada

```typescript
/**
 * ProtectedRoute - Protege rutas por autenticacion Y configuracion
 *
 * Verifica:
 * 1. Usuario autenticado
 * 2. Pagina habilitada en pages_config
 * 3. Permisos de rol (si requireAdmin)
 */

import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useInstallation } from '@/hooks/useInstallation';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPage?: string;
  requireAdmin?: boolean;
}

export function ProtectedRoute({
  children,
  requiredPage,
  requireAdmin
}: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const session = useAuthStore(state => state.session);
  const { isPageEnabled, defaultPage, isLoading } = useInstallation();

  // 1. Verificar autenticacion
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 2. Esperar carga de configuracion
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // 3. Verificar si la pagina esta habilitada
  if (requiredPage && !isPageEnabled(requiredPage)) {
    // Redirigir a la pagina por defecto
    const defaultPath = defaultPage === 'overview' ? '/' : `/${defaultPage}`;
    return <Navigate to={defaultPath} replace />;
  }

  // 4. Verificar permisos de admin
  if (requireAdmin && session?.user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
```

### Diagrama de Decision

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROTECCION DE RUTA                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Usuario intenta acceder a /anomalies                           │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 1. isAuthenticated ?                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│              │                           │                       │
│              ▼ SI                        ▼ NO                    │
│              │                  ┌──────────────────┐            │
│              │                  │ Redirect /login  │            │
│              │                  └──────────────────┘            │
│              ▼                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 2. isPageEnabled("anomalies") ?                           │   │
│  │    (revisa pages_config.enabled)                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│              │                           │                       │
│              ▼ SI                        ▼ NO                    │
│              │                  ┌──────────────────┐            │
│              │                  │ Redirect a       │            │
│              │                  │ defaultPage      │            │
│              │                  └──────────────────┘            │
│              ▼                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 3. requireAdmin && user.role !== 'admin' ?                │   │
│  └──────────────────────────────────────────────────────────┘   │
│              │                           │                       │
│              ▼ NO                        ▼ SI                    │
│  ┌──────────────────┐           ┌──────────────────┐            │
│  │ Renderizar       │           │ Redirect /       │            │
│  │ children         │           └──────────────────┘            │
│  └──────────────────┘                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Archivos a Crear/Modificar

### Nuevos Archivos

| Archivo | Descripcion |
|---------|-------------|
| `src/hooks/useInstallation.ts` | Hook para acceder a config |
| `src/providers/ThemeProvider.tsx` | Proveedor de tema dinamico |

### Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/components/layout/Sidebar.tsx` | Menu dinamico desde config |
| `src/pages/VariablesPage.tsx` | Sensores desde config |
| `src/components/auth/ProtectedRoute.tsx` | Verificar paginas habilitadas |
| `src/App.tsx` | Envolver con ThemeProvider |
| `src/index.css` | CSS custom properties |
| `tailwind.config.js` | Colores dinamicos (opcional) |

---

## 7. Orden de Implementacion

```
1. useInstallation.ts
   └── Hook base que usaran todos los componentes

2. ThemeProvider.tsx
   └── Sistema de tema dinamico

3. Modificar App.tsx
   └── Integrar ThemeProvider

4. Modificar Sidebar.tsx
   └── Menu dinamico

5. Modificar ProtectedRoute.tsx
   └── Verificar paginas habilitadas

6. Modificar VariablesPage.tsx
   └── Sensores desde config

7. Ajustar CSS/Tailwind
   └── Usar variables de tema
```

---

## 8. Testing Manual

### Escenario 1: Paginas Habilitadas

1. Setup con `pages_config.enabled = ["overview", "variables"]`
2. Verificar que Sidebar solo muestra Overview y Variables
3. Intentar navegar a `/network` directamente
4. Verificar redireccion a `/` (defaultPage)

### Escenario 2: Sensores

1. Setup con 5 sensores en `sensors_config.mapping`
2. Ir a Variables page
3. Verificar que solo aparecen los 5 sensores configurados
4. Verificar que se muestran con `display_name`, no key de TB
5. Verificar que los datos tienen la unidad correcta

### Escenario 3: Tema

1. Setup con `theme_primary = "#FF0000"` (rojo)
2. Verificar que elementos destacados son rojos
3. Cambiar tema desde Settings
4. Verificar que el cambio se aplica sin recargar pagina

---

## 9. Consideraciones de Performance

### Caching

- El store de Zustand mantiene la config en memoria
- Solo se hace fetch al cargar la app o al llamar `refresh()`
- Considerar agregar TTL si es necesario

### Lazy Loading

- Las paginas no habilitadas no se cargan (no estan en el router)
- Los sensores se cargan bajo demanda

### CSS Variables

- El cambio de tema es instantaneo (no requiere rebuild)
- Solo se recalculan estilos afectados

---

*Documento creado: Enero 2026*
*Relacionado con: PLAN_MODULARIDAD.md, FASE2_WIZARD_SETUP.md*
