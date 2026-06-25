/**
 * P&ID / ISA 5.1 style instrument symbols.
 *
 * Lucide has no tank, valve or flow-meter glyph, so these hand-drawn SVGs let a
 * sensor card show the *actual* SCADA equipment the reading comes from
 * (tank for LIT, flow meter for FIT, valve for MV, …). All are stroke-based on
 * a 24×24 grid using `currentColor` so they inherit text color and theming,
 * and they accept the same props as a Lucide icon (className, aria-label, and a
 * `<title>` child for tooltips).
 */
import type { SVGProps, ReactNode } from 'react';

type SymbolProps = SVGProps<SVGSVGElement>;

function makeSymbol(displayName: string, paths: ReactNode) {
  const Symbol = ({ children, ...props }: SymbolProps) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
      {paths}
    </svg>
  );
  Symbol.displayName = displayName;
  return Symbol;
}

/** LIT — storage tank with a liquid level line. */
export const TankIcon = makeSymbol(
  'TankIcon',
  <>
    <rect x="5" y="3.5" width="14" height="17" rx="2" />
    <path d="M5 13c1.8 1.3 3.5-1.3 7 0s5.2 1.3 7 0" />
  </>,
);

/** FIT — inline flow meter (caudalímetro): a meter body on a pipe with flow direction. */
export const FlowMeterIcon = makeSymbol(
  'FlowMeterIcon',
  <>
    <circle cx="12" cy="12" r="5" />
    <path d="M2 12h5" />
    <path d="M17 12h5" />
    <path d="m10 10 2 2-2 2" />
  </>,
);

/** PIT — pressure gauge (dial + needle + process stem). */
export const PressureGaugeIcon = makeSymbol(
  'PressureGaugeIcon',
  <>
    <circle cx="12" cy="10" r="6.5" />
    <path d="M12 10 15 6.5" />
    <circle cx="12" cy="10" r="0.6" fill="currentColor" stroke="none" />
    <path d="M12 16.5V20" />
    <path d="M9 20h6" />
  </>,
);

/** DPIT — differential pressure cell (gauge with two process taps). */
export const DiffPressureIcon = makeSymbol(
  'DiffPressureIcon',
  <>
    <circle cx="12" cy="10" r="6.5" />
    <path d="M12 10 15 6.5" />
    <circle cx="12" cy="10" r="0.6" fill="currentColor" stroke="none" />
    <path d="M9.5 16.5 8.5 20" />
    <path d="M14.5 16.5 15.5 20" />
  </>,
);

/** AIT — analyzer (Erlenmeyer flask: pH / ORP / conductivity / chlorine / O₂). */
export const AnalyzerIcon = makeSymbol(
  'AnalyzerIcon',
  <>
    <path d="M9 3h6" />
    <path d="M10 3v5.5L5.4 17a1.8 1.8 0 0 0 1.6 2.8h10a1.8 1.8 0 0 0 1.6-2.8L14 8.5V3" />
    <path d="M7.5 15h9" />
  </>,
);

/** MV — motorized valve (bow-tie body with motor actuator on top). */
export const ValveIcon = makeSymbol(
  'ValveIcon',
  <>
    <path d="M4 8 4 16 12 12Z" />
    <path d="M20 8 20 16 12 12Z" />
    <path d="M12 12V6.5" />
    <rect x="9" y="3" width="6" height="3.5" rx="0.5" />
  </>,
);

/** P — centrifugal pump (casing + impeller + discharge nozzle). */
export const PumpIcon = makeSymbol(
  'PumpIcon',
  <>
    <circle cx="11.5" cy="12.5" r="7" />
    <path d="m9.5 9 5 3.5-5 3.5z" />
    <path d="M18.5 12.5H22" />
  </>,
);

/** UV — UV lamp (radiating light). */
export const UvLampIcon = makeSymbol(
  'UvLampIcon',
  <>
    <circle cx="12" cy="12" r="3.6" />
    <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9 6.7 6.7M17.3 17.3 19.1 19.1M19.1 4.9 17.3 6.7M6.7 17.3 4.9 19.1" />
  </>,
);

/** Fallback — generic ISA instrument balloon. */
export const InstrumentBalloonIcon = makeSymbol(
  'InstrumentBalloonIcon',
  <circle cx="12" cy="12" r="8" />,
);
