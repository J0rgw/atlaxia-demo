/**
 * Atlaxia badge registry — SINGLE SOURCE OF TRUTH.
 *
 * INVARIANT (do not break, now or in future extensions):
 * Saturated colour encodes ISA-18.2 criticality and NOTHING else. A new colour
 * is never invented for a non-criticality concept.
 *   - criticality / sensor / alert / priority -> the criticality tone family.
 *     These are the SAME ISA scale under domain-specific names (a sensor "CRIT",
 *     an alert "Emergencia" and a P1 rule are all "critical"); they reuse the
 *     criticality tones, they do not add colours.
 *   - reference -> brand cobalt.
 *   - everything else (state/source/importance/device/entry/flag, free tags and
 *     any future axis) -> neutral slate. Told apart by ICON, never by colour.
 * Geometry and typography are global; a badge only picks { value, label, icon }.
 *
 * Labels are bilingual ({ es, en }); the component resolves the active one from
 * the global language store, so badges follow the app's i18n. Proper nouns and
 * abbreviations (SCADA, Snort, ISA-18.2, OK/WARN/CRIT, P1..P4, mac/ip) are equal
 * in both languages.
 *
 * The <Badge> component reads everything from here — never duplicate values or
 * colours in the component. Colours live as CSS tokens in src/index.css.
 */

/** Closed set of tones. Each maps to --badge-<tone>-bg / --badge-<tone>-fg.
 *  The `neutral*` family is one hue (slate) graded by luminosity — it adds NO
 *  colour, so the invariant holds. Grade conveys weight; the icon conveys meaning. */
export type Tone =
  | 'cobalt'
  | 'neutral'
  | 'neutral-faint'
  | 'neutral-strong'
  | 'neutral-muted'
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'normal';

/** Icon identifiers — mapped to lucide-react components in Badge.tsx. */
export type IconName =
  | 'doc'
  | 'gauge'
  | 'shield'
  | 'wall'
  | 'help'
  | 'clock'
  | 'circle-check'
  | 'circle-x'
  | 'search'
  | 'shield-check'
  | 'archive'
  | 'bell-off'
  | 'alert-triangle'
  | 'alert-circle'
  | 'info'
  | 'arrow-up'
  | 'arrow-right'
  | 'arrow-down'
  | 'cpu'
  | 'monitor'
  | 'laptop'
  | 'network'
  | 'router'
  | 'globe';

/** Supported languages — kept in sync with the language store. */
export type Lang = 'es' | 'en';

/** A label in both supported languages. */
export interface LocalizedLabel {
  readonly es: string;
  readonly en: string;
}

/** A single registry entry. `icon` is optional (compact/technical axes omit it). */
export interface BadgeEntry {
  readonly value: string;
  readonly label: LocalizedLabel;
  readonly icon?: IconName;
}

/* ---- Coloured axes (criticality tone family) -------------------------- */

/** criticality — CLOSED set, mandatory (ISA-18.2). The canonical coloured axis. */
export const CRITICALITY = [
  { value: 'critical', label: { es: 'Crítica', en: 'Critical' }, icon: 'alert-triangle' },
  { value: 'high', label: { es: 'Alta', en: 'High' }, icon: 'alert-circle' },
  { value: 'medium', label: { es: 'Media', en: 'Medium' }, icon: 'gauge' },
  { value: 'low', label: { es: 'Baja', en: 'Low' }, icon: 'info' },
  { value: 'normal', label: { es: 'Normal', en: 'Normal' }, icon: 'circle-check' },
] as const satisfies readonly BadgeEntry[];

/** sensor — live reading status (ISA-101). Same scale as criticality. */
export const SENSOR = [
  { value: 'crit', label: { es: 'CRIT', en: 'CRIT' }, icon: 'alert-triangle' },
  { value: 'warn', label: { es: 'WARN', en: 'WARN' }, icon: 'alert-circle' },
  { value: 'ok', label: { es: 'OK', en: 'OK' }, icon: 'circle-check' },
] as const satisfies readonly BadgeEntry[];

/** alert — network alert severity. Same scale as criticality. */
export const ALERT = [
  { value: 'emergencia', label: { es: 'Emergencia', en: 'Emergency' }, icon: 'alert-triangle' },
  { value: 'alerta', label: { es: 'Alerta', en: 'Alert' }, icon: 'alert-circle' },
  { value: 'aviso', label: { es: 'Aviso', en: 'Notice' }, icon: 'info' },
] as const satisfies readonly BadgeEntry[];

