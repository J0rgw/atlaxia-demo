import { cn } from '@/lib/utils';
import type { SensorMapping, SensorCategory } from '@/types/installation';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/Tooltip';

// Categorical sensor-type badges. Status tokens cover the green/red/grey
// cases; remaining hues use Tailwind classes paired with `dark:` variants so
// they stay legible across both theme modes (the wizard toggles `.dark` on
// `<html>` exactly like the authed app does).
const TYPE_COLORS: Record<string, string> = {
  FIT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  LIT: 'bg-[var(--status-normal-muted)] text-[var(--status-normal)]',
  AIT: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  PIT: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  TIT: 'bg-[var(--status-critical-muted)] text-[var(--status-critical)]',
  MV: 'bg-[var(--bg-inset)] text-[var(--text-secondary)]',
  P: 'bg-[var(--bg-inset)] text-[var(--text-secondary)]',
  BLW: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  DOS: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

function getTypeColor(type: string): string {
  return TYPE_COLORS[type] || 'bg-[var(--bg-inset)] text-[var(--text-secondary)]';
}

function RoleIcon({ role }: { role?: string }) {
  if (!role) return null;
  const cls = 'w-3.5 h-3.5 text-[var(--text-muted)]';
  switch (role) {
    case 'sensor':
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 3" />
            </svg>
          </TooltipTrigger>
          <TooltipContent side="top"><p>Sensor</p></TooltipContent>
        </Tooltip>
      );
    case 'actuator':
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </TooltipTrigger>
          <TooltipContent side="top"><p>Actuador</p></TooltipContent>
        </Tooltip>
      );
    case 'setpoint':
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="3" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-7.07l-2.83 2.83M9.76 14.24l-2.83 2.83m11.14 0l-2.83-2.83M9.76 9.76L6.93 6.93" />
            </svg>
          </TooltipTrigger>
          <TooltipContent side="top"><p>Setpoint</p></TooltipContent>
        </Tooltip>
      );
    default:
      return null;
  }
}

interface SensorRowProps {
  sensorId: string;
  mapping: SensorMapping;
  isEditing: boolean;
  isDefaultSelected: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onUpdate: (updates: Partial<SensorMapping>) => void;
  onToggleDefault: () => void;
  categories?: SensorCategory[];
  onMoveToCategory?: (categoryId: string) => void;
}

