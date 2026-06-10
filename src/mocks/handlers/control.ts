import { http, HttpResponse } from 'msw';
import { replay } from '../replay';

export const controlHandlers = [
  http.get('/api/control/indicators', () => {
    const snap = replay.getSnapshot();
    return HttpResponse.json({
      indicators: replay.getControlIndicators(),
      timestamp: snap.timestamp,
      status: 'ok',
    });
  }),
];
