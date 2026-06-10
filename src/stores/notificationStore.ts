import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error';
  alertType: string;
  name: string;
  macOrigin?: string;
  ipOrigin?: string;
  timestamp: number;
  read: boolean;
  dismissed: boolean;
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'read' | 'dismissed'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
}

const MAX_NOTIFICATIONS = 50;

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: [],

      addNotification: (notification) =>
        set((state) => {
          const newNotification: Notification = {
            ...notification,
            read: false,
            dismissed: false,
          };
          const updated = [newNotification, ...state.notifications]
            .filter((n) => !n.dismissed)
            .slice(0, MAX_NOTIFICATIONS);
          return { notifications: updated };
        }),

      markAsRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),

      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),

      dismiss: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      clearAll: () => set({ notifications: [] }),
    }),
    {
      name: 'atlaxia-notifications',
    }
  )
);