export function SensorRow({
  mapping,
  isEditing,
  isDefaultSelected,
  onEdit,
  onRemove,
  onUpdate,
  onToggleDefault,
  categories,
  onMoveToCategory,
}: SensorRowProps) {
  return (
    <div className={cn('rounded transition-colors min-w-0', isEditing ? 'bg-[var(--bg-inset)]' : '')}>
      <div className="flex items-center gap-1.5 px-2 py-1 min-w-0 group">
        {/* Star toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onToggleDefault}
              className={cn(
                'shrink-0 transition-colors',
                isDefaultSelected ? 'text-[var(--status-warning)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              )}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={isDefaultSelected ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{isDefaultSelected ? 'Quitar de favoritos' : 'Mostrar por defecto en Variables'}</p>
          </TooltipContent>
        </Tooltip>

        {/* Type badge */}
        {mapping.sensor_type && (
          <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold leading-none ${getTypeColor(mapping.sensor_type)}`}>
            {mapping.sensor_type}
          </span>
        )}

        {/* Role icon */}
        <RoleIcon role={mapping.instrument_role} />

        {/* Display name */}
        <span className="flex-1 min-w-0 text-sm truncate" title={`${mapping.display_name} (${mapping.thingsboard_key})`}>
          {mapping.display_name}
        </span>

        {/* Unit pill */}
        {mapping.unit && (
          <span className="shrink-0 text-[10px] text-[var(--text-muted)] bg-[var(--bg-inset)] px-1.5 py-0.5 rounded font-readout">
            {mapping.unit}
          </span>
        )}

        {/* Actions */}
        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {categories && categories.length > 0 && onMoveToCategory && (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="text-[var(--text-muted)] hover:text-[var(--status-normal)] p-0.5" title="Mover a categoria">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="min-w-[160px] bg-[var(--bg-surface)] rounded-lg border border-[var(--border-subtle)] p-1 z-50"
                  sideOffset={5}
                >
                  <DropdownMenu.Label className="px-2 py-1 text-xs text-[var(--text-secondary)]">
                    Mover a proceso
                  </DropdownMenu.Label>
                  <DropdownMenu.Separator className="h-px bg-[var(--border-subtle)] my-1" />
                  {categories.map((cat) => (
                    <DropdownMenu.Item
                      key={cat.id}
                      className="px-2 py-1.5 text-sm text-[var(--text-primary)] rounded hover:bg-[var(--status-normal-muted)] hover:text-[var(--status-normal)] cursor-pointer outline-none"
                      onSelect={() => onMoveToCategory(cat.id)}
                    >
                      {cat.name}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          )}
          <button onClick={onEdit} className="text-[var(--text-muted)] hover:text-[var(--status-normal)] p-0.5" title="Editar">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button onClick={onRemove} className="text-[var(--text-muted)] hover:text-[var(--status-critical)] p-0.5" title="Eliminar">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded edit form */}
      {isEditing && (
        <div className="px-2 pb-2 pt-1 space-y-2 border-t border-[var(--border-subtle)] mx-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor={`sensor-display-${mapping.thingsboard_key}`} className="block text-xs text-[var(--text-secondary)] mb-0.5">Nombre a mostrar</label>
              <input
                id={`sensor-display-${mapping.thingsboard_key}`}
                type="text"
                value={mapping.display_name}
                onChange={(e) => onUpdate({ display_name: e.target.value })}
                className="w-full px-2 py-1 text-sm bg-[var(--bg-inset)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] border border-[var(--border-default)] rounded focus:ring-2 focus:ring-[var(--accent-primary)]/30 focus:border-[var(--accent-primary)] outline-none transition-colors"
              />
            </div>
            <div>
              <label htmlFor={`sensor-unit-${mapping.thingsboard_key}`} className="block text-xs text-[var(--text-secondary)] mb-0.5">Unidad</label>
              <input
                id={`sensor-unit-${mapping.thingsboard_key}`}
                type="text"
                value={mapping.unit || ''}
                onChange={(e) => onUpdate({ unit: e.target.value || undefined })}
                className="w-full px-2 py-1 text-sm bg-[var(--bg-inset)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] border border-[var(--border-default)] rounded focus:ring-2 focus:ring-[var(--accent-primary)]/30 focus:border-[var(--accent-primary)] outline-none transition-colors"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor={`sensor-min-${mapping.thingsboard_key}`} className="block text-xs text-[var(--text-secondary)] mb-0.5">Min</label>
              <input
                id={`sensor-min-${mapping.thingsboard_key}`}
                type="number"
                value={mapping.min ?? ''}
                onChange={(e) => onUpdate({ min: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full px-2 py-1 text-sm bg-[var(--bg-inset)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] border border-[var(--border-default)] rounded focus:ring-2 focus:ring-[var(--accent-primary)]/30 focus:border-[var(--accent-primary)] outline-none transition-colors"
              />
            </div>
            <div>
              <label htmlFor={`sensor-max-${mapping.thingsboard_key}`} className="block text-xs text-[var(--text-secondary)] mb-0.5">Max</label>
              <input
                id={`sensor-max-${mapping.thingsboard_key}`}
                type="number"
                value={mapping.max ?? ''}
                onChange={(e) => onUpdate({ max: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full px-2 py-1 text-sm bg-[var(--bg-inset)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] border border-[var(--border-default)] rounded focus:ring-2 focus:ring-[var(--accent-primary)]/30 focus:border-[var(--accent-primary)] outline-none transition-colors"
              />
            </div>
          </div>
          <div>
            <label htmlFor={`sensor-tbkey-${mapping.thingsboard_key}`} className="block text-xs text-[var(--text-secondary)] mb-0.5">Clave ThingsBoard</label>
            <input
              id={`sensor-tbkey-${mapping.thingsboard_key}`}
              type="text"
              value={mapping.thingsboard_key}
              disabled
              className="w-full px-2 py-1 text-xs bg-[var(--bg-inset)] border border-[var(--border-subtle)] rounded text-[var(--text-secondary)]"
            />
          </div>
          {mapping.description && (
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-0.5">Descripcion (encuesta)</label>
              <p className="text-xs text-[var(--text-secondary)] bg-[var(--bg-inset)] rounded px-2 py-1.5 leading-relaxed">{mapping.description}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
