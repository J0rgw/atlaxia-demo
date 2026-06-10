import { useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useSensorsConfig } from '@/hooks/useSensorsConfig';
import type { SensorCategory } from '@/types';

export function useFilteredSensors() {
  const session = useAuthStore((state) => state.session);
  const canAccessSensor = useAuthStore((state) => state.canAccessSensor);

  // Get config-driven sensor configuration
  const { categories, sensorsConfig } = useSensorsConfig();

  // Convert process categories to sensor categories format
  const filteredCategories = useMemo((): SensorCategory[] => {
    if (!session) return [];

    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      sensors: category.sensors.filter((sensorName: string) => {
        // Get the ThingsBoard key from the mapping
        const mapping = sensorsConfig.mapping[sensorName];
        const sensorKey = mapping?.thingsboard_key || sensorName;
        return sensorKey && canAccessSensor(sensorKey);
      }),
    })).filter((category) => category.sensors.length > 0);
  }, [session, canAccessSensor, categories, sensorsConfig.mapping]);

  const allFilteredSensors = useMemo(() => {
    return filteredCategories.flatMap((cat) => cat.sensors);
  }, [filteredCategories]);

  const filteredSensorKeys = useMemo(() => {
    return allFilteredSensors
      .map((name) => {
        const mapping = sensorsConfig.mapping[name];
        return mapping?.thingsboard_key || name;
      })
      .filter(Boolean);
  }, [allFilteredSensors, sensorsConfig.mapping]);

  return {
    filteredCategories,
    allFilteredSensors,
    filteredSensorKeys,
    totalSensors: allFilteredSensors.length,
  };
}
