# PROMPT — Frontend Hardening Sweep (Bugs + Performance + A11y)

> **Fecha de auditoría**: 2026-05-19
> **Auditor**: 3 agentes paralelos sobre `src/front/` en `main`
> **Total de issues**: 47 (17 bugs funcionales · 15 performance · 15 accesibilidad)
> **Última actualización**: 2026-05-20 (añadidos B15 critical + B16 low + B17 medium durante remediación / backend handoff)
> **Fuente canónica**: `src/front/.ai/decisions.md` → entrada *Frontend Hardening Sweep (2026-05-19)*
> **Branch de trabajo**: `fix/frontend-hardening-sweep` (desde `main`)

---

## 0. Rol del agente y contrato de ejecución

Eres un **senior frontend engineer** con experiencia en React 18, Zustand, TanStack Query, WebSockets, ECharts y accesibilidad WCAG 2.1 AA. Vas a aplicar 44 fixes concretos a un dashboard SCADA industrial. La auditoría ya está hecha: cada issue está fundamentado en código real, con archivo y línea. Tu trabajo es **leerlos detenidamente, validar cada uno contra el código actual, y resolverlos uno por uno**.

### Reglas duras (no negociables)

1. **Lee todo este documento antes de tocar código.** Los issues se cruzan: un fix de performance puede romper un fix de bugs si los abordas en orden equivocado. El orden de ejecución de la §6 es obligatorio.
2. **Un issue a la vez.** Marca el issue como `in_progress` con TaskCreate al empezar, `completed` al cerrar. Si un fix requiere otro pendiente, regístralo como dependencia (`blockedBy`) y avanza al siguiente.
3. **Verifica tras cada fix**:
   - `cd src/front && npx vitest run` → 98/98 (mínimo; pueden subir si añades tests).
   - `cd src/front && npm run lint` → sin warnings nuevos.
   - `cd src/front && npx tsc --noEmit` → sin errores de tipos.
   - Si el fix toca UI: arrancar `npm run dev`, abrir la ruta afectada, probar **camino dorado + un edge case**. Si no puedes verificar visualmente (entorno headless, sin BFF arriba), declara explícitamente "manual smoke no ejecutado — entorno headless" en el cuerpo del commit. **No mientas sobre verificación.**
4. **Un commit por issue** con formato:
   ```
   fix(<scope>): <imperative summary> (#audit-<ID>)

   <archivo:línea> — <causa raíz en 1 frase>.
   <qué cambió y por qué>.

   Verified: vitest <N>/<N>, lint clean, manual smoke on <ruta o "headless">.
   ```
   Scopes válidos: `auth`, `telemetry`, `ws`, `router`, `bundle`, `chart`, `store`, `a11y`, `theme`, `form`, `kbd`, `branding`.
5. **No expandas scope.** Si encuentras un bug adyacente fuera del catálogo, **no lo arregles en el mismo commit**: añádelo al final de la sección correspondiente de `.ai/decisions.md` con la nota `(añadido durante remediación, 2026-MM-DD)` y sigue con el issue actual.
6. **Si el fix sketch es incorrecto**, documenta la corrección en `.ai/decisions.md` (línea `- **Revisado**: <razón>`) antes de implementar la alternativa. Los fix sketches son orientativos — no recetas cerradas.
7. **Branch única**: `fix/frontend-hardening-sweep`. PR consolidado al final. Si supera ~25 commits, abre PR parcial intermedio y continúa.
8. **Pre-commit hook activo siempre.** Nunca `--no-verify`. Si ruff/eslint se queja, arréglalo en el mismo commit.
9. **Marca progreso** en `.ai/decisions.md`: cada checkbox `[ ]` → `[x]` al cerrar. Cuando los 44 estén `[x]`, mueve el bloque a `## Done` con métricas finales.

### Cuándo parar y preguntar

- El fix exige cambios en `src/back` (BFF) — territorio de Jorge.
- El fix exige migración de BD o cambio en contratos `/docs/contracts/`.
- El fix revela que el modelo de auth está arquitectónicamente roto (no solo mal implementado).
- Los 98 tests existentes empiezan a romperse y no es por culpa de tu fix actual — puede indicar rama desactualizada respecto a `main`.

---

## 1. Contexto del codebase (lee esto si no lo tienes en cabeza)

- **Stack**: React 18 + TypeScript 5.6 + Vite 5. Zustand 5 (estado app + persist localStorage) + TanStack React Query 5 (estado servidor).
- **Estilos**: Tailwind 3 con tokens CSS en `src/styles/themes/{scada,modern}.css` (sistema dual: ISA-101 SCADA por defecto, "modern" alternativo). Dark-first.
- **Routing**: React Router 6, `ProtectedRoute` con gating por rol + licencia.
- **Realtime**: WebSocket con reconnect automático + fallback a HTTP polling (`src/hooks/useTelemetryWebSocket.ts`).
- **Charts**: ECharts 6 vía `echarts-for-react`.
- **i18n**: español por defecto, `src/stores/languageStore.ts`.
- **Auth**: Bearer tokens en localStorage (`truedata-auth`), refresh automático en 401.
- **Tests**: Vitest (jsdom), 98 tests, deben pasar siempre.

Comandos clave:
```bash
cd src/front
npm run dev          # Vite en :5173
npm run build        # tsc + Vite build → /dist
npm run lint         # ESLint flat config v9
npx vitest run       # tests
npx tsc --noEmit     # type-check sin emitir
```

### Lint baseline (pre-sweep — no contar como regresión)

`npm run lint` en `main` ya emite **3 warnings** preexistentes del regla `react-refresh/only-export-components`. Están **fuera del catálogo de 44** — arreglarlos exige partir cada archivo en dos (component en uno, hook/context/helper en otro), y eso es churn invasivo en files que ningún issue del sweep toca:

- `src/components/ui/ErrorBoundary.tsx` — exporta `ErrorBoundary` + helpers/tipos.
- `src/contexts/TelemetryContext.tsx` — exporta `TelemetryProvider` + `useTelemetryContext` + `TelemetryContext`.
- `src/providers/ThemeProvider.tsx` — exporta `ThemeProvider` + `useTheme`.

Razón: la regla penaliza archivos que mezclan componentes con no-componentes (hooks, contextos, helpers) porque Vite HMR no puede hot-patch el módulo — edita uno y `npm run dev` hace full refresh en lugar de HMR. Coste real pero leve.

**Cuando un commit del sweep diga "lint clean" o "sin warnings nuevos", significa "estos 3 warnings y nada más".** Si tras un fix aparece un cuarto, eso sí es regresión y debe arreglarse en el mismo commit.

---

## 2. Resumen ejecutivo de la auditoría

| Categoría | Critical | High | Medium | Low | Total |
|-----------|---------:|-----:|-------:|----:|------:|
| Bugs funcionales | 3 | 6 | 6 | 2 | 17 |
| Performance | 4 | 4 | 6 | 1 | 15 |
| Accesibilidad | 2 | 7 | 5 | 1 | 15 |
| **Total** | **9** | **17** | **17** | **4** | **47** |

**Top 5 prioridades absolutas** (todo lo demás depende de estos):
1. **B1+B2**: refetch infinito + WS resubscribe storm — están desbocando tráfico al BFF en cada sesión.
2. **B4**: race en refresh de token → sesiones murieron silenciosamente.
3. **P1–P4**: bundle de 2.1 MB sin code splitting (todos los usuarios pagan el coste de echarts/reactflow en el login).
4. **A4+A5**: `<div onClick>` en NotificationsDropdown y SensorCard — la UI no es operable con teclado/SR.
5. **A11**: `Switch`/`Checkbox` con clases Tailwind inexistentes (`primary-600`) tras el rebrand SCADA — el estado checked es invisible.

