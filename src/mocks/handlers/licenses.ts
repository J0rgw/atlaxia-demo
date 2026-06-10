import { http, HttpResponse, bypass } from 'msw';

interface LicenseUser {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  restricted_pages: string[] | null;
  restricted_sensors: string[] | null;
  elevated_permissions: string[];
}

let cached: LicenseUser[] | null = null;
let nextId = 200;

async function load(): Promise<LicenseUser[]> {
  if (cached) return cached;
  const res = await fetch(bypass('/swat/demo-users.json'));
  cached = (await res.json()) as LicenseUser[];
  return cached;
}

export const licenseHandlers = [
  http.get('/api/licenses/users/:licenseId', async () => {
    const list = await load();
    return HttpResponse.json(list);
  }),

  http.post('/api/licenses/users/technician', async ({ request }) => {
    const body = (await request.json()) as Partial<LicenseUser>;
    const list = await load();
    const user: LicenseUser = {
      id: nextId++,
      username: body.username ?? `tech-${Date.now()}`,
      email: body.email ?? `${body.username ?? 'tech'}@demo-plant.local`,
      role: 'tecnico',
      is_active: body.is_active ?? true,
      restricted_pages: body.restricted_pages ?? null,
      restricted_sensors: body.restricted_sensors ?? null,
      elevated_permissions: body.elevated_permissions ?? [],
    };
    list.push(user);
    return HttpResponse.json(user);
  }),

  http.patch('/api/licenses/users/:userId/permissions', async ({ params, request }) => {
    const body = (await request.json()) as Partial<LicenseUser>;
    const list = await load();
    const id = Number(params.userId);
    const existing = list.find((u) => u.id === id);
    if (!existing) return new HttpResponse(null, { status: 404 });
    Object.assign(existing, body);
    return HttpResponse.json(existing);
  }),

  http.post('/api/installation/logo', async () => HttpResponse.json({ logo_url: '/swat/logo.png' })),
];
