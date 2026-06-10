/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  safelist: [
    // Per-installation branding tokens (set dynamically by ThemeProvider from config.theme_primary)
    'dark:text-primary-300',
    'dark:text-primary-400',
    'dark:bg-primary-900/20',
    'dark:bg-primary-900/30',
    'dark:border-primary-800',
    'dark:hover:text-primary-400',
    'transition-colors',
  ],
  theme: {
    extend: {
      colors: {
        // Legacy installation-config colors (kept for branding)
        primary: {
          50: 'var(--color-primary-lighter)',
          100: 'var(--color-primary-light)',
          200: 'color-mix(in srgb, var(--color-primary) 20%, white)',
          300: 'color-mix(in srgb, var(--color-primary) 40%, white)',
          400: 'color-mix(in srgb, var(--color-primary) 70%, white)',
          500: 'var(--color-primary)',
          600: 'var(--color-primary)',
          700: 'var(--color-primary-hover)',
          800: 'var(--color-primary-dark)',
          900: 'var(--color-primary-dark)',
        },
        secondary: {
          50: 'color-mix(in srgb, var(--color-secondary) 5%, white)',
          100: 'var(--color-secondary-light)',
          200: 'color-mix(in srgb, var(--color-secondary) 20%, white)',
          300: 'color-mix(in srgb, var(--color-secondary) 40%, white)',
          400: 'color-mix(in srgb, var(--color-secondary) 70%, white)',
          500: 'var(--color-secondary)',
          600: 'var(--color-secondary)',
          700: 'var(--color-secondary-dark)',
          800: 'var(--color-secondary-dark)',
          900: 'color-mix(in srgb, var(--color-secondary) 100%, black 30%)',
        },

        // SCADA Design System semantic tokens (design.md Section 9)
        base:             'var(--bg-base)',
        surface:          'var(--bg-surface)',
        'surface-raised': 'var(--bg-surface-raised)',
        inset:            'var(--bg-inset)',

        subtle:           'var(--border-subtle)',
        default:          'var(--border-default)',
        emphasis:         'var(--border-emphasis)',

        normal:           'var(--status-normal)',
        advisory:         'var(--status-advisory)',
        warning:          'var(--status-warning)',
        critical:         'var(--status-critical)',
        emergency:        'var(--status-emergency)',

        'normal-muted':     'var(--status-normal-muted)',
        'advisory-muted':   'var(--status-advisory-muted)',
        'warning-muted':    'var(--status-warning-muted)',
        'critical-muted':   'var(--status-critical-muted)',
        'emergency-muted':  'var(--status-emergency-muted)',

        accent:             'var(--accent-primary)',
        'accent-secondary': 'var(--accent-secondary)',
      },
      fontFamily: {
        sans: ["var(--font-sans)", "IBM Plex Sans", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      fontSize: {
        xs:   ['11px', { lineHeight: '1.45' }],
        sm:   ['12px', { lineHeight: '1.45' }],
        base: ['13px', { lineHeight: '1.5' }],
        md:   ['14px', { lineHeight: '1.5' }],
        lg:   ['16px', { lineHeight: '1.4' }],
        xl:   ['20px', { lineHeight: '1.3' }],
        '2xl': ['28px', { lineHeight: '1.2' }],
        '3xl': ['36px', { lineHeight: '1.1' }],
      },
      spacing: {
        0.5: '2px',
        1:   '4px',
        1.5: '6px',
        2:   '8px',
        3:   '12px',
        4:   '16px',
        5:   '20px',
        6:   '24px',
        8:   '32px',
      },
      borderRadius: {
        none: '0px',
        sm:   'var(--radius-sm)',
        DEFAULT: 'var(--radius-md)',
        md:   'var(--radius-md)',
        lg:   'var(--radius-lg)',
        xl:   'var(--radius-xl)',
      },
      boxShadow: {
        card: "var(--shadow-card)",
      },
      zIndex: {
        'base':          '0',
        'table-sticky':  '10',
        'sidebar':       '20',
        'header':        '30',
        'dropdown':      '40',
        'modal-scrim':   '50',
        'modal':         '60',
        'toast':         '70',
        'tooltip':       '80',
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};
