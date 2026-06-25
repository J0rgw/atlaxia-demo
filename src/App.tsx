import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { LoginPage } from '@/pages/LoginPage';
import { useAuthStore } from '@/stores/authStore';
import { useAccessGateStore } from '@/stores/accessGateStore';
import { useInstallationStore } from '@/stores/installationStore';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { TelemetryProvider } from '@/contexts/TelemetryContext';

const SetupWizard = lazy(() =>
  import('@/pages/setup/SetupWizard').then((m) => ({ default: m.SetupWizard }))
);
const OverviewPage = lazy(() =>
  import('@/pages/OverviewPage').then((m) => ({ default: m.OverviewPage }))
);
const VariablesPage = lazy(() =>
  import('@/pages/VariablesPage').then((m) => ({ default: m.VariablesPage }))
);
const NetworkStatusPage = lazy(() =>
  import('@/pages/NetworkStatusPage').then((m) => ({ default: m.NetworkStatusPage }))
);
const PoliciesPage = lazy(() =>
  import('@/pages/PoliciesPage').then((m) => ({ default: m.PoliciesPage }))
);
const AnomaliesPage = lazy(() =>
  import('@/pages/AnomaliesPage').then((m) => ({ default: m.AnomaliesPage }))
);
const ControlPage = lazy(() =>
  import('@/pages/ControlPage').then((m) => ({ default: m.ControlPage }))
);
const SettingsPage = lazy(() =>
  import('@/pages/settings/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);
const MachinesPage = lazy(() =>
  import('@/pages/MachinesPage').then((m) => ({ default: m.MachinesPage }))
);
const AlertsPage = lazy(() =>
  import('@/pages/AlertsPage').then((m) => ({ default: m.AlertsPage }))
);
const CustomPageRenderer = lazy(() =>
  import('@/pages/CustomPageRenderer').then((m) => ({ default: m.CustomPageRenderer }))
);
const DataOverviewPage = lazy(() =>
  import('@/pages/DataOverviewPage').then((m) => ({ default: m.DataOverviewPage }))
);
const NetworkOverviewPage = lazy(() =>
  import('@/pages/NetworkOverviewPage').then((m) => ({ default: m.NetworkOverviewPage }))
);
const BadgesPage = lazy(() =>
  import('@/pages/dev/BadgesPage').then((m) => ({ default: m.BadgesPage }))
);
const IconsPage = lazy(() =>
  import('@/pages/dev/IconsPage').then((m) => ({ default: m.IconsPage }))
);

function RouteFallback() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="flex items-center gap-3">
        <svg className="animate-spin h-5 w-5 text-[var(--accent-primary)]" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-[var(--text-secondary)] text-sm">Cargando...</span>
      </div>
    </div>
  );
}

