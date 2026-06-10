import { authHandlers } from './auth';
import { installationHandlers } from './installation';
import { telemetryHandlers } from './telemetry';

export const handlers = [...authHandlers, ...installationHandlers, ...telemetryHandlers];
