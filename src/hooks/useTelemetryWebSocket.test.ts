import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mock dependencies before importing the hook
// ---------------------------------------------------------------------------

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  wsLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// WebSocket mock infrastructure
// ---------------------------------------------------------------------------

type WSEventHandler = ((event: unknown) => void) | null;

interface MockWebSocketInstance {
  url: string;
  readyState: number;
  onopen: WSEventHandler;
  onclose: WSEventHandler;
  onmessage: WSEventHandler;
  onerror: WSEventHandler;
  send: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  simulateOpen: () => void;
  simulateMessage: (data: unknown) => void;
  simulateClose: (code?: number, reason?: string) => void;
  simulateError: () => void;
}

let mockWSInstances: MockWebSocketInstance[] = [];

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState = MockWebSocket.CONNECTING;
  onopen: WSEventHandler = null;
  onclose: WSEventHandler = null;
  onmessage: WSEventHandler = null;
  onerror: WSEventHandler = null;
  send = vi.fn();
  close = vi.fn();

  constructor(url: string) {
    this.url = url;
    const instance = this as unknown as MockWebSocketInstance;

    instance.simulateOpen = () => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) this.onopen({} as Event);
    };

    instance.simulateMessage = (data: unknown) => {
      if (this.onmessage) {
        this.onmessage({ data: JSON.stringify(data) } as MessageEvent);
      }
    };

    instance.simulateClose = (code = 1006, reason = '') => {
      this.readyState = MockWebSocket.CLOSED;
      if (this.onclose) this.onclose({ code, reason } as CloseEvent);
    };

    instance.simulateError = () => {
      if (this.onerror) this.onerror({} as Event);
    };

    mockWSInstances.push(instance);
  }
}

// Assign static constants so the hook's `WebSocket.OPEN` checks work
Object.assign(MockWebSocket, {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
});

// ---------------------------------------------------------------------------
// Import the hook AFTER mocks are set up
// ---------------------------------------------------------------------------

