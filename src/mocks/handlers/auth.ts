import { http, HttpResponse } from 'msw';

const DEMO_TOKENS = {
  access_token: 'demo-access-token',
  refresh_token: 'demo-refresh-token',
  token_type: 'bearer',
  expires_in: 3600,
};

const DEMO_SESSION = {
  id: 1,
  username: 'demo',
  email: 'demo@atlaxia.example',
  is_active: true,
  is_superuser: false,
  role: 'admin',
  license: {
    id: 1,
    name: 'Demo License',
    code: 'demo-full',
    enabled_sensors: [],
    enabled_pages: [
      'overview',
      'data-overview',
      'network-overview',
      'variables',
      'network',
      'policies',
      'anomalies',
      'control',
      'machines',
      'logs',
      'alerts',
    ],
    is_active: true,
    expires_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  effective_pages: [
    'overview',
    'data-overview',
    'network-overview',
    'variables',
    'network',
    'policies',
    'anomalies',
    'control',
    'machines',
    'logs',
    'alerts',
  ],
  effective_sensors: [],
  effective_permissions: ['manage_users', 'manage_settings', 'manage_network', 'manage_alerts'],
  theme_variant: 'scada',
};

export const authHandlers = [
  http.post('/api/auth/login', () => HttpResponse.json(DEMO_TOKENS)),

  http.post('/api/auth/refresh', () => HttpResponse.json(DEMO_TOKENS)),

  http.get('/api/auth/me', () => HttpResponse.json(DEMO_SESSION)),

  http.put('/api/auth/me/theme', async ({ request }) => {
    const body = (await request.json()) as { theme_variant: string | null };
    return HttpResponse.json({ ...DEMO_SESSION, theme_variant: body.theme_variant });
  }),

  http.post('/api/auth/password', () => HttpResponse.json({ status: 'ok' })),
];