---

## 3. Bugs funcionales (17 issues)

### B1 — `[Critical]` `t` recreado cada render dispara refetch infinito

- **Archivos**: `src/pages/MachinesPage.tsx:228`, `src/pages/VariablesPage.tsx:163`
- **Síntoma observable**: `/api/machines/sensors` y `/api/telemetry/sensors` se llaman en cada render, las respuestas re-renderizan, produciendo un flood continuo. El BFF se ahoga y el array local de `sensors` se resetea.
- **Causa raíz**: `useTranslation()` devuelve un `t` nuevo cada render. `t` está en el array de deps del `useEffect` que dispara el fetch. Cualquier re-render del padre (typical: tick de telemetría) refire el fetch. El `eslint-disable` en `VariablesPage.tsx:162` cubre otras deps pero `t` sigue listada.
- **Fix sketch**: Memoizar `t` en `languageStore.ts` (`useCallback([language])`), o sacar `t` del array de deps (usar ref o inlinear el string en el catch). El primer enfoque es preferible porque ayuda también a P13.
- **Verificación específica**: Abrir Network tab en DevTools, navegar a `/machines` y `/variables`. No deben verse llamadas repetidas al endpoint mientras la página esté quieta.

### B2 — `[Critical]` WS re-subscribe storm

- **Archivos**: `src/hooks/useTelemetryWebSocket.ts:376-389`, caller en `src/contexts/TelemetryContext.tsx:380`
- **Síntoma observable**: Mientras la WS está conectada, el cliente spamea mensajes `{type:'subscribe',...}` al BFF en cada render del `TelemetryProvider` (que ocurre en cada snapshot/delta).
- **Causa raíz**: El efecto "reconnect when options change" depende de `channels` y `sensors`. El caller pasa inline `['telemetry','network_alerts','inferences']` — nueva referencia cada render. La igualdad por referencia falla → efecto corre cada render.
- **Fix sketch**: `useMemo` para `channels`/`sensors` en el caller, **o** comparar por contenido dentro del efecto (`JSON.stringify` o deep-equal). Preferir `useMemo` en caller — más limpio.
- **Verificación específica**: Inspeccionar frames WS en DevTools. Tras la suscripción inicial no deben aparecer mensajes `subscribe` adicionales mientras la sesión esté quieta.

### B3 — `[High]` Closures stale en `connect`/`disconnect`

- **Archivos**: `src/hooks/useTelemetryWebSocket.ts:358-373`
- **Síntoma observable**: Tras la primera conexión WS, los callbacks `onSnapshot`/`onDelta`/`onNetworkAlert` siguen disparando la versión inicial aunque el padre pase nuevas closures. Combinado con B2, mantiene handlers stale toda la sesión.
- **Causa raíz**: Mount-time `useEffect` depende solo de `enabled` (lint suprimido). `connect` se recrea cada render con callbacks nuevos pero el efecto no se re-invoca. El `disconnect` en cleanup también captura refs stale.
- **Fix sketch**: Almacenar callbacks en refs (`onSnapshotRef.current`) y leer desde la ref dentro de `onmessage`/`connect`. Entonces deps pueden ser `[]` sin staleness.

### B4 — `[High]` Race en refresh de token

- **Archivo**: `src/lib/api.ts:51-78`
- **Síntoma observable**: Al cargar la app, varias requests reciben 401 simultáneamente (`/me`, `/config`, `/snapshot`, etc.). Cada una llama `/auth/refresh` con el mismo refresh token. Si el backend rota refresh tokens, la segunda llamada falla con `invalid_token` → logout silencioso.
- **Causa raíz**: `refreshAccessToken` no tiene singleton in-flight. Múltiples escritores compiten por sobrescribir `truedata-auth` en localStorage.
- **Fix sketch**: Cachear la promise del refresh:
  ```ts
  private refreshPromise: Promise<string|null> | null = null;
  async refreshAccessToken() {
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = this._doRefresh().finally(() => { this.refreshPromise = null; });
    return this.refreshPromise;
  }
  ```
- **Verificación específica**: Forzar token expirado, recargar app con DevTools Network → solo una llamada a `/auth/refresh`.

### B5 — `[High]` `logout()` no limpia caches del bearer

- **Archivo**: `src/stores/authStore.ts:100-108`
- **Síntoma observable**: Tras logout, el siguiente usuario en el mismo navegador ve notificaciones del usuario previo (`truedata-notifications`), layout de dashboard, selección de machines, custom pages y la cache de TanStack Query (hasta que expire `staleTime` 30 s).
- **Causa raíz**: `logout` solo limpia `accessToken`/`refreshToken`/`session`. Otros stores persistidos y `QueryClient` siguen poblados. No hay `queryClient.clear()` en ningún sitio.
- **Fix sketch**: En `logout`, limpiar stores de notificación/dashboard/customPages, llamar `queryClient.clear()`, y borrar `truedata-auth` explícitamente.

### B6 — `[High]` rAF chains stale en `AnimatedValue`

- **Archivo**: `src/components/sensors/SensorCard.tsx:213-244`
- **Síntoma observable**: Con telemetría en vivo, cada cambio de valor genera un nuevo `requestAnimationFrame` mientras el anterior sigue corriendo. Tras unmount, `setDisplayValue` se llama sobre componente desmontado (warning React 18, error React 19). Visualmente: el readout parpadea entre animaciones que compiten.
- **Causa raíz**: No hay ref con el id del rAF, no se cancela en cambio de deps ni en unmount; la closure interna `animate` captura `startValue`/`endValue` así que loops previos terminan a su ritmo.
- **Fix sketch**: Guardar handle del rAF en una ref y `cancelAnimationFrame(ref.current)` al inicio del efecto y en cleanup.

### B7 — `[High]` `CustomPageRenderer` con `slug!` y sin auth gate

- **Archivos**: `src/pages/CustomPageRenderer.tsx:69-71`, `src/App.tsx:157`
- **Síntoma observable**: Visita directa a `/custom/` o `/custom` (sin slug) → `useParams()` devuelve `{slug: undefined}`, el `slug!` non-null assertion miente. Cae por suerte al `Navigate to="/"`, pero la ruta tampoco está envuelta en `ProtectedRoute`.
- **Fix sketch**:
  ```tsx
  if (!slug) return <Navigate to="/" replace />;
  ```
  Y wrap de la ruta en `<ProtectedRoute>` en `App.tsx:157`.

### B8 — `[High]` `useLocalStorage` escribe valor stale

- **Archivo**: `src/hooks/useLocalStorage.ts:30-41`
- **Síntoma observable**: Llamar `setValue(x)` dos veces síncronamente (o dos eventos en el mismo tick) escribe el valor equivocado: la segunda llamada ve el snapshot de `storedValue` previo a la primera. Rompe el Set de favoritos al togglear varios entries rápido.
- **Fix sketch**: Usar siempre el setter funcional:
  ```ts
  setStoredValue((prev) => {
    const next = value instanceof Function ? value(prev) : value;
    localStorage.setItem(key, JSON.stringify(next));
    return next;
  });
  ```

### B9 — `[Medium]` WS handlers post-navegación

- **Archivo**: `src/contexts/TelemetryContext.tsx:344-372`
- **Síntoma observable**: Tras logout, el race entre unmount del provider y limpieza de auth puede disparar `addNotification` una última vez. Combinado con B5, las notifications se acumulan en localStorage entre logins.
- **Fix sketch**: Gatear handlers WS por `useAuthStore.getState().isAuthenticated` antes de mutar stores transversales, y desmontar el provider antes de limpiar auth.

### B10 — `[Medium]` `setTimeout` pendientes tras unmount

