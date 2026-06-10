# Decisiones Pendientes: IA, Producto y Diseño

Documento generado el 2026-04-27 a partir de una investigación profunda del repositorio `proTrueData`. El objetivo es delimitar todo lo que **no** es trabajo de implementación de frontend (React) ni de backend BFF (FastAPI), sino que requiere acción del equipo de IA/ML, del equipo de producto/diseño, del equipo comercial/técnico de campo, o decisiones de negocio.

El frontend y la BFF están estructuralmente listos. Lo que bloquea hoy la salida a producción no es código, es decisión.

---

## 1. Resumen Ejecutivo

Estado actual de cableado del frontend con datos reales:

- Aproximadamente el 65 por ciento de las pantallas consume APIs reales de la BFF.
- Quedan dos páginas con mock duro (`AnomaliesPage` y `ControlPage`), que es trabajo de cableado trivial.
- El asistente conversacional FluvIA está completamente simulado y depende de decisiones de producto e integración con un LLM.
- El detector de anomalías GNN (CoGNN/STGNN) existe en el servicio de inferencia pero no está conectado a la BFF: el endpoint `/api/anomalies` actualmente devuelve un cálculo simulado, no la salida real del modelo.
- Toda la sección de dashboards personalizados (FASE 3), branding por instalación, escalado de alertas, permisos por rol y retención de datos está bloqueada por decisiones de producto.

---

## 2. Equipo de IA y ML

### 2.1 Detección de anomalías (CoGNN / STGNN)

Bloqueador crítico actual. El servicio `src/inference/` produce salidas (`attack`, `valorRiesgo`, `devices` por sensor) pero la BFF no las consume; en su lugar usa un cálculo de placeholder (`calculate_behavior_separation`, `calculate_anomaly_indicator`).

Lo que se tiene que hacer y dejar documentado:

1. Contrato de salida estable del servicio de inferencia con los siguientes campos por evaluación:
   - `anomalyIndicator` por sensor en rango 0 a 1.
   - `behaviorSeparation` por sensor (eje X del scatter de anomalías).
   - `isAnomaly` booleano según el umbral activo.
   - `timestamp` de evaluación.
   - Versión del modelo, fecha de entrenamiento y dataset usado.
2. Frecuencia de inferencia. El frontend asume 30 segundos en el polling actual, hay que confirmar si es real o si la inferencia es por lotes.
3. Atribución por nodo. Si la pantalla de anomalías va a permitir entender por qué un sensor dispara una alerta, el modelo debe entregar importancia de features o reconstrucción del error a nivel sensor.
4. Confianza o incertidumbre. El frontend no muestra esto hoy, pero conviene definir si el modelo expondrá un score de confianza para distinguir falsos positivos.
5. Política de umbrales. Hoy el umbral está hardcodeado en 0.7. Decidir si:
   - Se mantiene fijo global.
   - Se hace configurable por instalación.
   - Se hace configurable por sensor.
   - Se adapta de forma dinámica con histórico.
6. Versionado de modelo y rollback. Ya existen artefactos versionados con symlink en `models/SWAT/COGNN`. Definir quién y cómo decide promover una versión.
7. Cold start. Qué hace el sistema cuando una instalación nueva no tiene historial suficiente para entrenar.

### 2.2 Forecasting y bandas de confianza

El frontend tiene preparado `AreaBandChart` y los tipos `ForecastData` y `MachineAIMetadata` para consumir bandas de predicción superior e inferior por sensor.

Decisiones pendientes del equipo de IA:

1. Horizonte de predicción. Hoy se asume 60 minutos en metadata, hay que confirmar si será fijo o configurable por sensor.
2. Estacionalidad. Para sensores con `seasonality: 'daily'` definir si la ventana se reinicia a medianoche o se calcula sobre 24 horas móviles.
3. Modelo a usar. Aún no se ha decidido si se utiliza el mismo backbone que la detección de anomalías o un modelo separado (ARIMA, Prophet, GRU).
4. Degradación elegante con poco histórico. Si un sensor tiene menos de 7 días de datos, el endpoint debe devolver `forecast: null` o degradar a media móvil.

### 2.3 FluvIA, asistente conversacional

Actualmente es 100 por ciento mock. El componente `src/components/chat/FluviaChat.tsx` devuelve un mensaje fijo con un retraso simulado. No hay backend, no hay contexto, no hay LLM.

Decisiones de producto e IA bloqueantes:

1. Selección de proveedor LLM. Opciones a evaluar: Anthropic Claude, OpenAI GPT, modelo open source autoalojado en cliente (importante en clientes con red aislada SCADA). Esta decisión depende de coste, soberanía del dato y restricciones del cliente final.
2. Alcance funcional. Definir si FluvIA es:
   - Asistente de troubleshooting que explica anomalías y referencia runbooks.
   - Consulta de estado en lenguaje natural sobre telemetría y alarmas.
   - Asistente operativo con capacidad de ejecutar acciones (cerrar válvulas, acusar alarmas).
   - Una mezcla de las anteriores con permisos por rol.
3. Base de conocimiento. Decidir si se construye un RAG, y con qué fuentes:
   - Documentación de sensores y procesos por planta.
   - Histórico de incidentes y resoluciones.
   - Manuales de operación y diagramas de proceso.
   - Procedimientos ISA-101 y normativa.
