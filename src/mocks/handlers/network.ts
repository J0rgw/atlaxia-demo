import { http, HttpResponse } from 'msw';
import { replay } from '../replay';

export const networkHandlers = [
  http.get('/api/network/alerts', ({ request }) => {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit') ?? 50);
    const offset = Number(url.searchParams.get('offset') ?? 0);
    const alertType = url.searchParams.get('alert_type') ?? undefined;
    return HttpResponse.json(replay.getNetworkAlerts({ limit, offset, alertType }));
  }),

  http.put('/api/network/alerts/:id/acknowledge', ({ params }) => {
    const id = Number(params.id);
    return HttpResponse.json({ id, acknowledged: true, message: 'ok' });
  }),

  http.get('/api/network/alerts/timeline', () => HttpResponse.json({ buckets: [] })),
];
