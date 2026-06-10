import { http, HttpResponse, bypass } from 'msw';

interface DemoSensorMapping {
  thingsboard_key: string;
  min?: number;
  max?: number;
}

let cachedSensorKeys: string[] | null = null;

async function getDemoSensorKeys(): Promise<string[]> {
  if (cachedSensorKeys) return cachedSensorKeys;
  try {
    const res = await fetch(bypass('/swat/demo-sensors.json'));
    if (!res.ok) {
      cachedSensorKeys = [];
      return cachedSensorKeys;
    }
    const fixture = (await res.json()) as { mapping: Record<string, DemoSensorMapping> };
    cachedSensorKeys = Object.values(fixture.mapping).map((m) => m.thingsboard_key);
    return cachedSensorKeys;
  } catch {
    cachedSensorKeys = [];
    return cachedSensorKeys;
  }
}

export const telemetryHandlers = [
  http.get('/api/telemetry/snapshot', async () => {
    const keys = await getDemoSensorKeys();
    const sensors = Object.fromEntries(keys.map((k) => [k, 0]));
    return HttpResponse.json({ sensors, ts: Date.now() });
  }),
];