- **Archivos**: `src/pages/settings/SettingsPage.tsx:173`, `src/pages/settings/components/InstallationConfigTab.tsx:82`, `src/components/chat/FluviaChat.tsx:65`
- **Síntoma observable**: Navegar fuera dentro de 3 s tras guardar (o 1.5 s tras enviar mensaje en chat) → warning React 18 sobre state update en unmounted (error en React 19).
- **Fix sketch**: Guardar el handle del timeout en una ref y `clearTimeout` en cleanup; o envolver el branch de éxito con `isMountedRef`.

### B11 — `[Medium]` Suscripción a store completo en `MachinesPage`

- **Archivo**: `src/pages/MachinesPage.tsx:42-45` (patrón también en `LoginPage`, `SettingsPage`)
- **Síntoma observable**: Cualquier cambio en `machinesStore` (incluyendo `editMode`, `viewMode`, reorders de widgets) re-renderiza toda la página, amplificando B1 y B2.
- **Fix sketch**: Selectores atómicos: `useMachinesStore((s) => s.selectedProcess)`, etc. Aplicar también a las destructuraciones de `useInstallationStore()` en `LoginPage`/`SettingsPage`.

### B12 — `[Medium]` Delta handler sin coalescencia

- **Archivo**: `src/contexts/TelemetryContext.tsx:328-337`
- **Síntoma observable**: Snapshot handler aplica `now - lastPoint.ts >= 1000`. Delta handler **no**. Para una planta con 200 keys empujando 10 deltas/seg, `historyRef` crece a `MAX_HISTORY_POINTS` por key en segundos y luego reasigna en cada shift.
- **Fix sketch**: Mismo guard en el loop del delta handler.

### B13 — `[Low/Medium]` Branding effect re-aplicado cada render

- **Archivo**: `src/pages/LoginPage.tsx:38-45`
- **Síntoma observable**: Objeto `palette` literal en render scope → nueva referencia cada render → el tercer efecto de `useUnauthThemeBootstrap` re-aplica 12 CSS vars al root. En CI lento, los campos de form parpadean en focus.
- **Fix sketch**:
  ```ts
  const palette = useMemo(() => ({...}), [branding?.theme_primary, branding?.theme_secondary, branding?.theme_accent]);
  ```

### B14 — `[Low]` Orden de gates en `ProtectedRoute`

- **Archivo**: `src/components/auth/ProtectedRoute.tsx:33-44`
- **Síntoma observable**: Usuarios con `license.is_active=false` ven "Licencia Inactiva" dentro del layout en `/`, pero en `/users` son redirigidos a `/` (un loop que aterriza en la pantalla de licencia). UX incoherente entre rutas.
- **Fix sketch**: Mover el check de licencia inactiva por encima de `requiredPage`/`requireAdmin`.

### B15 — `[Critical, MVP-mandatory rework]` `/telemetry` charts: realtime semantics + HTTP backfill multi-resolución + AI inference markers

> **Estado**: rework decretado por usuario (2026-05-20) tras investigar el síntoma original de "charts vacíos". Lo que parecía un bugfix puntual es una feature incompleta: la página nunca llamó al endpoint histórico, los charts usan `xAxis.type: 'category'` (rompiendo semántica realtime), y el buffer en memoria son 120 puntos (~2 min). MVP-mandatory para la demo.
>
> **Coordinación**: requiere cambios BFF (ver `src/front/docs/handoff_backend.md`) ANTES o EN PARALELO con el rework FE. La fix del bug de comma-keys en `/api/telemetry/history` es bloqueante.

- **Archivos**:
  - Frontend: `src/components/machines/AreaBandChart.tsx:268,303` (xAxis type + series shape), `src/components/dashboard/SensorTrendChart.tsx:123`, `src/components/dashboard/ComboChart.tsx:59` (mismos issues), `src/pages/VariablesPage.tsx:71,270` (datasource), `src/contexts/TelemetryContext.tsx:70,271-285,338-350` (buffer + key space), `src/hooks/useOverviewData.ts:141-164` (reutilizar `useTelemetryHistory`), nuevo `src/hooks/useTelemetryRange.ts`.
  - Backend (ver `handoff_backend.md`): `src/back/src/api/telemetry.py:140-183`, `src/back/src/services/thingsboard.py:296-333`, TB tenant retention (admin UI).

- **Síntoma observable** (lo que el usuario ve hoy):
  1. Abrir `/telemetry`: "Sin datos de telemetría disponibles" en todos los charts aunque la inyección esté corriendo.
  2. Aunque la inyección se quede 10 minutos enviando datos, la página solo muestra ~2 min porque el buffer en memoria los descarta.
  3. Cuando la inyección se para una hora y vuelve, los puntos nuevos se dibujan **pegados** a los viejos, como si no hubiera pasado el tiempo (continuidad falsa).
  4. Al hacer login después de un fin de semana, no hay forma de ver qué pasó.

- **Causa raíz (3 defectos encadenados)**:
  1. **Sin HTTP backfill**: `VariablesPage` no llama nunca a `/api/telemetry/history`. Lee `telemetryData[widget.id]` desde el contexto, que se rellena solo con frames WS (`historyRef.current` en `TelemetryContext.tsx`). Cap `MAX_HISTORY_POINTS = 120` ⇒ máximo 2 min visibles aunque haya datos.
  2. **Axis de categoría, no de tiempo**: `xAxis.type: 'category'` en `AreaBandChart.tsx:268` (y en `SensorTrendChart.tsx:123` y `ComboChart.tsx:59`) coloca los puntos en índices enteros, no en posiciones de reloj. Una pausa de 1 hora queda pegada al punto anterior.
  3. **Bug latente en BFF**: `/api/telemetry/history` descarta filas cuando llegan `?keys=A,B,C` comma-joined (FastAPI parsea como `["A,B,C"]`, luego `if key in keys` falla para cada clave individual). Hoy afecta solo a `SensorTrendChart` (Custom dashboards) silenciosamente. **Bloquea el rework**: sin esta fix, `VariablesPage` llamando `/history` también devolvería vacío.

