/**
 * Engine de canvas del grafo XAI — port 1:1 del motor validado en
 * docs/xai-graph/prototype-focus.html (decisiones cerradas en
 * docs/xai-graph/XAI-graph.md §8).
 *
 * Por qué Canvas y no @xyflow/react (el grafo de ProcessGraph/TopologyGraph):
 * React Flow modela DAGs estáticos con layout por capas; este grafo necesita
 * física force-directed continua, focus+context con atenuación, hulls de
 * proceso y colocación de etiquetas anti-colisión a 60 fps — semántica de
 * lienzo, no de DOM. El chrome (controles, paneles) SÍ es React.
 *
 * El engine es imperativo y agnóstico de React: recibe el estado de render
 * por `update()` y reporta hover por callback. `useXaiEngine` lo encapsula.
 */

import { convexHull, hexA, rectsOverlap, segHitsRect, segmentsCross, type Pt } from './geometry';
import type { EnginePalette } from './palette';
import { buildRenderState } from './subgraph';
import { sev } from './heat';
import type {
  RenderEdge,
  RenderNode,
  XaiDataset,
  XaiHoverInfo,
  XaiMode,
  XaiSettings,
} from './types';

const FONT_MONO = '"JetBrains Mono","Fira Code",ui-monospace,monospace';
const FONT_SANS = '"IBM Plex Sans",ui-sans-serif,system-ui';
const ANCHOR_RX = 235;
const ANCHOR_RY = 225;
const SETTLE_REBUILD = 90;
const SETTLE_INITIAL = 260;

export interface XaiEngineInput {
  mode: XaiMode;
  frame: number;
  ui: XaiSettings;
  palette: EnginePalette;
}

interface NodePos {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number;
  fy: number;
}

export class XaiEngine {
  private readonly cv: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly ds: XaiDataset;
  private readonly onHover: (info: XaiHoverInfo | null) => void;

  private nodes: RenderNode[] = [];
  private edges: RenderEdge[] = [];
  private mode: XaiMode = 'global';
  private frame = 0;
  private ui!: XaiSettings;
  private palette!: EnginePalette;

  private readonly pos: Record<string, NodePos> = {};
  private cam = { x: 55, y: 0, s: 1 };
  private dpr = 1;
  private hoverFocus: string | null = null;
  private panning = false;
  private last: Pt | null = null;
  private readonly labelMemory: Record<string, number> = {};
  private rafId = 0;
  private firstBuild = true;
  private destroyed = false;
  private seed = 42;
  private resizeObserver: ResizeObserver | null = null;
  private readonly disposers: (() => void)[] = [];

  constructor(
    canvas: HTMLCanvasElement,
    dataset: XaiDataset,
    onHover: (info: XaiHoverInfo | null) => void
  ) {
    this.cv = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
    this.ds = dataset;
    this.onHover = onHover;
    dataset.nodes.forEach((n) => {
      const a = this.rnd() * Math.PI * 2;
      const r = 200 + this.rnd() * 150;
      this.pos[n.id] = { x: Math.cos(a) * r, y: Math.sin(a) * r, vx: 0, vy: 0, fx: 0, fy: 0 };
    });
    this.bindEvents();
    this.resize();
    this.rafId = requestAnimationFrame(this.draw);
  }

