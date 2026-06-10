import { http, HttpResponse } from 'msw';
import { replay } from '../replay';

export const inferenceHandlers = [
  http.get('/api/inference/models', () => HttpResponse.json(replay.getModels())),

  http.get('/api/inference/health-summary', () => HttpResponse.json(replay.getInferenceHealth())),

  http.get('/api/inference/latest', () => HttpResponse.json({ models: replay.getLatestInferenceMap() })),

  http.get('/api/inferences/history', ({ request }) => {
    const url = new URL(request.url);
    const startTs = Number(url.searchParams.get('startTs') ?? 0);
    const endTs = Number(url.searchParams.get('endTs') ?? 0);
    return HttpResponse.json({ events: [], startTs, endTs });
  }),
];
