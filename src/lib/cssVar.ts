/**
 * Puente tokens CSS → JS para librerías que no entienden `var()` (p. ej. el
 * renderer canvas de ECharts: `fillStyle` no resuelve `var()` ni siempre
 * `color-mix()`). Lee el valor RESUELTO de la custom property en el root, así
 * el color sigue el tema activo (scada/modern × claro/oscuro) y el branding por
 * inquilino. Para DOM normal usa `var(--token)` directo; esto es solo el escape.
 */
export function readCssVar(name: string, fallback = ''): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** `#rgb`/`#rrggbb` → `rgba(r,g,b,a)`. Devuelve el original si no es hex. */
export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.trim().replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (full.length !== 6) return hex;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return hex;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
