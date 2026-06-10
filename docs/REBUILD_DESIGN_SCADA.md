# Reconstrucción del Frontend: Migración al Sistema de Diseño SCADA

**Fecha:** 2026-04-27
**Alcance:** Migración completa del frontend de Atlaxia desde la estética SaaS corporativa anterior (Inter, teal/sky/emerald, tarjetas redondeadas con sombras, light-mode-first) hacia un sistema SCADA conforme a ISA-101 (dark-first, denso, monocromo con datos cromáticos solo en estado, tipografía compacta, tarjetas planas).

---

## 1. Contexto y Motivación

El frontend antes presentaba un diseño orientado a productos SaaS de gestión: paleta colorida, mucho espacio en blanco, sombras suaves, fuente Inter. Esto choca con las convenciones de la industria HMI/SCADA donde:

- Los operadores miran pantallas durante turnos de 8-12h: el dark-first reduce fatiga visual.
- El color **debe** ser usado como información (estado de proceso), no como decoración.
- La densidad de información importa: cada píxel debe transmitir datos.
- El estándar ISA-101 (HMI Industrial) define una paleta limitada con significado preciso (normal, advisory, warning, critical, emergency).

La migración se ejecutó en **8 fases secuenciales**, con un build verde en cada checkpoint y los 98 tests pasando al final de cada fase.

---

## 2. Resumen de Fases

### Fase 0 — Infraestructura de Tokens (sin cambios visuales)

Se agregaron los CSS custom properties del documento `design.md` Sección 2 al lado de las variables existentes, sin tocar nada todavía. Esto permitió que el resto de fases tuvieran tokens disponibles sin romper nada.

**Archivos:**
- `src/index.css` — añadidos `--bg-base`, `--bg-surface`, `--bg-surface-raised`, `--bg-inset`, `--border-subtle/default/emphasis`, `--text-primary/secondary/muted`, `--accent-primary/secondary` y todos los `--status-*` con sus variantes `-muted`.
- `tailwind.config.js` — añadidos colores semánticos (`base`, `surface`, `inset`, `subtle`, `normal`, `advisory`, `warning`, `critical`, `emergency`, etc.), escala compacta de `fontSize` (base 13px), `spacing` 4px-base, `borderRadius` máximo 8px, `boxShadow.card: 'none'`, escala `zIndex` semántica.

### Fase 1 — Fundamentos: Fuentes, Variables CSS y ThemeProvider

#### 1a. Migración de fuentes
- `Inter` → `IBM Plex Sans` (cuerpo del texto)
- Se mantuvo `JetBrains Mono` para readout (datos numéricos).
- `.font-readout` recibió `font-feature-settings: 'liga' 0` para forzar números no-ligados (legibilidad SCADA).
- Tema ECharts: todas las referencias `'Inter, sans-serif'` → `'IBM Plex Sans, system-ui, sans-serif'`.

#### 1b. Cambio de variables CSS
- `:root` ahora contiene los valores **dark** por defecto (dark-first).
- `:root:not(.dark)` provee los overrides para light mode con valores de design.md Sección 2.1.
- Se redujo `--sidebar-width` a 200px y `--header-height` a 44px.

#### 1c. Reescritura del ThemeProvider
- `src/providers/ThemeProvider.tsx` ahora arranca en `'dark'` por defecto.
- El `useEffect` setea las nuevas variables (`--bg-base`, `--bg-surface`, `--text-primary`...) según el modo.
- **Crítico:** la aplicación de la configuración por cliente (líneas 94-115) quedó intacta — el branding `--color-primary-*` sigue funcionando.

### Fase 2 — Componentes Compartidos

Cambios en componentes UI base, que se propagan automáticamente a decenas de consumidores:

