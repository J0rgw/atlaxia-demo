/**
 * Paleta del engine de canvas por tema. El canvas no puede leer CSS vars en
 * cada frame, así que los tokens SCADA se materializan aquí (espejo de
 * styles/themes/scada.css). La escala de calor y los colores de proceso son
 * idénticos en ambos modos (regla ISA-101: el estado no cambia con el tema).
 */

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
  return isDark ? DARK : LIGHT;
}

/** Fallback para procesos sin color asignado en el dataset (gris neutro). */
export const UNKNOWN_PROC_COLOR = '#64748b';
