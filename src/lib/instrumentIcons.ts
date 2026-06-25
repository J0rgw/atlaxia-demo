/**
 * Instrument (device) icon resolver.
 *
 * Maps an ISA 5.1 instrument type — the kind of field device that *contains* a
 * sensor/variable — to a P&ID-style symbol so each sensor card shows the actual
 * SCADA equipment the reading comes from:
 *
 *   LIT  → tank level        FIT  → flow meter (caudalímetro)
 *   PIT  → pressure gauge     DPIT → differential-pressure cell
 *   AIT  → analyzer (pH/ORP/conductivity/Cl/O₂)
 *   MV   → motorized valve    P    → pump            UV → UV lamp
 *
 * The tag prefix (LIT101 → "LIT", DPIT301 → "DPIT", P101 → "P") equals the
 * InstrumentType enum value, so icons resolve from either a full IndustrialSensor
 * or a bare tag string.
 */
import type { SVGProps, ComponentType } from 'react';
import { InstrumentType } from '@/types/industrial';
import type { IndustrialSensor } from '@/types/industrial';
import {
  TankIcon,
  FlowMeterIcon,
  PressureGaugeIcon,
  DiffPressureIcon,
  AnalyzerIcon,
  ValveIcon,
  PumpIcon,
  UvLampIcon,
  InstrumentBalloonIcon,
} from '@/components/sensors/InstrumentSymbols';

export type InstrumentIcon = ComponentType<SVGProps<SVGSVGElement>>;

const INSTRUMENT_ICONS: Record<InstrumentType, InstrumentIcon> = {
  [InstrumentType.LEVEL_TRANSMITTER]: TankIcon,
  [InstrumentType.FLOW_TRANSMITTER]: FlowMeterIcon,
  [InstrumentType.PRESSURE_TRANSMITTER]: PressureGaugeIcon,
  [InstrumentType.DIFF_PRESSURE_TRANSMITTER]: DiffPressureIcon,
  [InstrumentType.ANALYTICAL_TRANSMITTER]: AnalyzerIcon,
  [InstrumentType.MOTORIZED_VALVE]: ValveIcon,
  [InstrumentType.PUMP]: PumpIcon,
  [InstrumentType.UV_SYSTEM]: UvLampIcon,
  [InstrumentType.LEVEL_SWITCH]: TankIcon,
  [InstrumentType.LEVEL_SWITCH_HIGH]: TankIcon,
  [InstrumentType.LEVEL_SWITCH_LOW]: TankIcon,
};

// Human-readable device label (Spanish, matching the rest of the UI) used as a
// tooltip/aria-label on the icon.
const INSTRUMENT_LABELS: Record<InstrumentType, string> = {
  [InstrumentType.LEVEL_TRANSMITTER]: 'Transmisor de nivel (tanque)',
  [InstrumentType.FLOW_TRANSMITTER]: 'Caudalímetro',
  [InstrumentType.PRESSURE_TRANSMITTER]: 'Transmisor de presión',
  [InstrumentType.DIFF_PRESSURE_TRANSMITTER]: 'Transmisor de presión diferencial',
  [InstrumentType.ANALYTICAL_TRANSMITTER]: 'Analizador (pH / ORP / conductividad / cloro / O₂)',
  [InstrumentType.MOTORIZED_VALVE]: 'Válvula motorizada',
  [InstrumentType.PUMP]: 'Bomba',
  [InstrumentType.UV_SYSTEM]: 'Sistema UV',
  [InstrumentType.LEVEL_SWITCH]: 'Interruptor de nivel',
  [InstrumentType.LEVEL_SWITCH_HIGH]: 'Interruptor de nivel alto',
  [InstrumentType.LEVEL_SWITCH_LOW]: 'Interruptor de nivel bajo',
};

/**
 * The instrument prefix is the leading letter run of an ISA tag
 * (LIT101 → "LIT", DPIT301 → "DPIT", P101 → "P"), which equals the
 * InstrumentType enum value.
 */
function instrumentTypeFromTag(tag: string): InstrumentType | undefined {
  const prefix = tag.match(/^[A-Za-z]+/)?.[0]?.toUpperCase();
  if (!prefix) return undefined;
  return (Object.values(InstrumentType) as string[]).includes(prefix)
    ? (prefix as InstrumentType)
    : undefined;
}

/** Icon for a fully configured industrial sensor. */
export function getInstrumentIcon(sensor: IndustrialSensor): InstrumentIcon {
  return INSTRUMENT_ICONS[sensor.instrumentType] ?? InstrumentBalloonIcon;
}

/** Icon for a bare sensor tag (fallback cards without IndustrialSensor metadata). */
export function getInstrumentIconByTag(tag: string): InstrumentIcon {
  const type = instrumentTypeFromTag(tag);
  return type ? INSTRUMENT_ICONS[type] : InstrumentBalloonIcon;
}

/** Spanish device label for tooltip/aria, derived from the sensor or tag. */
export function getInstrumentLabel(sensorOrTag: IndustrialSensor | string): string {
  const type =
    typeof sensorOrTag === 'string'
      ? instrumentTypeFromTag(sensorOrTag)
      : sensorOrTag.instrumentType;
  return type ? INSTRUMENT_LABELS[type] : 'Dispositivo';
}

/** Icon used for tags whose prefix matches no known ISA instrument type. */
export const FALLBACK_INSTRUMENT_ICON: InstrumentIcon = InstrumentBalloonIcon;

// Representative ISA tag per instrument type, used by the /dev/icons gallery.
const INSTRUMENT_EXAMPLES: Record<InstrumentType, string> = {
  [InstrumentType.LEVEL_TRANSMITTER]: 'LIT101',
  [InstrumentType.FLOW_TRANSMITTER]: 'FIT101',
  [InstrumentType.PRESSURE_TRANSMITTER]: 'PIT501',
  [InstrumentType.DIFF_PRESSURE_TRANSMITTER]: 'DPIT301',
  [InstrumentType.ANALYTICAL_TRANSMITTER]: 'AIT201',
  [InstrumentType.MOTORIZED_VALVE]: 'MV101',
  [InstrumentType.PUMP]: 'P101',
  [InstrumentType.UV_SYSTEM]: 'UV401',
  [InstrumentType.LEVEL_SWITCH]: 'LS101',
  [InstrumentType.LEVEL_SWITCH_HIGH]: 'LSH101',
  [InstrumentType.LEVEL_SWITCH_LOW]: 'LSL101',
};

export interface InstrumentIconEntry {
  /** ISA instrument type. */
  type: InstrumentType;
  /** Tag prefix that selects this icon (equals the enum value). */
  prefix: string;
  /** Example ISA tag of this type. */
  example: string;
  /** Spanish device label. */
  label: string;
  /** The P&ID symbol component. */
  Icon: InstrumentIcon;
}

/** Full, ordered list of every instrument type and its P&ID icon. */
export const INSTRUMENT_ICON_REGISTRY: InstrumentIconEntry[] = (
  Object.values(InstrumentType) as InstrumentType[]
).map((type) => ({
  type,
  prefix: type,
  example: INSTRUMENT_EXAMPLES[type],
  label: INSTRUMENT_LABELS[type],
  Icon: INSTRUMENT_ICONS[type],
}));