| Componente | Cambio principal |
|---|---|
| `Card.tsx` | `rounded-xl` → `rounded-md`, sin sombra, `bg-[var(--bg-surface)]`, padding compacto |
| `Badge.tsx` | emerald/amber/red/sky → tokens `normal/warning/critical/advisory` |
| `StatusDot.tsx` | colores semánticos ISA-101 |
| `Button.tsx` | superficies tokenizadas, `h-8`, `rounded-sm` |
| `Input.tsx` | `bg-[var(--bg-inset)]`, bordes con tokens |
| `Switch.tsx`, `Checkbox.tsx` | usan `--border-default` y branding `primary-*` |
| `KPICard.tsx` / `KPICardSkeleton.tsx` | iconos planos con color de estado, sin sombras |
| `ConnectionStatus.tsx`, `LiveIndicator.tsx` | tokens `--status-normal` |
| `statusStyles.ts` | mapeos de importancia → tokens ISA |

### Fase 3 — Layout Shell

- `Header.tsx`: altura `h-16` → `h-11` (44px), todos los slate → tokens.
- `Sidebar.tsx`: ancho `w-60` → `w-[200px]`, dot live → `--status-normal`.
- `AppLayout.tsx`: `bg-slate-50 dark:bg-slate-900` → `bg-[var(--bg-base)]`, padding `p-6` → `p-4`.
- `NotificationsDropdown.tsx`: `rounded-xl` → `rounded-md`, slate → tokens.

### Fase 4 — Barrido de Color (181 ocurrencias en 52 archivos)

Mapping consistente:

| Antiguo | Nuevo |
|---|---|
| `bg-teal-500/10` / `bg-emerald-500/10` | `bg-[var(--status-normal-muted)]` |
| `text-teal-600` / `text-emerald-600` | `text-[var(--status-normal)]` |
| `bg-emerald-500` | `bg-[var(--status-normal)]` |
| `bg-sky-500/10` | `bg-[var(--status-advisory-muted)]` |
| `text-sky-*` | `text-[var(--status-advisory)]` |
| `bg-slate-50 dark:bg-slate-800` | `bg-[var(--bg-surface)]` |
| `text-slate-900 dark:text-slate-100` | `text-[var(--text-primary)]` |
| `text-slate-600 dark:text-slate-400` | `text-[var(--text-secondary)]` |
| `text-slate-400 dark:text-slate-500` | `text-[var(--text-muted)]` |
| `border-slate-200 dark:border-slate-700` | `border-[var(--border-subtle)]` |

Aplicado por lotes (charts, sensores/máquinas, network, setup wizard, settings, páginas, otros). Después de Fase 4 el grep para `bg-teal|bg-emerald|bg-sky|text-teal|text-emerald|text-sky` devuelve 0.

**Bug del cascade de sed:** una sustitución temprana `bg-slate-50 → bg-[var(--bg-inset)]` se ejecutó antes que `bg-slate-500`, corrompiendo `bg-slate-500` a `bg-[var(--bg-inset)]0`. Encontrado en los puntos del typing-indicator de FluviaChat y arreglado manualmente.

### Fase 5 — Densidad y Tipografía

- `font-mono` → `font-readout` en 22 archivos (todos los displays numéricos).
- `rounded-xl` restantes → `rounded-md` en 14 archivos.
- Padding global reducido (`p-6`/`p-5` → `p-3`/`p-4` donde no sea Card).
- `gap-6`/`gap-8` → `gap-3` para grids más densos.

### Fase 6 — Light Mode

Se descubrió que **había** un light mode preexistente, pero con tokens incorrectos. Se reconstruyó:

- `:root:not(.dark)` ahora provee los valores light de design.md (`--bg-base: #f0f2f5`, `--bg-surface: #ffffff`, `--bg-inset: #e8ecf0`, `--text-primary: #1f2328`, etc.).
- Los colores de estado **no cambian** entre dark/light — ya tenían contraste suficiente en ambos modos.
- Tema ECharts light: actualizado con grid/text colors apropiados.
- `LoginPage.tsx`: removidos gradientes decorativos, ahora usa `bg-[var(--bg-base)]` plano.

### Fase 7 — Funcionalidades Nuevas

