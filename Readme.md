# Frontend Dashboard

React single-page application on `:5173` (dev) / `:80` (prod via gateway).

Industrial SCADA dashboard for water treatment plant monitoring (Atlaxia).
ISA-101 compliant design, dark-first, dense data displays.

## Stack

- React 18 + TypeScript 5.6
- Vite 6 build tool
- Tailwind CSS 3 with custom SCADA token system
- Zustand 5 state management
- TanStack Query 5 for server state
- ECharts 6 (themed dark/light)
- @dnd-kit for drag-and-drop dashboards
- IBM Plex Sans + JetBrains Mono fonts

## Run

```bash
# Development
npm run dev          # Vite dev server on :5173

# Production
npm run build        # tsc + Vite build → dist/
npm run lint         # ESLint v9 flat config
npm test             # Vitest (jsdom)
```

## Structure

```
src/
  components/   # Reusable UI components (ui/, dashboard/, network/, sensors/, ...)
  pages/        # Route-level pages (11)
  hooks/        # Custom React hooks (telemetry, translations, ...)
  stores/       # Zustand state stores (auth, installation, sidebar, ...)
  lib/          # api.ts, echarts-theme.ts, statusStyles.ts, utils
  config/       # Static config (sensor mappings, navigation)
  contexts/     # Telemetry, Theme contexts
  providers/    # ThemeProvider (dark-first, per-installation branding)
  types/        # TypeScript type definitions
docs/
  REBUILD_DESIGN_SCADA.md   # Log of the 2026-04 SCADA migration (8 phases)
design.md                    # Full design system spec (ISA-101 tokens, layout, motion)
CLAUDE.md                    # AI agent instructions for this project
.ai/decisions.md             # Roadmap and architectural decisions
.ai/references/design-system.md  # Anti-patterns and aesthetic guardrails
```

## Design System

Tokens live in `src/index.css` and `tailwind.config.js`. Use `var(--bg-surface)`, `var(--text-primary)`, `var(--status-critical)`, etc. — never raw Tailwind colors like `slate-*`, `emerald-*`, `red-*` for status.

Dark is the primary operating mode. Light mode is available via the toggle in the header.

Per-client branding (logo, primary color) is injected at runtime by `ThemeProvider` from the installation config — uses the `primary-*` Tailwind shade scale.

See `design.md` for the full spec, `docs/REBUILD_DESIGN_SCADA.md` for the migration log.
