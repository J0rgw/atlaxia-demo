import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { useNotificationStore } from '@/stores/notificationStore';
import { useDashboardStore, DEFAULT_WIDGETS, DEFAULT_FILTERS } from '@/stores/dashboardStore';
import { useMachinesStore } from '@/stores/machinesStore';
import { useVariablesStore } from '@/stores/variablesStore';
import { useCustomPagesStore } from '@/stores/customPagesStore';
import { useUserViewPrefsStore } from '@/stores/userViewPrefsStore';

export type UserRole = 'superadmin' | 'admin' | 'tecnico';

export type Capability =
  | 'manage_users'
  | 'manage_settings'
  | 'manage_network'
  | 'manage_alerts';

export const CAPABILITIES: Capability[] = [
  'manage_users',
  'manage_settings',
  'manage_network',
  'manage_alerts',
];

export interface License {
  id: number;
  name: string;
  code: string;
  enabled_sensors: string[];
  enabled_pages: string[];
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  is_superuser: boolean;
}

export type ThemeVariant = 'scada' | 'modern';

export interface AuthSession {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  role: string;
  license: License | null;
  effective_pages: string[];
  effective_sensors: string[];
  effective_permissions: Capability[];
  theme_variant: ThemeVariant | null;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loadSession: () => Promise<void>;
  clearError: () => void;
  updateThemeVariant: (variant: ThemeVariant | null) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;

  canAccessPage: (pageId: string) => boolean;
  canAccessSensor: (sensorKey: string) => boolean;
  canManage: (capability: Capability) => boolean;
  isAdmin: () => boolean;
  isSuperadmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const tokens = await api.login(username, password);

          set({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
          });

          const session = await api.get<AuthSession>('/api/auth/me');

          set({
            session,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err) {
          set({
            isLoading: false,
            error: (err as { detail?: string }).detail || 'Error de autenticacion',
          });
          throw err;
        }
      },

      logout: () => {
        set({
          accessToken: null,
          refreshToken: null,
          session: null,
          isAuthenticated: false,
          error: null,
        });

        useNotificationStore.setState({ notifications: [] });
        useDashboardStore.setState({
          widgets: DEFAULT_WIDGETS,
          editMode: false,
          filters: DEFAULT_FILTERS,
        });
        useMachinesStore.setState({
          widgets: [],
          editMode: false,
          viewMode: 'cards',
          selectedProcess: null,
          showDiagnostics: false,
        });
        useVariablesStore.setState({ widgets: [], editMode: false });
        useCustomPagesStore.setState({ pages: [], editingPageId: null });
        useUserViewPrefsStore.setState({ hiddenPages: [], hiddenSensors: [] });

        queryClient.clear();

        try {
          localStorage.removeItem('atlaxia-auth');
        } catch {
          // localStorage unavailable — persist middleware already cleared in-memory state above
        }
      },

      loadSession: async () => {
        const { accessToken } = get();
        if (!accessToken) {
          set({ isAuthenticated: false });
          return;
        }

        set({ isLoading: true });
        try {
          const session = await api.get<AuthSession>('/api/auth/me');
          set({
            session,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          set({
            accessToken: null,
            refreshToken: null,
            session: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      clearError: () => set({ error: null }),

      updateThemeVariant: async (variant: ThemeVariant | null) => {
        const { session } = get();
        if (!session) return;

        const previous = session.theme_variant;
        set({ session: { ...session, theme_variant: variant } });

        try {
          await api.put('/api/auth/me/theme', { theme_variant: variant });
        } catch (err) {
          set({ session: { ...session, theme_variant: previous } });
          throw err;
        }
      },

      changePassword: async (oldPassword: string, newPassword: string) => {
        await api.post('/api/auth/password', {
          old_password: oldPassword,
          new_password: newPassword,
        });
      },

      canAccessPage: (pageId: string) => {
        const { session, isAuthenticated } = get();
        if (!isAuthenticated || !session) return false;
        if (session.is_superuser) return true;
        return session.effective_pages.includes(pageId);
      },

      canAccessSensor: (sensorKey: string) => {
        const { session, isAuthenticated } = get();
        if (!isAuthenticated || !session) return false;
        if (session.is_superuser) return true;
        return session.effective_sensors.includes(sensorKey);
      },

      canManage: (capability: Capability) => {
        const { session, isAuthenticated } = get();
        if (!isAuthenticated || !session) return false;
        if (session.is_superuser) return true;
        if (session.role === 'admin' || session.role === 'superadmin') return true;
        return (session.effective_permissions ?? []).includes(capability);
      },

      isAdmin: () => {
        const { session } = get();
        if (!session) return false;
        return session.is_superuser || session.role === 'admin' || session.role === 'superadmin';
      },

      isSuperadmin: () => {
        const { session } = get();
        if (!session) return false;
        return session.is_superuser || session.role === 'superadmin';
      },
    }),
    {
      name: 'atlaxia-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
