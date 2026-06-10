/**
 * WebSocket hook for real-time telemetry updates.
 * Features:
 * - Auto-reconnect with exponential backoff
 * - Subscription management
 * - Fallback to HTTP polling if WebSocket fails
 * - Connection status tracking
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { wsLogger } from '@/lib/logger';
import type { InferenceMessage } from '@/types/inference';

const WS_BASE_URL = import.meta.env.VITE_WS_URL ??
  `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'fallback';

export interface TelemetrySnapshot {
  timestamp: number;
  sensors: Record<string, number>;
}

export interface TelemetryDelta {
  timestamp: number;
  changes: Record<string, number>;
}

export interface NetworkAlertWS {
  id: number;
  alertType: string;
  name: string;
  macOrigin?: string;
  macDestination?: string;
  ipOrigin?: string;
  ipDestination?: string;
  details?: Record<string, unknown>;
  timestamp: number;
}

export type WebSocketMessage =
  | {
      type: 'snapshot' | 'delta' | 'anomaly' | 'control' | 'network_alert' | 'pong';
      timestamp?: number;
      data?: TelemetrySnapshot;
      changes?: Record<string, number>;
      sensor?: unknown;
      indicators?: unknown;
      alert?: NetworkAlertWS;
    }
  | InferenceMessage;

export interface UseTelemetryWebSocketOptions {
  channels?: string[];
  sensors?: string[];
  throttleMs?: number;
  onSnapshot?: (data: TelemetrySnapshot) => void;
  onDelta?: (changes: TelemetryDelta) => void;
  onNetworkAlert?: (alert: NetworkAlertWS) => void;
  onInference?: (msg: InferenceMessage) => void;
  onError?: (error: Error) => void;
  fallbackPollingMs?: number;
  enabled?: boolean;
}

export interface UseTelemetryWebSocketReturn {
  status: ConnectionStatus;
  lastUpdate: number | null;
  sensorValues: Record<string, number>;
  reconnect: () => void;
  isLive: boolean;
}

const MAX_RECONNECT_DELAY = 30000;
const INITIAL_RECONNECT_DELAY = 1000;
const PING_INTERVAL = 25000;

// Module-level defaults keep referential identity stable across renders so
// the resubscribe effect (deps: channels, sensors) doesn't refire when the
// caller omits these options.
const DEFAULT_CHANNELS: string[] = ['telemetry'];
const DEFAULT_SENSORS: string[] = [];

export function useTelemetryWebSocket(
  options: UseTelemetryWebSocketOptions = {}
): UseTelemetryWebSocketReturn {
  const {
    channels = DEFAULT_CHANNELS,
    sensors = DEFAULT_SENSORS,
    throttleMs = 1000,
    onSnapshot,
    onDelta,
    onNetworkAlert,
    onInference,
    onError,
    fallbackPollingMs = 10000,
    enabled = true,
  } = options;

  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [sensorValues, setSensorValues] = useState<Record<string, number>>({});

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY);
  const reconnectAttemptsRef = useRef(0);
  const isMountedRef = useRef(true);

  // Live refs for values consumed by long-lived WS event handlers. The mount
  // effect only re-runs on `enabled` changes, so the handlers attached to the
  // first socket would otherwise keep firing the initial closures (callbacks
  // and option values frozen at mount). Refs let the handlers see the latest
  // parent closures and options without rebuilding `connect`.
  const onSnapshotRef = useRef(onSnapshot);
  const onDeltaRef = useRef(onDelta);
  const onNetworkAlertRef = useRef(onNetworkAlert);
  const onInferenceRef = useRef(onInference);
  const onErrorRef = useRef(onError);
  const channelsRef = useRef(channels);
  const sensorsRef = useRef(sensors);
  const throttleMsRef = useRef(throttleMs);

  useEffect(() => {
    onSnapshotRef.current = onSnapshot;
    onDeltaRef.current = onDelta;
    onNetworkAlertRef.current = onNetworkAlert;
    onInferenceRef.current = onInference;
    onErrorRef.current = onError;
    channelsRef.current = channels;
    sensorsRef.current = sensors;
    throttleMsRef.current = throttleMs;
  });

  const clearTimers = useCallback(() => {
    if (connectDelayRef.current) {
      clearTimeout(connectDelayRef.current);
      connectDelayRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const startFallbackPolling = useCallback(() => {
    if (pollingIntervalRef.current) return;

    setStatus('fallback');
    wsLogger.debug(' Starting fallback HTTP polling');

    const poll = async () => {
      try {
        const response = await api.get<TelemetrySnapshot>('/api/machines/snapshot');
        if (!isMountedRef.current) return;

        const now = response.timestamp || Date.now();
        setSensorValues(response.sensors);
        setLastUpdate(now);

        onSnapshotRef.current?.(response);
      } catch (err) {
        wsLogger.error(' Fallback polling error:', err);
        if (err instanceof Error) {
          onErrorRef.current?.(err);
        }
      }
    };

    poll();
    pollingIntervalRef.current = setInterval(poll, fallbackPollingMs);
  }, [fallbackPollingMs]);

  const stopFallbackPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!enabled || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    clearTimers();
    stopFallbackPolling();

    const wsUrl = `${WS_BASE_URL}/ws/telemetry`;
    wsLogger.debug(' Connecting to:', wsUrl);
    setStatus('connecting');

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) return;

        wsLogger.debug(' Connected');
        setStatus('connected');
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;
        reconnectAttemptsRef.current = 0;

        // Subscribe to channels (read latest options from refs so reconnects
        // pick up the current values, not the ones captured at mount).
        const currentChannels = channelsRef.current;
        const currentSensors = sensorsRef.current;
        const currentThrottleMs = throttleMsRef.current;
        currentChannels.forEach((channel) => {
          const subscribeMsg = {
            type: 'subscribe',
            channel,
            sensors: currentSensors.length > 0 ? currentSensors : undefined,
            throttleMs: currentThrottleMs,
          };
          ws.send(JSON.stringify(subscribeMsg));
        });

        // Start ping interval
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, PING_INTERVAL);
      };

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;

        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'snapshot':
              if (message.data) {
                const snapshot = message.data;
                setSensorValues(snapshot.sensors || {});
                setLastUpdate(message.timestamp || Date.now());
                onSnapshotRef.current?.(snapshot);
              }
              break;

            case 'delta':
              if (message.changes) {
                setSensorValues((prev) => ({
                  ...prev,
                  ...message.changes,
                }));
                setLastUpdate(message.timestamp || Date.now());
                onDeltaRef.current?.({
                  timestamp: message.timestamp || Date.now(),
                  changes: message.changes,
                });
              }
              break;

            case 'network_alert':
              if (message.alert) {
                onNetworkAlertRef.current?.(message.alert);
              }
              break;

            case 'inference':
              onInferenceRef.current?.(message as InferenceMessage);
              break;

            case 'pong':
              // Keep-alive acknowledged
              break;

            default:
              wsLogger.debug(' Unhandled message type:', message.type);
          }
        } catch (err) {
          wsLogger.error(' Error parsing message:', err);
        }
      };

      ws.onclose = (event) => {
        if (!isMountedRef.current) return;

        wsLogger.debug(' Connection closed:', event.code, event.reason);
        wsRef.current = null;

        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Don't reconnect if closed cleanly or component unmounted
        if (event.code === 1000 || !enabled) {
          setStatus('disconnected');
          return;
        }

        // Exponential backoff reconnect
        reconnectAttemptsRef.current++;
        const delay = Math.min(
          reconnectDelayRef.current * Math.pow(1.5, reconnectAttemptsRef.current - 1),
          MAX_RECONNECT_DELAY
        );

        console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
        setStatus('reconnecting');

        // After 3 failed attempts, start fallback polling
        if (reconnectAttemptsRef.current >= 3) {
          startFallbackPolling();
        }

        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current && enabled) {
            connect();
          }
        }, delay);
      };

      ws.onerror = (event) => {
        wsLogger.error(' Error:', event);
        onErrorRef.current?.(new Error('WebSocket connection error'));
      };
    } catch (err) {
      wsLogger.error(' Failed to create WebSocket:', err);
      setStatus('disconnected');
      startFallbackPolling();
    }
  }, [enabled, clearTimers, startFallbackPolling, stopFallbackPolling]);

  const disconnect = useCallback(() => {
    clearTimers();
    stopFallbackPolling();

    if (wsRef.current) {
      const ws = wsRef.current;
      wsRef.current = null;
      // Suppress events from the closing socket
      ws.onopen = null;
      ws.onclose = null;
      ws.onerror = null;
      ws.onmessage = null;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close(1000, 'Client disconnect');
      }
    }

    setStatus('disconnected');
  }, [clearTimers, stopFallbackPolling]);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;
    reconnectAttemptsRef.current = 0;
    setTimeout(connect, 100);
  }, [disconnect, connect]);

  // Connect on mount (small delay to survive React StrictMode double-mount).
  // `connect` / `disconnect` are now stable across renders (their deps are
  // stable refs / primitives), so this effect only re-runs when `enabled`
  // actually flips.
  useEffect(() => {
    isMountedRef.current = true;

    if (enabled) {
      connectDelayRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          connect();
        }
      }, 50);
    }

    return () => {
      isMountedRef.current = false;
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  // Reconnect when options change
  useEffect(() => {
    if (enabled && status === 'connected' && wsRef.current?.readyState === WebSocket.OPEN) {
      // Re-subscribe with new options
      channels.forEach((channel) => {
        const subscribeMsg = {
          type: 'subscribe',
          channel,
          sensors: sensors.length > 0 ? sensors : undefined,
          throttleMs,
        };
        wsRef.current?.send(JSON.stringify(subscribeMsg));
      });
    }
  }, [channels, sensors, throttleMs, enabled, status]);

  const isLive = status === 'connected' && lastUpdate !== null && Date.now() - lastUpdate < 30000;

  return {
    status,
    lastUpdate,
    sensorValues,
    reconnect,
    isLive,
  };
}

export default useTelemetryWebSocket;
