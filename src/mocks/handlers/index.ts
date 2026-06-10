import { authHandlers } from './auth';
import { installationHandlers } from './installation';
import { telemetryHandlers } from './telemetry';
import { controlHandlers } from './control';
import { sensorsHandlers } from './sensors';
import { inferenceHandlers } from './inference';
import { networkHandlers } from './network';
import { licenseHandlers } from './licenses';
import { websocketHandlers } from './websocket';

export const handlers = [
  ...authHandlers,
  ...installationHandlers,
  ...telemetryHandlers,
  ...controlHandlers,
  ...sensorsHandlers,
  ...inferenceHandlers,
  ...networkHandlers,
  ...licenseHandlers,
  ...websocketHandlers,
];