#### 7a. Sidebar Colapsable
- Nuevo store `src/stores/sidebarStore.ts` (Zustand + persist):
  ```ts
  { collapsed: boolean, toggle(), setCollapsed() }
  ```
- `Sidebar.tsx`: ancho reactivo `w-[48px]` (colapsado, solo iconos) ↔ `w-[200px]` (expandido), botón toggle al fondo.
- `AppLayout.tsx`: `ml-[48px]`/`ml-[200px]` reactivo al store.
- Transición `transition-[width] duration-200`.

#### 7b. Reloj en Vivo en el Header
Nuevo componente `src/components/layout/LiveClock.tsx`:
- `useState` + `setInterval(1000)` → `HH:MM:SS`
- Clase `font-readout` + `tabular-nums` para que los dígitos no salten.
- Posicionado entre el search y los controles del lado derecho.

#### 7c. Badge de Notificaciones en el Header
- Lee unread count de `notificationStore`.
- Badge numérico sobre el icono Bell con `bg-[var(--status-critical)]` cuando > 0.
- Muestra "9+" si supera 9.

### Fase 8 — Limpieza Final

- Trimming del safelist de Tailwind (de 33 a 7 entradas, conservando solo los `primary-*` que ThemeProvider setea dinámicamente desde `config.theme_primary`).
- Eliminación de las 216 referencias `slate-*` distribuidas en 43 archivos (verificado con grep, solo quedan falsos positivos de `translate-*`).
- Tokenización de los últimos colores raw:
  - `timeUtils.ts` (freshness pills) → tokens advisory/warning/critical
  - `ErrorBoundary.tsx` (fallbacks widget + section) → critical tokens
  - `Input.tsx` (border error) → `--status-critical`
  - `NotificationsDropdown.tsx` (iconos info/warning/error) → ISA tokens
  - `LoginPage`, `UserPermissionsTab`, `InstallationConfigTab`, `LogoUpload` (mensajes de error) → critical tokens
  - `CalendarDayCell`, `CalendarLegend`, `calendarUtils` (severidad de eventos) → ISA tokens
  - `AnomalyScatterChart`, `AnomaliesTable`, `TopologyGraph` (stats) → ISA tokens
  - `ProcessAccordion` (estado uncategorized) → `--status-warning`
  - `AdminStep` (password strength) → escala ISA
  - `PageWidgetWrapper` (hover de delete) → `--status-critical`

**Resultado del bundle:**
- CSS antes de la migración: ~66.5 KB
- CSS después de Fase 8 (slate cleanup): 63.24 KB
- CSS después de safelist trim final: **57.73 KB** (≈ -13% vs original)

---

## 3. Sistema de Tokens Resultante

### 3.1 Superficies (jerarquía vertical)

```
--bg-base          // Fondo de la página (más oscuro en dark)
--bg-surface       // Tarjetas, paneles
--bg-surface-raised// Modales, dropdowns
--bg-inset         // Inputs, áreas embebidas
```

### 3.2 Bordes

```
--border-subtle    // Divisores apenas visibles
--border-default   // Bordes de inputs, botones
--border-emphasis  // Estados destacados o focus
```

### 3.3 Texto

```
--text-primary     // Datos principales, headings
--text-secondary   // Labels, descripciones
--text-muted       // Auxiliar, timestamps
--text-link        // Hipervínculos
```

### 3.4 Estado ISA-101 (los **únicos** colores cromáticos de la UI)

```
--status-normal      // verde — proceso en rango
--status-advisory    // azul — informativo, no requiere acción
--status-warning     // amarillo — atención, no urgente
--status-critical    // rojo — acción requerida
--status-emergency   // magenta — peligro inmediato
```

Cada uno tiene su variante `-muted` (alpha bajo) para fondos de badges/pills.

### 3.5 Acento

```
--accent-primary   // Color de acción principal (links, botones primarios fijos)
--accent-secondary // Acento secundario
```

### 3.6 Branding por instalación (no tocar)

