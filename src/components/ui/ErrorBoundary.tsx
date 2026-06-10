import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useTranslation } from '@/stores/languageStore';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  level?: 'page' | 'section' | 'widget';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(`[ErrorBoundary:${this.props.level ?? 'unknown'}]`, error, errorInfo);
  }

  handleReset = (): void => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <DefaultErrorFallback
          level={this.props.level ?? 'section'}
          error={this.state.error}
          onReset={this.handleReset}
        />
      );
    }
    return this.props.children;
  }
}

interface DefaultErrorFallbackProps {
  level: 'page' | 'section' | 'widget';
  error: Error | null;
  onReset: () => void;
}

function DefaultErrorFallback({ level, error, onReset }: DefaultErrorFallbackProps) {
  const { t } = useTranslation();
  const showDebug = import.meta.env.DEV && error?.message;

  if (level === 'widget') {
    return (
      <span className="text-sm text-[var(--status-critical)]">
        {t('errorWidgetMessage')}
      </span>
    );
  }

  if (level === 'page') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-8">
        <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
          {t('errorPageTitle')}
        </h2>
        <p className="text-[var(--text-secondary)] max-w-md text-center">
          {t('errorBody')}
        </p>
        {showDebug ? (
          <p className="text-xs text-[var(--text-muted)] font-mono max-w-md text-center break-all">
            {error?.message}
          </p>
        ) : null}
        <button
          onClick={onReset}
          className="px-4 py-2 bg-[var(--accent-primary)] hover:opacity-90 text-white rounded-md transition-colors text-sm font-medium"
        >
          {t('errorRetry')}
        </button>
      </div>
    );
  }

  // section level
  return (
    <div className="border border-[var(--status-critical)]/40 rounded-md p-4 my-2 bg-[var(--status-critical-muted)]">
      <p className="font-medium text-[var(--status-critical)]">{t('errorSectionTitle')}</p>
      <p className="text-sm text-[var(--text-secondary)] mt-1">
        {t('errorBody')}
      </p>
      {showDebug ? (
        <p className="text-xs text-[var(--text-muted)] font-mono mt-1 break-all">
          {error?.message}
        </p>
      ) : null}
      <button
        onClick={onReset}
        className="mt-2 px-3 py-1 text-sm bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded hover:bg-[var(--bg-inset)] text-[var(--text-primary)] transition-colors"
      >
        {t('errorRetry')}
      </button>
    </div>
  );
}
