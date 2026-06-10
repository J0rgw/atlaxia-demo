import { http, HttpResponse } from 'msw';
import { replay } from '../replay';

export const sensorsHandlers = [
  http.get('/api/sensors/alarms', () => HttpResponse.json(replay.getActiveAlarms())),
  http.get('/api/sensors/process-status', () => HttpResponse.json(replay.getProcessStatus())),
  http.get('/api/anomalies', ({ request }) => {
    const url = new URL(request.url);
    const threshold = Number(url.searchParams.get('threshold') ?? 0.7);
    return HttpResponse.json(replay.getAnomalies(threshold));
  }),
];