- **Decisión de arquitectura (rework, ver plan completo en `/Users/j0rgw/.claude/plans/polished-nibbling-acorn.md`)**:

  1. **Modo por rango**: los botones `1m / 5m / 15m / 1h / 5h / 24h / 7d / 30d` cambian el modo del chart:
     - `1m, 5m` → **REALTIME**: solo WS, eje anclado a `now` con `setInterval(1000)` para que avance aunque no lleguen datos.
     - `15m+` → **HISTORIC**: `useTelemetryHistory(...)` con `interval` adaptado por rango + tail WS pegada al borde derecho.

  2. **LOD ladder** (intervalos por rango, todos < 1000 puntos para respetar el `limit` de TB):
     | Rango | Modo | Bucket TB | Puntos esperados |
     |---|---|---|---|
     | 1m | REALTIME (WS) | RAW | ~60 |
     | 5m | REALTIME (WS) | RAW | ~300 |
     | 15m | HISTORIC | `agg=NONE` (raw ≤1000) | ~900 |
     | 1h | HISTORIC | `agg=AVG&interval=60_000` | ~60 |
     | 5h | HISTORIC | `agg=AVG&interval=300_000` | ~60 |
     | 24h | HISTORIC | `agg=AVG&interval=900_000` | ~96 |
     | 7d | HISTORIC | `agg=AVG&interval=3_600_000` | 168 |
     | 30d | HISTORIC | `agg=AVG&interval=14_400_000` | 180 |

  3. **xAxis.type: 'time'** en todos los charts time-series. `series.data` pasa de `[v, v, ...]` a `[[ts, v], [ts, v], ...]`. `connectNulls: false` para que los gaps se vean.

  4. **LOD cache vía TanStack queryKey**: el `queryKey` ya incluye `interval` (`useOverviewData.ts:157`), así que cada rango histórico vive en su propio cache slot. `gcTime: 30 min`, `staleTime: 30s`. Prefetch on hover de los botones. **Bonus backend (2026-05-20)**: el endpoint `/api/telemetry/history` ahora tiene cache Redis 30 s (key sha256 por set ordenado de sensores + rango); segundas visitas dentro del TTL pegan a Redis, no a TB. Refuerza el `staleTime: 30s` del frontend.

  5. **AI inference event markers** — dos capas (después del backend handoff 2026-05-20):
     - **In-session per-sensor (modo LIVE/REALTIME)**: `TelemetryContext.handleInference` ya captura inference messages por WS con `sensor_key` per-device. Renderizar como `markPoint` de ECharts en la serie del sensor afectado. Funciona desde el primer mensaje WS sin endpoint nuevo. Es lo que verá el operador durante la sesión activa.
     - **HISTORIC plant-level (rangos 7d/30d, sesión nueva)**: backend expone `/api/inferences/history?sensor_key=__plant__&startTs=...&endTs=...` con eventos plant-level (sentinel `__plant__`, 4 plant keys, filtrados a `PERSIST_MIN_LEVEL>=2`, dedupe por `max(inference_ts)` per model; backfill automático en lifespan via `inference_backfill.backfill_plant_level_events`). Renderizar como `markLine` vertical que cruza todas las series del chart, **no** pinned a un sensor concreto. Apto para MVP demo.
     - **Per-sensor en HISTORIC queda fuera del MVP** — requiere cambiar contrato inference-service → TB para publicar por-device, no solo plant-level. Tracked como **B17** (Medium, follow-up cross-team). Hasta entonces, los rangos largos muestran plant-level y la sesión activa rellena per-sensor via WS.
     - Sustituye al envelope min/max (rechazado por usuario por sobrecoste BFF — el usuario optó por "lean on AI inference events").

  6. **Canonicalización de keys**: `historyRef.current` keyed por display tag (`mapToDisplayName(rawKey)`), `widget.id = display tag` siempre. Fallback `tb:<rawKey>` para sensores sin mapping.

  7. **MAX_HISTORY_POINTS = 600** (10 min @ 1Hz, suficiente para el rango REALTIME 5m con holgura).

  8. **TB retention a 30 días — automatizado** (2026-05-20): implementado en `src/thingsboard/src/services/cli.py` Phase 4a vía sysadmin one-shot login + POST tenant con `additionalInfo.maxDaysToKeepTelemetry`. Lee `TB_SYSADMIN_USER`/`TB_SYSADMIN_PASSWORD` de env, fail-soft con WARN si TB ignora el campo. Runbook manual queda como fallback en `docs/runbook/tb-retention.md`. No requiere acción del operador.

- **Lo que se descarta del MVP** (decisiones del usuario el 2026-05-20):
  - **Envelope min/max/avg**: descartado. Se confía en los markers de inferencia para mostrar anomalías sub-bucket. (Cuesta 3× llamadas TB y prolongaría latencia BFF — ROI no justifica para MVP.)
  - **Dynamic AI normal-range band per timestep**: descartado para MVP. Se mantiene la banda estática existente (`normalRange` prop ya implementada) que viene del sensor config.

- **Plan de ejecución completo**: `/Users/j0rgw/.claude/plans/polished-nibbling-acorn.md` (este plan). Resumen de commits en Phase B (frontend, post-merge de backend handoff):
  1. `fix(chart): switch xAxis from category to time (#audit-B15.1)`
  2. `feat(telemetry): introduce useTelemetryRange hook with LOD cache (#audit-B15.2)`
  3. `feat(telemetry): AreaBandChart uses useTelemetryRange + wall-clock axis tick (#audit-B15.3)`
  4. `feat(telemetry): render AI inference event markers on chart (#audit-B15.4)`
  5. `fix(telemetry): canonical display-tag key space in TelemetryContext (#audit-B15.5)`
  6. `perf(telemetry): bump MAX_HISTORY_POINTS to 600 (#audit-B15.6)`
  7. `feat(telemetry): prefetch adjacent ranges on hover (#audit-B15.7)`

- **Verificación específica**:
  1. Login fresco, abrir `/telemetry`: dentro de 2s, charts muestran 5m de historia (o 1h, o 30d) según el botón activo, completos.
  2. Pausar inyección 5 min y reanudar: el chart muestra un gap visible de 5 min, no continuidad falsa.
  3. Sin inyección por 30 min, el eje del chart en modo REALTIME sigue avanzando hasta "now" — no se queda congelado en el último punto.
  4. Disparar una inferencia anómala: aparece un marker coloreado en el chart en el `ts` exacto, visible a cualquier zoom.
  5. Cambiar entre 24h ↔ 7d ↔ 30d: la segunda visita es < 50ms (cache hit). La primera es la latencia BFF estándar.
  6. DevTools Network: al cambiar de rango histórico, una request `GET /api/telemetry/history?keys=...&interval=...` con respuesta no vacía.
  7. Logout viernes, login lunes: ver el fin de semana en los charts en modos 24h/7d.

- **Hallazgo paralelo (no-issue, documentado para que no se vuelva a investigar)**: las 401 sobre `/api/auth/me` y `/api/installation/config` al cargar la app son una carrera de hidratación FE (el persist middleware aún no ha cargado el token cuando salen las primeras requests). El singleton de refresh (B4) las recupera. BFF responde correctamente. Los rojos en DevTools son cosméticos.

### B16 — `[Low]` React duplicate-key warning `'value'` en `ProcessMachinePanel`

> **Añadido durante remediación (2026-05-20)**. Detectado en consola al investigar B15.

- **Archivo**: `src/components/machines/ProcessMachinePanel.tsx:301` (`<div key={sensor.key}>`). El stack trace del warning apunta a `src/pages/MachinesPage.tsx:29:17` pero el offending key está en el child.
- **Síntoma observable**: warning en consola al renderizar `/plant`:
  ```
  Warning: Encountered two children with the same key, `value`. Keys should be unique
  so that components maintain their identity across updates.
  ```
- **Causa raíz**: dos entries de `sensors[]` en `MachinesPage` con `sensor.key === "value"`. Probable origen: respuesta de `/api/telemetry/sensors` con claves de ThingsBoard que terminan en sufijos como `.Value` / `Value` / `value` y, tras alguna normalización (FE o BFF), colapsan a la palabra literal `"value"`. `VariablesPage.tsx:82-87` dedupea exact-match, pero `MachinesPage` construye su propio `sensors[]` sin esa salvaguarda.
- **Fix sketch**: composite key `${sensor.device_id}-${sensor.key}` en el `<div key=...>`, o filtrar claves reservadas (`value`, `timestamp`, `state`) en el setter de `sensors` en `MachinesPage`. Considerar también filtrar en el backend si la respuesta de `/api/telemetry/sensors` no debería incluirlas — abrir un issue paralelo si se confirma server-side.
- **Verificación específica**: consola limpia (sin este warning) al navegar a `/plant` con inyección activa, ambos en modo dev y prod build.

### B17 — `[Medium]` Per-device inference backfill (HISTORIC markers per-sensor)

> **Añadido durante remediación (2026-05-20)**, después del backend handoff que entregó `/api/inferences/history` con scope plant-level only. Follow-up cross-team; no bloquea el MVP de B15 — plant-level cubre la demo.

