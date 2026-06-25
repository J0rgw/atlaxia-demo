/**
 * Sample/example instruments — one per ISA device type.
 *
 * The live demo feed (demo-sensors.json) only emits analog transmitters
 * (LIT/FIT/AIT/PIT/DPIT), so valves, pumps and the UV system never get a card.
 * These representative samples let the team verify that every instrument type —
 * and its P&ID icon — renders correctly on the Machines page. They are clearly
 * marked as "ejemplo" and are not real plant data.
 *
 * The tag prefix (LIT/FIT/MV/P/…) is what drives the icon, so each entry uses an
 * ISA-style tag in the 9xx range to avoid colliding with real plant tags.
 */
export interface SampleInstrument {
  /** ISA-style tag; the letter prefix selects the device icon. */
  tag: string;
  value: number;
  unit: string;
  /** Short Spanish description of what the device measures/does. */
  description: string;
}

export const SAMPLE_INSTRUMENTS: SampleInstrument[] = [
  { tag: 'LIT900', value: 675, unit: 'mm', description: 'Nivel de tanque' },
  { tag: 'FIT900', value: 3.2, unit: 'm³/h', description: 'Caudal' },
  { tag: 'PIT900', value: 320, unit: 'kPa', description: 'Presión' },
  { tag: 'DPIT900', value: 28, unit: 'kPa', description: 'Presión diferencial' },
  { tag: 'AIT900', value: 7.4, unit: 'pH', description: 'Análisis (pH / ORP / conductividad)' },
  { tag: 'MV900', value: 100, unit: '% apertura', description: 'Válvula motorizada' },
  { tag: 'P900', value: 100, unit: '% velocidad', description: 'Bomba' },
  { tag: 'UV900', value: 95, unit: '% intensidad', description: 'Sistema UV' },
];
