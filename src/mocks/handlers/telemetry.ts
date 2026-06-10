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
];
