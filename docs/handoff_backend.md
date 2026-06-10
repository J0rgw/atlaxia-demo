# Handoff — BFF cambios necesarios para B15 (`/telemetry` chart rework)

> **Para**: colega de backend / Jorge en su sombrero BFF.
> **Origen**: Plan completo en `/Users/j0rgw/.claude/plans/polished-nibbling-acorn.md` (frontend agent).
> **Severidad**: Critical, MVP-mandatory.
> **Fecha**: 2026-05-20.

## TL;DR

El frontend va a reescribir `/telemetry` para que use `/api/telemetry/history` con multi-resolución. **Tres cambios bloquean ese trabajo**:

1. **Fix obligatorio**: el endpoint `/api/telemetry/history` descarta filas cuando recibe `?keys=A,B,C` comma-joined. 7 líneas de código.
2. **Recomendado**: validar/documentar que TB tenant retention pueda extenderse a 30 días sin sorpresas (cambio admin, no de código).
3. **Opcional pero deseable**: WS subscribe debería responder con un ack frame para que el FE pueda distinguir "suscrito, esperando datos" de "subscribe perdido".

Sin (1), el FE no puede empezar el rework. (2) y (3) pueden ir en paralelo o después.

---

## Cambio 1 (BLOQUEANTE) — Fix comma-keys en `/api/telemetry/history`

### Síntoma

`GET /api/telemetry/history?keys=A,B,C&startTs=...&endTs=...` devuelve `{"data": {}, ...}` aunque TB tenga datos para A, B y C.

`GET /api/telemetry/history?keys=A&keys=B&keys=C&...` (params repetidos) funciona correctamente.

### Causa raíz

`src/back/src/api/telemetry.py:140-183`:

```python
@router.get("/history", response_model=TelemetryHistoryResponse)
async def get_telemetry_history(
    keys: List[str] = Query(description="Sensor keys to fetch"),
    ...
):
    ...
    # Lines 172-174 (approx):
    for key, values in telemetry.items():
        if key in keys:   # <-- bug
            result[key] = ...
```

FastAPI parsea `?keys=A,B,C` como `keys=["A,B,C"]` (un único elemento que es la string completa). Luego TB sí devuelve datos (porque `tb_service.get_telemetry_timeseries` hace `",".join(keys)` accidentalmente coincidiendo con lo que TB espera), pero el filtro `if key in keys` evalúa `"A" in ["A,B,C"]` → `False`, y descarta todas las filas.

El test suite (`src/back/tests/test_telemetry.py:67-100`) usa httpx con `params={"keys": [...]}` (que produce params repetidos), por eso el bug nunca se detectó.

### Fix propuesto (7 LOC, backward-compatible)

```diff
--- a/src/back/src/api/telemetry.py
+++ b/src/back/src/api/telemetry.py
@@ -140,7 +140,7 @@
 @router.get("/history", response_model=TelemetryHistoryResponse)
 async def get_telemetry_history(
-    keys: List[str] = Query(description="Sensor keys to fetch"),
+    keys: List[str] = Query(description="Sensor keys to fetch (repeat or comma-separated)"),
     startTs: int = Query(description="Start timestamp in milliseconds"),
     endTs: int = Query(description="End timestamp in milliseconds"),
     aggregation: str = Query(default="NONE", description="Aggregation: NONE, AVG, MIN, MAX"),
     interval: Optional[int] = Query(default=None, description="Aggregation interval in ms"),
     tb_service: ThingsBoardService = Depends(get_thingsboard_service),
 ):
+    # Frontend envía un único valor comma-joined (`?keys=A,B,C`); aceptar
+    # ambas convenciones para no romper el patrón actual del FE.
+    flat_keys: List[str] = []
+    for k in keys:
+        flat_keys.extend(p.strip() for p in k.split(",") if p.strip())
+    keys = flat_keys
+
     devices = await tb_service.get_devices()
     ...
```

### Test sugerido

Añadir un caso en `src/back/tests/test_telemetry.py` que use `params={"keys": "A,B,C"}` (string, no lista) y verifique que se devuelven datos para A, B y C.

### Verificación end-to-end (post-deploy)

