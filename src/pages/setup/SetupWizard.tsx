/**
 * SetupWizard - Main setup wizard component
 * Orchestrates the 5-step setup process for new installations.
 *
 * The wizard runs *before* authentication, so it sits outside the global
 * <ThemeProvider>. To keep the design tokens working, this component drives
 * the same `<html>` classes (`theme-scada` / `theme-modern` / `dark`) and
 * branding CSS variables itself, mirroring whatever the user is currently
 * picking in the form. The dark/light toggle is exposed to the steps via
 * SetupPreviewContext so IdentityStep can render it next to the template
 * selector.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInstallationStore } from '@/stores/installationStore';
import { StepIndicator } from './components/StepIndicator';
import { IdentityStep } from './steps/IdentityStep';
import { SensorsStep } from './steps/SensorsStep';
import { PagesStep } from './steps/PagesStep';
import { AdminStep } from './steps/AdminStep';
import { SummaryStep } from './steps/SummaryStep';
import { cn } from '@/lib/utils';
import type { ThemeTemplate } from '@/types/installation';
import { SetupPreviewContext } from './previewContext';
import { useUnauthThemeBootstrap, readStoredThemeMode } from '@/hooks/useUnauthThemeBootstrap';
import type { PreviewMode } from '@/hooks/useUnauthThemeBootstrap';

const IS_DEMO = import.meta.env.MODE === 'demo';
const TOUR_WIZARD_FLAG = 'demo.tourWizard';

export function SetupWizard() {
  const navigate = useNavigate();
  const {
    statusLoading,
    fetchStatus,
    setupStep,
    setupData,
    setupLoading,
    setupError,
    nextStep,
    prevStep,
    submitSetup,
    provisioningStatus,
    provisioningError,
    provisionThingsBoard,
  } = useInstallationStore();

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'wizard' | 'provisioning'>('wizard');

  const [previewMode, setPreviewMode] = useState<PreviewMode>(readStoredThemeMode);

  const variant: ThemeTemplate = setupData.installation.theme.template;

  // Drive the same `<html>` classes + branding CSS variables that
  // <ThemeProvider> sets after auth, so the wizard looks branded as the user
  // is configuring it. Cleanup is intentionally not done — the next route
  // (login → app → ThemeProvider) overwrites these values without a flash.
  useUnauthThemeBootstrap(variant, previewMode, setupData.installation.theme);

  // Check if setup is already completed
  useEffect(() => {
    fetchStatus().then((status) => {
      if (status.setup_completed) {
        navigate('/login', { replace: true });
      }
    });
  }, [fetchStatus, navigate]);

  // Validation for each step
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0: // Identity
        return setupData.installation.name.trim().length > 0;

      case 1: // Sensors
        return Object.keys(setupData.sensors_config.mapping).length > 0;

      case 2: // Pages
        return setupData.pages_config.enabled.length > 0;

      case 3: // Admin
        return (
          setupData.admin_user.username.length >= 3 &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(setupData.admin_user.email) &&
          setupData.admin_user.password.length >= 8
        );

      case 4: // Summary
        return true;

      default:
        return false;
    }
  };

  // Handle next button
  const handleNext = () => {
    if (setupStep < 4) {
      nextStep();
    }
  };

  // Handle submit
  const handleSubmit = async () => {
    setSubmitError(null);
    const result = await submitSetup();

    if (result.success) {
      // Start provisioning phase
      setPhase('provisioning');
      const provResult = await provisionThingsBoard();

      if (provResult.status === 'completed' || provResult.status === 'partial') {
        navigate('/login', { replace: true });
      }
      // If failed, stay on provisioning screen with retry option
    } else {
      setSubmitError(result.error || 'Error al completar el setup');
    }
  };

  const handleRetryProvisioning = async () => {
    const result = await provisionThingsBoard();
    if (result.status === 'completed' || result.status === 'partial') {
      navigate('/login', { replace: true });
    }
  };

  const handleSkipProvisioning = () => {
    navigate('/login', { replace: true });
  };

  // Demo escape hatch: clear the opt-in tour flag so /login stops being treated
  // as an incomplete install, then return to the login surface.
  const handleExitWizard = () => {
    localStorage.removeItem(TOUR_WIZARD_FLAG);
    navigate('/login', { replace: true });
  };

  const togglePreviewMode = () => {
    setPreviewMode((m) => (m === 'dark' ? 'light' : 'dark'));
  };

  // Loading state
  if (statusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-inset)]">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-6 w-6 text-[var(--accent-primary)]" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-[var(--text-secondary)]">Verificando estado...</span>
        </div>
      </div>
    );
  }

  // Render current step
  const renderStep = () => {
    switch (setupStep) {
      case 0:
        return <IdentityStep />;
      case 1:
        return <SensorsStep />;
      case 2:
        return <PagesStep />;
      case 3:
        return <AdminStep />;
      case 4:
        return <SummaryStep />;
      default:
        return null;
    }
  };

  // Provisioning phase
  if (phase === 'provisioning') {
    return (
      <div className="min-h-screen bg-[var(--bg-inset)] flex items-center justify-center">
        <div className="bg-[var(--bg-surface)] rounded-md border border-[var(--border-subtle)] shadow-card p-8 max-w-md w-full text-center">
          {provisioningStatus === 'provisioning' && (
            <>
              <svg className="animate-spin h-10 w-10 text-[var(--accent-primary)] mx-auto mb-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Configurando ThingsBoard</h2>
              <p className="text-sm text-[var(--text-secondary)]">Creando dispositivos y perfiles...</p>
            </>
          )}

          {provisioningStatus === 'failed' && (
            <>
              <svg className="w-10 h-10 text-[var(--status-warning)] mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Error de provisioning</h2>
              <p className="text-sm text-[var(--status-critical)] mb-4">{provisioningError}</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleRetryProvisioning}
                  className="px-4 py-2 text-sm font-medium bg-[var(--accent-primary)] text-white rounded-md hover:opacity-90"
                >
                  Reintentar
                </button>
                <button
                  onClick={handleSkipProvisioning}
                  className="px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-inset)] rounded-md"
                >
                  Omitir
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-inset)]">
      {/* Header */}
      <header className="bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-[var(--accent-primary)] rounded-md flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-[var(--text-primary)] truncate">AtlaXia Setup</h1>
              <p className="text-sm text-[var(--text-secondary)] truncate">Configuracion inicial de la instalacion</p>
            </div>
          </div>

          {IS_DEMO && (
            <button
              type="button"
              onClick={handleExitWizard}
              className="shrink-0 px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-inset)] rounded-md transition-colors"
            >
              Volver al login
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Step Indicator */}
        <StepIndicator currentStep={setupStep} />

        {/* Step Content */}
        <div className="mt-8 bg-[var(--bg-surface)] rounded-md border border-[var(--border-subtle)] shadow-card p-4">
          <SetupPreviewContext.Provider value={{ previewMode, togglePreviewMode }}>
            {renderStep()}
          </SetupPreviewContext.Provider>
        </div>

        {/* Error Message */}
        {(setupError || submitError) && (
          <div className="mt-4 p-4 bg-[var(--status-critical-muted)] border border-[var(--status-critical)] rounded-md">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-[var(--status-critical)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-[var(--status-critical)]">{setupError || submitError}</p>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={prevStep}
            disabled={setupStep === 0}
            className={cn(
              'px-6 py-2 text-sm font-medium rounded-md transition-colors',
              setupStep === 0
                ? 'text-[var(--text-muted)] cursor-not-allowed'
                : 'text-[var(--text-primary)] hover:bg-[var(--bg-inset)]'
            )}
          >
            Atras
          </button>

          {setupStep < 4 ? (
            <button
              onClick={handleNext}
              disabled={!isStepValid(setupStep)}
              className={cn(
                'px-6 py-2 text-sm font-medium rounded-md transition-colors',
                isStepValid(setupStep)
                  ? 'bg-[var(--accent-primary)] text-white hover:opacity-90'
                  : 'bg-[var(--bg-inset)] text-[var(--text-secondary)] cursor-not-allowed'
              )}
            >
              Siguiente
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={setupLoading}
              className={cn(
                'px-6 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2',
                setupLoading
                  ? 'bg-[var(--bg-inset)] text-[var(--text-secondary)] cursor-not-allowed'
                  : 'bg-[var(--status-normal)] text-white hover:opacity-90'
              )}
            >
              {setupLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Completando...
                </>
              ) : (
                'Completar Setup'
              )}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