`ThemeProvider.tsx` sigue inyectando `--color-primary-*` a partir de `config.theme_primary` del cliente. Los componentes que deben adoptar branding del cliente (Header avatar, Switch, Checkbox, FiltersPanel, NotificationsDropdown links, CustomPageSidebar selección) usan las clases `primary-*` de Tailwind, que internamente referencian estas vars.

---

## 4. Reglas de Uso

1. **El color es información.** Solo usar tokens `--status-*` para indicar estado real del proceso. Nada de teal/emerald/sky decorativo.
2. **Dark-first.** Diseñar y verificar primero en dark; light es fallback con contraste comprobado.
3. **Densidad.** Padding por defecto compacto (`p-2`, `p-3`); reservar `p-4` para cards principales. `gap-3` por defecto en grids.
4. **Sin sombras.** `boxShadow.card: 'none'`. La jerarquía se establece por superficies (`--bg-surface` vs `--bg-inset`) y bordes.
5. **Border-radius máximo 8px.** Nada de `rounded-xl/2xl/3xl`. Default `rounded-md` (6px).
6. **Tipografía:** IBM Plex Sans para texto, JetBrains Mono (`font-readout`) para datos numéricos con `liga 0`.

---

## 5. Verificación

| Check | Resultado |
|---|---|
| `npx vite build` | pasa (4.77s) |
| `npx vitest run` | 98/98 tests |
| Grep `bg-teal\|bg-emerald\|bg-sky` | 0 |
| Grep `slate-\d` | 0 (solo falsos positivos de `translate-*`) |
| Grep raw `red-\d`/`amber-\d` en código de estado | 0 (taxonómicos FIT/TIT/DOS preservados) |
| CSS bundle | 57.73 KB (≈ -13% vs línea base) |

---

## 6. Pendientes / Tech Debt Conocido

- Las clases categóricas `FIT`/`TIT`/`DOS` en setup wizard (`SensorSourceTabs`, `SensorRow`, `ImportSummary`, `SensorSettingsRow`) usan `bg-blue-100`/`bg-red-100`/`bg-amber-100`. Son **taxonómicas** (tipos de sensor, no estado del proceso), por lo que se preservaron — pero podrían beneficiarse de una paleta dedicada `--taxonomy-*` si se desea consistencia.
- Las variables legacy `--color-bg-*` siguen en `index.css` por compatibilidad; el `ThemeProvider` las mantiene en sincronía. Pueden eliminarse en una segunda pasada cuando se confirme que ningún consumidor externo las referencia.
- El warning de bundle > 500 KB en Vite sugiere code-splitting para reducir el JS inicial — fuera de scope de esta migración de diseño.

---

## 7. Archivos Clave Modificados

```
src/index.css                              — Tokens CSS dark/light
src/providers/ThemeProvider.tsx            — Modo por defecto + setters
tailwind.config.js                         — Tokens semánticos, fontSize, spacing, safelist
src/lib/echarts-theme.ts                   — Paleta ECharts dark/light
src/lib/statusStyles.ts                    — Mapeo importancia → tokens
src/lib/calendarUtils.ts                   — Background classes con tokens
src/lib/timeUtils.ts                       — Freshness color con tokens
src/components/ui/                         — Card, Badge, Button, Input, Switch, etc.
src/components/layout/                     — Header, Sidebar, AppLayout, LiveClock (NEW)
src/components/layout/NotificationsDropdown.tsx — Iconos ISA
src/components/dashboard/                  — KPI, EventLog, Calendar*
src/components/network/                    — Topology, Devices, Alerts
src/components/sensors/                    — SensorCard, AlarmBanner
src/components/machines/                   — Process, Diagnostics
src/stores/sidebarStore.ts                 — NEW: estado collapsed
src/pages/                                 — Todas las 11 páginas barrido completo
src/pages/setup/                           — Wizard completo
src/pages/settings/                        — Settings + Permissions
```

---

**Status final:** Migración completa. Build verde. Tests verdes. Bundle CSS reducido un 13%. Listo para QA visual en las 11 páginas + login + setup wizard, en dark y light.
