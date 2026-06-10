import { http, HttpResponse } from 'msw';

export const healthHandler = http.get('/api/health', () =>
  HttpResponse.json({ status: 'ok', source: 'msw-demo' })
);