  /** Aplica un nuevo estado (frame/modo/controles/tema) y asienta el layout. */
  update(input: XaiEngineInput): void {
    this.mode = input.mode;
    this.frame = input.frame;
    this.ui = input.ui;
    this.palette = input.palette;
    const state = buildRenderState(this.ds, this.mode, this.frame, this.ui);
    this.nodes = state.nodes;
    this.edges = state.edges;
    for (const n of this.nodes) {
      if (!this.pos[n.id]) {
        this.pos[n.id] = {
          x: (this.rnd() - 0.5) * 120,
          y: (this.rnd() - 0.5) * 120,
          vx: 0,
          vy: 0,
          fx: 0,
          fy: 0,
        };
      }
    }
    this.settle(this.firstBuild ? SETTLE_INITIAL : SETTLE_REBUILD);
    this.reduceCrossings();
    if (this.firstBuild) {
      // abre enfocando el sensor más anómalo; el hover lo cambia después
      this.hoverFocus = [...this.nodes].sort((a, b) => b.val - a.val)[0]?.id ?? null;
      this.firstBuild = false;
    }
  }

  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.rafId);
    this.resizeObserver?.disconnect();
    this.disposers.forEach((d) => d());
  }

  // --- infraestructura --------------------------------------------------------

  private rnd(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  private bindEvents(): void {
    const cv = this.cv;
    const onDown = (e: MouseEvent) => {
      this.panning = true;
      this.last = { x: e.offsetX, y: e.offsetY };
      cv.classList.add('cursor-grabbing');
    };
    const onMove = (e: MouseEvent) => {
      if (this.destroyed) return;
      const r = cv.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      if (this.panning && this.last) {
        this.cam.x += mx - this.last.x;
        this.cam.y += my - this.last.y;
        this.last = { x: mx, y: my };
        return;
      }
      const id = this.hit(mx, my);
      this.hoverFocus = id;
      if (id) {
        const n = this.nodes.find((node) => node.id === id);
        if (n) {
          this.onHover({
            id,
            proc: this.ds.procOf[id],
            equip: this.ds.equip[id] ?? null,
            sub: `${sev(n.val)} · ${n.sub}`,
            val: n.val,
            x: mx,
            y: my,
          });
          return;
        }
      }
      this.onHover(null);
    };
    const onUp = () => {
      this.panning = false;
      cv.classList.remove('cursor-grabbing');
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const f = e.deltaY < 0 ? 1.12 : 0.89;
      const W = cv.clientWidth;
      const H = cv.clientHeight;
      const mx = e.offsetX - (W / 2 + this.cam.x);
      const my = e.offsetY - (H / 2 + this.cam.y);
      this.cam.x -= mx * (f - 1);
      this.cam.y -= my * (f - 1);
      this.cam.s = Math.max(0.35, Math.min(3, this.cam.s * f));
    };
    const onLeave = () => {
      this.hoverFocus = null;
      this.onHover(null);
    };
    cv.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    cv.addEventListener('wheel', onWheel, { passive: false });
    cv.addEventListener('mouseleave', onLeave);
    this.disposers.push(() => {
      cv.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      cv.removeEventListener('wheel', onWheel);
      cv.removeEventListener('mouseleave', onLeave);
    });
    const onResize = () => this.resize();
    window.addEventListener('resize', onResize);
    this.disposers.push(() => window.removeEventListener('resize', onResize));
    // re-sincroniza el backing store si el layout interno cambia (p. ej.
    // plegar/desplegar FluvIA) — evita arrastrar fotogramas viejos.
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(cv);
    }
  }

  private resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    this.cv.width = this.cv.clientWidth * this.dpr;
    this.cv.height = this.cv.clientHeight * this.dpr;
  }

  // --- física ------------------------------------------------------------------

  private procAnchor(p: string): Pt {
    const present = [...new Set(this.nodes.map((n) => n.proc))].sort();
    const i = present.indexOf(p);
    const n = present.length || 1;
    if (i < 0) return { x: 0, y: 0 };
    // semicírculo IZQUIERDO (abajo → izquierda → arriba): deja libre el lado
    // del panel de Interpretación y separa al máximo los procesos presentes.
    const a = n === 1 ? Math.PI : Math.PI / 2 + (i / (n - 1)) * Math.PI;
    return { x: Math.cos(a) * ANCHOR_RX, y: Math.sin(a) * ANCHOR_RY };
  }

  private activeEdges(): RenderEdge[] {
    const out: RenderEdge[] = [];
    if (this.ui.conn !== 'phys') out.push(...this.edges);
    if (this.ui.conn !== 'ai') {
      const vis = (id: string) => this.nodes.some((n) => n.id === id);
      for (const [s, t] of this.ds.phys) {
        if (vis(s) && vis(t)) out.push({ s, t, w: 0.5 });
      }
    }
    return out;
  }

  private physics(edges: RenderEdge[]): void {
    const ids = this.nodes.map((n) => n.id);
    for (const id of ids) {
      this.pos[id].fx = 0;
      this.pos[id].fy = 0;
    }
    // lazo → más repulsión: clusters más esponjados
    const rep = this.ui.proc === 'lazo' ? 19000 : 9000;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const A = this.pos[ids[i]];
        const B = this.pos[ids[j]];
        let dx = A.x - B.x;
        let dy = A.y - B.y;
        const d2 = dx * dx + dy * dy || 1;
        const f = rep / d2;
        const d = Math.sqrt(d2);
        dx /= d;
        dy /= d;
        A.fx += dx * f;
        A.fy += dy * f;
        B.fx -= dx * f;
        B.fy -= dy * f;
      }
    }
    for (const e of edges) {
      const A = this.pos[e.s];
      const B = this.pos[e.t];
      if (!A || !B) continue;
      let dx = B.x - A.x;
      let dy = B.y - A.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      // muelle inter-proceso estirado (175) para separar etapas
      const rest =
        this.ds.procOf[e.s] !== this.ds.procOf[e.t] ? 175 : this.ui.proc === 'lazo' ? 130 : 95;
      const f = (d - rest) * 0.02;
      dx /= d;
      dy /= d;
      A.fx += dx * f;
      A.fy += dy * f;
      B.fx -= dx * f;
      B.fy -= dy * f;
    }
    const group = this.ui.proc === 'lazo';
    for (const id of ids) {
      const P = this.pos[id];
      if (group) {
        const an = this.procAnchor(this.ds.procOf[id]);
        P.fx += (an.x - P.x) * 0.013;
        P.fy += (an.y - P.y) * 0.013;
        P.fx += -P.x * 0.0008;
        P.fy += -P.y * 0.0008;
      } else {
        P.fx += -P.x * 0.004;
        P.fy += -P.y * 0.004;
      }
      P.vx = (P.vx + P.fx) * 0.85;
      P.vy = (P.vy + P.fy) * 0.85;
      P.x += P.vx;
      P.y += P.vy;
    }
  }

  /** Asienta el layout en sitio (la física NO corre en el draw loop). */
  private settle(n: number): void {
    const edges = this.activeEdges();
    for (let k = 0; k < n; k++) this.physics(edges);
  }

  private edgesCrossing(edges: RenderEdge[]): number {
    let n = 0;
    for (let i = 0; i < edges.length; i++) {
      for (let j = i + 1; j < edges.length; j++) {
        const e = edges[i];
        const f = edges[j];
        if (e.s === f.s || e.s === f.t || e.t === f.s || e.t === f.t) continue;
        const [a, b, c, d] = [this.pos[e.s], this.pos[e.t], this.pos[f.s], this.pos[f.t]];
        if (a && b && c && d && segmentsCross(a, b, c, d)) n++;
      }
    }
    return n;
  }

  /** Intercambia pares del MISMO cluster si reduce cruces (determinista, solo lazo). */
  private reduceCrossings(): void {
    if (this.ui.proc !== 'lazo') return;
    const edges = this.activeEdges();
    const byProc: Record<string, string[]> = {};
    this.nodes.forEach((n) => (byProc[n.proc] = [...(byProc[n.proc] ?? []), n.id]));
    let cur = this.edgesCrossing(edges);
    for (let pass = 0; pass < 8 && cur > 0; pass++) {
      let improved = false;
      for (const p of Object.keys(byProc)) {
        const g = byProc[p];
        for (let i = 0; i < g.length; i++) {
          for (let j = i + 1; j < g.length; j++) {
            const a = this.pos[g[i]];
            const b = this.pos[g[j]];
            const [ax, ay, bx, by] = [a.x, a.y, b.x, b.y];
            a.x = bx; a.y = by; b.x = ax; b.y = ay;
            const c = this.edgesCrossing(edges);
            if (c < cur) {
              cur = c;
              improved = true;
            } else {
              a.x = ax; a.y = ay; b.x = bx; b.y = by;
            }
          }
        }
      }
      if (!improved) break;
    }
  }

  // --- interacción ---------------------------------------------------------------

  private toWorld(mx: number, my: number): Pt {
    const W = this.cv.clientWidth;
    const H = this.cv.clientHeight;
    return {
      x: (mx - (W / 2 + this.cam.x)) / this.cam.s,
      y: (my - (H / 2 + this.cam.y)) / this.cam.s,
    };
  }

  private hit(mx: number, my: number): string | null {
    const w = this.toWorld(mx, my);
    const z = Math.sqrt(this.cam.s);
    for (const n of this.nodes) {
      const P = this.pos[n.id];
      const dx = P.x - w.x;
      const dy = P.y - w.y;
      const hr = (n.r * z) / this.cam.s + 6 / this.cam.s;
      if (dx * dx + dy * dy < hr * hr) return n.id;
    }
    return null;
  }

  private nodeR(id: string): number {
    const n = this.nodes.find((node) => node.id === id);
    return n ? n.r * Math.sqrt(this.cam.s) : 8;
  }

  // --- etiquetas -------------------------------------------------------------------

  /** Elige el offset con menos cruces de arista y menos solape con otras pills. */
  private placeLabel(
    key: string,
    ax: number,
    ay: number,
    clearance: number,
    w: number,
    h: number,
    segs: number[][],
    up: boolean,
    placed: [number, number, number, number][]
  ): Pt {
    const z = Math.sqrt(this.cam.s);
    const gap = 6 * z;
    const ox = clearance + gap + w / 2;
    const oy = clearance + gap + h / 2;
    const d = (clearance + gap) * 0.72;
    const C: [number, number][] = up
      ? [
          [0, -oy], [-(w * 0.55), -oy], [w * 0.55, -oy], [ox, 0], [-ox, 0],
          [d + w / 2, -(d + h / 2)], [-(d + w / 2), -(d + h / 2)], [0, oy],
        ]
      : [
          [0, oy], [0, -oy], [ox, 0], [-ox, 0],
          [d + w / 2, d + h / 2], [-(d + w / 2), d + h / 2],
          [d + w / 2, -(d + h / 2)], [-(d + w / 2), -(d + h / 2)],
        ];
    let best = 0;
    let bestScore = 1e9;
    for (let i = 0; i < C.length; i++) {
      const cx = ax + C[i][0];
      const cy = ay + C[i][1];
      const rx = cx - w / 2;
      const ry = cy - h / 2;
      let s = 0;
      for (const g of segs) {
        if (segHitsRect(g[0], g[1], g[2], g[3], rx, ry, w, h)) s++;
      }
      for (const p of placed) {
        if (rectsOverlap(rx, ry, w, h, p)) s += 0.7;
      }
      if (this.labelMemory[key] === i) s -= 0.6; // histéresis anti-parpadeo
      if (i === 0) s -= 0.08;
      if (s < bestScore) {
        bestScore = s;
        best = i;
      }
    }
    this.labelMemory[key] = best;
    return { x: ax + C[best][0], y: ay + C[best][1] };
  }

  // --- capas de dibujo ---------------------------------------------------------------

  private drawPipes(SX: (id: string) => number, SY: (id: string) => number, zsc: number, segs: number[][]): void {
    const ctx = this.ctx;
    const vis = (id: string) => this.nodes.some((n) => n.id === id);
    for (const [s, t] of this.ds.phys) {
      if (!vis(s) || !vis(t) || !this.pos[s] || !this.pos[t]) continue;
      const x1 = SX(s);
      const y1 = SY(s);
      const x2 = SX(t);
      const y2 = SY(t);
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const rs = this.nodeR(s);
      const rt = this.nodeR(t);
      if (len < rs + rt + 14 * zsc) continue;
      const sx = x1 + ux * (rs + 2 * zsc);
      const sy = y1 + uy * (rs + 2 * zsc);
      const ex = x2 - ux * (rt + 2 * zsc);
      const ey = y2 - uy * (rt + 2 * zsc);
      ctx.lineCap = 'round';
      ctx.strokeStyle = this.palette.pipeOuter;
      ctx.lineWidth = 9 * zsc;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.strokeStyle = this.palette.pipeInner;
      ctx.lineWidth = 3.2 * zsc;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      // chevron de sentido de flujo
      const mx = (sx + ex) / 2;
      const my = (sy + ey) / 2;
      const px = -uy;
      const py = ux;
      const c = 5 * zsc;
      ctx.strokeStyle = this.palette.pipeChevron;
      ctx.lineWidth = 2 * zsc;
      ctx.beginPath();
      ctx.moveTo(mx - ux * c + px * c, my - uy * c + py * c);
      ctx.lineTo(mx + ux * c, my + uy * c);
      ctx.lineTo(mx - ux * c - px * c, my - uy * c - py * c);
      ctx.stroke();
      ctx.lineCap = 'butt';
      segs.push([sx, sy, ex, ey]);
    }
  }

  private blobPath(p: Pt[]): void {
    const ctx = this.ctx;
    const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    ctx.beginPath();
    if (p.length < 3) {
      p.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
      ctx.closePath();
      return;
    }
    const s = mid(p[p.length - 1], p[0]);
    ctx.moveTo(s.x, s.y);
    for (let i = 0; i < p.length; i++) {
      const cur = p[i];
      const nx = p[(i + 1) % p.length];
      const m = mid(cur, nx);
      ctx.quadraticCurveTo(cur.x, cur.y, m.x, m.y);
    }
    ctx.closePath();
  }

  private drawHullFills(
    SX: (id: string) => number,
    SY: (id: string) => number
  ): { x: number; y: number; name: string; col: string }[] {
    if (this.ui.proc !== 'lazo' || !this.nodes.length) return [];
    const ctx = this.ctx;
    const z = Math.sqrt(this.cam.s);
    const groups: Record<string, RenderNode[]> = {};
    const labels: { x: number; y: number; name: string; col: string }[] = [];
    for (const n of this.nodes) groups[n.proc] = [...(groups[n.proc] ?? []), n];
    for (const p of Object.keys(groups)) {
      const g = groups[p];
      const col = this.ds.procColor[p] ?? '#94a3b8';
      const pts = g.map((n) => ({ x: SX(n.id), y: SY(n.id), r: n.r * z }));
      const pad = Math.max(...pts.map((q) => q.r)) + 24 * z;
      let topPt: Pt;
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.fillStyle = hexA(col, 0.1);
      ctx.strokeStyle = hexA(col, 0.5);
      ctx.lineWidth = 2 * z;
      ctx.setLineDash([7 * z, 5 * z]);
      if (pts.length >= 3) {
        const hull = convexHull(pts);
        const cx = hull.reduce((s, q) => s + q.x, 0) / hull.length;
        const cy = hull.reduce((s, q) => s + q.y, 0) / hull.length;
        const poly = hull.map((q) => {
          const dx = q.x - cx;
          const dy = q.y - cy;
          const d = Math.hypot(dx, dy) || 1;
          return { x: q.x + (dx / d) * pad, y: q.y + (dy / d) * pad };
        });
        this.blobPath(poly);
        topPt = poly.reduce((a, b) => (b.y < a.y ? b : a), poly[0]);
      } else {
        const cx = pts.reduce((s, q) => s + q.x, 0) / pts.length;
        const cy = pts.reduce((s, q) => s + q.y, 0) / pts.length;
        const rr = Math.max(...pts.map((q) => Math.hypot(q.x - cx, q.y - cy) + q.r)) + 18 * z;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, Math.PI * 2);
        topPt = { x: cx, y: cy - rr };
      }
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      labels.push({ x: topPt.x, y: topPt.y - 4 * z, name: this.ds.procName[p] ?? p, col });
    }
    return labels;
  }

  private drawHullLabels(
    labels: { x: number; y: number; name: string; col: string }[],
    segs: number[][],
    placed: [number, number, number, number][]
  ): void {
    const ctx = this.ctx;
    for (const L of labels) {
      ctx.font = `600 ${Math.max(10, 11.5 * Math.sqrt(this.cam.s))}px ${FONT_SANS}`;
      const tw = ctx.measureText(L.name).width;
      const dotW = 15;
      const padX = 9;
      const h = 22;
      const w = tw + dotW + padX * 2;
      const pos = this.placeLabel(`proc:${L.name}`, L.x, L.y, 2, w, h, segs, true, placed);
      placed.push([pos.x - w / 2, pos.y - h / 2, w, h]);
      const rx = pos.x - w / 2;
      ctx.beginPath();
      ctx.roundRect(rx, pos.y - h / 2, w, h, h / 2);
      ctx.fillStyle = this.palette.procLabelBg;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = hexA(L.col, 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(rx + padX + 4, pos.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = L.col;
      ctx.fill();
      ctx.fillStyle = this.palette.procLabelText;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(L.name, rx + padX + dotW, pos.y);
    }
  }

  // --- draw loop -----------------------------------------------------------------

  private readonly draw = (): void => {
    if (!this.ui || !this.palette) {
      this.rafId = requestAnimationFrame(this.draw);
      return;
    }
    const ctx = this.ctx;
    const cv = this.cv;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, cv.clientWidth, cv.clientHeight);
    const W = cv.clientWidth;
    const H = cv.clientHeight;
    const cx = W / 2 + this.cam.x;
    const cy = H / 2 + this.cam.y;
    const s = this.cam.s;
    const SX = (id: string) => this.pos[id].x * s + cx;
    const SY = (id: string) => this.pos[id].y * s + cy;
    const zsc = Math.sqrt(s);

    // focus+context: ego-red (1 salto) del nodo bajo el cursor
    let fset: Set<string> | null = null;
    if (this.hoverFocus && this.nodes.some((n) => n.id === this.hoverFocus)) {
      fset = new Set([this.hoverFocus]);
      for (const e of this.activeEdges()) {
        if (e.s === this.hoverFocus) fset.add(e.t);
        else if (e.t === this.hoverFocus) fset.add(e.s);
      }
    }

    const segs: number[][] = [];
    const hullLabels = this.drawHullFills(SX, SY);
    if (this.ui.conn !== 'ai') this.drawPipes(SX, SY, zsc, segs);

    // aristas inferidas (IA): línea recta + cabeza de flecha que escala
    if (this.ui.conn !== 'phys') {
      for (const e of this.edges) {
        const A = this.pos[e.s];
        const B = this.pos[e.t];
        if (!A || !B) continue;
        const x1 = SX(e.s);
        const y1 = SY(e.s);
        const x2 = SX(e.t);
        const y2 = SY(e.t);
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        const rs = this.nodeR(e.s);
        const rt = this.nodeR(e.t);
        const lw = Math.max(1, e.w * zsc);
        const head = Math.min(Math.max(9 * zsc, lw * 3.2), len * 0.45);
        if (len < rs + rt + head * 0.9) continue;
        const gap = 2 * zsc;
        const sx = x1 + ux * (rs + gap);
        const sy = y1 + uy * (rs + gap);
        const ex = x2 - ux * (rt + gap);
        const ey = y2 - uy * (rt + gap);
        const bx = ex - ux * head;
        const by = ey - uy * head;
        const inFocus = !fset || e.s === this.hoverFocus || e.t === this.hoverFocus;
        ctx.globalAlpha = fset && !inFocus ? 0.2 : 1;
        if (fset && inFocus) {
          ctx.strokeStyle = this.palette.focusAccent;
          ctx.fillStyle = this.palette.focusAccent;
        } else {
          ctx.strokeStyle = this.palette.edge;
          ctx.fillStyle = this.palette.edgeHead;
        }
        if (fset && !inFocus) ctx.setLineDash([4 * zsc, 4 * zsc]);
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(bx, by);
        ctx.stroke();
        const px = -uy;
        const py = ux;
        const hw = Math.max(head * 0.55, lw * 1.15);
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(bx + px * hw, by + py * hw);
        ctx.lineTo(bx - px * hw, by - py * hw);
        ctx.closePath();
        ctx.fill();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        if (inFocus) segs.push([sx, sy, ex, ey]);
      }
    }

    // nodos: anillo hueco con la criticidad en el TRAZO; sólido para foco/top-K
    for (const n of this.nodes) {
      const x = SX(n.id);
      const y = SY(n.id);
      const r = n.r * zsc;
      const isTop = n.top;
      const isContext = fset !== null && !fset.has(n.id);
      ctx.globalAlpha = !fset ? 1 : fset.has(n.id) ? (n.id === this.hoverFocus ? 1 : 0.95) : 0.16;
      const solid = (isTop || n.id === this.hoverFocus) && !isContext;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      if (solid) {
        ctx.fillStyle = n.col;
        ctx.fill();
        ctx.lineWidth = 1.4 * zsc;
        ctx.strokeStyle = this.palette.nodeStroke;
        ctx.stroke();
      } else {
        ctx.fillStyle = this.palette.nodeFill;
        ctx.fill();
        ctx.lineWidth = Math.max(1.4, 1.9 * zsc);
        ctx.strokeStyle = isContext ? this.palette.contextRing : n.col;
        ctx.stroke();
      }
      // anillo de proceso exterior (solo modo 'anillo')
      if (this.ui.proc === 'ring') {
        ctx.strokeStyle = this.ds.procColor[n.proc] ?? '#b0b8c1';
        ctx.lineWidth = 1.5 * zsc;
        ctx.beginPath();
        ctx.arc(x, y, r + 3.4 * zsc, 0, Math.PI * 2);
        ctx.stroke();
      }
      // glow del foco / top-K (accent)
      if ((isTop || n.id === this.hoverFocus) && !isContext) {
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.shadowColor = this.palette.focusGlow;
        ctx.shadowBlur = (n.id === this.hoverFocus ? 18 : 8) * zsc;
        ctx.strokeStyle = this.palette.focusAccent;
        ctx.lineWidth = (n.id === this.hoverFocus ? 2.4 : 1.6) * zsc;
        ctx.beginPath();
        ctx.arc(x, y, r + (this.ui.proc === 'ring' ? 6 : 2.8) * zsc, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;

    // etiquetas: texto plano con halo, colocado sin cortar aristas ni pills
    const placed: [number, number, number, number][] = [];
    const useEquip = this.ui.label === 'equip';
    for (const n of this.nodes) {
      const x = SX(n.id);
      const y = SY(n.id);
      const r = n.r * zsc;
      if (fset && !fset.has(n.id)) {
        // contexto: tag gris tenue encima del nodo
        ctx.font = `${Math.max(8.5, 10 * zsc)}px ${FONT_MONO}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = this.palette.dimLabel;
        ctx.fillText(n.id, x, y - r - 7 * zsc);
        continue;
      }
      const txt = useEquip ? this.ds.equip[n.id] ?? n.id : n.id;
      ctx.font = `${useEquip ? '500 ' : ''}${Math.max(9.5, 11 * zsc)}px ${useEquip ? FONT_SANS : FONT_MONO}`;
      ctx.textBaseline = 'middle';
      const tw = ctx.measureText(txt).width;
      const h = Math.max(13, 14 * zsc);
      const w = tw + 6 * zsc;
      const pos = this.placeLabel(n.id, x, y, r, w, h, segs, false, placed);
      ctx.textAlign = 'center';
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(2.5, 3 * zsc);
      ctx.strokeStyle = this.palette.labelHalo;
      ctx.strokeText(txt, pos.x, pos.y);
      ctx.fillStyle = n.id === this.hoverFocus ? this.palette.labelTextFocus : this.palette.labelText;
      ctx.fillText(txt, pos.x, pos.y);
      placed.push([pos.x - w / 2, pos.y - h / 2, w, h]);
    }
    this.drawHullLabels(hullLabels, segs, placed);

    if (!this.nodes.length) {
      ctx.fillStyle = this.palette.emptyText;
      ctx.font = `13px ${FONT_MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Sin nodos — baja «peso mín.» o sube «vecinos»', W / 2, H / 2);
    }
    this.rafId = requestAnimationFrame(this.draw);
  };
}
