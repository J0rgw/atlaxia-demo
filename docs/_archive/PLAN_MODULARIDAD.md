# Plan: Sistema de Modularidad con Licencias Pendientes

## Resumen Ejecutivo

Sistema de configuracion modular por instalacion donde:
- Un **tecnico de TrueData** realiza el setup completo on-premise
- Los **clientes** crean sus propios usuarios despues del setup
- El **sistema de licencias** queda como placeholder para definicion futura
- La **modularidad** funciona independiente, con bypass temporal

---

## Estado del Sistema de Licencias

> **PENDIENTE DE DEFINIR**: El sistema de licencias esta planificado pero no definido.
> - Scope: Por instalacion vs por usuario - **NO DEFINIDO**
> - Modelo de negocio: Pago, expiracion, limites - **NO DEFINIDO**
> - Integracion: Como se valida/activa - **NO DEFINIDO**

### Estrategia de Implementacion

```
┌─────────────────────────────────────────────────────────────┐
│                    ARQUITECTURA ACTUAL                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────────┐     ┌──────────────────────────────┐    │
│   │   LICENCIA   │────▶│  MODULARIDAD (installation_  │    │
│   │  (placeholder)│     │  config)                     │    │
│   │              │     │  - sensores habilitados      │    │
│   │  Bypass:     │     │  - paginas habilitadas       │    │
│   │  siempre OK  │     │  - tema/branding             │    │
│   └──────────────┘     │  - config ThingsBoard        │    │
│         │              └──────────────────────────────┘    │
│         │                            │                      │
│         ▼                            ▼                      │
│   ┌──────────────┐     ┌──────────────────────────────┐    │
│   │ Futuro:      │     │  FRONTEND                     │    │
│   │ - Validar    │     │  - Sidebar dinamico          │    │
│   │ - Expirar    │     │  - Sensores desde config     │    │
│   │ - Limitar    │     │  - Tema aplicado             │    │
│   └──────────────┘     └──────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Punto de integracion futuro:**
```typescript
// services/license.ts (PLACEHOLDER)
export async function validateLicense(): Promise<LicenseStatus> {
  // TODO: Implementar cuando se defina el sistema de licencias
  // Por ahora, siempre retorna valido
  return {
    valid: true,
    expiresAt: null,
    features: 'all'  // Sin restricciones
  };
}
```

---

## Storyboard: Ciclo de Vida de una Instalacion

### FASE 1: Venta y Preparacion

```
┌─────────────────────────────────────────────────────────────┐
│  COMERCIAL TRUEDATA                                          │
├─────────────────────────────────────────────────────────────┤
│  1. Cierra venta con cliente (ej: EDAR Madrid Sur)          │
│  2. Define requerimientos:                                   │
│     - Sensores que monitorizaran                            │
│     - Paginas necesarias                                    │
│     - Numero de usuarios estimados                          │
│  3. Agenda visita de tecnico para instalacion               │
└─────────────────────────────────────────────────────────────┘
```

### FASE 2: Instalacion On-Premise (Tecnico TrueData)

```
┌─────────────────────────────────────────────────────────────┐
│  DIA DE INSTALACION - Tecnico TrueData en sitio             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  PASO 1: Preparar Hardware                                   │
│  ├── Instalar PC industrial                                  │
│  ├── Configurar red local                                    │
│  └── Verificar conectividad con PLCs/sensores               │
│                                                              │
│  PASO 2: Desplegar Aplicacion                                │
│  ├── Clonar repositorio / Docker compose                     │
│  ├── Configurar variables de entorno (.env con ThingsBoard) │
│  └── Iniciar servicios (PostgreSQL, Redis, BFF, Frontend)   │
│                                                              │
│  PASO 3: Acceder al Wizard de Setup                          │
│  ├── Browser → http://localhost:3000                         │
│  ├── Sistema detecta: "No hay configuracion"                 │
│  └── Redirige a /setup                                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  WIZARD DE SETUP TECNICO (5 pasos)                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  NOTA: ThingsBoard se configura EXTERNAMENTE por el         │
│  tecnico (variables de entorno). El wizard solo usa la      │
│  conexion ya existente para cargar sensores.                │
│                                                              │
│  [1/5] IDENTIDAD DE LA INSTALACION                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Nombre instalacion: [EDAR Madrid Sur              ]│    │
│  │  Logo: [Subir imagen...]  [vista previa]            │    │
│  │  Colores del tema:                                   │    │
│  │  Primario:   [#0D9488] ████                         │    │
│  │  Secundario: [#0EA5E9] ████                         │    │
│  │  Acento:     [#F59E0B] ████                         │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  [2/5] CONFIGURAR SENSORES                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  (Carga sensores desde ThingsBoard ya configurado)  │    │
│  │  Sensores disponibles (781)    Sensores habilitados │    │
│  │  [+ Nueva categoria]  [Renombrar sensor]            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  [3/5] PAGINAS HABILITADAS                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  [✓] Overview    - Dashboard principal              │    │
│  │  [✓] Variables   - Monitoreo de sensores            │    │
│  │  [✓] Network     - Estado de la red                 │    │
│  │  [ ] Anomalies   - Deteccion de anomalias           │    │
│  │  [ ] Control     - Control de procesos              │    │
│  │  [✓] Settings    - Configuracion (solo admin)       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  [4/5] CREAR CUENTA ADMINISTRADOR                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Nombre usuario: [admin_edar_madrid   ]             │    │
│  │  Email:          [admin@edarmadrid.es ]             │    │
│  │  Password:       [****************    ]             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  [5/5] RESUMEN Y CONFIRMACION                                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  RESUMEN DE CONFIGURACION                            │    │
│  │  Instalacion: EDAR Madrid Sur                        │    │
│  │  Sensores habilitados: 35                            │    │
│  │  Paginas: Overview, Variables, Network, Settings     │    │
│  │  Admin: admin_edar_madrid                            │    │
│  │                      [Completar Setup]               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  POST-SETUP                                                  │
├─────────────────────────────────────────────────────────────┤
│  1. Tecnico hace login con cuenta admin para verificar      │
│  2. Prueba navegacion y visualizacion de datos              │
│  3. Verifica que los sensores cargan correctamente          │
│  4. Entrega credenciales al cliente                         │
└─────────────────────────────────────────────────────────────┘
```

### FASE 3: Uso por el Cliente

```
┌─────────────────────────────────────────────────────────────┐
│  PRIMER LOGIN DEL CLIENTE (Admin)                            │
├─────────────────────────────────────────────────────────────┤
│  → Redirige al Dashboard con tema personalizado             │
│  → Sidebar muestra solo paginas habilitadas                 │
│  → Variables muestra solo sensores configurados             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  ADMIN CREA USUARIOS ADICIONALES                             │
├─────────────────────────────────────────────────────────────┤
│  Settings → Usuarios → [+ Nuevo Usuario]                    │
│  → Nuevo usuario hereda configuracion de instalacion        │
│  → Admin puede restringir paginas adicionales por usuario   │
└─────────────────────────────────────────────────────────────┘
```

---

## Arquitectura de Datos

### Tabla: installation_config

```sql
CREATE TABLE installation_config (
    id INTEGER PRIMARY KEY DEFAULT 1,

    -- Identidad
    installation_name VARCHAR(100) NOT NULL DEFAULT 'TrueData',
    logo_url VARCHAR(255),

    -- Tema
    theme_primary VARCHAR(7) DEFAULT '#0D9488',
    theme_secondary VARCHAR(7) DEFAULT '#0EA5E9',
    theme_accent VARCHAR(7) DEFAULT '#F59E0B',

    -- NOTA: ThingsBoard se configura en variables de entorno (.env)

    -- Configuracion (JSONB)
    sensors_config JSONB DEFAULT '{"categories": [], "mapping": {}}',
    pages_config JSONB DEFAULT '{"enabled": [], "default": "overview"}',
    features_config JSONB DEFAULT '{}',

    -- Estado del setup
    setup_completed BOOLEAN DEFAULT FALSE,
    setup_completed_at TIMESTAMP WITH TIME ZONE,
    setup_completed_by INTEGER REFERENCES users(id),

    -- PLACEHOLDER LICENCIA (para integracion futura)
    license_key VARCHAR(255),
    license_validated_at TIMESTAMP,
    license_data JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT single_installation_config CHECK (id = 1)
);
```

### Estructura JSONB: sensors_config

```json
{
  "categories": [
    {
      "id": "caudal",
      "name": "Caudal",
      "expanded": true,
      "sensors": ["caudal_area_1", "caudal_101"]
    }
  ],
  "mapping": {
    "caudal_area_1": {
      "thingsboard_key": "1_FIT_001_PV.Value",
      "display_name": "Caudal Area 1",
      "unit": "m3/h",
      "min": 0,
      "max": 100
    }
  },
  "defaultSelected": ["caudal_area_1", "presion_001"]
}
```

### Estructura JSONB: pages_config

```json
{
  "enabled": ["overview", "variables", "network", "settings"],
  "default": "overview",
  "customPages": []
}
```

---

## Endpoints API

### Publicos (sin autenticacion)

```
GET /api/installation/status
Response: {
  "setup_completed": false,
  "has_users": false,
  "installation_name": null
}
```

### Setup (solo si no hay setup completado)

```
POST /api/installation/setup
Body: {
  installation: { name, logo_url, theme_primary, theme_secondary, theme_accent },
  sensors_config: { categories: [...], mapping: {...} },
  pages_config: { enabled: [...], default: "overview" },
  admin_user: { username, email, password }
}
Response: { success: true, redirect: "/login" }
```

### Autenticados

```
GET  /api/installation/config     -- Obtener config (todos)
PUT  /api/installation/config     -- Actualizar config (solo admin)
GET  /api/installation/sensors    -- Sensores habilitados (desde config)
GET  /api/thingsboard/sensors     -- Sensores disponibles en ThingsBoard
```

### Placeholder Licencia

```
GET  /api/license/status
Response: {
  "valid": true,      // SIEMPRE true por ahora
  "bypass": true,     // Indica que es bypass
  "message": "License validation pending implementation"
}
```

---

## Fases de Implementacion

### Fase 1: Backend Base
1. Actualizar migracion SQL (quitar campos ThingsBoard)
2. Modelo InstallationConfig en models.py
3. Endpoint GET /api/installation/status
4. Endpoint POST /api/installation/setup
5. Endpoint GET /api/installation/config
6. Servicio placeholder licencia (siempre OK)

### Fase 2: Wizard Setup Frontend
1. Crear componentes del wizard (5 pasos)
2. Crear installationStore.ts
3. Modificar LoginPage para detectar estado
4. Integracion con API setup

### Fase 3: Modularidad Dinamica
1. Hook useInstallation()
2. Sidebar lee pages_config
3. VariablesPage lee sensors_config
4. Aplicar tema desde config

### Fase 4: Testing y Documentacion
1. Probar flujo completo
2. Documentar para tecnicos TrueData

---

## Notas Importantes

### Bypass de Licencia

```typescript
// hooks/useLicense.ts
export function useLicense() {
  return {
    isValid: true,        // Siempre valido
    isLoading: false,
    error: null,
    validate: async () => ({ valid: true, bypass: true }),
  };
}
```

### Seguridad

- Setup solo disponible si setup_completed = false
- Solo admin puede modificar configuracion
- ThingsBoard se configura en variables de entorno (no expuesto en UI)

---

*Ultima actualizacion: Enero 2026*
*Estado licencias: PENDIENTE DEFINIR*