- **Archivos**:
  - Backend: `src/back/src/services/inference_backfill.py` (docstring nota la limitación; `backfill_plant_level_events` actual usa sentinel `__plant__` y 4 plant keys), inference-service publisher contract (fuera del repo del frontend; ML team).
  - Frontend (cuando aterrice): `src/components/machines/AreaBandChart.tsx` (markPoint per serie), futuro hook `src/hooks/useSensorInferences.ts` (parte de B15.4 con scope reducido en MVP).
- **Síntoma observable**: en HISTORIC (rangos 7d/30d, sesión recién abierta sin acumulación WS) los markers de inferencia que pinta `AreaBandChart` son **plant-level only** — un `markLine` vertical que cruza todas las series del chart, no pinned a un sensor concreto. Los markers per-sensor solo aparecen para eventos llegados via WS durante la sesión activa.
- **Causa raíz**: el servicio de inferencia publica a ThingsBoard solo `*_Anomalies_*` devices con 4 plant keys (rollups); no hay canal per-device en TB. El `inference_backfill.py` del BFF refleja esa limitación con un sentinel `sensor_key=__plant__` en `inference_events` (`inference_events.sensor_key` ahora nullable, migración `010_inference_events_plant_level.sql`).
- **Fix sketch (cross-team, orden recomendado)**:
  1. **ML / inference-service**: cambiar el publisher para emitir eventos per-device hacia TB. Decidir formato (atributo + valor JSON, o stream telemetry); abrir ADR si toca contrato.
  2. **BFF**: ampliar `backfill_plant_level_events` (o añadir `backfill_per_sensor_events`) para consumir el nuevo canal y poblar `inference_events.sensor_key` con la ISA tag concreta del sensor afectado. Mantener compatibilidad con `__plant__` mientras la transición.
  3. **Frontend**: `useSensorInferences(sensorKey)` (creado dentro de B15.4 con scope reducido) llama a `/api/inferences/history?sensor_key=<displayTag>&startTs=...` en modo HISTORIC, mergeando con el WS in-session. Sustituye los `markLine` plant-level por `markPoint` per-sensor cuando existan datos.
- **Verificación específica**: en una sesión recién abierta (sin WS events acumulados), rango 7d, disparar histórico de anomalías per-sensor en backend → cada chart afectado muestra `markPoint` en el `ts` exacto del evento, no un `markLine` cruzando todos los sensores.
- **Prioridad**: Medium. Plant-level cubre la demo MVP; per-sensor es feature de pulido cuando la herramienta sea operativa diaria.

- **Revisado (B17, 2026-06-01)**: auditoría del flujo end-to-end Inference → BFF → AnomaliesPage confirma que el 95% del contrato está cerrado: webhook `POST /api/internal/inferences` recibe, persiste en `inference_events` (level ≥ LOW por sensor), broadcastea en canal WS `inferences`, y `/api/anomalies` consume `last_inference_by_sensor` (ADR-0008). El único gap es éste — per-sensor backfill desde antes del startup del BFF. Tres opciones documentadas en `.jorge/handoff_bff_inferencias_2026-06-01.md` §4.4:
  - **Opción A — Replay desde `stream.jsonl`** del contenedor inference en startup BFF (~1 día, solo BFF). Infringe ADR que marca `stream.jsonl` como debug-only.
  - **Opción B.2 — Per-sensor write-back a TB v1.1 (recomendada)**: extender `src/inference/src/services/tb_publisher.py` para añadir keys prefijadas `{sensor}.score`, `{sensor}.level`, `{sensor}.level_name` al device `{CLIENT}_Anomalies_{MODEL}` existente. BFF generaliza `_build_rows_from_telemetry` en `inference_backfill.py` para reconocer el prefijo y emitir filas con `sensor_key=<sensor>`. Bump del contrato `docs/contracts/inference-thingsboard-integration.md` a v1.1. ~½ día BFF + 2-3 días ML.
  - **Opción C — TimescaleDB hypertable en BFF**, persistir todo lo del webhook (no solo level ≥ LOW), eliminar backfill desde TB. ~1 semana, cambio arquitectónico.
- **Nota operativa (2026-06-01)**: `INF_BFF_ENABLED=false` por defecto en `deploy/compose/ml.yml:71`. Inference real no publica al BFF salvo override en `.env`. Mock inference (`tools/mock-inference/`) sí publica si está mapeado en lugar del real. Verificación rápida sin tocar inference: `curl -X POST http://localhost:8000/api/internal/inferences -d @payload-v21.json` (payload completo en el handoff §6.1) → debería actualizar la `/anomalies` en el front ≤ 200 ms vía WS.

---

## 4. Performance (15 issues)

### P1 — `[Critical]` Bundle único de 2.1 MB sin splitting

- **Archivos**: `src/front/vite.config.ts` (entero), `dist/assets/index-*.js`
- **Métricas**: `dist/assets/index-Dwl89WPx.js` = **2.1 MB** sin gzip; CSS = 62 KB. Cero `manualChunks`, cero `React.lazy`, cero dynamic imports.
- **Causa raíz**: `vite.config.ts` tiene 12 líneas, solo `@vitejs/plugin-react` + alias. Todos los 169 archivos fuente + echarts + @xyflow/react + @dagrejs/dagre + @dnd-kit + Radix + 34 entries de lucide acaban en `index-*.js`.
- **Fix sketch**: Añadir en `vite.config.ts`:
  ```ts
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          echarts: ['echarts', 'echarts-for-react'],
          flow: ['@xyflow/react', '@dagrejs/dagre'],
          dnd: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          radix: ['@radix-ui/...'],  // listar los que se usan
          icons: ['lucide-react'],
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  }
  ```
- **Verificación**: `npm run build` debe mostrar el chunk principal por debajo de 500 KB.

### P2 — `[Critical]` Las 11 rutas importadas eagerly

- **Archivo**: `src/App.tsx:6-17`
- **Síntoma**: SetupWizard (multistep + sensor surveys), MachinesPage (441 LOC + ProcessGraph ReactFlow+Dagre), NetworkStatusPage (TopologyGraph ReactFlow), VariablesPage y SettingsPage cargan en la pantalla de login.
- **Fix sketch**:
  ```tsx
  const MachinesPage = lazy(() => import('@/pages/MachinesPage'));
  const NetworkStatusPage = lazy(() => import('@/pages/NetworkStatusPage'));
  const SetupWizard = lazy(() => import('@/pages/setup/SetupWizard'));
  const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'));
  const AlertsPage = lazy(() => import('@/pages/AlertsPage'));
  const CustomPageRenderer = lazy(() => import('@/pages/CustomPageRenderer'));
  ```
  Envolver `<Routes>` en `<Suspense fallback={<LoadingFallback />}>`.

### P3 — `[Critical]` Charts ECharts importados sincrónicamente

- **Archivos**: `src/components/dashboard/{SensorTrendChart,AnomalyScatterChart,ComboChart,ProcessStatusChart}.tsx`, `src/components/network/{AlertTimeline,DevicesPieChart}.tsx`, `src/components/control/RadarChart.tsx`, `src/components/machines/AreaBandChart.tsx`
- **Síntoma**: ~500-700 KB de echarts en el primer JS que el navegador parsea, incluso en `/login`.
- **Fix sketch**: Combinar dos enfoques:
  1. `React.lazy` los componentes de chart en sus parents.
  2. Imports modulares de `echarts/core` + registrar solo `LineChart`, `BarChart`, etc. usados.
  3. Combinado con `manualChunks.echarts` de P1.

### P4 — `[High]` ReactFlow + Dagre eagerly

