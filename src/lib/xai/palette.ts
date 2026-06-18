/**
 * Paleta del engine de canvas. El canvas no resuelve `var()`, así que aquí
 * MATERIALIZAMOS los tokens del tema activo (scada/modern × claro/oscuro +
 * branding por inquilino) leyéndolos en el momento de la llamada. `getEnginePalette`
 * se invoca por render / cambio de tema (no por frame: el objeto se reusa entre
 * frames), por eso resolver tokens aquí es seguro. Las constantes LIGHT/DARK son
 * el *fallback* exacto para SSR/tests sin DOM; en navegador los valores siguen al
 * tema y al accent del inquilino. (Antes esto era un espejo estático de scada: el
 * grafo no seguía a modern ni al rebrand — focusAccent y tuberías clavados en
 * azul.) La escala de calor y los colores de proceso son colores de DATO, fijos
 * en ambos modos (regla ISA-101: el estado no cambia con el tema/branding).
 */

import { hexToRgba, readCssVar } from '../cssVar';

export interface EnginePalette {
  isDark: boolean;
  /** Relleno de los nodos huecos (superficie). */
  nodeFill: string;
  /** Contorno sutil de los nodos sólidos. */
  nodeStroke: string;
  /** Anillo de los nodos fuera de foco (contexto). */
  contextRing: string;
  edge: string;
  edgeHead: string;
  focusAccent: string;
  focusGlow: string;
  labelText: string;
  labelTextFocus: string;
  labelHalo: string;
  dimLabel: string;
  pipeOuter: string;
  pipeInner: string;
  pipeChevron: string;
  procLabelBg: string;
  procLabelText: string;
  emptyText: string;
}

const LIGHT: EnginePalette = {
  isDark: false,
  nodeFill: '#ffffff',
  nodeStroke: 'rgba(31,35,40,.30)',
  contextRing: 'rgba(139,148,158,.9)',
  edge: 'rgba(107,114,128,.55)',
  edgeHead: 'rgba(89,99,110,.92)',
  focusAccent: '#58a6ff',
  focusGlow: 'rgba(88,166,255,.55)',
  labelText: '#3d454e',
  labelTextFocus: '#1f2328',
  labelHalo: 'rgba(240,242,245,.92)',
  dimLabel: 'rgba(139,148,158,.7)',
  pipeOuter: 'rgba(9,105,218,.22)',
  pipeInner: 'rgba(9,105,218,.85)',
  pipeChevron: 'rgba(9,105,218,.95)',
  procLabelBg: 'rgba(255,255,255,.94)',
  procLabelText: '#1f2328',
  emptyText: 'rgba(100,116,139,.9)',
};

const DARK: EnginePalette = {
  isDark: true,
  nodeFill: '#151b23',
  nodeStroke: 'rgba(230,237,243,.28)',
  contextRing: 'rgba(72,79,88,.9)',
  edge: 'rgba(139,148,158,.5)',
  edgeHead: 'rgba(139,148,158,.9)',
  focusAccent: '#58a6ff',
  focusGlow: 'rgba(88,166,255,.55)',
  labelText: '#9aa4af',
  labelTextFocus: '#e6edf3',
  labelHalo: 'rgba(13,17,23,.92)',
  dimLabel: 'rgba(72,79,88,.9)',
  pipeOuter: 'rgba(88,166,255,.18)',
  pipeInner: 'rgba(88,166,255,.8)',
  pipeChevron: 'rgba(121,192,255,.95)',
  procLabelBg: 'rgba(28,35,48,.94)',
  procLabelText: '#e6edf3',
  emptyText: 'rgba(139,148,158,.9)',
};

export function getEnginePalette(isDark: boolean): EnginePalette {
  const fb = isDark ? DARK : LIGHT;
  // accent del inquilino: tiñe el foco y la corriente de las tuberías (el motivo
  // «flow» = el color de marca). Antes hardcodeado a azul → no seguía el rebrand.
  const accent = readCssVar('--accent-primary', fb.focusAccent);
  return {
    isDark,
    nodeFill: readCssVar('--bg-surface', fb.nodeFill),
    nodeStroke: hexToRgba(readCssVar('--text-primary', isDark ? '#e6edf3' : '#1f2328'), isDark ? 0.28 : 0.3),
    contextRing: hexToRgba(readCssVar('--text-muted', isDark ? '#484f58' : '#8b949e'), 0.9),
    edge: hexToRgba(readCssVar('--border-emphasis', isDark ? '#484f58' : '#6b7280'), isDark ? 0.5 : 0.55),
    edgeHead: hexToRgba(readCssVar('--text-secondary', isDark ? '#8b949e' : '#59636e'), isDark ? 0.9 : 0.92),
    focusAccent: accent,
    focusGlow: hexToRgba(accent, 0.55),
    labelText: readCssVar('--text-secondary', fb.labelText),
    labelTextFocus: readCssVar('--text-primary', fb.labelTextFocus),
    // el halo «borra» el fondo del lienzo tras la etiqueta → debe seguir a --bg-base.
    labelHalo: hexToRgba(readCssVar('--bg-base', isDark ? '#0d1117' : '#f0f2f5'), 0.92),
    dimLabel: hexToRgba(readCssVar('--text-muted', isDark ? '#484f58' : '#8b949e'), 0.7),
    pipeOuter: hexToRgba(accent, isDark ? 0.18 : 0.22),
    pipeInner: hexToRgba(accent, isDark ? 0.8 : 0.85),
    pipeChevron: hexToRgba(accent, 0.95),
    procLabelBg: hexToRgba(readCssVar('--bg-surface-raised', isDark ? '#1c2330' : '#ffffff'), 0.94),
    procLabelText: readCssVar('--text-primary', fb.procLabelText),
    emptyText: hexToRgba(readCssVar('--text-muted', isDark ? '#8b949e' : '#64748b'), 0.9),
  };
}

/** Fallback para procesos sin color asignado en el dataset (gris neutro). */
export const UNKNOWN_PROC_COLOR = '#64748b';
