import { useInstallationStore } from '@/stores/installationStore';
import type { SensorMapping, SensorCategory, PageId, AdminUserSetup } from '@/types/installation';

interface DemoSensorsFixture {
  categories: SensorCategory[];
  mapping: Record<string, SensorMapping>;
  defaultSelected: string[];
}

interface DemoPagesFixture {
  enabled: PageId[];
  default: PageId;
}

type DemoAdminFixture = AdminUserSetup;

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function seedDemoState() {
  const store = useInstallationStore.getState();

  if (Object.keys(store.setupData.sensors_config.mapping).length === 0) {
    const sensors = await fetchJson<DemoSensorsFixture>('/swat/demo-sensors.json');
    if (sensors) {
      store.updateSensorsConfig({
        mapping: sensors.mapping,
        categories: sensors.categories,
        defaultSelected: sensors.defaultSelected,
      });
    }
  }

  const pages = await fetchJson<DemoPagesFixture>('/swat/demo-pages.json');
  if (pages) {
    store.updatePagesConfig({
      enabled: pages.enabled,
      default: pages.default,
    });
  }

  const admin = await fetchJson<DemoAdminFixture>('/swat/demo-admin.json');
  if (admin) {
    store.updateAdminUser(admin);
  }
}