- **Archivos**: `src/components/network/TopologyGraph.tsx:7-23`, `src/components/machines/ProcessGraph.tsx:12-28`
- **Métricas**: ~250 KB extra en main chunk.
- **Fix sketch**: Lazy-load `TopologyGraph` y `ProcessGraph`. Para named exports:
  ```ts
  const TopologyGraph = lazy(() => import('@/components/network/TopologyGraph').then(m => ({ default: m.TopologyGraph })));
  ```

> **NOTA IMPORTANTE**: P1–P4 tocan `vite.config.ts` + `App.tsx` simultáneamente. Excepción documentada al "un commit por issue": ir con **un commit por sub-fix**, todos sobre el mismo PR parcial. Ejemplo: commit 1 = `manualChunks` config, commit 2 = lazy routes, commit 3 = lazy charts, commit 4 = lazy flow.

### P5 — `[High]` Cero uso de `React.memo`

- **Búsqueda**: `grep -rn "React.memo\|memo(" src/components` → 0 hits.
- **Síntoma**: Cada delta WS en `TelemetryContext` llama `setHistoryTrigger(t => t+1)` + crea Records nuevos. Todos los consumers (`ConnectionStatus`, `OverviewPage` widgets, `VariablesPage`, etc.) re-renderizan ~1×/seg.
- **Fix sketch**: `memo()` en componentes hoja que no dependen de props que cambian rápido: `KPICard`, filas de `EventLog`, `WidgetWrapper`, `LanguageToggle`, `FiltersPanel`.

### P6 — `[High]` Stores sin selectores

- **Archivos**: `src/pages/{OverviewPage,VariablesPage,MachinesPage}.tsx`, `src/pages/settings/SettingsPage.tsx:127`, `src/pages/setup/SetupWizard.tsx:44`, `src/pages/setup/steps/{Summary,Pages,Sensors,Identity,Admin}Step.tsx`, `src/components/filters/FiltersPanel.tsx:31`, `src/components/layout/LanguageToggle.tsx:5`, `src/pages/LoginPage.tsx:24`
- **Síntoma**: Patrón `const { a, b } = useDashboardStore()` (sin selector) → re-render en cualquier cambio del store. Cambiar `editMode` re-renderiza todo el árbol de OverviewPage aunque filters/widgets no hayan cambiado.
- **Fix sketch**: Selectores atómicos por slice o `useShallow` para tuplas:
  ```ts
  const widgets = useDashboardStore(s => s.widgets);
  const filters = useDashboardStore(s => s.filters);
  ```

### P7 — `[High]` `sensorHistory` rebuilt cada mensaje WS

- **Archivo**: `src/contexts/TelemetryContext.tsx:130-131,278,338,439-443,472-503`
- **Síntoma**: `setHistoryTrigger(t+1)` fira en cada snapshot Y cada delta (throttle 1 Hz). El `sensorHistory` memo devuelve `{...historyRef.current}` — nueva identidad cada vez. El `value` memo del context depende de `sensorHistory` → todos los consumers re-renderizan ~1×/seg aunque ningún sensor visible haya cambiado.
- **Fix sketch**: Eliminar `historyTrigger`. Exponer `sensorHistory` vía callback estable `getSensorHistory(key)` o dividir en `useTelemetryValues()` + `useTelemetryHistory(key)` con `useSyncExternalStore` para suscripciones por key.

### P8 — `[High]` Reconnect storm en `useTelemetryWebSocket`

- **Archivos**: `src/hooks/useTelemetryWebSocket.ts:164-328,376-389`
- **Síntoma**: `connect` depende de `channels`, `sensors`, `throttleMs`, `onSnapshot`, `onDelta`, `onNetworkAlert`, `onInference`, `onError`. Callbacks son `useCallback`-stable pero `channels` es array literal nuevo cada render → `connect` identity cambia → efecto re-suscribe cada render.
- **Fix sketch**: `useMemo` en `channels`/`sensors` en el caller (alineado con B2), o usar `useRef`.

### P9 — `[Medium]` Deps de handlers WS mutan con cualquier config refresh

- **Archivo**: `src/contexts/TelemetryContext.tsx:230, 284, 346, 357`
- **Síntoma**: `handleSnapshot`/`handleDelta` dependen de `mapToDisplayName`, `isSensorConfigured`, que dependen de `reverseMapping, sensorsConfig.mapping`. Estables en steady state, pero cualquier refresh de config flushea toda la suscripción WS.
- **Fix sketch**: Guardar `mapToDisplayName` en una ref actualizada por efecto. Leer desde la ref dentro de los handlers → sockets mantienen handlers estables.

### P10 — `[Medium]` ECharts sin memo ni `notMerge`/`lazyUpdate`

- **Archivo**: `src/components/dashboard/ComboChart.tsx:17-107` (sin `useMemo`); búsqueda `notMerge\|lazyUpdate` → 0 hits.
- **Fix sketch**: Envolver `option` en `useMemo` en todos los charts. Pasar `notMerge={false} lazyUpdate` a `ReactECharts` para live charts. Para sub-segundo, preferir `dataset`/`setOption({series:[{data}]}, false, true)`.

### P11 — `[Medium]` `useTelemetryHistory` queryKey thrash

- **Archivos**: `src/components/dashboard/SensorTrendChart.tsx:44-50`, `src/hooks/useOverviewData.ts:141-164`
- **Síntoma**: `const now = Date.now()` en render → nuevo `startTs/endTs` → nueva `queryKey` → entry de cache huérfano (gcTime 5 min) + fetch nuevo. Combinado con `refetchInterval: 60000`, más tráfico del previsto.
- **Fix sketch**: Snap `now` a un boundary grueso (`Math.floor(Date.now()/60_000)*60_000`) o subir `now` a `useMemo([])` con refresh por efecto.

### P12 — `[Medium]` `tbKeys` sin memo

- **Archivo**: `src/components/dashboard/SensorTrendChart.tsx:41`
- **Fix sketch**: `const tbKeys = useMemo(() => sensorMeta.map(s => s.tbKey), [sensorMeta]);`

### P13 — `[Medium]` `t` fresco + translations inlined

- **Archivo**: `src/stores/languageStore.ts:761-768`
- **Síntoma**: `t` nueva closure por llamada → cualquier `useMemo` con `t` en deps se invalida cada render. Translation file de 769 líneas (~23 KB) inlined en bundle.
- **Fix sketch**: `useCallback([language])` para `t`. Dividir locale en JSON externo + `dynamic import()` por idioma (~10 KB savings en first paint).

### P14 — `[Medium]` 34 imports a `lucide-react`

- **Métricas**: `grep -rln "from 'lucide-react'" src | wc -l` → 34. ~80-150 KB de iconos en main chunk.
- **Fix sketch**: Añadir `lucide-react` a `manualChunks.icons` (de P1). Para los ~5 iconos del header/sidebar, considerar `lucide-react/icons/X` deep imports o SVG inline.

### P15 — `[Low]` Effect dep `query.data` re-itera modelos

- **Archivo**: `src/contexts/TelemetryContext.tsx:392-407`
- **Fix sketch**: Depender de `query.dataUpdatedAt` y short-circuit si todos los modelos ya están en `latestInferenceByModel`.

### P16 — `[High]` Navegación a `/plant` y `/telemetry` tarda ~minutos en pintar

