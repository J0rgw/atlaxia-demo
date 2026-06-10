import { http, HttpResponse } from 'msw';
import { replay } from '../replay';

export const telemetryHandlers = [
  http.get('/api/telemetry/snapshot', () => {
    const snap = replay.getSnapshot();
    return HttpResponse.json({ sensors: snap.sensors, ts: snap.timestamp });
  }),

  http.get('/api/machines/snapshot', () => {
    const snap = replay.getSnapshot();
    return HttpResponse.json({ sensors: snap.sensors, timestamp: snap.timestamp });
  }),

  http.get('/api/machines/sensors', () => HttpResponse.json(replay.getSensorList())),

  http.get('/api/telemetry/history', ({ request }) => {
    const url = new URL(request.url);
    const keysParam = url.searchParams.get('keys') ?? url.searchParams.get('sensor') ?? '';
    const keys = keysParam.split(',').map((s) => s.trim()).filter(Boolean);
    const startTs = Number(url.searchParams.get('startTs') ?? 0);
    const endTs = Number(url.searchParams.get('endTs') ?? Date.now());
    const interval = Number(url.searchParams.get('interval') ?? 60000);
    return HttpResponse.json(replay.getTelemetryHistory(keys, startTs, endTs, interval));
  }),
];
