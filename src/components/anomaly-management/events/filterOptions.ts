/** Opciones de filtro del registro — compartidas por toolbar y headers de tabla. */

import type { AnomalyEventFilters, AnomalyEventRange } from '@/types';
import type { HeaderFilterOption } from './HeaderFilter';

export const RANGE_OPTIONS: HeaderFilterOption<AnomalyEventRange>[] = [
  { value: '24h', label: 'Últimas 24 h' },
  { value: 'yesterday', label: 'Ayer' },
  { value: '7d', label: '7 días' },
  { value: 'custom', label: 'Personalizado' },
];

export const POSIBLE_OPTIONS: HeaderFilterOption<AnomalyEventFilters['posible']>[] = [
  { value: 'all', label: 'Todos' },
  { value: 'candidate', label: 'Candidatas' },
  { value: 'confirmed', label: 'Confirmadas' },
];

export const REVIEW_OPTIONS: HeaderFilterOption<AnomalyEventFilters['review_status']>[] = [
  { value: 'all', label: 'Todas' },
  { value: 'pending_review', label: 'Pendientes' },
  { value: 'confirmed_real', label: 'Reales' },
  { value: 'dismissed_fp', label: 'FP' },
];