- **Archivos**: `src/pages/MachinesPage.tsx`, `src/components/machines/ProcessGraph.tsx`, `src/pages/VariablesPage.tsx`
- **Síntoma observable**: Tras `login` → `/telemetry` (esperar a que el WS sirva ~30s de datos) → click `/plant` → TTI del orden de minutos antes de que la página sea interactiva. Reportado por usuario 2026-05-20.
- **Hipótesis**: Suma de P3 (ECharts sync) + P5 (cero `React.memo`) + P7 (`sensorHistory` rebuilt cada delta) + P11 (`queryKey` con `Date.now()` thrasheando cache) + B11 (store destructurado entero). Pero la magnitud "minutos" sugiere algo adicional no cubierto por esos: ¿layout dagre síncrono en `ProcessGraph` con muchos nodos? ¿patrón N+1 de fetch en `MachinesPage`?
- **Investigación previa al fix**:
  1. Profilear con React DevTools Profiler la transición `/telemetry` → `/plant`.
  2. Medir tiempo de `dagre.layout()` en `ProcessGraph` con la planta del cliente actual.
  3. Inspeccionar Network tab durante la transición — ¿cuántas requests dispara MachinesPage y cuáles tardan?
  4. Si tras aplicar P5+P7+P11+B11 la latencia baja a aceptable, P16 queda cubierto. Si no, abrir investigación dedicada.
- **Nota**: Añadido durante remediación (2026-05-20), fuera del audit original.

### Ganancias estimadas (referencia)

| Conjunto de fixes | Impacto estimado |
|---|---|
| P1+P2+P3+P4 (bundle split + lazy routes + lazy charts + lazy flow) | 2.1 MB → ~400 KB first-load JS |
| P5+P6+P7 (memo + selectors + history split) | -10× re-renders desperdiciados/seg mientras WS está vivo |
| P8+P9 (deps WS estables) | eliminar chatter `subscribe` duplicado |
| P11 (snap `now`) | mata cache thrash en Overview |

---

## 5. Accesibilidad (15 issues, WCAG 2.1 AA)

### A1 — `[High]` `<html lang="en">` con UI en español

- **Archivo**: `src/front/index.html:2`
- **WCAG**: 3.1.1 (Language of Page, A)
- **Síntoma**: NVDA/JAWS/VoiceOver pronuncia strings españoles con fonemas ingleses → ininteligible.
- **Fix sketch**: `<html lang="es">` en `index.html`. Actualizar dinámicamente desde `languageStore`:
  ```ts
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  ```

### A2 — `[High]` Contraste `--status-warning` falla AA

- **Archivo**: `src/styles/themes/scada.css:25,59`
- **WCAG**: 1.4.3
- **Métricas**: `#d29922` sobre `#151b23` = **~4.30:1** (falla 4.5:1). Usado en `Badge variant="warning"` (Badge.tsx:16), labels de alarma (SensorCard.tsx:358), filas advisory.
- **Fix sketch**: Subir el ámbar dark-mode a `#e3a72d` o `#f0b429` (≥5.5:1). Alternativa: usar el ámbar solo sobre `--status-warning-muted` con `--text-primary`.

### A3 — `[High]` Contraste `--text-muted` falla AA

- **Archivo**: `src/styles/themes/scada.css:70`
- **WCAG**: 1.4.3
- **Métricas**: `#484f58` sobre `#151b23` = **~3.6:1**. Usado en timestamps de EventLog, sub-labels de sensores, headings uppercase de sidebar.
- **Fix sketch**: Subir dark `--text-muted` a `#6e7681` (4.62:1). Mantener `--text-secondary` `#8b949e` (ya pasa).

### A4 — `[Critical]` NotificationsDropdown rows no alcanzables por teclado

- **Archivo**: `src/components/layout/NotificationsDropdown.tsx:80-87`
- **WCAG**: 2.1.1, 4.1.2
- **Síntoma**: Operadores con Tab no llegan a las notificaciones; solo la X interna es focusable. Marcar como leída requiere ratón.
- **Fix sketch**: Reemplazar `<div onClick>` con `<button type="button">`. Mover la X a un botón hermano y prevenir bubbling con `e.stopPropagation()`.

### A5 — `[Critical]` SensorCard / ProcessMachinePanel rows `<div onClick>`

- **Archivos**: `src/components/sensors/SensorCard.tsx:334-347`, `src/components/machines/ProcessMachinePanel.tsx:345`
- **WCAG**: 2.1.1, 4.1.2
- **Síntoma**: Toda la card es clickeable (`cursor-pointer`, `onCardClick`) pero es un `<div>` sin role/tabIndex/keyDown. Los `<button>` internos (favorite/info) funcionan, pero la acción de card-level no existe para teclado.
- **Fix sketch**: Si la card entera es la acción, envolver contenido en `<button type="button" onClick={onCardClick}>`. Los botones internos se quedan como hermanos con `stopPropagation`.

### A6 — `[High]` Botones icon-only sin `aria-label`

- **Archivos**: `src/pages/LoginPage.tsx:152` (toggle password), `src/pages/setup/steps/AdminStep.tsx:124` (toggle password), `src/components/layout/NotificationsDropdown.tsx:96` (dismiss X)
- **Fix sketch**:
  ```tsx
  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
  aria-label="Descartar notificación"
  ```

### A7 — `[Medium]` Iconos decorativos sin `aria-hidden`

- **Archivos**: `src/components/layout/NotificationsDropdown.tsx:35-39`, `Header.tsx:19`, `Sidebar.tsx:44`, `LoginPage.tsx:164`
- **Síntoma**: Lucide SVGs tienen rol implícito "img"; SR lee icono + label redundante.
- **Fix sketch**: `aria-hidden="true"` en iconos decorativos junto a texto. Mantener Bell en NotificationsDropdown como parte visible del botón etiquetado.

### A8 — `[High]` Errores de form sin `aria-invalid`/`aria-describedby`

- **Archivos**: `src/pages/LoginPage.tsx:122-167`, `src/pages/setup/steps/AdminStep.tsx:64-103`
- **WCAG**: 3.3.1, 4.1.2
- **Fix sketch**:
  - En `src/components/ui/Input.tsx`: pasar `aria-invalid={error || undefined}`.
  - En LoginPage/AdminStep: `<p id="login-error">` y `<Input aria-describedby="login-error">`.

### A9 — `[High]` Inputs sin `<label htmlFor>`

- **Archivos**: `src/pages/LoginPage.tsx:124,139`, `src/components/layout/Header.tsx:20`
- **Fix sketch**:
  ```tsx
  <label htmlFor="login-username">Usuario</label>
  <Input id="login-username" ... />
  ```
  Para Header search: label visualmente oculta (`sr-only`) o `aria-label={t('search')}`.

### A10 — `[Medium]` Focus rings con opacidad insuficiente

- **Archivos**: `src/components/ui/Button.tsx:15`, `src/components/ui/Input.tsx:18`, `src/pages/setup/steps/AdminStep.tsx:71,118`
- **WCAG**: 2.4.7
- **Síntoma**: `focus:ring-2 ring-[var(--accent-primary)]/25` → halo apenas perceptible. AdminStep inputs aplican `outline-none` sin `focus-visible:` decente.
- **Fix sketch**: Subir opacidad a `/60` o usar color sólido de contraste. Estandarizar en `focus-visible:` (no `focus:`) para que ratón no muestre ring pero teclado sí.

### A11 — `[Medium]` Switch/Checkbox con tokens Tailwind inexistentes

- **Archivos**: `src/components/ui/Switch.tsx:14,16`, `src/components/ui/Checkbox.tsx:14,16`
- **WCAG**: 1.4.11, 2.4.7
- **Síntoma**: Clases `bg-primary-600`, `ring-primary-500`, `border-primary-600` referencian colores Tailwind ausentes en el sistema de tokens SCADA. El indicador checked puede renderizar transparente/negro → invisible.
- **Fix sketch**:
  ```tsx
  data-[state=checked]:bg-[var(--accent-primary)]
  data-[state=checked]:border-[var(--accent-primary)]
  focus-visible:ring-[var(--accent-primary)]
  ```

### A12 — `[High]` Sin live regions para alarmas en tiempo real

