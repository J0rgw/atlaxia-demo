import { useState, useEffect, useCallback } from 'react';
import { useAuthStore, type Capability } from '@/stores/authStore';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import {
  User,
  Shield,
  Users,
  UserPlus,
  Check,
  AlertCircle,
  X,
  Eye,
  EyeOff,
  Wrench,
  Settings as SettingsIcon,
  Network,
  Bell,
  UserCog,
} from 'lucide-react';

interface LicenseUser {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  restricted_pages: string[] | null;
  restricted_sensors: string[] | null;
  elevated_permissions: Capability[];
}

const PAGE_OPTIONS = [
  { id: 'overview', labelEs: 'Resumen', labelEn: 'Overview' },
  { id: 'data-overview', labelEs: 'Resumen de datos', labelEn: 'Data overview' },
  { id: 'machines', labelEs: 'Estado actual de planta', labelEn: 'Plant current state' },
  { id: 'variables', labelEs: 'Telemetria historica', labelEn: 'Historic telemetry' },
  { id: 'anomalies', labelEs: 'Alertas de datos', labelEn: 'Data alerts' },
  { id: 'network-overview', labelEs: 'Resumen de red', labelEn: 'Network overview' },
  { id: 'network', labelEs: 'Estado actual de red', labelEn: 'Current network state' },
  { id: 'alerts', labelEs: 'Alertas de red', labelEn: 'Network alerts' },
  { id: 'logs', labelEs: 'Registros', labelEn: 'Logs' },
  { id: 'control', labelEs: 'Control', labelEn: 'Control' },
];

const CAPABILITY_OPTIONS: {
  id: Capability;
  labelEs: string;
  labelEn: string;
  descriptionEs: string;
  descriptionEn: string;
  Icon: typeof UserCog;
}[] = [
  {
    id: 'manage_users',
    labelEs: 'Gestionar usuarios',
    labelEn: 'Manage users',
    descriptionEs: 'Crear y editar otros tecnicos',
    descriptionEn: 'Create and edit other technicians',
    Icon: UserCog,
  },
  {
    id: 'manage_settings',
    labelEs: 'Editar ajustes',
    labelEn: 'Edit settings',
    descriptionEs: 'Modificar identidad, tema y configuracion',
    descriptionEn: 'Modify identity, theme and configuration',
    Icon: SettingsIcon,
  },
  {
    id: 'manage_network',
    labelEs: 'Gestionar red',
    labelEn: 'Manage network',
    descriptionEs: 'Editar dispositivos y politicas de red',
    descriptionEn: 'Edit network devices and policies',
    Icon: Network,
  },
  {
    id: 'manage_alerts',
    labelEs: 'Gestionar alertas',
    labelEn: 'Manage alerts',
    descriptionEs: 'Reconocer alertas y editar politicas',
    descriptionEn: 'Acknowledge alerts and edit policies',
    Icon: Bell,
  },
];

