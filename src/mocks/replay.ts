/**
 * SWAT replay engine.
 *
 * Loads the SWAT Jul-2019 v2 CSV once, loops the normal-regime slice at
 * real-time 1 Hz, and exposes:
 *   - subscribe() for WS handlers to push snapshots / deltas on each tick
 *   - getSnapshot() / getDelta() for REST handlers
 *   - getControlIndicators(), getActiveAlarms(), getRecentAnomalies(),
 *     getLatestInference() — view caches built per-tick
 *   - injectAttack() / reset() — attack-HUD plumbing (page 11)
 */

import Papa from 'papaparse';

const CSV_URL = '/swat/swat_jul2019_v2_clean.csv';
const SENSORS_URL = '/swat/demo-sensors.json';
const ATTACKS_URL = '/swat/swat_attacks.json';

// Loop the documented normal-regime slice (rows 0..NORMAL_END exclusive).
// The SWAT v2 metadata pins normal_period at the first ~9400 rows.
const NORMAL_END = 9399;
const TICK_MS = 1000;

const TREND_WINDOW = 30; // points used by control-indicator rolling means

type SensorRow = Record<string, number>;
type Listener = (snapshot: SensorRow, prev: SensorRow | null, tickIndex: number) => void;

interface DemoSensorMapping {
  thingsboard_key: string;
  display_name?: string;
  unit?: string;
  min?: number;
  max?: number;
  alarm_l?: number;
  alarm_h?: number;
  process_area?: string;
  criticality?: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface DemoSensorCategory {
  id: string;
  sensors: string[];
}

interface DemoSensorsFixture {
  mapping: Record<string, DemoSensorMapping>;
  categories: DemoSensorCategory[];
}

interface AttackOverride {
  id: string;
  label: string;
  rowStart: number;
  rowEnd: number;
  anomalySensors: string[];
  expectedAlarms?: string[];
  networkAlert?: string;
  injectedAt: number;
}

export interface AttackManifestEntry {
  id: string;
  label: string;
  process: string;
  row_start: number;
  row_end: number;
  anomaly_sensors: string[];
  expected_alarms?: string[];
  network_alert?: string;
  intent: string;
}

export interface DemoNetworkAlert {
  id: number;
  alertType: 'Emergencia' | 'Alerta' | 'Aviso';
  name: string;
  macOrigin: string;
  macDestination: string;
  ipOrigin: string;
  ipDestination: string;
  date: string;
  timestamp: number;
  acknowledged: boolean;
  acknowledgedAt: string | null;
}

interface ControlIndicators {
  calidad: number;
  caudal: number;
  ciberseguridad: number;
  factorHumano: number;
  temperatura: number;
}

interface ActiveAlarm {
  sensor_tag: string;
  level: string;
  priority: string;
  value: number;
  limit: number;
  timestamp: number;
  acknowledged: boolean;
  description: string;
  process_area: string;
  suggested_action: string;
}

interface AnomalyItem {
  sensorKey: string;
  sensorName: string;
  category: string;
  currentValue: number;
  behaviorSeparation: number;
  anomalyIndicator: number;
  isAnomaly: boolean;
  timestamp: number;
}

interface ProcessAreaStatus {
  id: string;
  name: string;
  status: 'normal' | 'warning' | 'critical';
  active_alarms: ActiveAlarm[];
  sensor_count: number;
  sensors_in_alarm: number;
}

const PROCESS_NAMES: Record<string, string> = {
  P1: 'P1 - Captacion',
  P2: 'P2 - Dosificacion',
  P3: 'P3 - Ultrafiltracion',
  P4: 'P4 - Decloracion UV',
  P5: 'P5 - Osmosis Inversa',
  P6: 'P6 - Retrolavado',
};

/** Canonical key transform: strip "_PV" / "_STATUS" / "_ALARM" / "_STATE",
 *  then normalize to uppercase so a row lookup never misses on case alone. */
function canonicalKey(raw: string): string {
  return raw.replace(/_PV$|_STATUS$|_ALARM$|_STATE$/i, '').toUpperCase();
}

function diffSnapshot(prev: SensorRow | null, next: SensorRow): SensorRow {
  if (!prev) return next;
  const changes: SensorRow = {};
  for (const k of Object.keys(next)) {
    if (next[k] !== prev[k]) changes[k] = next[k];
  }
  return changes;
}

class ReplayEngine {
  private rows: SensorRow[] = [];
  private columns: string[] = [];
  private mapping: Record<string, DemoSensorMapping> = {};
  private bootTs = Date.now();
  private cursor = 0;
  private tickIndex = 0;
  private listeners = new Set<Listener>();
  private latest: SensorRow | null = null;
  private prev: SensorRow | null = null;
  private trend: Record<string, number[]> = {};
  private alarmsTouched = 0;
  private attack: AttackOverride | null = null;
  private inferenceTickAccumulator = 0;
  private latestInferences: Record<string, InferenceLike> = {};
  private modelNames = ['cognn-demo', 'stgnn-demo'];
  private initialized: Promise<void> | null = null;
  // Handle for the 1 Hz tick so we can restart it after a background-tab
  // throttle. Browsers clamp setInterval to ~1/min (or freeze it) in hidden
  // tabs, which would otherwise stall the whole simulation. See
  // .demo-plan/0-bug-background-tab-freeze.md.
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private visibilityBound = false;
  private attackManifest: AttackManifestEntry[] = [];
  private networkAlerts: DemoNetworkAlert[] = [];
  private networkAlertListeners = new Set<(alert: DemoNetworkAlert) => void>();
  private nextAlertId = 1;
  // Per-sensor AI prediction baseline captured at the moment an attack is
  // injected. During the attack window emitInferences() ships these values
  // alongside the actual readings so the chart can draw the red "AI thinks
  // it should be here" dot vs. the spoofed trace. Cleared on attack end.
  private attackBaselines: Record<string, number> = {};
  // Process area letter (e.g. 'P1') → demo-sensors.json category id (e.g.
  // 'p1_captacion'). useSensorInferences looks up per_process by category id,
  // not by mapping.process_area, so we need both sides of the mapping.
  private processAreaToCategoryId: Record<string, string> = {};

