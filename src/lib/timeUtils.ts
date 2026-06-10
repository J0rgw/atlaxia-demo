/**
 * Shared time formatting utilities used across sensor cards,
 * diagnostics panels, and notification dropdowns.
 */

/**
 * Format elapsed seconds into a human-readable relative time string.
 * Used by DiagnosticsPanel and similar components that already have seconds.
 */
export function formatElapsedSeconds(seconds: number | null, neverLabel = 'never'): string {
  if (seconds === null) return neverLabel;
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  const days = Math.floor(seconds / 86400);
  return days === 1 ? '1 day ago' : `${days}d ago`;
}

/**
 * Format a timestamp into a short relative time string.
 * Used by NotificationsDropdown and similar timestamp-based displays.
 */
export function formatTimestamp(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  return new Date(timestamp).toLocaleDateString();
}

export interface FreshnessInfo {
  text: string;
  color: string;
}

/**
 * Compute freshness text + color class for a timestamp.
 * Used by SensorCard's FreshnessBadge for detailed data-age display.
 */
export function getFreshnessInfo(timestamp: number): FreshnessInfo {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 5) {
    return {
      text: 'just now',
      color: 'text-[var(--status-normal)] bg-[var(--status-normal-muted)]',
    };
  }
  if (seconds < 30) {
    return {
      text: `${seconds}s ago`,
      color: 'text-[var(--status-normal)] bg-[var(--status-normal-muted)]',
    };
  }
  if (seconds < 60) {
    return {
      text: `${seconds}s ago`,
      color: 'text-[var(--status-advisory)] bg-[var(--status-advisory-muted)]',
    };
  }
  if (seconds < 300) {
    return {
      text: `${Math.floor(seconds / 60)}m ago`,
      color: 'text-[var(--status-warning)] bg-[var(--status-warning-muted)]',
    };
  }
  if (seconds < 3600) {
    return {
      text: `${Math.floor(seconds / 60)}m ago`,
      color: 'text-[var(--status-critical)] bg-[var(--status-critical-muted)]',
    };
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return {
      text: `${hours}h ago`,
      color: 'text-[var(--status-critical)] bg-[var(--status-critical-muted)]',
    };
  }
  if (seconds < 604800) {
    const days = Math.floor(seconds / 86400);
    return {
      text: days === 1 ? '1 day ago' : `${days}d ago`,
      color: 'text-[var(--text-muted)] bg-[var(--bg-inset)]',
    };
  }

  return {
    text: new Date(timestamp).toLocaleDateString(),
    color: 'text-[var(--text-muted)] bg-[var(--bg-inset)]',
  };
}