export function UserPermissionsTab({
  session,
  language,
}: {
  session: ReturnType<typeof useAuthStore.getState>['session'];
  language: string;
}) {
  const [technicians, setTechnicians] = useState<LicenseUser[]>([]);
  const [selectedTechnician, setSelectedTechnician] = useState<LicenseUser | null>(null);
  const [pageToggles, setPageToggles] = useState<Record<string, boolean>>({});
  const [capabilityToggles, setCapabilityToggles] = useState<Record<Capability, boolean>>({
    manage_users: false,
    manage_settings: false,
    manage_network: false,
    manage_alerts: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Create user form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [createPageToggles, setCreatePageToggles] = useState<Record<string, boolean>>({});
  const [createCapabilityToggles, setCreateCapabilityToggles] = useState<Record<Capability, boolean>>({
    manage_users: false,
    manage_settings: false,
    manage_network: false,
    manage_alerts: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadTechnicians = useCallback(async () => {
    if (!session?.license) return;

    setIsLoading(true);
    try {
      const users = await api.get<LicenseUser[]>(`/api/licenses/users/${session.license.id}`);
      const techs = users.filter((u) => u.role === 'tecnico');
      setTechnicians(techs);
    } catch (err) {
      console.error('Error loading technicians:', err);
    } finally {
      setIsLoading(false);
    }
  }, [session?.license]);

  useEffect(() => {
    if (session?.license) {
      loadTechnicians();
    }
  }, [session, loadTechnicians]);

  const handleSelectTechnician = (tech: LicenseUser) => {
    setSelectedTechnician(tech);
    setShowCreateForm(false);
    setSaveStatus('idle');

    const enabledPages = session?.license?.enabled_pages || [];
    const pageState: Record<string, boolean> = {};
    PAGE_OPTIONS.forEach((page) => {
      if (!enabledPages.includes(page.id)) {
        pageState[page.id] = false;
      } else if (tech.restricted_pages === null) {
        pageState[page.id] = true;
      } else {
        pageState[page.id] = tech.restricted_pages.includes(page.id);
      }
    });
    setPageToggles(pageState);

    const capState: Record<Capability, boolean> = {
      manage_users: false,
      manage_settings: false,
      manage_network: false,
      manage_alerts: false,
    };
    (tech.elevated_permissions || []).forEach((cap) => {
      if (cap in capState) capState[cap] = true;
    });
    setCapabilityToggles(capState);
  };

  const handleSavePermissions = async () => {
    if (!selectedTechnician) return;

    setIsSaving(true);
    setSaveStatus('idle');

    const allowedPages = Object.entries(pageToggles)
      .filter(([, enabled]) => enabled)
      .map(([pageId]) => pageId);

    const elevatedPermissions = (Object.entries(capabilityToggles) as [Capability, boolean][])
      .filter(([, enabled]) => enabled)
      .map(([cap]) => cap);

    try {
      // allowed_sensors: null = no sensor restriction. WIP — see
      // docs/known-issues/user-permissions-wip.md before re-enabling the UI.
      await api.patch(`/api/licenses/users/${selectedTechnician.id}/permissions`, {
        allowed_pages: allowedPages,
        allowed_sensors: null,
        elevated_permissions: elevatedPermissions,
      });

      setSaveStatus('success');

      const updated: Partial<LicenseUser> = {
        restricted_pages: allowedPages,
        elevated_permissions: elevatedPermissions,
      };
      setTechnicians((prev) =>
        prev.map((t) => (t.id === selectedTechnician.id ? { ...t, ...updated } : t))
      );
      setSelectedTechnician((prev) => (prev ? { ...prev, ...updated } : null));
    } catch (err) {
      console.error('Error saving permissions:', err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenCreateForm = () => {
    setShowCreateForm(true);
    setSelectedTechnician(null);
    setCreateForm({ username: '', email: '', password: '' });
    setCreateError(null);
    setShowPassword(false);

    const enabledPages = session?.license?.enabled_pages || [];
    const pageState: Record<string, boolean> = {};
    PAGE_OPTIONS.forEach((page) => {
      pageState[page.id] = enabledPages.includes(page.id);
    });
    setCreatePageToggles(pageState);

    setCreateCapabilityToggles({
      manage_users: false,
      manage_settings: false,
      manage_network: false,
      manage_alerts: false,
    });
  };

  const handleCreateUser = async () => {
    setCreateError(null);

    if (!createForm.username.trim() || createForm.username.trim().length < 3) {
      setCreateError(language === 'es' ? 'El nombre de usuario debe tener al menos 3 caracteres' : 'Username must be at least 3 characters');
      return;
    }
    if (!createForm.email.trim() || !createForm.email.includes('@')) {
      setCreateError(language === 'es' ? 'Email invalido' : 'Invalid email');
      return;
    }
    if (createForm.password.length < 8) {
      setCreateError(language === 'es' ? 'La contrasena debe tener al menos 8 caracteres' : 'Password must be at least 8 characters');
      return;
    }

    setIsCreating(true);

    const allowedPages = Object.entries(createPageToggles)
      .filter(([, enabled]) => enabled)
      .map(([pageId]) => pageId);

    const elevatedPermissions = (Object.entries(createCapabilityToggles) as [Capability, boolean][])
      .filter(([, enabled]) => enabled)
      .map(([cap]) => cap);

    try {
      // allowed_sensors: null = no sensor restriction. WIP — see
      // docs/known-issues/user-permissions-wip.md before re-enabling the UI.
      const newUser = await api.post<LicenseUser>('/api/licenses/users/technician', {
        username: createForm.username.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        allowed_pages: allowedPages,
        allowed_sensors: null,
        elevated_permissions: elevatedPermissions,
      });

      setTechnicians((prev) => [...prev, newUser]);
      setShowCreateForm(false);
      setCreateForm({ username: '', email: '', password: '' });
    } catch (err: unknown) {
      console.error('Error creating technician:', err);
      const detail = (err as { detail?: string })?.detail || '';
      const status = (err as { status?: number })?.status;
      if (detail.includes('already exists')) {
        setCreateError(language === 'es' ? 'Ya existe un usuario con ese nombre o email' : 'A user with that username or email already exists');
      } else if (status === 403 || detail.includes('capability') || detail.includes('privileges')) {
        setCreateError(language === 'es' ? 'No tienes permisos para crear usuarios' : 'You do not have permission to create users');
      } else if (status === 404 || detail.includes('Not Found')) {
        setCreateError(language === 'es' ? 'Endpoint no disponible. Reinicia el servidor backend.' : 'Endpoint not available. Restart the backend server.');
      } else {
        setCreateError(detail || (language === 'es' ? 'Error al crear el usuario' : 'Error creating user'));
      }
    } finally {
      setIsCreating(false);
    }
  };

  const isPageAvailableInLicense = (pageId: string) => {
    return session?.license?.enabled_pages?.includes(pageId) ?? false;
  };

  const canManageUsers = session?.is_superuser
    || session?.role === 'admin'
    || session?.role === 'superadmin'
    || (session?.effective_permissions ?? []).includes('manage_users');

  // Sensor / process restriction UI is intentionally a placeholder — the
  // backend already accepts allowed_sensors, but the right granularity (per
  // sensor, per process, per category, by tag) is still being designed.
  // See docs/known-issues/user-permissions-wip.md.
  const renderSensorSection = () => (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-dashed border-[var(--border-default)] bg-[var(--bg-inset)]">
      <Wrench className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0 mt-0.5" />
      <div className="text-sm">
        <p className="font-medium text-[var(--text-primary)]">
          {language === 'es' ? 'En construccion' : 'Work in progress'}
        </p>
        <p className="text-[var(--text-secondary)] mt-0.5">
          {language === 'es'
            ? 'La gestion de procesos y variables se definira en una proxima iteracion. Por ahora los tecnicos ven todos los sensores que su licencia permite.'
            : 'Process and variable management will land in a future iteration. For now technicians see every sensor their license allows.'}
        </p>
      </div>
    </div>
  );

  // Reusable capabilities section
  const renderCapabilitySection = (
    toggles: Record<Capability, boolean>,
    setToggles: (updater: (prev: Record<Capability, boolean>) => Record<Capability, boolean>) => void,
    onChange?: () => void,
  ) => (
    <div className="space-y-2">
      {CAPABILITY_OPTIONS.map((cap) => {
        const Icon = cap.Icon;
        return (
          <div
            key={cap.id}
            className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]"
          >
            <div className="flex items-center gap-3">
              <Icon className="w-4 h-4 text-[var(--text-secondary)] flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {language === 'es' ? cap.labelEs : cap.labelEn}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {language === 'es' ? cap.descriptionEs : cap.descriptionEn}
                </p>
              </div>
            </div>
            <Switch
              checked={toggles[cap.id]}
              onCheckedChange={() => {
                setToggles((prev) => ({ ...prev, [cap.id]: !prev[cap.id] }));
                onChange?.();
              }}
            />
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      {session?.license && (
        <Card className="p-4 bg-[var(--bg-inset)] border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-[var(--status-normal)]" />
              <div>
                <p className="font-medium text-[var(--text-primary)]">{session.license.name}</p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {language === 'es' ? 'Codigo: ' : 'Code: '}
                  {session.license.code}
                </p>
              </div>
            </div>
            {canManageUsers && (
              <Button onClick={handleOpenCreateForm} variant="secondary" size="sm">
                <UserPlus className="w-4 h-4 mr-1.5" />
                {language === 'es' ? 'Crear usuario' : 'Create user'}
              </Button>
            )}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: User List */}
        <Card>
          <div className="p-4 border-b border-[var(--border-subtle)]">
            <h2 className="font-semibold text-[var(--text-primary)]">
              {language === 'es' ? 'Usuarios Tecnicos' : 'Technician Users'}
            </h2>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-[var(--text-secondary)]">
              {language === 'es' ? 'Cargando...' : 'Loading...'}
            </div>
          ) : technicians.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <Users className="w-14 h-14 text-[var(--text-muted)] mb-4" />
              <p className="text-base font-medium text-[var(--text-secondary)]">
                {language === 'es' ? 'No hay usuarios tecnicos' : 'No technician users'}
              </p>
              <p className="text-sm text-[var(--text-muted)] mt-1 text-center max-w-xs">
                {language === 'es'
                  ? 'Crea un usuario tecnico para asignarle permisos'
                  : 'Create a technician user to assign permissions'}
              </p>
              {canManageUsers && (
                <Button onClick={handleOpenCreateForm} variant="secondary" size="sm" className="mt-4">
                  <UserPlus className="w-4 h-4 mr-1.5" />
                  {language === 'es' ? 'Crear usuario' : 'Create user'}
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {technicians.map((tech) => (
                <button
                  key={tech.id}
                  onClick={() => handleSelectTechnician(tech)}
                  className={`w-full p-4 text-left hover:bg-[var(--bg-inset)] transition-colors ${
                    selectedTechnician?.id === tech.id
                      ? 'bg-[var(--status-normal-muted)] border-l-2 border-[var(--status-normal)]'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[var(--bg-inset)] rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-[var(--text-secondary)]" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-[var(--text-primary)]">{tech.username}</p>
                      <p className="text-sm text-[var(--text-secondary)]">{tech.email}</p>
                      {tech.elevated_permissions && tech.elevated_permissions.length > 0 && (
                        <p className="text-xs text-[var(--accent-primary)] mt-0.5">
                          {tech.elevated_permissions.length}{' '}
                          {language === 'es' ? 'privilegios elevados' : 'elevated privileges'}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Right Column: Create Form or Permissions */}
        {showCreateForm && (
          <Card>
            <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <h2 className="font-semibold text-[var(--text-primary)]">
                {language === 'es' ? 'Nuevo Usuario Tecnico' : 'New Technician User'}
              </h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)] rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-5">
              <div>
                <label htmlFor="create-username" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  {language === 'es' ? 'Nombre de usuario' : 'Username'}
                </label>
                <input
                  id="create-username"
                  type="text"
                  value={createForm.username}
                  onChange={(e) => setCreateForm((f) => ({ ...f, username: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[var(--border-default)] rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] outline-none"
                  placeholder={language === 'es' ? 'Minimo 3 caracteres' : 'Minimum 3 characters'}
                />
              </div>

              <div>
                <label htmlFor="create-email" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Email
                </label>
                <input
                  id="create-email"
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[var(--border-default)] rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] outline-none"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label htmlFor="create-password" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  {language === 'es' ? 'Contrasena' : 'Password'}
                </label>
                <div className="relative">
                  <input
                    id="create-password"
                    type={showPassword ? 'text' : 'password'}
                    value={createForm.password}
                    onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                    className="w-full px-3 py-2 pr-10 text-sm border border-[var(--border-default)] rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] outline-none"
                    placeholder={language === 'es' ? 'Minimo 8 caracteres' : 'Minimum 8 characters'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  {language === 'es' ? 'Paginas' : 'Pages'}
                </label>
                <div className="space-y-2">
                  {PAGE_OPTIONS.map((page) => {
                    const isAvailable = isPageAvailableInLicense(page.id);
                    return (
                      <div
                        key={page.id}
                        className={`flex items-center justify-between p-2.5 rounded-lg ${
                          isAvailable ? 'bg-[var(--bg-surface)] border border-[var(--border-subtle)]' : 'bg-[var(--bg-inset)] opacity-50'
                        }`}
                      >
                        <span className={`text-sm ${isAvailable ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                          {language === 'es' ? page.labelEs : page.labelEn}
                        </span>
                        <Switch
                          checked={createPageToggles[page.id] || false}
                          onCheckedChange={() =>
                            setCreatePageToggles((prev) => ({ ...prev, [page.id]: !prev[page.id] }))
                          }
                          disabled={!isAvailable}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  {language === 'es' ? 'Procesos / variables' : 'Processes / variables'}
                </label>
                {renderSensorSection()}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  {language === 'es' ? 'Privilegios elevados' : 'Elevated privileges'}
                </label>
                {renderCapabilitySection(createCapabilityToggles, setCreateCapabilityToggles)}
              </div>

              {createError && (
                <div className="flex items-center gap-2 p-3 bg-[var(--status-critical-muted)] border border-[var(--status-critical)]/40 rounded-md text-[var(--status-critical)] text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {createError}
                </div>
              )}

              <Button onClick={handleCreateUser} className="w-full" disabled={isCreating}>
                {isCreating
                  ? language === 'es'
                    ? 'Creando...'
                    : 'Creating...'
                  : language === 'es'
                  ? 'Crear Usuario'
                  : 'Create User'}
              </Button>
            </div>
          </Card>
        )}

        {!showCreateForm && selectedTechnician && (
          <Card>
            <div className="p-4 border-b border-[var(--border-subtle)]">
              <h2 className="font-semibold text-[var(--text-primary)]">
                {language === 'es' ? 'Permisos: ' : 'Permissions: '}
                {selectedTechnician.username}
              </h2>
            </div>

            <div className="p-4 space-y-5">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  {language === 'es' ? 'Paginas' : 'Pages'}
                </label>
                <div className="space-y-2">
                  {PAGE_OPTIONS.map((page) => {
                    const isAvailable = isPageAvailableInLicense(page.id);
                    return (
                      <div
                        key={page.id}
                        className={`flex items-center justify-between p-2.5 rounded-lg ${
                          isAvailable ? 'bg-[var(--bg-surface)] border border-[var(--border-subtle)]' : 'bg-[var(--bg-inset)] opacity-50'
                        }`}
                      >
                        <span className={isAvailable ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}>
                          {language === 'es' ? page.labelEs : page.labelEn}
                        </span>
                        <Switch
                          checked={pageToggles[page.id] || false}
                          onCheckedChange={() => {
                            setPageToggles((prev) => ({ ...prev, [page.id]: !prev[page.id] }));
                            setSaveStatus('idle');
                          }}
                          disabled={!isAvailable}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  {language === 'es' ? 'Procesos / variables' : 'Processes / variables'}
                </label>
                {renderSensorSection()}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  {language === 'es' ? 'Privilegios elevados' : 'Elevated privileges'}
                </label>
                {renderCapabilitySection(capabilityToggles, setCapabilityToggles, () => setSaveStatus('idle'))}
              </div>

              {saveStatus === 'success' && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  <Check className="w-4 h-4" />
                  {language === 'es' ? 'Cambios guardados' : 'Changes saved'}
                </div>
              )}

              {saveStatus === 'error' && (
                <div className="flex items-center gap-2 p-3 bg-[var(--status-critical-muted)] border border-[var(--status-critical)]/40 rounded-md text-[var(--status-critical)] text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {language === 'es' ? 'Error al guardar' : 'Error saving changes'}
                </div>
              )}

              <Button onClick={handleSavePermissions} className="w-full" disabled={isSaving}>
                {isSaving
                  ? language === 'es'
                    ? 'Guardando...'
                    : 'Saving...'
                  : language === 'es'
                  ? 'Guardar Cambios'
                  : 'Save Changes'}
              </Button>
            </div>
          </Card>
        )}

        {!showCreateForm && !selectedTechnician && technicians.length > 0 && (
          <Card className="flex items-center justify-center p-8">
            <p className="text-[var(--text-secondary)] text-center">
              {language === 'es'
                ? 'Selecciona un usuario tecnico para configurar sus permisos'
                : 'Select a technician user to configure their permissions'}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