  /** Lazy idempotent init — loads CSV + mapping and starts the tick. */
  init(): Promise<void> {
    if (this.initialized) return this.initialized;
    this.initialized = (async () => {
      const startedAt = performance.now();
      try {
        const [csvRes, fixtureRes, attacksRes] = await Promise.all([
          fetch(CSV_URL),
          fetch(SENSORS_URL),
          fetch(ATTACKS_URL).catch(() => null),
        ]);
        if (!csvRes.ok) throw new Error(`CSV fetch ${CSV_URL} returned ${csvRes.status}`);
        if (!fixtureRes.ok) throw new Error(`Sensor fixture fetch ${SENSORS_URL} returned ${fixtureRes.status}`);
        const [csvText, fixture, attacks] = await Promise.all([
          csvRes.text(),
          fixtureRes.json() as Promise<DemoSensorsFixture>,
          attacksRes && attacksRes.ok ? (attacksRes.json() as Promise<AttackManifestEntry[]>) : Promise.resolve([] as AttackManifestEntry[]),
        ]);
        this.mapping = fixture.mapping;
        this.attackManifest = attacks;
        // Build the process-letter → category-id lookup once. Category ids in
        // demo-sensors.json follow the "p1_captacion" convention; we key the
        // map by the uppercase letter prefix so mapping.process_area ('P1')
        // resolves cleanly to the runtime category id.
        this.processAreaToCategoryId = {};
        for (const cat of fixture.categories ?? []) {
          const prefix = cat.id.split('_')[0];
          if (prefix) this.processAreaToCategoryId[prefix.toUpperCase()] = cat.id;
        }
        const parsed = Papa.parse<Record<string, string>>(csvText, {
          header: true,
          dynamicTyping: false,
          skipEmptyLines: true,
        });
        const headers = parsed.meta.fields ?? [];
        this.columns = headers.filter((h) => h !== 'timestamp');
        const numericRows: SensorRow[] = [];
        for (const raw of parsed.data) {
          const row: SensorRow = {};
          for (const col of this.columns) {
            const v = raw[col];
            if (v === undefined || v === '') continue;
            const n = Number(v);
            if (Number.isFinite(n)) row[canonicalKey(col)] = n;
          }
          numericRows.push(row);
        }
        this.rows = numericRows;
        this.cursor = 0;
        this.tickIndex = 0;
        this.bootTs = Date.now();
        // Tick immediately so subscribers see a snapshot before the first interval.
        this.tick();
        this.startTicker();
        this.bindVisibility();
        const ms = (performance.now() - startedAt).toFixed(0);
        console.info(
          `[replay] init complete in ${ms}ms — ${this.rows.length} rows, ${Object.keys(this.mapping).length} mapped sensors, latest row has keys: ${Object.keys(this.latest ?? {}).slice(0, 4).join(', ')}…`,
        );
      } catch (err) {
        console.error('[replay] init FAILED:', err);
        throw err;
      }
    })();
    return this.initialized;
  }

