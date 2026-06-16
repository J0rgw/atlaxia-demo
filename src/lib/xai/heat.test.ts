import { describe, it, expect } from 'vitest';
import { heat, sev, sevColor } from './heat';

describe('heat', () => {
  it('devuelve los stops exactos de la escala ISA-101', () => {
    expect(heat(0)).toBe('rgb(139,148,158)'); // calmo muted
    expect(heat(0.4)).toBe('rgb(210,153,34)'); // warning
    expect(heat(0.7)).toBe('rgb(248,81,73)'); // critical
    expect(heat(1)).toBe('rgb(218,54,51)'); // emergency
  });

  it('clampa fuera de rango', () => {
    expect(heat(-1)).toBe(heat(0));
    expect(heat(2)).toBe(heat(1));
  });

  it('interpola entre stops', () => {
    const mid = heat(0.2);
    expect(mid).toMatch(/^rgb\(\d+,\d+,\d+\)$/);
    expect(mid).not.toBe(heat(0));
    expect(mid).not.toBe(heat(0.4));
  });

  it('el extremo crítico es más oscuro que el calmo (a11y monótona)', () => {
    const lum = (c: string) => {
      const [r, g, b] = c.match(/\d+/g)!.map(Number);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    expect(lum(heat(1))).toBeLessThan(lum(heat(0)));
  });
});

describe('sev / sevColor', () => {
  it('mapea score a severidad textual', () => {
    expect(sev(0.9)).toBe('Muy anómalo');
    expect(sev(0.7)).toBe('Anómalo');
    expect(sev(0.5)).toBe('Algo anómalo');
    expect(sev(0.1)).toBe('Leve');
  });

  it('los colores de severidad son los status ISA-101', () => {
    expect(sevColor(0.9)).toBe('#da3633');
    expect(sevColor(0.7)).toBe('#f85149');
    expect(sevColor(0.5)).toBe('#d29922');
    expect(sevColor(0.1)).toBe('#8b949e');
  });
});
