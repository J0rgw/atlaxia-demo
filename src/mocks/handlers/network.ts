import { http, HttpResponse } from 'msw';

export const networkHandlers = [
  http.get('/api/network/alerts', ({ request }) => {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit') ?? 50);
    const offset = Number(url.searchParams.get('offset') ?? 0);
    return HttpResponse.json({
      alerts: [],
      total: 0,
      offset,
      limit,
      byType: { Emergencia: 0, Alerta: 0, Aviso: 0 },
    });
  }),
];