  /** (Re)start the 1 Hz ticker, clearing any previous handle first. */
  private startTicker() {
    if (this.tickTimer !== null) clearInterval(this.tickTimer);
    this.tickTimer = setInterval(() => this.tick(), TICK_MS);
  }

  /**
   * Background tabs throttle/freeze setInterval, so when the visitor comes
   * back the simulation has been stalled and the WS bridge (which only emits
   * inside subscribe(), i.e. per tick) has gone silent. On returning to a
   * visible state we restart the ticker and tick once immediately so fresh
   * data flows again within a frame instead of waiting for the browser to
   * un-throttle the old interval. Idempotent — only bound once.
   */
  private bindVisibility() {
    if (this.visibilityBound || typeof document === 'undefined') return;
    this.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible' || this.rows.length === 0) return;
      this.startTicker();
      this.tick();
    });
  }

  reset() {
    this.cursor = 0;
    this.tickIndex = 0;
    this.attack = null;
    this.trend = {};
    this.alarmsTouched = 0;
    this.prev = null;
    this.latest = null;
    this.latestInferences = {};
    this.networkAlerts = [];
    this.attackBaselines = {};
  }

  seedNetworkAlerts(alerts: DemoNetworkAlert[]) {
    this.networkAlerts = [...alerts].sort((a, b) => b.timestamp - a.timestamp);
    this.nextAlertId = Math.max(this.nextAlertId, ...alerts.map((a) => a.id + 1));
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Public: deliver the current row to a fresh subscriber without waiting for next tick. */
  pushSnapshotTo(listener: Listener) {
    if (this.latest) listener(this.latest, null, this.tickIndex);
  }

  injectAttack(att: Omit<AttackOverride, 'injectedAt'>) {
    this.attack = { ...att, injectedAt: Date.now() };
    this.cursor = att.rowStart;
    // Capture the AI's "what it should be" baseline for each anomaly sensor
    // before the cursor jumps into the spoofed window. Prefer the trailing
    // mean of the trend buffer (what the model saw just before the spoof);
    // fall back to the survey midrange if cold-started with no trend yet.
    this.attackBaselines = {};
    for (const tag of att.anomalySensors) {
      const series = this.trend[tag];
      if (series && series.length > 0) {
        this.attackBaselines[tag] = series.reduce((a, b) => a + b, 0) / series.length;
        continue;
      }
      const m = this.mapping[tag];
      if (m && m.min != null && m.max != null) {
        this.attackBaselines[tag] = (m.min + m.max) / 2;
      }
    }
    if (att.networkAlert) {
      const alert = this.makeNetworkAlert(att);
      this.networkAlerts.unshift(alert);
      if (this.networkAlerts.length > 200) this.networkAlerts.length = 200;
      for (const l of this.networkAlertListeners) {
        try { l(alert); } catch { /* swallow */ }
      }
    }
  }

  injectAttackById(id: string) {
    const entry = this.attackManifest.find((a) => a.id === id);
    if (!entry) return false;
    this.injectAttack({
      id: entry.id,
      label: entry.label,
      rowStart: entry.row_start,
      rowEnd: entry.row_end,
      anomalySensors: entry.anomaly_sensors,
      expectedAlarms: entry.expected_alarms,
      networkAlert: entry.network_alert,
    });
    return true;
  }

  listAttacks(): AttackManifestEntry[] {
    return this.attackManifest;
  }

  subscribeNetworkAlerts(listener: (alert: DemoNetworkAlert) => void): () => void {
    this.networkAlertListeners.add(listener);
    return () => this.networkAlertListeners.delete(listener);
  }

  getNetworkAlerts(params?: { limit?: number; offset?: number; alertType?: string }) {
    const all = this.networkAlerts;
    let filtered = params?.alertType ? all.filter((a) => a.alertType === params.alertType) : all;
    const offset = params?.offset ?? 0;
    const limit = params?.limit ?? 50;
    const slice = filtered.slice(offset, offset + limit);
    const byType: Record<string, number> = { Emergencia: 0, Alerta: 0, Aviso: 0 };
    for (const a of all) byType[a.alertType] = (byType[a.alertType] ?? 0) + 1;
    return { alerts: slice, total: filtered.length, offset, limit, byType };
  }

  private makeNetworkAlert(att: Omit<AttackOverride, 'injectedAt'>): DemoNetworkAlert {
    const ts = this.now();
    const date = new Date(ts).toISOString();
    return {
      id: this.nextAlertId++,
      alertType: 'Emergencia',
      name: att.networkAlert ?? `attack:${att.id}`,
      macOrigin: '00:1B:44:11:3A:B7',
      macDestination: '00:25:90:6A:7E:11',
      ipOrigin: '10.10.20.42',
      ipDestination: '10.10.40.10',
      date,
      timestamp: ts,
      acknowledged: false,
      acknowledgedAt: null,
    };
  }

  // ----- view caches (REST handlers) -----

  getSnapshot(): { sensors: SensorRow; timestamp: number } {
    return { sensors: this.latest ?? {}, timestamp: this.bootTs + this.tickIndex * TICK_MS };
  }

  /**
   * Telemetry history slice. Maps wall-clock to row indices using
   *   row = (now - ts) ms / TICK_MS, walked backwards from the current cursor.
   * Returns one point per `step` ms in [startTs, endTs]. Aggregation other
   * than NONE/AVG falls through to AVG.
   */
  getTelemetryHistory(keys: string[], startTs: number, endTs: number, step: number) {
    const data: Record<string, Array<{ ts: number; value: string }>> = {};
    if (this.rows.length === 0 || endTs <= startTs) {
      for (const k of keys) data[k] = [];
      return { data, startTs, endTs };
    }
    const span = NORMAL_END;
    const now = this.now();
    const stride = Math.max(1000, Math.floor(step));
    for (const rawKey of keys) {
      const key = canonicalKey(rawKey);
      const series: Array<{ ts: number; value: string }> = [];
      for (let t = Math.floor(startTs / stride) * stride; t <= endTs; t += stride) {
        // Clamp the delta to one loop span. After a background-tab stall `now`
        // can jump far ahead of `t`, making `ago` wrap the cyclic buffer many
        // times and land on incoherent rows. Capping at `span` keeps the
        // window a single contiguous pass over the loop.
        const ago = Math.min(span, Math.max(0, Math.floor((now - t) / TICK_MS)));
        const idx = ((this.cursor - ago) % span + span) % span;
        const row = this.rows[idx];
        const v = row?.[key];
        if (v === undefined) continue;
        series.push({ ts: t, value: String(v) });
      }
      data[key] = series;
      // Echo back the raw key the client asked for, in case it included a
      // suffix or device prefix.
      if (rawKey !== key) data[rawKey] = series;
    }
    return { data, startTs, endTs };
  }

  /**
   * Sensor-list view used by /api/machines/sensors and /api/machines/snapshot's
   * `devices` field. One entry per mapped sensor, value pulled from the
   * latest tick, unit pulled from demo-sensors.json.
   */
  getSensorList() {
    const ts = this.now();
    const list = Object.keys(this.mapping).map((tag) => {
      const m = this.mapping[tag];
      const value = this.latest?.[tag] ?? null;
      return {
        key: tag,
        name: m.display_name ?? tag,
        device_id: `device-${tag.toLowerCase()}`,
        device_name: m.process_area ?? 'PX',
        value,
        timestamp: ts,
        unit: m.unit,
      };
    });
    const devices = Array.from(new Set(list.map((s) => s.device_name))).map((dn) => ({
      id: `device-${dn.toLowerCase()}`,
      name: dn,
      online: true,
    }));
    return {
      sensors: list,
      devices,
      last_update: ts,
      total: list.length,
    };
  }

  getControlIndicators(): ControlIndicators {
    // Calidad / Caudal / Temperatura / Factor humano: derive a rolling stability
    // score from the variance of recent values across analytical / flow /
    // pressure sensors. We map "stability + in-range" to a 0..1 health score
    // and dent the axis tied to any active alarm.
    const alarmCount = this.computeAlarms().length;
    const denominator = Math.max(1, Object.keys(this.mapping).length);
    const baseline = Math.max(0.55, 1 - alarmCount / denominator);
    const variance = (keys: string[]) => {
      const vals: number[] = [];
      for (const k of keys) {
        const series = this.trend[k];
        if (series && series.length > 5) {
          const mean = series.reduce((a, b) => a + b, 0) / series.length;
          const v = series.reduce((acc, x) => acc + (x - mean) * (x - mean), 0) / series.length;
          // Normalize by midrange so a 1% wobble reads as healthy.
          const m = this.mapping[k];
          const span = m && m.max != null && m.min != null ? Math.abs(m.max - m.min) : Math.abs(mean) || 1;
          vals.push(Math.min(1, Math.sqrt(v) / Math.max(1e-6, span)));
        }
      }
      if (vals.length === 0) return 0.05;
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    };

    const analytics = Object.keys(this.mapping).filter((k) => k.startsWith('AIT'));
    const flows = Object.keys(this.mapping).filter((k) => k.startsWith('FIT'));
    const pressures = Object.keys(this.mapping).filter((k) => k.startsWith('PIT') || k.startsWith('DPIT'));
    const levels = Object.keys(this.mapping).filter((k) => k.startsWith('LIT'));

    const calidad = clamp01(baseline - variance(analytics));
    const caudal = clamp01(baseline - variance(flows));
    const temperatura = clamp01(baseline - variance(pressures));
    const factorHumano = clamp01(baseline - variance(levels) * 0.6);
    // Ciberseguridad is overridden client-side from the IDS feed (Overview
    // page does that). Returning 1 here is a safe default.
    return {
      calidad,
      caudal,
      ciberseguridad: 1,
      factorHumano,
      temperatura,
    };
  }

  getActiveAlarms(): { alarms: ActiveAlarm[]; timestamp: number; total_alarms: number; by_priority: Record<string, number>; by_process: Record<string, number> } {
    const alarms = this.computeAlarms();
    const by_priority: Record<string, number> = {};
    const by_process: Record<string, number> = {};
    for (const a of alarms) {
      by_priority[a.priority] = (by_priority[a.priority] ?? 0) + 1;
      by_process[a.process_area] = (by_process[a.process_area] ?? 0) + 1;
    }
    return {
      alarms,
      timestamp: this.now(),
      total_alarms: alarms.length,
      by_priority,
      by_process,
    };
  }

  getAnomalies(threshold: number) {
    const alarms = this.computeAlarms();
    const anomalies: AnomalyItem[] = [];
    for (const tag of Object.keys(this.mapping)) {
      const m = this.mapping[tag];
      const value = this.latest?.[tag] ?? 0;
      const inAlarm = alarms.some((a) => a.sensor_tag === tag);
      const score = inAlarm ? 0.85 : 0.05 + 0.1 * Math.random();
      anomalies.push({
        sensorKey: tag,
        sensorName: m.display_name ?? tag,
        category: m.process_area ?? 'PX',
        currentValue: value,
        behaviorSeparation: score,
        anomalyIndicator: score,
        isAnomaly: score >= threshold,
        timestamp: this.now(),
      });
    }
    return {
      anomalies,
      totalSensors: anomalies.length,
      anomalyCount: anomalies.filter((a) => a.isAnomaly).length,
      threshold,
      timestamp: this.now(),
    };
  }

  getProcessStatus(): { process_areas: ProcessAreaStatus[]; overall_status: string; total_alarms: number; timestamp: number } {
    const alarms = this.computeAlarms();
    const processes: Record<string, ProcessAreaStatus> = {};
    for (const tag of Object.keys(this.mapping)) {
      const m = this.mapping[tag];
      const pid = m.process_area ?? 'PX';
      if (!processes[pid]) {
        processes[pid] = {
          id: pid,
          name: PROCESS_NAMES[pid] ?? pid,
          status: 'normal',
          active_alarms: [],
          sensor_count: 0,
          sensors_in_alarm: 0,
        };
      }
      processes[pid].sensor_count += 1;
    }
    for (const a of alarms) {
      const p = processes[a.process_area];
      if (!p) continue;
      p.active_alarms.push(a);
      p.sensors_in_alarm += 1;
      p.status = a.priority === 'CRITICAL' ? 'critical' : (p.status === 'critical' ? 'critical' : 'warning');
    }
    const list = Object.values(processes).sort((a, b) => a.id.localeCompare(b.id));
    return {
      process_areas: list,
      overall_status: alarms.some((a) => a.priority === 'CRITICAL') ? 'critical' : alarms.length > 0 ? 'warning' : 'normal',
      total_alarms: alarms.length,
      timestamp: this.now(),
    };
  }

  getLatestInferenceMap(): Record<string, InferenceLike> {
    return this.latestInferences;
  }

  getModels(): { schema_version: '2.0'; models: Record<string, ModelInfoLike> } {
    const models: Record<string, ModelInfoLike> = {};
    for (const name of this.modelNames) {
      models[name] = {
        name,
        version: '0.1.0-demo',
        trained_at: new Date(this.bootTs - 7 * 86400_000).toISOString(),
        threshold_source: 'mvp_seed',
        consumption_mode: 'aggregated',
        bucket_window_s: 1,
        seq_in_len: 60,
        anomaly_threshold_level: 3,
        aggregation_method: 'mean',
      };
    }
    return { schema_version: '2.0', models };
  }

  getInferenceHealth() {
    const last = Object.values(this.latestInferences).sort((a, b) => Number(new Date(b.inference_ts)) - Number(new Date(a.inference_ts)))[0];
    const lastTs = last ? last.inference_ts : new Date(this.bootTs).toISOString();
    const age = Math.max(0, Math.floor((Date.now() - new Date(lastTs).getTime()) / 1000));
    return {
      state: 'ok' as const,
      reason: null,
      last_webhook_ts: lastTs,
      last_webhook_age_seconds: age,
      last_ready: { ok: true },
      models_loaded_count: this.modelNames.length,
      etl: {
        ok: true,
        status: 'fresh',
        data_freshness_ms: 1000,
        stale: false,
        last_poll_ts: new Date(Date.now() - 1000).toISOString(),
      },
    };
  }

  // ----- internals -----

  private now(): number {
    return this.bootTs + this.tickIndex * TICK_MS;
  }

  private tick() {
    if (this.rows.length === 0) return;
    const att = this.attack;
    let i: number;
    if (att) {
      const span = Math.max(1, att.rowEnd - att.rowStart);
      const advanced = (this.cursor - att.rowStart) % span;
      i = att.rowStart + advanced;
      this.cursor += 1;
      if (this.cursor - att.rowStart >= span) {
        this.attack = null;
        this.attackBaselines = {};
      }
    } else {
      i = this.cursor % NORMAL_END;
      this.cursor += 1;
    }
    this.tickIndex += 1;
    const row = this.rows[i] ?? {};
    this.prev = this.latest;
    this.latest = row;
    // Bound trend buffers
    for (const k of Object.keys(row)) {
      if (!this.trend[k]) this.trend[k] = [];
      this.trend[k].push(row[k]);
      if (this.trend[k].length > TREND_WINDOW) this.trend[k].shift();
    }
    // Cheap inference rollup: emit every 5 s normally, every 1 s in an attack.
    this.inferenceTickAccumulator += 1;
    const inferenceInterval = this.attack ? 1 : 5;
    if (this.inferenceTickAccumulator >= inferenceInterval) {
      this.inferenceTickAccumulator = 0;
      this.emitInferences();
    }
    // Notify subscribers (WS bridge will publish snapshot/delta).
    for (const l of this.listeners) {
      try {
        l(row, this.prev, this.tickIndex);
      } catch {
        // Subscribers must not break the tick loop.
      }
    }
  }

  private computeAlarms(): ActiveAlarm[] {
    if (!this.latest) return [];
    const alarms: ActiveAlarm[] = [];
    const ts = this.now();
    for (const tag of Object.keys(this.mapping)) {
      const m = this.mapping[tag];
      const value = this.latest[tag];
      if (value === undefined) continue;
      const hi = m.alarm_h;
      const lo = m.alarm_l;
      if (hi != null && value > hi) {
        alarms.push({
          sensor_tag: tag,
          level: 'HIGH',
          priority: m.criticality === 'HIGH' ? 'CRITICAL' : 'HIGH',
          value,
          limit: hi,
          timestamp: ts,
          acknowledged: false,
          description: `${m.display_name ?? tag} above high alarm`,
          process_area: m.process_area ?? 'PX',
          suggested_action: 'Verify upstream control / inspect setpoint.',
        });
      } else if (lo != null && value < lo) {
        alarms.push({
          sensor_tag: tag,
          level: 'LOW',
          priority: m.criticality === 'HIGH' ? 'HIGH' : 'MEDIUM',
          value,
          limit: lo,
          timestamp: ts,
          acknowledged: false,
          description: `${m.display_name ?? tag} below low alarm`,
          process_area: m.process_area ?? 'PX',
          suggested_action: 'Check feed availability or sensor health.',
        });
      }
    }
    this.alarmsTouched = alarms.length;
    return alarms;
  }

  private emitInferences() {
    const ts = new Date(this.now()).toISOString();
    const alarms = this.computeAlarms();
    const isAttack = this.attack !== null;
    const levelGlobal = isAttack ? 4 : alarms.length > 0 ? 2 : 0;
    const levelName: InferenceLike['level_global_name'] = isAttack
      ? 'HIGH'
      : alarms.length > 0
        ? 'LOW'
        : 'NORMAL';

    // Build per_process + per-sensor predictions for the current attack window.
    // useSensorInferences resolves a sensor to its category-id (e.g.
    // 'p1_captacion') and needs per_process keyed by that id to surface a
    // marker at all. We also ship the AI's "predicted" baseline alongside the
    // actual reading so the chart can draw the red dot where the model thinks
    // the value should be.
    const perProcess: Record<string, { score: number; level: number; level_name: InferenceLike['level_global_name'] }> = {};
    const predictions: Record<string, { predicted: number; actual: number }> = {};
    if (this.attack) {
      const impacted = new Set<string>();
      for (const tag of this.attack.anomalySensors) {
        const m = this.mapping[tag];
        const pid = m?.process_area && this.processAreaToCategoryId[m.process_area];
        if (pid) impacted.add(pid);
        const predicted = this.attackBaselines[tag];
        const actual = this.latest?.[tag];
        if (predicted !== undefined && actual !== undefined && Number.isFinite(actual)) {
          predictions[tag] = { predicted, actual };
        }
      }
      for (const pid of impacted) {
        perProcess[pid] = { score: 0.85, level: 4, level_name: 'HIGH' };
      }
    }

    for (const name of this.modelNames) {
      const msg: InferenceLike = {
        type: 'inference',
        channel: 'inferences',
        schema_version: '2.1',
        model_name: name,
        inference_ts: ts,
        identity: {
          name,
          version: '0.1.0-demo',
          trained_at: new Date(this.bootTs - 7 * 86400_000).toISOString(),
          threshold_source: 'mvp_seed',
        },
        valorRiesgo: isAttack ? 0.9 : alarms.length > 0 ? 0.4 : 0.05,
        level_global: levelGlobal,
        level_global_name: levelName,
        plant: { score: isAttack ? 0.9 : 0.05, level: levelGlobal, level_name: levelName },
        per_process: perProcess,
        predictions,
        devices: {},
        alarms_derived: { plant: isAttack || alarms.length > 0, per_process: {}, devices: {} },
        alarms_debounced: {
          plant: isAttack,
          per_process: {},
          devices: {},
          kofn: { k: 2, n: 3 },
        },
        threshold_source: 'mvp_seed',
        show_verdict: true,
        observability: {
          level_summary: {},
          level_distribution: {},
          sensor_health: null,
        },
      };
      this.latestInferences[name] = msg;
    }
    void this.alarmsTouched;
  }
}

