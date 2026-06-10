import { useInstallationStore } from '@/stores/installationStore';
import { useVariablesStore } from '@/stores/variablesStore';
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

  // Seed a single LIT301 widget on the telemetry page so it never lands blank.
  // Only when the visitor hasn't customized — respect persisted state.
  const variablesState = useVariablesStore.getState();
  if (variablesState.widgets.length === 0) {
    variablesState.setWidgets([{ id: 'LIT301', size: 'half' }]);
  }
}
