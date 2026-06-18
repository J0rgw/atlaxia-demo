import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
    },
  },
});

// Recover every React Query consumer after the tab returns from the background.
// While hidden, browsers throttle timers and (in the MSW demo) evict the service
// worker, so in-flight fetches can fail and leave queries stuck in an error
// state — e.g. "Error loading devices / topology" on the network pages. React
// Query's default focus refetch skips any hook that opted out with
// refetchOnWindowFocus:false, so we force a refetch of all active queries on
// visibility regain. Combined with the api-client's transient retry (which
// gives the worker time to wake) the pages repopulate within a couple of
// seconds without a reload. See .demo-plan/0-bug-background-tab-freeze.md.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void queryClient.refetchQueries({ type: 'active' });
    }
  });
}