interface InferenceLike {
  type: 'inference';
  channel: 'inferences';
  schema_version: '2.1';
  model_name: string;
  inference_ts: string;
  identity: {
    name: string;
    version: string;
    trained_at: string;
    threshold_source: string;
  };
  valorRiesgo: number;
  level_global: number;
  level_global_name: 'NORMAL' | 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';
  plant: { score: number; level: number; level_name: InferenceLike['level_global_name'] } | null;
  per_process: Record<string, { score: number; level: number; level_name: InferenceLike['level_global_name'] }>;
  /** Per-sensor predicted-vs-actual surfacing the red AI dot on telemetry charts.
   *  Only populated for the anomaly sensors of the current attack window. */
  predictions: Record<string, { predicted: number; actual: number }>;
  devices: Record<string, unknown>;
  alarms_derived: { plant: boolean; per_process: Record<string, boolean>; devices: Record<string, boolean> };
  alarms_debounced: { plant: boolean; per_process: Record<string, boolean>; devices: Record<string, boolean>; kofn: { k: number; n: number } };
  threshold_source: string;
  show_verdict: boolean;
  observability: { level_summary: Record<string, number>; level_distribution: Record<string, number>; sensor_health: null };
}

interface ModelInfoLike {
  name: string;
  version: string;
  trained_at: string;
  threshold_source: string;
  consumption_mode: string;
  bucket_window_s: number;
  seq_in_len: number;
  anomaly_threshold_level: number;
  aggregation_method: string;
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

export const replay = new ReplayEngine();
export type { SensorRow };
export { diffSnapshot };
