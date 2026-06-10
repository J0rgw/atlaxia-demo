import { useInstallationStore } from '@/stores/installationStore';
import { useVariablesStore } from '@/stores/variablesStore';
import { useCustomPagesStore } from '@/stores/customPagesStore';
import type { SensorMapping, SensorCategory, PageId, AdminUserSetup } from '@/types/installation';
import type { CustomPageState } from '@/types/customPages';

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
  // Reset the theme to light on every demo boot. The product writes the
  // wizard's previewMode toggle to localStorage, which would otherwise
  // sticky-stick across sessions. Visitor toggles within a session still
  // work; the reload always resets to light.
  try {
    localStorage.setItem('theme-mode', 'light');
  } catch {
    // Storage unavailable — bootstrap defaults take over.
  }

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

  // Seed one custom page so the sidebar shows the feature without forcing the
  // visitor to create one first.
  const customState = useCustomPagesStore.getState();
  if (customState.pages.length === 0) {
    const seeded: CustomPageState = {
      definition: {
        id: 'custom-demo01',
        name: 'Plant overview (custom)',
        icon: 'layout-dashboard',
        slug: 'plant-overview',
        createdAt: new Date(0).toISOString(),
        enabled: true,
        order: 0,
      },
      widgets: [
        { id: 'kpi-strip', size: 'full' },
        { id: 'radar', size: 'half' },
        { id: 'anomaly-scatter', size: 'half' },
        { id: 'event-log', size: 'full' },
      ],
    };
    useCustomPagesStore.setState({ pages: [seeded] });
  }
}
