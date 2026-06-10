/**
 * Centralized logging service
 * In production, these logs are suppressed or sent to a monitoring service
 * In development, they're displayed in the console
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  prefix?: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const isDev = import.meta.env.DEV;

const defaultConfig: LoggerConfig = {
  enabled: isDev,
  level: isDev ? 'debug' : 'error',
};

function shouldLog(level: LogLevel, config: LoggerConfig): boolean {
  if (!config.enabled) return false;
  return LOG_LEVELS[level] >= LOG_LEVELS[config.level];
}

function formatMessage(prefix: string | undefined, message: string): string {
  return prefix ? `[${prefix}] ${message}` : message;
}

function createLogger(config: LoggerConfig = defaultConfig) {
  return {
    debug: (message: string, ...args: unknown[]) => {
      if (shouldLog('debug', config)) {
        console.debug(formatMessage(config.prefix, message), ...args);
      }
    },
    info: (message: string, ...args: unknown[]) => {
      if (shouldLog('info', config)) {
        console.info(formatMessage(config.prefix, message), ...args);
      }
    },
    warn: (message: string, ...args: unknown[]) => {
      if (shouldLog('warn', config)) {
        console.warn(formatMessage(config.prefix, message), ...args);
      }
    },
    error: (message: string, ...args: unknown[]) => {
      if (shouldLog('error', config)) {
        console.error(formatMessage(config.prefix, message), ...args);
      }
    },
  };
}

// Default logger instance
export const logger = createLogger();

// Create namespaced loggers for different modules
export const wsLogger = createLogger({ ...defaultConfig, prefix: 'WS' });
export const apiLogger = createLogger({ ...defaultConfig, prefix: 'API' });
export const storageLogger = createLogger({ ...defaultConfig, prefix: 'Storage' });

export { createLogger };
export type { LoggerConfig, LogLevel };