const IS_DEMO = import.meta.env.MODE === 'demo';

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const loadSession = useAuthStore((state) => state.loadSession);
  const isLoading = useAuthStore((state) => state.isLoading);
  const gateUnlocked = useAccessGateStore((state) => state.unlocked);

  const fetchConfig = useInstallationStore((state) => state.fetchConfig);
  const config = useInstallationStore((state) => state.config);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Load installation config when authenticated
  useEffect(() => {
    if (isAuthenticated && !config) {
      fetchConfig();
    }
  }, [isAuthenticated, config, fetchConfig]);

  if (isLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-6 w-6 text-[var(--accent-primary)]" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-[var(--text-secondary)]">Cargando...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Demo password gate: until it is unlocked, every route resolves to the
    // landing/password screen so /setup and /dev/* can't be reached directly
    // by URL. The gate is demo-only — real installations rely on backend auth.
    if (IS_DEMO && !gateUnlocked) {
      return (
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="*" element={<ErrorBoundary level="page"><LoginPage /></ErrorBoundary>} />
          </Routes>
        </Suspense>
      );
    }

    return (
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<ErrorBoundary level="page"><LoginPage /></ErrorBoundary>} />
          <Route path="/setup" element={<ErrorBoundary level="page"><SetupWizard /></ErrorBoundary>} />
          <Route path="/dev/badges" element={<ErrorBoundary level="page"><BadgesPage /></ErrorBoundary>} />
          <Route path="/dev/icons" element={<ErrorBoundary level="page"><IconsPage /></ErrorBoundary>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <ThemeProvider>
      <TelemetryProvider>
        <AppLayout>
          <Suspense fallback={<RouteFallback />}>
          <Routes>
          <Route path="/login" element={<Navigate to="/" replace />} />

          <Route path="/" element={
            <ProtectedRoute requiredPage="overview">
              <ErrorBoundary level="page">
                <OverviewPage />
              </ErrorBoundary>
            </ProtectedRoute>
          } />

          <Route path="/data" element={
            <ProtectedRoute requiredPage="data-overview">
              <ErrorBoundary level="page">
                <DataOverviewPage />
              </ErrorBoundary>
            </ProtectedRoute>
          } />

          <Route path="/network" element={
            <ProtectedRoute requiredPage="network-overview">
              <ErrorBoundary level="page">
                <NetworkOverviewPage />
              </ErrorBoundary>
            </ProtectedRoute>
          } />

          <Route path="/telemetry" element={
            <ProtectedRoute requiredPage="variables">
              <ErrorBoundary level="page">
                <VariablesPage />
              </ErrorBoundary>
            </ProtectedRoute>
          } />

          <Route path="/sniffer" element={
            <ProtectedRoute requiredPage="network">
              <ErrorBoundary level="page">
                <NetworkStatusPage />
              </ErrorBoundary>
            </ProtectedRoute>
          } />

          <Route path="/policies" element={
            <ProtectedRoute requiredPage="policies">
              <ErrorBoundary level="page">
                <PoliciesPage />
              </ErrorBoundary>
            </ProtectedRoute>
          } />

          <Route path="/anomalies" element={
            <ProtectedRoute requiredPage="anomalies">
              <ErrorBoundary level="page">
                <AnomaliesPage />
              </ErrorBoundary>
            </ProtectedRoute>
          } />

          <Route path="/control" element={
            <ProtectedRoute requiredPage="control">
              <ErrorBoundary level="page">
                <ControlPage />
              </ErrorBoundary>
            </ProtectedRoute>
          } />

          <Route path="/plant" element={
            <ProtectedRoute requiredPage="machines">
              <ErrorBoundary level="page">
                <MachinesPage />
              </ErrorBoundary>
            </ProtectedRoute>
          } />

          <Route path="/machines" element={<Navigate to="/plant" replace />} />
          <Route path="/variables" element={<Navigate to="/telemetry" replace />} />

          <Route path="/logs" element={
            <ProtectedRoute requiredPage="logs">
              <ErrorBoundary level="page">
                <PlaceholderPage title="Logs" />
              </ErrorBoundary>
            </ProtectedRoute>
          } />

          <Route path="/alerts" element={
            <ProtectedRoute requiredPage="alerts">
              <ErrorBoundary level="page">
                <AlertsPage />
              </ErrorBoundary>
            </ProtectedRoute>
          } />

          <Route path="/settings" element={
            <ProtectedRoute>
              <ErrorBoundary level="page">
                <SettingsPage />
              </ErrorBoundary>
            </ProtectedRoute>
          } />

          <Route path="/custom/:slug" element={
            <ProtectedRoute>
              <ErrorBoundary level="page">
                <CustomPageRenderer />
              </ErrorBoundary>
            </ProtectedRoute>
          } />

          <Route path="/dev/badges" element={<ErrorBoundary level="page"><BadgesPage /></ErrorBoundary>} />
          <Route path="/dev/icons" element={<ErrorBoundary level="page"><IconsPage /></ErrorBoundary>} />

          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </AppLayout>
      </TelemetryProvider>
    </ThemeProvider>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">{title}</h1>
        <p className="text-[var(--text-secondary)]">Esta pagina esta en desarrollo</p>
      </div>
    </div>
  );
}

export default App;
