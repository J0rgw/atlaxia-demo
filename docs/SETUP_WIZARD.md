# Setup Wizard

First-run wizard that builds the per-installation configuration. Runs before authentication, blocks login until completed.

> **Supersedes:** `_archive/FASE2_WIZARD_SETUP.md`, `_archive/CONTEXTO_IMPLEMENTACION.md`.

## Entry point

The app gates on `GET /api/installation/status`. If `setup_completed === false`, all routes redirect to `/setup`. The wizard reads/writes through `installationStore` (`src/stores/installationStore.ts`).

```
GET /api/installation/status -> { setup_completed, has_users, installation_name }
GET /api/installation/branding -> public branding (logo, colors, variant) for pre-auth screens
```

## Steps (5)

Lives under `src/pages/setup/`. Step files in `steps/`, shared widgets in `components/`.

| # | Component | Validates |
|---|---|---|
| 0 | `IdentityStep.tsx` | `installation.name` not empty |
| 1 | `SensorsStep.tsx` | at least one entry in `sensors_config.mapping` |
| 2 | `PagesStep.tsx` | at least one page in `pages_config.enabled` |
| 3 | `AdminStep.tsx` | username ≥3, valid email, password ≥8 |
| 4 | `SummaryStep.tsx` | always valid |

Step navigation is managed inside the store (`setupStep`, `nextStep`, `prevStep`, max index 4).

## Identity step

Collects `installation.name`, `logo_url`, `theme.{primary,secondary,accent,template}`. `template: 'scada' | 'modern'` picks which token set (`src/styles/themes/{scada,modern}.css`) drives the app. Dark/light is an orthogonal user preference handled by `useUnauthThemeBootstrap` so the wizard previews the chosen branding live.

The wizard sits outside `<ThemeProvider>` (which only mounts after auth), so it drives `<html>` classes itself via `useUnauthThemeBootstrap(variant, previewMode, theme)`. Cleanup is intentionally skipped — `ThemeProvider` overwrites the same vars on next mount.

## Sensors step

**Not** a manual TB-key picker. The current flow is plant-survey driven:

1. `JsonUploadZone.tsx` accepts a plant-survey JSON.
2. `lib/plantSurveyParser.ts` converts it into a `SensorsConfig` + `client_name` + `survey_metadata` + `plant_info` and the store applies it via `importFromPlantSurvey()`.
3. `SensorSourceTabs` / `ProcessAccordion` / `SensorRow` let the user review and adjust mappings (display name, unit, alarm limits, criticality, process area).

For installations without a survey, `availableSensors` can be fetched from `GET /api/telemetry/snapshot` (the live ThingsBoard snapshot) to populate the picker.

The output is `SensorsConfig`:

```ts
{
  categories: SensorCategory[]      // process areas (P1, P2, ...)
  mapping: Record<tag, SensorMapping>  // tag -> { thingsboard_key, display_name, alarm_hh/h/l/ll, criticality, process_area, variable_type, ... }
  defaultSelected: string[]
  topology?: ProcessTopology        // main flow + branches (from survey)
}
```

See `docs/SENSORS.md` for the full `SensorMapping` schema.

## Pages step

User picks which pages this installation exposes. The list of available pages is `AVAILABLE_PAGES` in `src/types/installation.ts`:

```
overview, data-overview, machines, variables, anomalies,
network-overview, network, alerts, logs, policies, control, settings
```

`settings` is always shown to admins regardless of `enabled` (it carries `adminOnly: true`).

`pages_config.default` is the post-login landing page.

> **Layered with license:** what users actually see at runtime is `license.enabled_pages ∩ installation.pages_config.enabled`. See `docs/MODULARITY.md`.

## Admin step

Creates the first user. This is the *installation admin*, not a superadmin. Subsequent users are created from `Settings → Users`.

## Summary + submit

```
POST /api/installation/setup
{
  installation: { name, logo_url, theme: { primary, secondary, accent, template } },
  sensors_config: SensorsConfig,
  pages_config: { enabled: PageId[], default: PageId },
  admin_user: { username, email, password },
  client_name?: string,
  survey_metadata?: PlantSurveyMetadata,
  plant_info?: PlantSurveyPlantInfo
}
```

On success the store transitions into the **provisioning phase** (a separate UI screen, not a step).

## Provisioning phase

After `setup` returns, the wizard fires:

```
POST /api/installation/provision
-> { status: 'completed' | 'partial' | 'failed', devices_created, buckets_created, errors[] }
```

This runs ThingsBoard provisioning (devices, profiles, rule chains, buckets) based on the sensor mapping just persisted. Three outcomes:

- `completed` / `partial` → navigate to `/login`. Partial means some devices failed; the install is usable.
- `failed` → show retry + skip buttons. Skip lets the operator log in and finish provisioning manually from Settings.

Provisioning is idempotent — retrying is safe. Status is also queryable from `GET /api/installation/provision/status`.

## Endpoints reference

All routed through `src/back/src/api/installation.py`:

| Method | Path | Use |
|---|---|---|
| GET | `/api/installation/status` | gate — has setup happened? |
| GET | `/api/installation/branding` | public — logo + colors for login/setup |
| GET | `/api/installation/config` | authenticated — full config |
| PUT | `/api/installation/config` | partial update (Settings → Identity etc.) |
| POST | `/api/installation/setup` | first-run only — rejected if `setup_completed` |
| POST | `/api/installation/logo` | upload logo file |
| POST | `/api/installation/provision` | run/retry ThingsBoard provisioning |
| GET | `/api/installation/provision/status` | check provisioning state |
| GET | `/api/installation/sensors` | available sensors from TB |
| GET | `/api/installation/device-credentials` | TB credentials for the gateway |

## Post-setup runtime

After login, `useInstallationLoader(isAuthenticated)` (called once at app root) does `GET /api/installation/config` and stores it. The rest of the app consumes it via:

- `useInstallation()` — `installationName`, `logoUrl`, `theme`, `enabledPages`, `defaultPage`, `sensorsConfig`, `canAccessPage()`
- `useSensorsConfig()` — sensor mapping helpers (see `docs/SENSORS.md`)
- `<ThemeProvider>` — applies `theme_variant` class + `--color-primary-*` CSS vars

Settings → Identity tab calls `PUT /api/installation/config` to mutate any of these post-setup (name, logo, theme, enabled pages).

## Editing or extending

- Adding a step → bump the `setupStep` max bound (currently `4`) in `installationStore.ts:250`, add to `SETUP_STEPS` in `types/installation.ts`, render in `SetupWizard.tsx:152`.
- Adding a field to `installation_config` → add to `InstallationConfig` (`types/installation.ts`) **and** to the backend's `InstallationConfig` model. Plant-survey-importable fields also need a branch in `lib/plantSurveyParser.ts`.
- Adding a new page id → extend `PageId` union and `AVAILABLE_PAGES` (`types/installation.ts`), wire `ProtectedRoute requiredPage="..."` in `App.tsx`, add entry in `src/config/navigation.ts`.
