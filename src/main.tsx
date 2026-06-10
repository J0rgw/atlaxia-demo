import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import './index.css';
import App from './App';

async function bootstrap() {
  if (import.meta.env.MODE === 'demo') {
    const { worker } = await import('./mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass' });
    const { seedDemoState } = await import('./demo/seedDemoState');
    await seedDemoState();
    // Await the SWAT replay engine. CSV parse takes ~1-2s. Awaiting here is
    // cheap (single time on boot) and means every downstream consumer —
    // watchdog poll, /api/machines/sensors, WS bridge — gets real values on
    // the very first request instead of empty defaults that visibly clear
    // sensorValues each poll.
    const { replay } = await import('./mocks/replay');
    try {
      await replay.init();
    } catch (err) {
      console.error('[main] Replay engine init failed; dashboards will render empty.', err);
    }
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </StrictMode>
  );
}

void bootstrap();