4. Inyección de contexto. Si el asistente debe saber qué pantalla está viendo el usuario, qué alarmas activas hay y qué sensores están en estado crítico, hay que diseñar el envío de ese contexto en cada turno.
5. Permisos. Diferenciar capacidades por rol (superadmin, admin, tecnico). Por ejemplo: solo admin puede pedir resúmenes de facturación o modificar reglas, solo tecnico ejecuta diagnósticos.
6. Trazabilidad. Si FluvIA puede ejecutar acciones, hay que decidir el sistema de auditoría y firma de acciones.

### 2.4 Indicadores del Centro de Control

El radar de control muestra 5 indicadores en rango 0 a 1: calidad, caudal, ciberseguridad, factor humano y temperatura. Hoy el cálculo es:

- `calidad`, `caudal` y `temperatura` se derivan de sensores reales con agregación simple.
- `ciberseguridad` está hardcodeado a 0.30.
- `factorHumano` está hardcodeado a 0.19.

Pendientes del equipo de IA y producto:

1. Definir si los cinco indicadores deben venir de modelos ML o si la agregación determinista es suficiente para la versión inicial.
2. Conectar `ciberseguridad` con la salida real del módulo Snort y del sniffer de red.
3. Definir el origen de `factorHumano`. Posibles fuentes: turnos, errores de operación registrados, tiempo de respuesta a alarmas, formación pendiente. Hoy no existe ese flujo de datos.
4. Atribución por indicador. Cuando un indicador empeora, qué sensores o eventos lo justifican (necesario para que el operador pueda actuar).
5. Umbrales de severidad. Cuándo un indicador pasa a estado crítico. Hoy hay un valor medio fijo de 0.4.

---

## 4. Integraciones Externas

### 4.1 ThingsBoard

El contrato real de integración no está documentado en detalle.

2. Política de fallback cuando ThingsBoard no responde. Hoy no está definido si la UI muestra el último valor conocido, un placeholder, o un mensaje de error.
3. Operaciones de escritura. Si la aplicación va a controlar actuadores a través de ThingsBoard o queda como visualización pasiva.
4. Multi-tenancy. Una instancia de ThingsBoard por cliente o instancia compartida con control de acceso por dispositivo.
5. Soporte de protocolos industriales adicionales (Modbus, OPC UA, BACnet) directamente o siempre vía gateway de ThingsBoard. Tiene impacto directo en el coste de despliegue por planta.

### 4.2 Inventario industrial por planta

Documentado parcialmente en `INDUSTRIAL_SENSOR_ARCHITECTURE.md`. Existen 781 sensores conocidos en el caso SWAT y se eligen entre 30 y 50 por instalación.

Trabajo para los equipos comercial y técnico:

2. Si se mantiene una librería compartida de procesos típicos por industria (potabilización, depuración, desalación, industria alimentaria) que el wizard pueda ofrecer como plantilla.
3. Categorización de sensores por área de proceso (P1 a P6) cuando el cliente no sigue la nomenclatura SWaT. Decidir si se le impone la nomenclatura o se permite renombrar áreas.

---

## 5. Datos Mock que Bloquean Validación con Cliente

Esta sección lista los puntos que parecen funcionales en pantalla pero que están alimentados por datos simulados, junto con quién debe entregar el dato real.

| Pantalla o componente | Estado actual | Origen real esperado | Responsable |
|------------------------|---------------|----------------------|-------------|
| `AnomaliesPage` | Lee `mockAnomalies` directamente | Endpoint `/api/anomalies` con salida real del modelo CoGNN | IA y BFF |
| `ControlPage` y `RadarChart` | Usa `mockControlIndicators` | `/api/control/indicators` con cálculo real de los 5 indicadores | IA y producto |
| FluvIA chat | Respuesta fija con retraso simulado | Servicio LLM con RAG y contexto | IA y producto |
| `ciberseguridad` en Centro de Control | Constante 0.30 | Pipeline Snort y sniffer | Seguridad y IA |
| `factorHumano` en Centro de Control | Constante 0.19 | Modelo o agregación de datos operativos | Producto y operaciones |
| Bandas de predicción en `AreaBandChart` | Esquema preparado, datos no llegan | Servicio de forecasting | IA |
| Atribución por sensor en anomalías | No existe | Importancia de features del modelo | IA |

El frontend ya está preparado para consumir todo esto en cuanto exista contrato y endpoint.

---

## 6. Camino Crítico Recomendado

Priorización sugerida para que el producto pueda demostrarse a un cliente piloto.

| Prioridad | Tema | Decisión o entregable |
|-----------|------|------------------------|
| P0 | Detección de anomalías GNN | Conectar la salida real del servicio de inferencia a la BFF y definir el contrato de salida final |
| P0 | Matriz de permisos por rol | Tabla cerrada de capacidades por superadmin, admin y tecnico |
| P0 | Enrutado y escalado de alertas | Política de quién recibe qué, cadena de escalado y canales |
| P1 | FluvIA | Decisión de proveedor LLM y alcance funcional inicial |
| P1 | Indicadores del Centro de Control | Origen real de ciberseguridad y factor humano |
| P2 | Modelo de licencias | Tipos de licencia, caducidad y degradación |
| P2 | Retención y exportación | Política de retención, formatos y RGPD |
| P2 | ThingsBoard | Protocolo, fallback y soporte de escritura |
| P2 | Multilenguaje | Orden de prioridad para nuevos idiomas |

Una vez resueltos los P0 y P1, el frontend y la BFF pueden cerrar la mayoría del trabajo de cableado en pocas iteraciones, ya que la arquitectura, el sistema de diseño y los hooks ya están en su sitio.