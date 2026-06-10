import { authHandlers } from './auth';
import { installationHandlers } from './installation';

export const handlers = [...authHandlers, ...installationHandlers];
