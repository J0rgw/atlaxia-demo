import { http, HttpResponse, bypass, delay } from 'msw';

const TOUR_WIZARD_FLAG = 'demo.tourWizard';

async function loadBranding() {
  const res = await fetch(bypass('/swat/demo-branding.json'));
  return res.json();
}

async function loadSensors() {
  const res = await fetch(bypass('/swat/demo-sensors.json'));
  return res.json();
}

async function loadPages() {
  const res = await fetch(bypass('/swat/demo-pages.json'));
  return res.json();
}

export const installationHandlers = [
  http.get('/api/installation/branding', async () => {
    const branding = await loadBranding();
    return HttpResponse.json(branding);
  }),

  http.get('/api/installation/status', async () => {
    const tourWizard = localStorage.getItem(TOUR_WIZARD_FLAG) === 'true';
    const branding = await loadBranding();
    return HttpResponse.json({
      setup_completed: !tourWizard,
      has_users: !tourWizard,
      installation_name: branding.installation_name,
    });
  }),

  http.post('/api/installation/setup', async () => {
    await delay(4000);
    localStorage.removeItem(TOUR_WIZARD_FLAG);
    return HttpResponse.json({});
  }),

  http.post('/api/installation/provision', async () => {
    await delay(1500);
    return HttpResponse.json({
      status: 'completed',
      devices_created: 51,
      buckets_created: 6,
      errors: [],
    });
  }),

  http.get('/api/installation/config', async () => {
    const [branding, sensors, pages] = await Promise.all([
      loadBranding(),
      loadSensors(),
      loadPages(),
    ]);
    return HttpResponse.json({
      installation_name: branding.installation_name,
      logo_url: branding.logo_url,
      theme_primary: branding.theme_primary,
      theme_secondary: branding.theme_secondary,
      theme_accent: branding.theme_accent,
      theme_variant: branding.theme_variant,
      sensors_config: sensors,
      pages_config: pages,
      features_config: {},
    });
  }),

  http.put('/api/installation/config', async ({ request }) => {
    const body = await request.json();
    const [branding, sensors, pages] = await Promise.all([
      loadBranding(),
      loadSensors(),
      loadPages(),
    ]);
    return HttpResponse.json({
      installation_name: branding.installation_name,
      logo_url: branding.logo_url,
      theme_primary: branding.theme_primary,
      theme_secondary: branding.theme_secondary,
      theme_accent: branding.theme_accent,
      theme_variant: branding.theme_variant,
      sensors_config: sensors,
      pages_config: pages,
      features_config: {},
      ...(body as Record<string, unknown>),
    });
  }),
];