/** priority — Snort IDS rule priority (compact, no icon). Same scale. */
export const PRIORITY = [
  { value: 'p1', label: { es: 'P1', en: 'P1' } },
  { value: 'p2', label: { es: 'P2', en: 'P2' } },
  { value: 'p3', label: { es: 'P3', en: 'P3' } },
  { value: 'p4', label: { es: 'P4', en: 'P4' } },
] as const satisfies readonly BadgeEntry[];

/** anomaly — degree of MODEL anomaly (XAI graph readout). Same ISA scale as
 *  criticality (reuses its tones; invents no colour). Escala de severidad
 *  concisa (Severo > Alto > Moderado > Leve): labels cortos para que el badge no
 *  salga estirado — el ancho del eje lo fija el label más largo en ambos idiomas. */
export const ANOMALY = [
  { value: 'muy', label: { es: 'Severo', en: 'Severe' }, icon: 'alert-triangle' },
  { value: 'anomalo', label: { es: 'Alto', en: 'High' }, icon: 'alert-circle' },
  { value: 'algo', label: { es: 'Moderado', en: 'Moderate' }, icon: 'gauge' },
  { value: 'leve', label: { es: 'Leve', en: 'Mild' }, icon: 'info' },
] as const satisfies readonly BadgeEntry[];

/* ---- Neutral axes (slate; told apart by icon) ------------------------- */

/** state — triage lifecycle (system verdict + human review). Graded neutral. */
export const STATE = [
  { value: 'posible', label: { es: 'Posible', en: 'Possible' }, icon: 'help' },
  { value: 'candidata', label: { es: 'Candidata', en: 'Candidate' }, icon: 'help' },
  { value: 'pendiente', label: { es: 'Pendiente', en: 'Pending' }, icon: 'clock' },
  { value: 'confirmada', label: { es: 'Confirmada', en: 'Confirmed' }, icon: 'circle-check' },
  { value: 'confirmada-real', label: { es: 'Confirmada real', en: 'Confirmed real' }, icon: 'shield-check' },
  { value: 'falso-positivo', label: { es: 'Falso positivo', en: 'False positive' }, icon: 'circle-x' },
] as const satisfies readonly BadgeEntry[];

/** importance — asset/network priority (NOT event severity). Graded neutral. */
export const IMPORTANCE = [
  { value: 'alta', label: { es: 'Alta', en: 'High' }, icon: 'arrow-up' },
  { value: 'media', label: { es: 'Media', en: 'Medium' }, icon: 'arrow-right' },
  { value: 'baja', label: { es: 'Baja', en: 'Low' }, icon: 'arrow-down' },
] as const satisfies readonly BadgeEntry[];

/** device — network device kind. Neutral; distinguished by icon. */
export const DEVICE = [
  { value: 'plc', label: { es: 'PLC', en: 'PLC' }, icon: 'cpu' },
  { value: 'scada', label: { es: 'SCADA', en: 'SCADA' }, icon: 'monitor' },
  { value: 'pc', label: { es: 'PC', en: 'PC' }, icon: 'laptop' },
  { value: 'switch', label: { es: 'Switch', en: 'Switch' }, icon: 'network' },
  { value: 'router', label: { es: 'Router', en: 'Router' }, icon: 'router' },
] as const satisfies readonly BadgeEntry[];

/** entry — whitelist match type. Neutral. */
export const ENTRY = [
  { value: 'mac', label: { es: 'mac', en: 'mac' }, icon: 'network' },
  { value: 'ip', label: { es: 'ip', en: 'ip' }, icon: 'globe' },
] as const satisfies readonly BadgeEntry[];

/** flag — whitelist auto-flags. Neutral (a critical asset is not an alarm). */
export const FLAG = [
  { value: 'autorizado', label: { es: 'Autorizado', en: 'Authorized' }, icon: 'circle-check' },
  { value: 'critico', label: { es: 'Crítico', en: 'Critical' }, icon: 'shield' },
] as const satisfies readonly BadgeEntry[];

/** source — origin system. Neutral. */
export const SOURCE = [
  { value: 'scada', label: { es: 'SCADA', en: 'SCADA' }, icon: 'gauge' },
  { value: 'snort', label: { es: 'Snort', en: 'Snort' }, icon: 'search' },
  { value: 'fortigate', label: { es: 'FortiGate', en: 'FortiGate' }, icon: 'shield' },
] as const satisfies readonly BadgeEntry[];