```bash
# Con FE en main que envía comma-joined:
curl -s "http://localhost:8000/api/telemetry/history?keys=FIT101,LIT101&startTs=$(($(date +%s%3N)-86400000))&endTs=$(date +%s%3N)&aggregation=AVG&interval=60000" \
  | jq '.data | keys'
# Debe devolver: ["FIT101", "LIT101"]   (no [])
```

---

## Cambio 2 (RECOMENDADO) — TB tenant retention a 30 días

### Por qué

El FE va a permitir al operador ver los últimos 30 días de telemetría (rango `30d`). TB default es 7 días — los rangos `7d` y `30d` mostrarían datos truncados sin avisar.

### Acción

En la admin UI de TB (o vía API admin):
- `Admin > Settings > Database Setup > Data Retention Policy`
- Subir retention de telemetría a 30 días mínimo (90 si hay margen de almacenamiento).

### Verificación de coste

Estimación a 1 Hz × 82 sensores × 30 días = ~213M filas adicionales. Tabla `ts_kv` Postgres con particionado por mes lo absorbe sin estrés notable; medir tamaño antes/después en staging si es la primera vez que se ajusta.

### Documentar

Añadir nota en `deploy/clients/<X>/README` o equivalente: "Per-installation requirement — TB retention 30d para soportar la vista `/telemetry` 30d". Idealmente, el wizard de setup o el provisioning script lo configura automáticamente.

---

## Cambio 3 (OPCIONAL, deseable) — WS subscribe ack frame

### Por qué

Hoy el FE manda `{type: 'subscribe', channels: [...]}` y no recibe respuesta. Si el subscribe se pierde o el BFF lo rechaza silenciosamente, el FE cree que está suscrito pero no recibe frames — diagnóstico imposible desde DevTools.

### Propuesta

En `src/back/src/main.py:373-381` (`handle_ws_message` para `type === 'subscribe'`), enviar:

```python
await websocket.send_json({
    "type": "subscribed",
    "channels": subscribed_channels,
    "ts": int(time.time() * 1000),
})
```

Frontend (no requiere cambios para MVP — solo log de debug):

```ts
case 'subscribed':
  console.debug('[WS] subscribed to', msg.channels);
  break;
```

Sin esto, el FE no puede distinguir entre:
- WS conectado, suscrito, no hay datos (estado válido)
- WS conectado, subscribe ignorado, nunca habrá datos (bug latente)

---

## Open questions / asks

1. **Multi-aggregation en una sola llamada TB**: ¿hay forma supported de pedirle a TB `?agg=MIN,MAX,AVG` en una request, o sigues recomendando 3 llamadas paralelas si el día de mañana añadimos envelope?
   - (MVP no lo necesita — el FE optó por inference markers en lugar de envelope.)
2. **TB Postgres direct**: el sub-agente investigó la opción de saltar la API HTTP y pegar SQL a `ts_kv` directamente. Pros: 1 query devuelve min+max+avg+count. Cons: acopla el BFF al schema interno de TB. ¿Tu opinión?
3. **Retention configurable per-installation**: ¿cómo lo expresamos en el manifest del cliente? Hoy no veo un campo `telemetry_retention_days` — ¿lo añadimos al `installation_config`?
4. **Inference event endpoint**: el FE va a pintar markers de inferencia sobre los charts. Hoy los eventos llegan por WS (`handleInference`). ¿Hay un endpoint HTTP `/api/inferences/history?sensor_key=...&startTs=...&endTs=...` que pueda llamar desde el chart en modo HISTORIC para backfillear los markers, o el FE debe acumular solo los WS en memoria?
   - Si no existe, propongo añadir uno. Es bloqueante para que los markers funcionen en la vista 7d/30d.

---

## Coordinación

- **Bloqueo**: el FE no puede empezar la commit cadena del rework B15 hasta que (1) esté mergeado.
- **No bloqueante para el primer commit FE**: el FE puede arrancar con `fix(chart): switch xAxis from category to time` (puramente FE, no depende del backend).
- **Comunica vía**: el catálogo en `src/front/.ai/decisions.md` (issue B15) — actualizar el row cuando cierres cada uno de los tres cambios.