import { useTelemetryWebSocket } from './useTelemetryWebSocket';
import type {
  WebSocketMessage,
  TelemetrySnapshot,
  TelemetryDelta,
  NetworkAlertWS,
} from './useTelemetryWebSocket';
import type { InferenceMessage } from '@/types/inference';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getLatestWSInstance(): MockWebSocketInstance {
  const inst = mockWSInstances[mockWSInstances.length - 1];
  if (!inst) throw new Error('No MockWebSocket instance created');
  return inst;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useTelemetryWebSocket', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockWSInstances = [];
    // Install mock WebSocket on globalThis (jsdom)
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Connection lifecycle
  // -------------------------------------------------------------------------

  describe('connection lifecycle', () => {
    it('starts in disconnected state', () => {
      const { result } = renderHook(() =>
        useTelemetryWebSocket({ enabled: false })
      );
      expect(result.current.status).toBe('disconnected');
    });

    it('transitions to connecting then connected on open', async () => {
      const { result } = renderHook(() => useTelemetryWebSocket());

      // The hook sets a 50ms delay before connecting (StrictMode guard)
      act(() => { vi.advanceTimersByTime(60); });

      const ws = getLatestWSInstance();
      expect(ws).toBeDefined();

      act(() => { ws.simulateOpen(); });

      await waitFor(() => {
        expect(result.current.status).toBe('connected');
      });
    });

    it('sends subscription messages on open', async () => {
      const { result } = renderHook(() =>
        useTelemetryWebSocket({
          channels: ['telemetry', 'alerts'],
          sensors: ['LIT101', 'FIT101'],
          throttleMs: 2000,
        })
      );

      act(() => { vi.advanceTimersByTime(60); });
      const ws = getLatestWSInstance();

      act(() => { ws.simulateOpen(); });

      await waitFor(() => {
        expect(result.current.status).toBe('connected');
      });

      // The hook sends subscription messages on open AND may re-subscribe
      // via the options-change useEffect. We verify the subscription messages
      // are present in the calls rather than checking exact call count.
      const sentMessages = ws.send.mock.calls.map(
        (call: string[]) => JSON.parse(call[0])
      );
      const subscriptions = sentMessages.filter(
        (msg: { type: string }) => msg.type === 'subscribe'
      );

      expect(subscriptions).toEqual(
        expect.arrayContaining([
          {
            type: 'subscribe',
            channel: 'telemetry',
            sensors: ['LIT101', 'FIT101'],
            throttleMs: 2000,
          },
          {
            type: 'subscribe',
            channel: 'alerts',
            sensors: ['LIT101', 'FIT101'],
            throttleMs: 2000,
          },
        ])
      );
    });

    it('does not connect when enabled is false', () => {
      renderHook(() => useTelemetryWebSocket({ enabled: false }));

      act(() => { vi.advanceTimersByTime(200); });

      expect(mockWSInstances).toHaveLength(0);
    });

    it('disconnects and cleans up on unmount', async () => {
      const { result, unmount } = renderHook(() => useTelemetryWebSocket());

      act(() => { vi.advanceTimersByTime(60); });
      const ws = getLatestWSInstance();
      act(() => { ws.simulateOpen(); });

      await waitFor(() => {
        expect(result.current.status).toBe('connected');
      });

      unmount();

      expect(ws.close).toHaveBeenCalledWith(1000, 'Client disconnect');
    });
  });

  // -------------------------------------------------------------------------
  // Message handling
  // -------------------------------------------------------------------------

  describe('message handling', () => {
    async function connectHook(options = {}) {
      const callbacks = {
        onSnapshot: vi.fn(),
        onDelta: vi.fn(),
        onNetworkAlert: vi.fn(),
        onInference: vi.fn(),
        onError: vi.fn(),
        ...options,
      };
      const hookResult = renderHook(() => useTelemetryWebSocket(callbacks));

      act(() => { vi.advanceTimersByTime(60); });
      const ws = getLatestWSInstance();
      act(() => { ws.simulateOpen(); });

      await waitFor(() => {
        expect(hookResult.result.current.status).toBe('connected');
      });

      return { ...hookResult, ws, callbacks };
    }

    it('handles snapshot messages', async () => {
      const { result, ws, callbacks } = await connectHook();

      const snapshotMsg: WebSocketMessage = {
        type: 'snapshot',
        timestamp: 1700000000000,
        data: {
          timestamp: 1700000000000,
          sensors: { LIT101: 500.2, FIT101: 2.3 },
        },
      };

      act(() => { ws.simulateMessage(snapshotMsg); });

      await waitFor(() => {
        expect(result.current.sensorValues).toEqual({ LIT101: 500.2, FIT101: 2.3 });
        expect(result.current.lastUpdate).toBe(1700000000000);
      });

      expect(callbacks.onSnapshot).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: 1700000000000,
          sensors: { LIT101: 500.2, FIT101: 2.3 },
        })
      );
    });

    it('handles delta messages and merges with existing values', async () => {
      const { result, ws, callbacks } = await connectHook();

      // First send a snapshot to populate values
      const snapshotMsg: WebSocketMessage = {
        type: 'snapshot',
        timestamp: 1700000000000,
        data: {
          timestamp: 1700000000000,
          sensors: { LIT101: 500.2, FIT101: 2.3, AIT201: 7.1 },
        },
      };

      act(() => { ws.simulateMessage(snapshotMsg); });

      await waitFor(() => {
        expect(Object.keys(result.current.sensorValues)).toHaveLength(3);
      });

      // Now send a delta that changes only one sensor
      const deltaMsg: WebSocketMessage = {
        type: 'delta',
        timestamp: 1700000001000,
        changes: { LIT101: 502.5 },
      };

      act(() => { ws.simulateMessage(deltaMsg); });

      await waitFor(() => {
        expect(result.current.sensorValues.LIT101).toBe(502.5);
        expect(result.current.sensorValues.FIT101).toBe(2.3);
        expect(result.current.lastUpdate).toBe(1700000001000);
      });

      expect(callbacks.onDelta).toHaveBeenCalledWith({
        timestamp: 1700000001000,
        changes: { LIT101: 502.5 },
      });
    });

    it('handles network_alert messages', async () => {
      const { ws, callbacks } = await connectHook();

      const alertData: NetworkAlertWS = {
        id: 42,
        alertType: 'Emergencia',
        name: 'ARP Spoofing detected',
        macOrigin: '00:11:22:33:44:55',
        ipOrigin: '192.168.1.100',
        timestamp: 1700000000000,
      };

      const alertMsg: WebSocketMessage = {
        type: 'network_alert',
        alert: alertData,
      };

      act(() => { ws.simulateMessage(alertMsg); });

      expect(callbacks.onNetworkAlert).toHaveBeenCalledWith(alertData);
    });

    it('fires onInference when an inference message arrives', async () => {
      const { ws, callbacks } = await connectHook();

      const inferenceMsg: InferenceMessage = {
        type: 'inference',
        channel: 'inferences',
        schema_version: '2.1',
        model_name: 'STGNN_TOPK_Cont',
        inference_ts: '2026-05-18T15:30:42.000000Z',
        identity: {
          name: 'STGNN_TOPK_Cont',
          version: 'v1',
          trained_at: '2026-05-11T07:18:17Z',
          threshold_source: 'calibrator_val_bands',
        },
        valorRiesgo: 0.6731,
        level_global: 4,
        level_global_name: 'HIGH',
        plant: { score: 0.67, level: 4, level_name: 'HIGH' },
        per_process: { P1: { score: 0.55, level: 2, level_name: 'LOW' } },
        devices: {
          FIT101: { score: 0.21, level: 1, level_name: 'INFO' },
          LIT101: { score: 0.55, level: 4, level_name: 'HIGH' },
        },
        alarms_derived: {
          plant: false,
          per_process: { P1: false },
          devices: { FIT101: false, LIT101: true },
        },
        alarms_debounced: {
          plant: false,
          per_process: { P1: false },
          devices: { FIT101: false, LIT101: false },
          kofn: { k: 5, n: 3 },
        },
        threshold_source: 'calibrator_val_bands',
        show_verdict: true,
        observability: {
          level_summary: {},
          level_distribution: {},
          sensor_health: null,
        },
      };

      act(() => { ws.simulateMessage(inferenceMsg); });

      expect(callbacks.onInference).toHaveBeenCalledTimes(1);
      expect(callbacks.onInference).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'inference',
          model_name: 'STGNN_TOPK_Cont',
          level_global_name: 'HIGH',
        })
      );
    });

    it('silently handles pong messages', async () => {
      const { ws, callbacks } = await connectHook();

      const pongMsg: WebSocketMessage = { type: 'pong' };

      act(() => { ws.simulateMessage(pongMsg); });

      // No callbacks should fire for pong
      expect(callbacks.onSnapshot).not.toHaveBeenCalled();
      expect(callbacks.onDelta).not.toHaveBeenCalled();
      expect(callbacks.onNetworkAlert).not.toHaveBeenCalled();
    });

    it('ignores snapshot messages with no data', async () => {
      const { result, ws, callbacks } = await connectHook();

      const emptySnapshot: WebSocketMessage = {
        type: 'snapshot',
        timestamp: 1700000000000,
        // no `data` field
      };

      act(() => { ws.simulateMessage(emptySnapshot); });

      expect(callbacks.onSnapshot).not.toHaveBeenCalled();
      expect(result.current.sensorValues).toEqual({});
    });

    it('ignores delta messages with no changes', async () => {
      const { ws, callbacks } = await connectHook();

      const emptyDelta: WebSocketMessage = {
        type: 'delta',
        timestamp: 1700000000000,
        // no `changes` field
      };

      act(() => { ws.simulateMessage(emptyDelta); });

      expect(callbacks.onDelta).not.toHaveBeenCalled();
    });

    it('handles malformed JSON messages gracefully', async () => {
      const { ws } = await connectHook();

      // Directly send invalid JSON through the onmessage handler
      act(() => {
        if (ws.onmessage) {
          ws.onmessage({ data: 'not-json{{{' } as MessageEvent);
        }
      });

      // Should not throw; the hook catches parse errors internally
    });
  });

  // -------------------------------------------------------------------------
  // Reconnection logic
  // -------------------------------------------------------------------------

  describe('reconnection', () => {
    it('transitions to reconnecting on unclean close', async () => {
      const { result } = renderHook(() => useTelemetryWebSocket());

      act(() => { vi.advanceTimersByTime(60); });
      const ws = getLatestWSInstance();
      act(() => { ws.simulateOpen(); });

      await waitFor(() => {
        expect(result.current.status).toBe('connected');
      });

      // Simulate abnormal close (code != 1000)
      act(() => { ws.simulateClose(1006, 'Abnormal'); });

      await waitFor(() => {
        expect(result.current.status).toBe('reconnecting');
      });
    });

    it('transitions to disconnected on clean close (code 1000)', async () => {
      const { result } = renderHook(() => useTelemetryWebSocket());

      act(() => { vi.advanceTimersByTime(60); });
      const ws = getLatestWSInstance();
      act(() => { ws.simulateOpen(); });

      await waitFor(() => {
        expect(result.current.status).toBe('connected');
      });

      act(() => { ws.simulateClose(1000, 'Normal closure'); });

      await waitFor(() => {
        expect(result.current.status).toBe('disconnected');
      });
    });

    it('attempts reconnection with exponential backoff', async () => {
      renderHook(() => useTelemetryWebSocket());

      act(() => { vi.advanceTimersByTime(60); });

      const ws1 = getLatestWSInstance();
      act(() => { ws1.simulateOpen(); });
      act(() => { ws1.simulateClose(1006, 'Abnormal'); });

      // First reconnection attempt: base delay is 1000ms * 1.5^0 = 1000ms
      expect(mockWSInstances).toHaveLength(1);

      act(() => { vi.advanceTimersByTime(1100); });

      // A new WebSocket instance should have been created
      expect(mockWSInstances.length).toBeGreaterThanOrEqual(2);
    });

    it('manual reconnect resets delay and reconnects', async () => {
      const { result } = renderHook(() => useTelemetryWebSocket());

      act(() => { vi.advanceTimersByTime(60); });
      const ws = getLatestWSInstance();
      act(() => { ws.simulateOpen(); });

      await waitFor(() => {
        expect(result.current.status).toBe('connected');
      });

      // Trigger manual reconnect
      act(() => { result.current.reconnect(); });

      // The reconnect method disconnects first, then connects after 100ms
      act(() => { vi.advanceTimersByTime(200); });

      expect(mockWSInstances.length).toBeGreaterThanOrEqual(2);
    });
  });

  // -------------------------------------------------------------------------
  // Ping / keep-alive
  // -------------------------------------------------------------------------

  describe('keep-alive pings', () => {
    it('sends ping messages at 25s intervals after connect', async () => {
      const { result } = renderHook(() => useTelemetryWebSocket());

      act(() => { vi.advanceTimersByTime(60); });
      const ws = getLatestWSInstance();
      act(() => { ws.simulateOpen(); });

      await waitFor(() => {
        expect(result.current.status).toBe('connected');
      });

      // Clear subscription sends
      ws.send.mockClear();

      // Advance 25 seconds for first ping
      act(() => { vi.advanceTimersByTime(25000); });

      expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ type: 'ping' }));
    });
  });

  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------

  describe('error handling', () => {
    it('calls onError when WebSocket emits an error event', async () => {
      const onError = vi.fn();
      renderHook(() => useTelemetryWebSocket({ onError }));

      act(() => { vi.advanceTimersByTime(60); });
      const ws = getLatestWSInstance();
      act(() => { ws.simulateOpen(); });
      act(() => { ws.simulateError(); });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'WebSocket connection error' })
      );
    });
  });

  // -------------------------------------------------------------------------
  // isLive computation
  // -------------------------------------------------------------------------

  describe('isLive flag', () => {
    it('is false when no data received', () => {
      const { result } = renderHook(() =>
        useTelemetryWebSocket({ enabled: false })
      );
      expect(result.current.isLive).toBe(false);
    });

    it('is true after receiving recent data while connected', async () => {
      const { result } = renderHook(() => useTelemetryWebSocket());

      act(() => { vi.advanceTimersByTime(60); });
      const ws = getLatestWSInstance();
      act(() => { ws.simulateOpen(); });

      await waitFor(() => {
        expect(result.current.status).toBe('connected');
      });

      const now = Date.now();
      const snapshotMsg: WebSocketMessage = {
        type: 'snapshot',
        timestamp: now,
        data: {
          timestamp: now,
          sensors: { LIT101: 100 },
        },
      };

      act(() => { ws.simulateMessage(snapshotMsg); });

      await waitFor(() => {
        expect(result.current.isLive).toBe(true);
      });
    });
  });
});