- **Archivos**: `src/components/dashboard/EventLog.tsx:14-22`, `src/components/sensors/SensorCard.tsx:333`, badge `unreadCount` en NotificationsDropdown
- **WCAG**: 4.1.3
- **Síntoma**: Nueva alarma crítica en EventLog o SensorCard cambiando a `critical` son silentes para SR.
- **Fix sketch**: EventLog wrapper: `role="log" aria-live="polite" aria-relevant="additions"`. Espejar alertas critical/emergency a un `role="alert"` visualmente oculto en `AppLayout`.

### A13 — `[High]` ECharts canvases sin alternativa textual

- **Archivos**: `src/components/dashboard/SensorTrendChart.tsx:163-167`, `AnomalyScatterChart.tsx`, `ProcessStatusChart.tsx`, `ComboChart.tsx`, RadarChart en `OverviewPage.tsx:146`
- **WCAG**: 1.1.1, 1.3.1
- **Fix sketch**:
  ```tsx
  <figure aria-label="Tendencia 24h del sensor X">
    <figcaption className="sr-only">{summary}</figcaption>
    <ReactECharts ... />
  </figure>
  ```
  Añadir toggle "Ver como tabla" que renderice `historyData` como `<table>` para SR.

### A14 — `[Medium]` Jerarquía de headings rota

- **Archivos**: `src/pages/OverviewPage.tsx` (sin h1, primer `<h3>` en L136), `src/pages/MachinesPage.tsx:317`, `src/components/ui/Card.tsx:50` (CardTitle hardcoded a `<h3>`)
- **WCAG**: 1.3.1, 2.4.6, 2.4.10
- **Fix sketch**: Añadir `<h1>` por página (en `AppLayout` desde un context `pageTitle`, o per-page). Hacer `CardTitle` aceptar prop `as`/`level`.

### A15 — `[Medium]` Sin `prefers-reduced-motion`

- **Archivos**: `src/index.css` (sin `@media`), `src/components/sensors/SensorCard.tsx:357` (animate-pulse), `src/components/ui/ConnectionStatus.tsx`, `src/pages/LoginPage.tsx:86` (animate-spin)
- **WCAG**: 2.3.3, 2.2.2
- **Fix sketch**: En `index.css`:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, ::before, ::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
    .scanline-overlay { animation: none; }
  }
  ```

---

## 6. Orden de ejecución (vinculante)

### Fase 1 — Bugs funcionales

Razón: los bugs B1/B2/B3 desbocan tráfico al BFF; mientras existan, las métricas de performance están contaminadas. Resolverlos primero estabiliza el estado base.

1. **B1** (refetch infinito por `t`)
2. **B2** (WS subscribe storm)
3. **B3** (closures stale en `connect`)
4. **B4** (refresh token race)
5. **B5** (logout no limpia caches)
6. **B6** (rAF stale)
7. **B7** (`CustomPageRenderer` slug + auth gate)
8. **B8** (`useLocalStorage` stale)
9. **B9** (WS handlers post-navegación)
10. **B10** (setTimeout pendientes)
11. **B11** (suscripción store completo)
12. **B12** (delta sin coalesce)
13. **B13** (branding effect cada render)
14. **B14** (orden de gates ProtectedRoute)
15. **B15** (`/telemetry` sin HTTP backfill + BFF `/history` comma-keys bug) — **prioridad sobre cualquier issue pendiente**. Requiere parche BFF (Jorge) ANTES del cambio FE; sin el parche, el HTTP backfill devuelve `{}`.
16. **B16** (React duplicate-key warning en `/plant`) — bajo, puede ir al final de la Fase 1 o tras Performance.
17. **B17** (per-device inference backfill — follow-up cross-team) — Medium. No bloquea B15 MVP (plant-level cubre la demo). Defer hasta que ML / inference-service entregue publisher per-device.

### Fase 2 — Performance

Razón: varios fixes de perf dependen de los de bugs (P7 toca el mismo archivo que B2/B3). P1–P4 van en sub-PR conjunto (excepción documentada).

**Sub-PR P1–P4 (bundle split, todos en `vite.config.ts` + `App.tsx` + componentes de chart/flow):**
- P1 (manualChunks)
- P2 (lazy routes)
- P3 (lazy charts + echarts modular)
- P4 (lazy flow)

**Resto, en orden:**
5. P5 (React.memo)
6. P6 (store selectors)
7. P7 (eliminar historyTrigger)
8. P8 (memo channels en caller, ya tocado en B2 — verificar)
9. P9 (deps WS estables via ref)
10. P10 (memo + notMerge/lazyUpdate en charts)
11. P11 (snap `now`)
12. P12 (memo tbKeys)
13. P13 (memo `t` + dynamic locale)
14. P14 (manualChunks icons, alineado con P1)
15. P15 (`dataUpdatedAt` dep)

### Fase 3 — Accesibilidad

Razón: muchos a11y fixes tocan primitivas (`Input`, `Button`, `Switch`, `Checkbox`, `Card`) que pueden haber cambiado durante fases 1–2.

1. A4 (NotificationsDropdown keyboard)
2. A5 (SensorCard keyboard)
3. A1 (`<html lang>`)
4. A2 (contraste warning)
5. A3 (contraste muted)
6. A6 (aria-label icon buttons)
7. A8 (form errors aria)
8. A9 (label htmlFor)
9. A12 (live regions)
10. A13 (chart alternatives)
11. A7 (aria-hidden icons)
12. A10 (focus rings)
13. A11 (Switch/Checkbox tokens)
14. A14 (heading hierarchy)
15. A15 (prefers-reduced-motion)

---

## 7. Gates de cierre

Antes de mover la entrada a `## Done` en `.ai/decisions.md`:

- [ ] 47/47 issues con `[x]` en el catálogo de `decisions.md` (incluye B15+B16+B17 añadidos durante remediación / backend handoff el 2026-05-20).
- [ ] `cd src/front && npx vitest run` → 98+ tests verdes.
- [ ] `cd src/front && npm run lint` sin warnings nuevos.
- [ ] `cd src/front && npx tsc --noEmit` sin errores.
- [ ] `cd src/front && npm run build` exitoso.
- [ ] **Métricas anotadas en `## Done`**:
  - Bundle principal antes vs después (KB).
  - Chunks generados (lista con tamaños).
  - Re-renders/seg en Overview con WS activa (antes vs después, medible con React DevTools Profiler).
- [ ] Smoke test manual: login → overview → planta → telemetría → sniffer → settings → logout, sin errores en consola, sin tráfico WS desbocado.
- [ ] Contraste de tokens modificados verificado con un checker WCAG real (no a ojo).

---

## 8. Convenciones de commit (recordatorio)

```
fix(<scope>): <imperative summary> (#audit-<ID>)

<archivo:línea> — <causa raíz en 1 frase>.
<qué cambió y por qué>.

Verified: vitest <N>/<N>, lint clean, manual smoke on <ruta o "headless">.
```

Scopes: `auth`, `telemetry`, `ws`, `router`, `bundle`, `chart`, `store`, `a11y`, `theme`, `form`, `kbd`, `branding`.

IDs: `#audit-B1` … `#audit-B14`, `#audit-P1` … `#audit-P15`, `#audit-A1` … `#audit-A15`.

---

## 9. Referencias rápidas

- Catálogo canónico: `src/front/.ai/decisions.md` → *Frontend Hardening Sweep — Bugs + Performance + A11y (2026-05-19)*
- Diseño SCADA y tokens: `src/front/design.md`, `src/front/docs/REBUILD_DESIGN_SCADA.md`
- Anti-patrones y guardrails: `src/front/.ai/references/design-system.md`
- ADRs del proyecto: `docs/decisions/` (raíz del repo, no del frontend)
