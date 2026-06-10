# Contexto de Implementación - Sistema de Setup Individual

## Estado de la Conversación

Este documento guarda el contexto completo para continuar la implementación del sistema de setup individual por instalación.

---

## 1. Decisiones Tomadas

### Modelo de Negocio
- **Tipo de despliegue:** Instalación LOCAL por cliente (no SaaS)
- **Gestión:** TrueData gestiona las instalaciones
- **Usuarios por instalación:** 2-5 usuarios típicamente
- **Configuración:** El primer usuario hace el setup, los demás heredan

### Arquitectura Elegida
- **DEPRECAR:** Sistema de licencias multi-tenant
- **NUEVO:** Sistema de configuración global por instalación
- **Flujo:** Login → Crear Primera Cuenta (si no hay usuarios) → Wizard de Setup → Dashboard

---

## 2. Trabajo Ya Realizado

### ThingsBoard Integration
-  Backend conectado a ThingsBoard (portal.airtrace.io:8080)
-  Polling cada 20 segundos funcionando
-  781 sensores disponibles desde ThingsBoard
-  Endpoint `/api/telemetry/snapshot` funcionando
-  Frontend `VariablesPage.tsx` modificado para usar API real (no mock)

### Sensores Configurados (35 sensores representativos)
Archivo modificado: `/back/bff/src/api/telemetry.py`
- Caudal: 6 sensores (1_FIT_001_PV.Value, 2_FIC_101_*, etc.)
- Presión: 6 sensores (2_DPIT_001_PV.Value, 2_PIT_*, etc.)
- Nivel: 4 sensores (1_LS_*, 1_LT_001_PV.Value)
- Analítico: 6 sensores (1_AIT_*)
- Válvulas: 4 sensores (1_MV_*_STATUS.Value)
- Bombas: 4 sensores (1_P_*_STATUS.Value)
- Otros: 5 sensores (AIT301-402.Pv.Value)

### Documentos Creados
- `/docs/MODULARIZACION_CLIENTES.md` - Estudio de modularización (API-Driven)
- `/docs/CONTEXTO_IMPLEMENTACION.md` - Este documento

---

## 3. Plan de Implementación

### Nueva Tabla: installation_config

```sql
CREATE TABLE installation_config (
    id INTEGER PRIMARY KEY DEFAULT 1,

    -- Identidad
    installation_name VARCHAR(100) NOT NULL,
    logo_url VARCHAR(255),

    -- Tema
    theme_primary VARCHAR(7) DEFAULT '#0D9488',
    theme_secondary VARCHAR(7) DEFAULT '#0EA5E9',

    -- ThingsBoard
    thingsboard_url VARCHAR(255),
    thingsboard_configured BOOLEAN DEFAULT FALSE,

    -- Configuración JSON
    sensors_config JSONB DEFAULT '{"categories": []}',
    pages_config JSONB DEFAULT '{"enabled": ["overview", "variables", "settings"]}',
    features_config JSONB DEFAULT '{}',

    -- Setup
    setup_completed BOOLEAN DEFAULT FALSE,
    setup_completed_at TIMESTAMP,
    setup_completed_by INTEGER REFERENCES users(id),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT single_row CHECK (id = 1)
);
```

### Nuevos Endpoints API

```
GET  /api/installation/status          # Público - ¿Hay usuarios? ¿Setup completo?
POST /api/installation/setup           # Público - Crear admin + config inicial
GET  /api/installation/config          # Auth - Obtener config
PUT  /api/installation/config          # Admin - Actualizar config
POST /api/installation/test-thingsboard # Auth - Probar conexión TB
GET  /api/installation/available-sensors # Auth - Cargar sensores de TB
```

### Wizard de Setup (6 pasos)

1. **Crear Admin:** username, email, password
2. **Configurar Instalación:** nombre, logo, colores
3. **Conectar ThingsBoard:** URL, credenciales, probar conexión
4. **Seleccionar Sensores:** cargar de TB, organizar categorías
5. **Configurar Páginas:** habilitar/deshabilitar
6. **Resumen:** revisar y completar

---

## 4. Archivos a Crear/Modificar

### Backend

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `/bff/src/db/models.py` | MODIFICAR | Añadir InstallationConfig |
| `/bff/src/api/installation.py` | CREAR | Endpoints de instalación |
| `/bff/src/api/auth.py` | MODIFICAR | Registro público primer usuario |
| `/bff/src/main.py` | MODIFICAR | Registrar router |
| `/scripts/migrations/004_installation_config.sql` | CREAR | Nueva tabla |

### Frontend

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `/src/pages/LoginPage.tsx` | MODIFICAR | Botón "Crear Primera Cuenta" |
| `/src/pages/SetupWizard.tsx` | CREAR | Wizard de 6 pasos |
| `/src/stores/installationStore.ts` | CREAR | Estado config global |
| `/src/stores/authStore.ts` | MODIFICAR | Remover licencia |
| `/src/App.tsx` | MODIFICAR | Ruta /setup |
| `/src/hooks/useInstallationConfig.ts` | CREAR | Hook para config |

---

## 5. Fases de Implementación

### Fase 1: Backend Base (2-3 días)
- Migración SQL
- Modelo InstallationConfig
- Endpoint GET /api/installation/status
- Endpoint POST /api/installation/setup

### Fase 2: Frontend Setup (3-4 días)
- Modificar LoginPage.tsx
- Crear SetupWizard.tsx
- Crear installationStore.ts

### Fase 3: Configuración Sensores (2-3 días)
- Endpoint cargar sensores de TB
- UI organizar categorías
- Guardar en sensors_config

### Fase 4: Migrar a Config Dinámica (2-3 días)
- Hook useInstallationConfig()
- Sidebar dinámico
- VariablesPage desde config
- Aplicar tema

### Fase 5: Limpieza (1-2 días)
- Deprecar licencias
- Actualizar SettingsPage
- Tests

---

## 6. Flujo Final

```
PRIMERA VEZ (instalación nueva):
┌────────┐    ┌──────────────┐    ┌────────────┐    ┌───────────┐
│ /login │───▶│ No hay users │───▶│ /setup     │───▶│ Dashboard │
│        │    │ "Crear cuenta"│    │ (wizard)   │    │           │
└────────┘    └──────────────┘    └────────────┘    └───────────┘

ACCESOS SIGUIENTES:
┌────────┐    ┌───────────┐
│ /login │───▶│ Dashboard │ (config heredada)
└────────┘    └───────────┘

CREAR NUEVO USUARIO:
Admin en /settings → "Añadir usuario" → Nuevo user hereda config
```

---

## 7. Notas Técnicas

### Sistema Actual de Licencias (A DEPRECAR)
- Tabla `licenses` con enabled_sensors, enabled_pages
- User.license_id como FK
- compute_effective_permissions() en auth.py
- ProtectedRoute valida licencia

### Credenciales ThingsBoard Actuales
```
URL: http://portal.airtrace.io:8080
Usuario: tenant@airtrace.io
Password: tenantairtrace
```

### Datos de ThingsBoard
- Los datos son históricos/demo (no cambian en tiempo real) mientras el pc no esté conectado a los sensores
- 781 sensores disponibles
- Categorías: AIT, FIT, PIT, LT, MV, P, SV, etc.

---

## 8. Comando para Continuar

Al recuperar tokens, ejecutar:
```
"Continúa con la implementación del sistema de setup individual.
Lee /docs/CONTEXTO_IMPLEMENTACION.md para el contexto completo.
Empieza por la Fase 1: Backend Base."
```