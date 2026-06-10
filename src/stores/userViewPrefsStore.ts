import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserViewPrefsState {
  hiddenPages: string[];
  hiddenSensors: string[];
  togglePage: (pageId: string) => void;
  toggleSensor: (sensorKey: string) => void;
  isPageHidden: (pageId: string) => boolean;
  isSensorHidden: (sensorKey: string) => boolean;
  reset: () => void;
}

export const useUserViewPrefsStore = create<UserViewPrefsState>()(
  persist(
    (set, get) => ({
      hiddenPages: [],
      hiddenSensors: [],

      togglePage: (pageId: string) => {
        const { hiddenPages } = get();
        set({
          hiddenPages: hiddenPages.includes(pageId)
            ? hiddenPages.filter((id) => id !== pageId)
            : [...hiddenPages, pageId],
        });
      },

      toggleSensor: (sensorKey: string) => {
        const { hiddenSensors } = get();
        set({
          hiddenSensors: hiddenSensors.includes(sensorKey)
            ? hiddenSensors.filter((k) => k !== sensorKey)
            : [...hiddenSensors, sensorKey],
        });
      },

      isPageHidden: (pageId: string) => get().hiddenPages.includes(pageId),
      isSensorHidden: (sensorKey: string) => get().hiddenSensors.includes(sensorKey),

      reset: () => set({ hiddenPages: [], hiddenSensors: [] }),
    }),
    {
      name: 'atlaxia-view-prefs',
    }
  )
);
