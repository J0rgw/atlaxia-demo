/**
 * useAnomalyEvents Hooks
 * React Query hooks para el registro de episodios de anomalía.
 * Hoy consumen el cliente mock (lib/anomalyEventsApi); la firma es la del
 * contrato REST real del SPEC anomaly-event-register.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addAnomalyEventAnnotation,
  assignAnomalyEventGestor,
  fetchAnomalyEvents,
  patchAnomalyEventReview,
} from '@/lib/anomalyEventsApi';
import type { AnomalyEventFilters, ReviewStatus } from '@/types';

const QUERY_ROOT = ['anomaly-events'] as const;

export function useAnomalyEvents(filters: AnomalyEventFilters) {
  return useQuery({
    queryKey: [...QUERY_ROOT, filters],
    queryFn: () => fetchAnomalyEvents(filters),
    placeholderData: (prev) => prev,
  });
}

export function useReviewAnomalyEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, review_status }: { id: number; review_status: ReviewStatus }) =>
      patchAnomalyEventReview(id, review_status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_ROOT });
    },
  });
}

export function useAnnotateAnomalyEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, author, text }: { id: number; author: string; text: string }) =>
      addAnomalyEventAnnotation(id, author, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_ROOT });
    },
  });
}

export function useAssignAnomalyEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, gestor }: { id: number; gestor: string | null }) =>
      assignAnomalyEventGestor(id, gestor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_ROOT });
    },
  });
}
