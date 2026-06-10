import { http, HttpResponse, bypass } from 'msw';

const TOUR_WIZARD_FLAG = 'demo.tourWizard';

async function loadBranding() {
  const res = await fetch(bypass('/swat/demo-branding.json'));
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
];
