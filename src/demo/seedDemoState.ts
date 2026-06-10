import { useInstallationStore } from '@/stores/installationStore';
import type { SensorMapping, SensorCategory } from '@/types/installation';

interface DemoSensorsFixture {
  categories: SensorCategory[];
  mapping: Record<string, SensorMapping>;
  defaultSelected: string[];
}

export async function seedDemoState() {
  const store = useInstallationStore.getState();

  if (Object.keys(store.setupData.sensors_config.mapping).length > 0) {
    return;
  }

  try {
    const res = await fetch('/swat/demo-sensors.json');
    if (!res.ok) return;
    const fixture: DemoSensorsFixture = await res.json();
    store.updateSensorsConfig({
      mapping: fixture.mapping,
      categories: fixture.categories,
      defaultSelected: fixture.defaultSelected,
    });
  } catch {
    // Silent: a failed seed just leaves the wizard empty.
  }
}