/** reference — standards. Cobalt tone. */
export const REFERENCE = [
  { value: 'isa-101', label: { es: 'ISA-101', en: 'ISA-101' }, icon: 'doc' },
  { value: 'isa-18-2', label: { es: 'ISA-18.2', en: 'ISA-18.2' }, icon: 'bell-off' },
  { value: 'iec-63303', label: { es: 'IEC 63303', en: 'IEC 63303' }, icon: 'shield-check' },
] as const satisfies readonly BadgeEntry[];

/* ---- Registry & types -------------------------------------------------- */

export const REGISTRY = {
  criticality: CRITICALITY,
  sensor: SENSOR,
  alert: ALERT,
  priority: PRIORITY,
  anomaly: ANOMALY,
  state: STATE,
  importance: IMPORTANCE,
  device: DEVICE,
  entry: ENTRY,
  flag: FLAG,
  source: SOURCE,
  reference: REFERENCE,
} as const;

/** All known axes. */
export type Axis = keyof typeof REGISTRY;

/** The set of valid `value` literals for a given axis (derived, type-safe). */
export type ValueOf<A extends Axis> = (typeof REGISTRY)[A][number]['value'];

/* ---- Tone resolution --------------------------------------------------- */

const SENSOR_TONE: Record<ValueOf<'sensor'>, Tone> = {
  crit: 'critical',
  warn: 'high',
  ok: 'normal',
};

const ALERT_TONE: Record<ValueOf<'alert'>, Tone> = {
  emergencia: 'critical',
  alerta: 'high',
  aviso: 'normal',
};

const PRIORITY_TONE: Record<ValueOf<'priority'>, Tone> = {
  p1: 'critical',
  p2: 'high',
  p3: 'low',
  p4: 'normal',
};

const ANOMALY_TONE: Record<ValueOf<'anomaly'>, Tone> = {
  muy: 'critical',
  anomalo: 'high',
  algo: 'medium',
  leve: 'low',
};

/** Triage grade: candidata/posible (faint) < pendiente (base) < confirmada
 *  (strong); falso-positivo reads dimmed. */
const STATE_TONE: Record<ValueOf<'state'>, Tone> = {
  posible: 'neutral-faint',
  candidata: 'neutral-faint',
  pendiente: 'neutral',
  confirmada: 'neutral-strong',
  'confirmada-real': 'neutral-strong',
  'falso-positivo': 'neutral-muted',
};

const IMPORTANCE_TONE: Record<ValueOf<'importance'>, Tone> = {
  alta: 'neutral-strong',
  media: 'neutral',
  baja: 'neutral-muted',
};

const FLAG_TONE: Record<ValueOf<'flag'>, Tone> = {
  autorizado: 'neutral',
  critico: 'neutral-strong',
};

/**
 * Resolve the tone for a (axis, value) pair, honouring the invariant.
 * Coloured axes (criticality/sensor/alert/priority) map to the criticality
 * tone family; reference -> cobalt; the rest -> neutral (flat or graded).
 */
export function toneFor<A extends Axis>(axis: A, value: ValueOf<A>): Tone {
  switch (axis) {
    case 'criticality':
      return value as Tone;
    case 'sensor':
      return SENSOR_TONE[value as ValueOf<'sensor'>];
    case 'alert':
      return ALERT_TONE[value as ValueOf<'alert'>];
    case 'priority':
      return PRIORITY_TONE[value as ValueOf<'priority'>];
    case 'anomaly':
      return ANOMALY_TONE[value as ValueOf<'anomaly'>];
    case 'state':
      return STATE_TONE[value as ValueOf<'state'>];
    case 'importance':
      return IMPORTANCE_TONE[value as ValueOf<'importance'>];
    case 'flag':
      return FLAG_TONE[value as ValueOf<'flag'>];
    case 'reference':
      return 'cobalt';
    default:
      return 'neutral'; // source, device, entry
  }
}

/** Look up the registry entry for a (axis, value) pair. */
export function entryFor<A extends Axis>(
  axis: A,
  value: ValueOf<A>
): BadgeEntry | undefined {
  return (REGISTRY[axis] as readonly BadgeEntry[]).find((e) => e.value === value);
}
