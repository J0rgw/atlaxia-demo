import { ws } from 'msw';
import { replay, diffSnapshot } from '../replay';

const telemetry = ws.link(/\/ws\/telemetry$/);

export const websocketHandlers = [
  telemetry.addEventListener('connection', ({ client }) => {
    let lastSent: Record<string, number> | null = null;

    // Send the latest snapshot immediately so the client paints without
    // waiting up to a second for the next tick.
    const initial = replay.getSnapshot();
    if (Object.keys(initial.sensors).length > 0) {
      client.send(
        JSON.stringify({
          type: 'snapshot',
          timestamp: initial.timestamp,
          data: { sensors: initial.sensors, timestamp: initial.timestamp },
        }),
      );
      lastSent = initial.sensors;
    }

    const unsubscribe = replay.subscribe((row, _prev, tickIndex) => {
      const timestamp = Date.now();
      if (!lastSent) {
        client.send(JSON.stringify({ type: 'snapshot', timestamp, data: { sensors: row, timestamp } }));
      } else {
        const changes = diffSnapshot(lastSent, row);
        if (Object.keys(changes).length > 0) {
          client.send(JSON.stringify({ type: 'delta', timestamp, changes }));
        }
      }
      lastSent = row;

      // Every 5 ticks, also publish the latest inference per model so the
      // Overview's criticality KPI and ScatterChart populate.
      if (tickIndex % 5 === 0) {
        const inferences = replay.getLatestInferenceMap();
        for (const msg of Object.values(inferences)) {
          client.send(JSON.stringify(msg));
        }
      }
    });

    client.addEventListener('message', (event) => {
      // The product client sends { type: 'subscribe', channel, ... } and
      // periodic { type: 'ping' }. We only need to respond to pings; channel
      // subscriptions are implicit — the replay engine pushes everything.
      try {
        const msg = JSON.parse(typeof event.data === 'string' ? event.data : '');
        if (msg?.type === 'ping') {
          client.send(JSON.stringify({ type: 'pong' }));
        }
      } catch {
        // Non-JSON messages are ignored.
      }
    });

    const unsubscribeAlerts = replay.subscribeNetworkAlerts((alert) => {
      client.send(
        JSON.stringify({
          type: 'network_alert',
          timestamp: alert.timestamp,
          alert: {
            id: alert.id,
            alertType: alert.alertType,
            name: alert.name,
            macOrigin: alert.macOrigin,
            macDestination: alert.macDestination,
            ipOrigin: alert.ipOrigin,
            ipDestination: alert.ipDestination,
            timestamp: alert.timestamp,
          },
        }),
      );
    });

    client.addEventListener('close', () => {
      unsubscribe();
      unsubscribeAlerts();
    });
  }),
];
