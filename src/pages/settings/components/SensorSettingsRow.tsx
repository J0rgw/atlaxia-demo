import { useState } from 'react';
import { Star, Pencil, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SensorMapping } from '@/types/installation';

const TYPE_COLORS: Record<string, string> = {
  FIT: 'bg-blue-100 text-blue-700',
  LIT: 'bg-[var(--status-normal-muted)] text-[var(--status-normal)]',
  AIT: 'bg-purple-100 text-purple-700',
  PIT: 'bg-orange-100 text-orange-700',
  TIT: 'bg-red-100 text-red-700',
  MV: 'bg-[var(--bg-inset)] text-[var(--text-secondary)]',
  P: 'bg-[var(--bg-inset)] text-[var(--text-secondary)]',
  BLW: 'bg-cyan-100 text-cyan-700',
  DOS: 'bg-amber-100 text-amber-700',
};

function getTypeTag(sensorId: string): string {
  const match = sensorId.match(/^([A-Z]+)/);
  return match ? match[1] : '';
}

interface SensorSettingsRowProps {
  sensorId: string;
  mapping: SensorMapping;
  isDefault: boolean;
  onToggleDefault: () => void;
  onUpdateMapping: (updates: Partial<SensorMapping>) => void;
  language: string;
}

export function SensorSettingsRow({
  sensorId,
  mapping,
  isDefault,
  onToggleDefault,
  onUpdateMapping,
  language,
}: SensorSettingsRowProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(mapping.display_name);
  const [editUnit, setEditUnit] = useState(mapping.unit || '');

  const typeTag = getTypeTag(sensorId);
  const typeColor = TYPE_COLORS[typeTag] || 'bg-gray-100 text-gray-600';

  const handleSaveEdit = () => {
    onUpdateMapping({
      display_name: editName,
      unit: editUnit || undefined,
    });
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setEditName(mapping.display_name);
    setEditUnit(mapping.unit || '');
    setEditing(false);
  };

  return (
    <div className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--bg-inset)] transition-colors">
      <button
        type="button"
        onClick={onToggleDefault}
        className={cn(
          'flex-shrink-0 transition-colors',
          isDefault ? 'text-amber-400' : 'text-[var(--text-muted)] hover:text-amber-300'
        )}
        aria-label={isDefault
          ? (language === 'es' ? 'Quitar de favoritos' : 'Remove from defaults')
          : (language === 'es' ? 'Marcar como favorito' : 'Mark as default')
        }
      >
        <Star className={cn('w-4 h-4', isDefault && 'fill-current')} />
      </button>

      {typeTag && (
        <span className={cn('px-1.5 py-0.5 text-[10px] font-semibold rounded', typeColor)}>
          {typeTag}
        </span>
      )}

      {editing ? (
        <div className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="flex-1 px-2 py-1 text-sm border border-[var(--border-default)] rounded focus:ring-1 focus:ring-[var(--accent-primary)] outline-none"
            autoFocus
          />
          <input
            type="text"
            value={editUnit}
            onChange={(e) => setEditUnit(e.target.value)}
            placeholder={language === 'es' ? 'Unidad' : 'Unit'}
            className="w-20 px-2 py-1 text-sm border border-[var(--border-default)] rounded focus:ring-1 focus:ring-[var(--accent-primary)] outline-none"
          />
          <button
            type="button"
            onClick={handleSaveEdit}
            className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
            aria-label={language === 'es' ? 'Guardar' : 'Save'}
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleCancelEdit}
            className="p-1 text-[var(--text-muted)] hover:bg-[var(--bg-inset)] rounded transition-colors"
            aria-label={language === 'es' ? 'Cancelar' : 'Cancel'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <span className="text-sm text-[var(--text-primary)] truncate">
            {mapping.display_name}
          </span>
          {mapping.unit && (
            <span className="px-1.5 py-0.5 text-[10px] font-readout bg-[var(--bg-inset)] text-[var(--text-secondary)] rounded">
              {mapping.unit}
            </span>
          )}
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="ml-auto p-1 opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--status-normal)] hover:bg-[var(--status-normal-muted)] rounded transition-all"
            aria-label={language === 'es' ? 'Editar sensor' : 'Edit sensor'}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  );
}
