/** Geometría 2D del engine (pura, testeable): hulls, cruces, colores. */

export interface Pt {
  x: number;
  y: number;
}

export function relLum(col: string): number {
  const m = (col || '').match(/\d+/g);
  if (!m) return 1;
  const [r, g, b] = [+m[0], +m[1], +m[2]];
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export function hexA(hex: string, a: number): string {
  const m = hex.replace('#', '');
  return `rgba(${parseInt(m.slice(0, 2), 16)},${parseInt(m.slice(2, 4), 16)},${parseInt(m.slice(4, 6), 16)},${a})`;
}

/** Hull convexo (monotone chain). Con <3 puntos devuelve copia tal cual. */
export function convexHull(pts: Pt[]): Pt[] {
  if (pts.length < 3) return pts.slice();
  const p = pts.slice().sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lo: Pt[] = [];
  for (const q of p) {
    while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
    lo.push(q);
  }
  const up: Pt[] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
    up.push(q);
  }
  lo.pop();
  up.pop();
  return lo.concat(up);
}

/** ¿Se cruzan ESTRICTAMENTE los segmentos p1p2 y p3p4? */
export function segmentsCross(p1: Pt, p2: Pt, p3: Pt, p4: Pt): boolean {
  const d = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) =>
    (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const d1 = d(p3.x, p3.y, p4.x, p4.y, p1.x, p1.y);
  const d2 = d(p3.x, p3.y, p4.x, p4.y, p2.x, p2.y);
  const d3 = d(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
  const d4 = d(p1.x, p1.y, p2.x, p2.y, p4.x, p4.y);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** ¿El segmento (ax,ay)-(bx,by) toca el rect (rx,ry,rw,rh)? */
export function segHitsRect(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number
): boolean {
  const x2 = rx + rw;
  const y2 = ry + rh;
  if ((ax >= rx && ax <= x2 && ay >= ry && ay <= y2) || (bx >= rx && bx <= x2 && by >= ry && by <= y2)) {
    return true;
  }
  const ss = (
    x1: number, y1: number, xx2: number, yy2: number,
    x3: number, y3: number, x4: number, y4: number
  ) => {
    const den = (xx2 - x1) * (y4 - y3) - (yy2 - y1) * (x4 - x3);
    if (Math.abs(den) < 1e-9) return false;
    const t = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / den;
    const u = ((x3 - x1) * (yy2 - y1) - (y3 - y1) * (xx2 - x1)) / den;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  };
  return (
    ss(ax, ay, bx, by, rx, ry, x2, ry) ||
    ss(ax, ay, bx, by, x2, ry, x2, y2) ||
    ss(ax, ay, bx, by, x2, y2, rx, y2) ||
    ss(ax, ay, bx, by, rx, y2, rx, ry)
  );
}

export function rectsOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  b: [number, number, number, number]
): boolean {
  return ax < b[0] + b[2] && ax + aw > b[0] && ay < b[1] + b[3] && ay + ah > b[1];
}
