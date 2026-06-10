# Modularity

How the frontend gates pages, sensors, and theming on a per-installation, per-license, per-user basis.

> **Supersedes:** `_archive/FASE3_MODULARIDAD_DINAMICA.md`, `_archive/MODULARIZACION_CLIENTES.md`, `_archive/PLAN_MODULARIDAD.md`.

## Mental model

AtlaXia ships **one autonomous installation per client** (see project root `CLAUDE.md` — "Per-client autonomous deployment, not multi-tenant SaaS"). Modularity is therefore *config-driven*, not multi-tenant:

- **Installation config** — what this deployment has and shows. Set once via the setup wizard, edited from Settings.
- **License** — what the customer has paid for. Issued by us, stored in DB, attached to users.
- **User role + view prefs** — what this person can do, plus their own UI hide-list.

Effective access at runtime is the **intersection** of these layers, layered with role checks for admin-only pages.

```
visible(page)  = license.enabled_pages
              ∩ installation.pages_config.enabled
              ∩ user.canAccessPage  (superuser always true)
              ∖ user.hiddenPages    (personal hide-list)
              + role override for adminOnly pages
```

## Source of truth per layer

| Layer | Where it lives | Read via |
|---|---|---|
| Installation pages | `installation_config.pages_config.enabled` | `useInstallation().enabledPages` |
| Installation sensors | `installation_config.sensors_config.mapping` | `useSensorsConfig()` (see SENSORS.md) |
| Installation theme | `installation_config.theme_*` | `useInstallation().theme`, `<ThemeProvider>` |
| License pages/sensors | `session.license.enabled_*` collapsed into `session.effective_*` server-side | `useAuthStore.canAccessPage()` / `canAccessSensor()` |
| User role | `session.role`, `session.is_superuser` | `useAuthStore.isAdmin()` / `isSuperadmin()` |
| User theme variant override | `session.theme_variant` | `<ThemeProvider>` (overrides installation) |
| User view prefs | `userViewPrefsStore.hiddenPages` (localStorage) | `Sidebar`, `App.tsx` |

`session.effective_pages` and `session.effective_sensors` are computed by the backend in `compute_effective_permissions()`; the frontend treats them as opaque allow-lists.

## Roles

```
superadmin > admin > tecnico
```

- `superadmin` — `is_superuser=true`. Bypasses all license/page/sensor checks (`authStore.canAccessPage`/`canAccessSensor` short-circuit on `is_superuser`).
- `admin` — sees `adminOnly: true` pages (currently `settings`), can edit installation config, manage users/licenses.
- `tecnico` — read-only operator view.

`isAdmin()` returns true for `superadmin | admin | is_superuser`. `isSuperadmin()` is stricter.

## Gating in routes

`ProtectedRoute` (`src/components/auth/ProtectedRoute.tsx`) wraps every authenticated route in `App.tsx`. Two props:

```tsx
<ProtectedRoute requiredPage="anomalies">
  <AnomaliesPage />
</ProtectedRoute>

<ProtectedRoute requireAdmin>
  <SettingsPage />
</ProtectedRoute>
```

Order of checks:

1. Not authenticated → redirect to `/login` with `state.from` preserved.
2. `session.license` exists and `!is_active` → render "Licencia Inactiva" screen (terminal — no redirect).
3. `requiredPage` set and `!canAccessPage(pageId)` → redirect to `/`.
4. `requireAdmin` set and `!isAdmin()` → redirect to `/`.

The license check is intentionally a render, not a redirect — it gives ops a stable URL to debug from.

Note: `ProtectedRoute` checks the *user-side* allow-list (`session.effective_pages`). Installation-side gating (`installation.pages_config.enabled`) is enforced by the **Sidebar** (the page is hidden from nav, but if a user types the URL it still renders). Don't rely on `ProtectedRoute` alone for installation-level disabling.

## Sidebar

`src/components/layout/Sidebar.tsx` builds the visible nav by intersecting three sources:

1. Static nav definition from `src/config/navigation.ts` (`NavSection[]` with Lucide icons).
2. `useInstallation().enabledPages` — installation gate.
3. `useAuthStore.canAccessPage()` — license + role gate.
4. `useUserViewPrefsStore.hiddenPages` — personal hide-list (user can hide things they have access to, from Settings → View prefs).

A page must clear all four to appear.

## Theming

Three independent dimensions, applied by `<ThemeProvider>` (`src/providers/ThemeProvider.tsx`):

1. **Variant** (`theme-scada` | `theme-modern`) — token set in `src/styles/themes/{scada,modern}.css`. Per-installation in `config.theme_variant`; users may override per-browser via `session.theme_variant` (column added in migrations 007/008). Persisted via `PUT /api/auth/me/theme`.
2. **Mode** (`light` | `dark`) — per-browser, localStorage key `theme-mode`. Dark is the default (control-room product).
3. **Branding** (`--color-primary*`, `--color-secondary*`, `--color-warning*`) — per-installation, computed at runtime from `config.theme_primary/secondary/accent` via `hexToLighter` / `hexToDarker`.

`<ThemeProvider>` also rewrites `<title>` and the favicon `<link>` from `config.installation_name` and `config.logo_url`.

Pre-auth screens (login, setup wizard) can't use `<ThemeProvider>` because there's no session yet. They use `useUnauthThemeBootstrap` which drives the same `<html>` classes and CSS variables from `GET /api/installation/branding` (publicly readable).

## License inactive vs. setup not done

Two different gates, often confused:

| Symptom | Cause | Path |
|---|---|---|
| Redirect to `/setup` | `installation_status.setup_completed === false` | wizard hasn't run |
| "Licencia Inactiva" page | `session.license.is_active === false` | issue the user a new license, or reactivate from Settings → Users |
| 403 on a page | `pageId ∉ session.effective_pages` | license lacks this page, or installation has it disabled |
| Page hidden in sidebar but URL works | page disabled at *installation* level only | Settings → Pages |

## Pages catalog

Authoritative list lives in `src/types/installation.ts:AVAILABLE_PAGES`. Currently 12 ids:

```
overview, data-overview, machines, variables, anomalies,
network-overview, network, alerts, logs, policies, control, settings
```

`settings` is the only one carrying `adminOnly: true`.

## Adding a new gated page

1. Add the id to `PageId` union and `AVAILABLE_PAGES` in `src/types/installation.ts`.
2. Add a `NavSection`/`NavItem` entry in `src/config/navigation.ts`.
3. Wrap the route in `App.tsx` with `<ProtectedRoute requiredPage="my-page">`.
4. Ensure backend includes the id in license `enabled_pages` for customers who should see it (otherwise it's invisible to everyone).

## What's intentionally *not* gated frontend-side

- **Anomaly detection results** — backend filters by license; frontend just renders what the API returns.
- **WebSocket telemetry** — backend filters by license; frontend doesn't subscribe selectively.
- **API endpoints** — every check is backend-authoritative. Frontend gates are UX, not security.
