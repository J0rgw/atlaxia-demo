import { http, HttpResponse, bypass } from 'msw';
import { replay, type DemoNetworkAlert } from '../replay';

interface NetworkFixture {
  devices: unknown[];
  deviceCounts: unknown[];
  topology: unknown;
  whitelist: { entries: unknown[] };
  snortRules: unknown[];
  snortRulesStats: { total: number; enabled: number; disabled: number };
  snortTemplates: unknown[];
  seedAlerts: DemoNetworkAlert[];
}

let cached: NetworkFixture | null = null;
let seeded = false;
async function load(): Promise<NetworkFixture> {
  if (cached) return cached;
  const res = await fetch(bypass('/swat/network-fixtures.json'));
  cached = (await res.json()) as NetworkFixture;
  if (!seeded) {
    replay.seedNetworkAlerts(cached.seedAlerts);
    seeded = true;
  }
  return cached;
}

export const networkHandlers = [
  http.get('/api/network/devices', async () => {
    const f = await load();
    const devicesAny = f.devices as Array<{ status: { authorized: boolean } }>;
    const authorized = devicesAny.filter((d) => d.status.authorized).length;
    return HttpResponse.json({
      devices: f.devices,
      deviceCounts: f.deviceCounts,
      total: devicesAny.length,
      authorized,
      unauthorized: devicesAny.length - authorized,
    });
  }),

  http.get('/api/network/topology', async () => {
    const f = await load();
    return HttpResponse.json(f.topology as Record<string, unknown>);
  }),

  http.get('/api/network/alerts', async ({ request }) => {
    await load();
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit') ?? 50);
    const offset = Number(url.searchParams.get('offset') ?? 0);
    const alertType = url.searchParams.get('alert_type') ?? undefined;
    return HttpResponse.json(replay.getNetworkAlerts({ limit, offset, alertType }));
  }),

  http.put('/api/network/alerts/:id/acknowledge', ({ params }) => {
    const id = Number(params.id);
    return HttpResponse.json({ id, acknowledged: true, message: 'ok' });
  }),

  http.get('/api/network/alerts/timeline', () => HttpResponse.json({ buckets: [] })),

  http.get('/api/network/whitelist', async () => {
    const f = await load();
    return HttpResponse.json({ entries: f.whitelist.entries, total: f.whitelist.entries.length });
  }),

  http.post('/api/network/whitelist', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: Date.now(), ...body, createdAt: null, updatedAt: null });
  }),

  http.put('/api/network/whitelist/:id', async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: Number(params.id), ...body, createdAt: null, updatedAt: null });
  }),

  http.delete('/api/network/whitelist/:id', () => HttpResponse.json({ ok: true })),

  http.get('/api/network/snort/rules', async () => {
    const f = await load();
    return HttpResponse.json({
      rules: f.snortRules,
      total: f.snortRulesStats.total,
      enabled: f.snortRulesStats.enabled,
      disabled: f.snortRulesStats.disabled,
    });
  }),

  http.post('/api/network/snort/rules', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: Date.now(), ...body, createdAt: null, updatedAt: null });
  }),

  http.put('/api/network/snort/rules/:id', async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: Number(params.id), ...body, createdAt: null, updatedAt: null });
  }),

  http.put('/api/network/snort/rules/:id/toggle', async ({ params }) => {
    const f = await load();
    const id = Number(params.id);
    const rule = (f.snortRules as Array<{ id: number; isEnabled: boolean }>).find((r) => r.id === id);
    return HttpResponse.json({ ...(rule ?? { id }), isEnabled: !(rule?.isEnabled ?? false) });
  }),

  http.delete('/api/network/snort/rules/:id', () => HttpResponse.json({ ok: true })),

  http.post('/api/network/snort/sync', () => HttpResponse.json({ ok: true, synced: true })),
  http.post('/api/network/snort/import', () => HttpResponse.json({ ok: true, imported: 0 })),

  http.get('/api/network/snort/templates', async () => {
    const f = await load();
    return HttpResponse.json({ templates: f.snortTemplates });
  }),
];
