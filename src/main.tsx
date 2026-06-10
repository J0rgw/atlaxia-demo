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
    // Start the SWAT replay engine in the background. CSV fetch + parse takes
    // a couple of seconds; the login + overview render comfortably before
    // it's needed.
    const { replay } = await import('./mocks/replay');
    void replay.init();
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
