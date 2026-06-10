/**
 * useNetwork Hooks
 * Provides React Query hooks for fetching network devices and alerts from the real API.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface DeviceStatus {
  authorized: boolean;
  critical: boolean;
  repairable: boolean;
}

interface NetworkDeviceAPI {
  id: number;
  name: string;
  deviceType: string;
  macAddress: string;
  ipAddress: string | null;
  status: DeviceStatus;
  importance: string;
  lastSeen: number | null;
}

interface DeviceTypeCount {
  deviceType: string;
  count: number;
  icon: string;
}

interface NetworkDevicesResponse {
  devices: NetworkDeviceAPI[];
  deviceCounts: DeviceTypeCount[];
  total: number;
  authorized: number;
  unauthorized: number;
}

interface NetworkAlertAPI {
  id: number;
  alertType: string;
  name: string;
  macOrigin: string | null;
  macDestination: string | null;
  ipOrigin: string | null;
  ipDestination: string | null;
  date: string;
  timestamp: number;
  acknowledged: boolean;
  acknowledgedAt: string | null;
}

interface NetworkAlertsResponse {
  alerts: NetworkAlertAPI[];
  total: number;
  offset: number;
  limit: number;
  byType: Record<string, number>;
}

export interface NetworkDevice {
  id: string;
  name: string;
  type: 'PC' | 'PLC' | 'Router' | 'Switch' | 'SCADA';
  macAddress: string;
  ipAddress: string;
  importance: 'Alta' | 'Media' | 'Baja';
  status: {
    authorized: boolean;
    critical: boolean;
    repairable: boolean;
  };
}

export interface NetworkAlert {
  id: string;
  type: 'Alerta' | 'Emergencia' | 'Aviso';
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

export interface AlertsFilterParams {
  limit?: number;
  offset?: number;
  alertType?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

function transformDevice(device: NetworkDeviceAPI): NetworkDevice {
  return {
    id: String(device.id),
    name: device.name,
    type: device.deviceType as NetworkDevice['type'],
    macAddress: device.macAddress,
    ipAddress: device.ipAddress || '',
    importance: device.importance as NetworkDevice['importance'],
    status: device.status,
  };
}

function transformAlert(alert: NetworkAlertAPI): NetworkAlert {
  return {
    id: String(alert.id),
    type: alert.alertType as NetworkAlert['type'],
    name: alert.name,
    macOrigin: alert.macOrigin || '',
    macDestination: alert.macDestination || '',
    ipOrigin: alert.ipOrigin || '',
    ipDestination: alert.ipDestination || '',
    date: alert.date,
    timestamp: alert.timestamp,
    acknowledged: alert.acknowledged,
    acknowledgedAt: alert.acknowledgedAt,
  };
}

export function useNetworkDevices() {
  return useQuery({
    queryKey: ['network', 'devices'],
    queryFn: async () => {
      const response = await api.get<NetworkDevicesResponse>('/api/network/devices');
      return {
        devices: response.devices.map(transformDevice),
        deviceCounts: response.deviceCounts,
        total: response.total,
        authorized: response.authorized,
        unauthorized: response.unauthorized,
      };
    },
    refetchInterval: 30000,
  });
}

export function useNetworkAlerts(
  params: AlertsFilterParams = {},
  refetchInterval: number | false = 10000,
) {
  const { limit = 50, offset = 0, alertType, search, dateFrom, dateTo } = params;

  const queryParams = new URLSearchParams();
  queryParams.set('limit', String(limit));
  queryParams.set('offset', String(offset));
  if (alertType) queryParams.set('alert_type', alertType);
  if (search) queryParams.set('search', search);
  if (dateFrom) queryParams.set('date_from', dateFrom);
  if (dateTo) queryParams.set('date_to', dateTo);

  return useQuery({
    queryKey: ['network', 'alerts', limit, offset, alertType, search, dateFrom, dateTo],
    queryFn: async () => {
      const response = await api.get<NetworkAlertsResponse>(
        `/api/network/alerts?${queryParams.toString()}`
      );
      return {
        alerts: response.alerts.map(transformAlert),
        total: response.total,
        offset: response.offset,
        limit: response.limit,
        byType: response.byType,
      };
    },
    refetchInterval,
  });
}

// --- Topology types & hook ---

export interface TopologyNode {
  id: string;
  label: string;
  ip: string | null;
  deviceType: string;
  importance: string;
  isCritical: boolean;
  isAuthorized: boolean;
  vendor: string | null;
  lastSeen: number | null;
}

export interface TopologyEdge {
  source: string;
  target: string;
  alertCount: number;
  lastAlertType: string;
  protocols: string[];
}

export interface TopologyStats {
  totalDevices: number;
  authorized: number;
  unauthorized: number;
  critical: number;
}

export interface TopologyResponse {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  stats: TopologyStats;
}

export function useNetworkTopology() {
  return useQuery({
    queryKey: ['network', 'topology'],
    queryFn: () => api.get<TopologyResponse>('/api/network/topology'),
    refetchInterval: 30000,
  });
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      return api.put<{ id: number; acknowledged: boolean; message: string }>(
        `/api/network/alerts/${alertId}/acknowledge`,
        {}
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network', 'alerts'] });
    },
  });
}

// --- Alert Timeline types & hook ---

export interface AlertTimelineBucket {
  timestamp: string;
  Emergencia: number;
  Alerta: number;
  Aviso: number;
}

export interface AlertTimelineResponse {
  buckets: AlertTimelineBucket[];
}

export function useAlertTimeline(days = 7, bucket: 'hour' | 'day' = 'hour') {
  return useQuery({
    queryKey: ['network', 'alerts', 'timeline', days, bucket],
    queryFn: () =>
      api.get<AlertTimelineResponse>(
        `/api/network/alerts/timeline?days=${days}&bucket=${bucket}`
      ),
    refetchInterval: 60000,
  });
}

// --- Whitelist types & hooks ---

export interface WhitelistEntry {
  id: number;
  entryType: string;
  pattern: string;
  description: string | null;
  isActive: boolean;
  autoAuthorize: boolean;
  autoCritical: boolean;
  autoImportance: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface WhitelistResponse {
  entries: WhitelistEntry[];
  total: number;
}

export interface WhitelistEntryCreate {
  entryType: string;
  pattern: string;
  description?: string;
  isActive?: boolean;
  autoAuthorize?: boolean;
  autoCritical?: boolean;
  autoImportance?: string;
}

export function useWhitelist() {
  return useQuery({
    queryKey: ['network', 'whitelist'],
    queryFn: () => api.get<WhitelistResponse>('/api/network/whitelist'),
  });
}

export function useCreateWhitelistEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entry: WhitelistEntryCreate) =>
      api.post<WhitelistEntry>('/api/network/whitelist', entry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network', 'whitelist'] });
    },
  });
}

export function useUpdateWhitelistEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, entry }: { id: number; entry: WhitelistEntryCreate }) =>
      api.put<WhitelistEntry>(`/api/network/whitelist/${id}`, entry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network', 'whitelist'] });
    },
  });
}

export function useDeleteWhitelistEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/network/whitelist/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network', 'whitelist'] });
    },
  });
}

// --- Snort Rules types & hooks ---

export interface SnortRule {
  id: number;
  sid: number;
  ruleText: string;
  name: string;
  category: string | null;
  isEnabled: boolean;
  isPassRule: boolean;
  priority: number;
  description: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface SnortRulesResponse {
  rules: SnortRule[];
  total: number;
  enabled: number;
  disabled: number;
}

export interface SnortRuleCreate {
  sid: number;
  ruleText: string;
  name: string;
  category?: string;
  isEnabled?: boolean;
  isPassRule?: boolean;
  priority?: number;
  description?: string;
}

export function useSnortRules(category?: string) {
  const params = category ? `?category=${category}` : '';
  return useQuery({
    queryKey: ['network', 'snort', 'rules', category],
    queryFn: () =>
      api.get<SnortRulesResponse>(`/api/network/snort/rules${params}`),
  });
}

export function useCreateSnortRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rule: SnortRuleCreate) =>
      api.post<SnortRule>('/api/network/snort/rules', rule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network', 'snort'] });
    },
  });
}

export function useUpdateSnortRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rule }: { id: number; rule: SnortRuleCreate }) =>
      api.put<SnortRule>(`/api/network/snort/rules/${id}`, rule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network', 'snort'] });
    },
  });
}

export function useDeleteSnortRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/network/snort/rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network', 'snort'] });
    },
  });
}

export function useToggleSnortRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.put<SnortRule>(`/api/network/snort/rules/${id}/toggle`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network', 'snort'] });
    },
  });
}

export function useSyncSnortRules() {
  return useMutation({
    mutationFn: () => api.post('/api/network/snort/sync', {}),
  });
}

export function useImportSnortRules() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/api/network/snort/import', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network', 'snort'] });
    },
  });
}

export interface SnortTemplate {
  name: string;
  category: string;
  template: string;
}

export function useSnortTemplates() {
  return useQuery({
    queryKey: ['network', 'snort', 'templates'],
    queryFn: () =>
      api.get<{ templates: SnortTemplate[] }>('/api/network/snort/templates'),
    staleTime: Infinity,
  });
}