// ---------------------------------------------------------------------------
// Message type parsing (pure logic, no React)
// ---------------------------------------------------------------------------

describe('WebSocket message type definitions', () => {
  it('TelemetrySnapshot has correct shape', () => {
    const snapshot: TelemetrySnapshot = {
      timestamp: Date.now(),
      sensors: { LIT101: 500, FIT101: 2.3 },
    };
    expect(snapshot.sensors.LIT101).toBe(500);
    expect(typeof snapshot.timestamp).toBe('number');
  });

  it('TelemetryDelta has correct shape', () => {
    const delta: TelemetryDelta = {
      timestamp: Date.now(),
      changes: { AIT201: 7.1 },
    };
    expect(delta.changes.AIT201).toBe(7.1);
  });

  it('NetworkAlertWS has correct shape', () => {
    const alert: NetworkAlertWS = {
      id: 1,
      alertType: 'Emergencia',
      name: 'Test Alert',
      macOrigin: '00:11:22:33:44:55',
      ipOrigin: '10.0.0.1',
      timestamp: Date.now(),
    };
    expect(alert.alertType).toBe('Emergencia');
    expect(alert.macOrigin).toBe('00:11:22:33:44:55');
  });

  it('WebSocketMessage discriminates on type field', () => {
    const messages: WebSocketMessage[] = [
      { type: 'snapshot', data: { timestamp: 0, sensors: {} } },
      { type: 'delta', changes: { LIT101: 1 } },
      { type: 'anomaly', sensor: { id: 'X' } },
      { type: 'control' },
      { type: 'network_alert', alert: { id: 1, alertType: 'Alerta', name: 'test', timestamp: 0 } },
      { type: 'pong' },
    ];

    const types = messages.map((m) => m.type);
    expect(types).toEqual(['snapshot', 'delta', 'anomaly', 'control', 'network_alert', 'pong']);
  });
});
