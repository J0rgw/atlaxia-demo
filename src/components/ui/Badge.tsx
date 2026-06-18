import { type CSSProperties } from 'react';
import {
  FileText,
  Gauge,
  Shield,
  BrickWall,
  CircleHelp,
  Clock,
  CircleCheck,
  CircleX,
  Search,
  ShieldCheck,
  Archive,
  BellOff,
  TriangleAlert,
  CircleAlert,
  Info,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  Cpu,
  Monitor,
  Laptop,
  Network,
  Router,
  Globe,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguageStore } from '@/stores/languageStore';
import {
  REGISTRY,
  toneFor,
  type Axis,
  type BadgeEntry,
  type IconName,
  type Tone,
  type ValueOf,
} from '@/lib/badges';

/** IconName -> lucide-react component. */
const ICONS: Record<IconName, LucideIcon> = {
  doc: FileText,
  gauge: Gauge,
  shield: Shield,
  wall: BrickWall,
  help: CircleHelp,
  clock: Clock,
  'circle-check': CircleCheck,
  'circle-x': CircleX,
  search: Search,
  'shield-check': ShieldCheck,
  archive: Archive,
  'bell-off': BellOff,
  'alert-triangle': TriangleAlert,
  'alert-circle': CircleAlert,
  info: Info,
  'arrow-up': ArrowUp,
  'arrow-right': ArrowRight,
  'arrow-down': ArrowDown,
  cpu: Cpu,
  monitor: Monitor,
  laptop: Laptop,
  network: Network,
  router: Router,
  globe: Globe,
};

/** Registry mode: axis + value, constrained by TS to that axis's literal set. */
interface RegistryProps<A extends Axis> {
  axis: A;
  value: ValueOf<A>;
  tag?: never;
  className?: string;
}

/** Free-tag mode: an open identifier (e.g. a sensor id) — neutral, no icon. */
interface TagProps {
  tag: string;
  axis?: never;
  value?: never;
  className?: string;
}

export type BadgeProps<A extends Axis> = RegistryProps<A> | TagProps;

const BASE =
  'inline-flex items-center justify-center align-middle border border-transparent select-none ' +
  'h-[25px] gap-[6px] px-[10px] text-[11px] font-medium leading-none tracking-[0.03em] whitespace-nowrap';

/**
 * Per-axis minimum width so every badge of the same axis renders identically
 * sized (the width of the axis's longest label), keeping table columns aligned.
 * An approximate floor (the font is proportional, not monospaced): padding (20px)
 * + icon slot (19px when the axis uses icons) + maxLabelLen ch + 1ch buffer. Since
 * `ch` ≈ the '0' advance and content is `whitespace-nowrap`, a longer label just
 * grows the chip past the floor rather than clipping.
 */
const AXIS_MIN_WIDTH: Record<Axis, string> = Object.fromEntries(
  (Object.keys(REGISTRY) as Axis[]).map((axis) => {
    const entries = REGISTRY[axis] as readonly BadgeEntry[];
    // Max over BOTH languages so width is stable when the language toggles.
    const maxLen = Math.max(
      ...entries.flatMap((e) => [e.label.es.length, e.label.en.length])
    );
    const iconSlot = entries.some((e) => e.icon) ? 19 : 0;
    return [axis, `calc(${20 + iconSlot}px + ${maxLen + 1}ch)`];
  })
) as Record<Axis, string>;

/** Free tags are open identifiers; align them to a common floor (~7 chars). */
const TAG_MIN_WIDTH = 'calc(20px + 8ch)';

function Chip({
  label,
  tone,
  icon,
  minWidth,
  className,
}: {
  label: string;
  tone: Tone;
  icon?: IconName;
  minWidth?: string;
  className?: string;
}) {
  const Icon = icon ? ICONS[icon] : null;
  const style: CSSProperties = {
    background: `var(--badge-${tone}-bg)`,
    color: `var(--badge-${tone}-fg)`,
    borderRadius: 'var(--r-chip)',
    fontFamily: 'var(--font-badge)',
    minWidth,
  };
  return (
    <span style={style} className={cn(BASE, className)}>
      {Icon && <Icon aria-hidden="true" size={13} strokeWidth={2} className="shrink-0" />}
      <span>{label}</span>
    </span>
  );
}

/**
 * Unified Atlaxia badge — "solid fill + icon" direction.
 *
 * Two modes:
 *   <Badge axis="criticality" value="critical" />   registry, type-safe
 *   <Badge tag="AIT202" />                           open identifier, neutral
 *
 * In registry mode label, icon and tone (hence colour) are resolved from the
 * registry — colour is never passed via props. Accessible name = the label; the
 * icon is decorative (aria-hidden) and its shape carries the meaning so it
 * survives colour loss (colour-blind safe).
 */
export function Badge<A extends Axis>(props: BadgeProps<A>) {
  const lang = useLanguageStore((s) => s.language);

  if (props.tag !== undefined) {
    return (
      <Chip
        label={props.tag}
        tone="neutral"
        minWidth={TAG_MIN_WIDTH}
        className={props.className}
      />
    );
  }

  const { axis, value, className } = props;
  const entry = (REGISTRY[axis] as readonly BadgeEntry[]).find(
    (e) => e.value === value
  );
  if (!entry) return null;

  return (
    <Chip
      label={entry.label[lang]}
      tone={toneFor(axis, value)}
      icon={entry.icon}
      minWidth={AXIS_MIN_WIDTH[axis]}
      className={className}
    />
  );
}
