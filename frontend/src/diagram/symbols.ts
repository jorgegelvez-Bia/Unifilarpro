/**
 * Símbolos normalizados (IEC 60617 / RETIE) del unifilar.
 * Copia de `SYM` y sus utilidades en UnifilarPro_Medida_Bia.html.
 * Cada símbolo recibe la `y` donde empieza y devuelve su SVG y medidas.
 */
import { NF, summary, trK, trN } from '@/checks';
import type { Element } from '@/types';

/** X de la línea vertical principal. */
export const X = 230;

export type El = Element & { _title?: string; _sub?: string };

export interface SymResult {
  g: string;
  top: number | null;
  bottom: number | null;
  h: number;
  cy: number;
  noLabel?: boolean;
  bx?: number;
  by?: number;
  sec?: { x: number; y: number; k: 'I' | 'V' };
}

export interface Ctx {
  planta?: El | null;
  mt?: boolean;
  next?: El;
  prevEl?: El;
  dual?: boolean;
  dualPrev?: number | null;
}

export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export function wrap(text: string, n: number): string[] {
  const words = text.split(' '), lines: string[] = [];
  let c = '';
  words.forEach((w) => {
    if ((c + ' ' + w).trim().length > n && c) { lines.push(c); c = w; } else c = (c + ' ' + w).trim();
  });
  if (c) lines.push(c);
  return lines;
}

export const L = (x1: number, y1: number, x2: number, y2: number, c = 'w') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${c}"/>`;

/* ===== Código de colores RETIE ===== */
export const RC_G = '#2E7D32', RC_N = '#FFFFFF';
export const RC = { MT: ['#7B1FA2', '#6D4C41', '#D32F2F'], B208: ['#F9A825', '#1565C0', '#D32F2F'], B480: ['#6D4C41', '#EF6C00', '#F9A825'], B1: ['#212121'], B2: ['#212121', '#D32F2F'] };
/** Estado de colores del diagrama que se está dibujando (se fija en buildSVG). */
export const RCX = { fases: 3, bt: '208', mt: true };
export function phCols(bt: boolean, n: number): string[] {
  if (!bt) return RC.MT.slice(0, n);
  if (n === 1) return RC.B1;
  if (n === 2) return RC.B2;
  return RCX.bt === '480' ? RC.B480 : RC.B208;
}
export const PH = (x1: number, y1: number, x2: number, y2: number, c: string) =>
  c === RC_N
    ? `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="stroke:#8A9699;stroke-width:4.2;stroke-linecap:round"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="stroke:#fff;stroke-width:2.4;stroke-linecap:round"/>`
    : `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="stroke:${c};stroke-width:2.8;stroke-linecap:round"/>`;
const GL = (x1: number, y1: number, x2: number, y2: number, w = 1.6) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="stroke:${RC_G};stroke-width:${w};stroke-linecap:round"/>`;
const ground = (x: number, y: number) => GL(x - 9, y, x + 9, y) + GL(x - 6, y + 4, x + 6, y + 4) + GL(x - 3, y + 8, x + 3, y + 8);
const ground4 = (x: number, y: number) => GL(x - 11, y, x + 11, y, 2.6) + GL(x - 8, y + 5, x + 8, y + 5) + GL(x - 5, y + 10, x + 5, y + 10) + GL(x - 2, y + 15, x + 2, y + 15);
export const dot = (x: number, y: number) => `<circle cx="${x}" cy="${y}" r="2.6" class="dot"/>`;
export const tri = (x: number, yy: number, n: number) => `<path d="M${x} ${yy - 10} L${x + 9} ${yy + 6} L${x - 9} ${yy + 6} Z" class="tri"/><text x="${x}" y="${yy + 4}" class="trit">${n}</text>`;

/** true mientras se dibuja: en el diagrama "Por revisar" no se marca (solo Dañado). */
export const DRAW = { inDiag: false };

export function stateText(el: El): string {
  const e = el.f.estado;
  if (!e || e === 'Bueno') return '';
  if (DRAW.inDiag && e !== 'Dañado') return '';
  if (DRAW.inDiag && el.t === 'dps' && +el.f.malos > 0) return el.f.malos + (+el.f.malos === 1 ? ' DAÑADO' : ' DAÑADOS') + (el.f.obs ? ': ' + el.f.obs : '');
  return (e === 'Dañado' ? 'DAÑADO' : 'POR REVISAR') + (el.f.obs ? ': ' + el.f.obs : '');
}
export function stClass(el: El): string {
  const e = el.f.estado;
  if (DRAW.inDiag && e === 'Por revisar') return '';
  return e === 'Dañado' ? 'bad' : e === 'Por revisar' ? 'rev' : '';
}
export function badge(x: number, y: number, el: El): string {
  const c = stClass(el);
  if (!c) return '';
  return `<circle cx="${x}" cy="${y}" r="7" class="bdg ${c}"/><text x="${x}" y="${y + 3.5}" class="bdgt">${c === 'bad' ? '!' : '?'}</text>`;
}

export const meterBox = (cx: number, cy: number, w: number, hh: number, r: number) =>
  `<rect x="${cx - w / 2}" y="${cy - hh / 2}" width="${w}" height="${hh}" rx="${r}" class="s"/><rect x="${cx - w / 2 + 6}" y="${cy - hh / 2 + 6}" width="${w - 12}" height="${Math.round(hh * 0.24)}" rx="2" class="disp"/><text x="${cx}" y="${cy - hh / 2 + 6 + Math.round(hh * 0.24) - 3}" class="pol" style="text-anchor:middle">0000</text><text x="${cx}" y="${cy + hh / 2 - 9}" class="kwh" style="font-weight:600">kWh</text>`;

function otrosBranch(yb: number, n: number, desc: string, medida: string) {
  const ax = X - 110;
  let g = dot(X, yb) + L(X, yb, ax, yb) + L(ax, yb, ax, yb + 12) + `<path d="M${ax - 7} ${yb + 12} L${ax + 7} ${yb + 12} L${ax} ${yb + 24} Z" class="arr"/>`;
  g += `<text x="${ax}" y="${yb + 40}" class="t1" style="text-anchor:middle">Otros usuarios</text>`;
  const det = [n ? '×' + n : '', desc || '', medida && medida !== 'Propia' ? 'medida: ' + medida.toLowerCase() : ''].filter(Boolean).join(' · ');
  wrap(det, 22).slice(0, 2).forEach((l, i) => (g += `<text x="${ax}" y="${yb + 53 + i * 12}" class="t2" style="text-anchor:middle">${esc(l)}</text>`));
  return g;
}

type SymFn = (y: number, e: El, ctx: Ctx) => SymResult;

export const SYM: Record<string, SymFn> = {
  red(y, e) {
    const h = 66, by = y + 10;
    let g = L(X - 44, by, X + 44, by, 'bus') + L(X, by, X, y + h);
    const n = NF[e.f.fases] || 3, bt = e.f.nivel !== 'MT', cs = phCols(bt, n);
    for (let i = 0; i < n; i++) { const yy = by + 24 + i * 7; g += PH(X - 6, yy + 4, X + 6, yy - 4, cs[i] || cs[0]); }
    if (e.f.neutro === 'Sí' && e.f.nivel !== 'MT') { const yy = by + 24 + n * 7; g += PH(X - 6, yy + 4, X + 6, yy - 4, RC_N) + `<circle cx="${X + 6}" cy="${yy - 4}" r="2" class="dot"/>`; }
    return { g, top: null, bottom: y + h, h, cy: by };
  },
  lmt(y, e) {
    const h = 74, cy = y + 37, n = parseInt(e.f.lineas) || 1;
    let g = L(X, y, X, y + h) + L(X - 22, cy - 14, X + 22, cy - 14, 'w thick');
    [X - 16, X, X + 16].forEach((x) => (g += `<rect x="${x - 3}" y="${cy - 24}" width="6" height="10" rx="2" class="s thinS"/>`));
    for (let i = 0; i < n; i++) { const yy = cy + 8 + i * 7; g += L(X - 6, yy + 4, X + 6, yy - 4); }
    return { g, top: y, bottom: y + h, h, cy };
  },
  acom(y, e, c) {
    const h = 66, cy = y + 33, sub = e.f.tipo === 'Subterránea';
    let g = L(X, y, X, y + h, sub ? 'w dash' : 'w');
    const n = ({ Trifásica: 3, Bifásica: 2, Monofásica: 1 } as Record<string, number>)[e.f.fasesA] || RCX.fases, bt = !(c && c.mt), cs = phCols(bt, n);
    for (let i = 0; i < n; i++) { const yy = cy - 8 + i * 7; g += PH(X - 9, yy + 4, X + 9, yy - 4, cs[i] || cs[0]); }
    if (e.f.neutro !== 'No' && bt) { const yy = cy - 8 + n * 7; g += PH(X - 9, yy + 4, X + 9, yy - 4, RC_N) + `<circle cx="${X + 9}" cy="${yy - 4}" r="2" class="dot"/>`; }
    g += `<path d="M${X + 8} ${cy + 19} l5 5 l-5 5" class="w thin2"/>`;
    return { g, top: y, bottom: y + h, h, cy };
  },
  xlpe(y) {
    const h = 80, cy = y + 40;
    const g = `<path d="M${X} ${cy - 28} L${X + 8} ${cy - 16} L${X - 8} ${cy - 16} Z" class="s"/>` + `<path d="M${X} ${cy - 16} C${X + 11} ${cy - 6} ${X - 11} ${cy + 6} ${X} ${cy + 16}" class="w"/>` + `<path d="M${X} ${cy - 16} C${X + 15} ${cy - 6} ${X - 5} ${cy + 6} ${X} ${cy + 16}" class="w thin2"/>` + `<path d="M${X} ${cy + 28} L${X + 8} ${cy + 16} L${X - 8} ${cy + 16} Z" class="s"/>`;
    return { g, top: cy - 28, bottom: cy + 28, h, cy };
  },
  fus(y) {
    const h = 68, cy = y + 34;
    const g = L(X - 8, cy - 22, X + 8, cy - 22, 'w thick') + `<g transform="rotate(-18 ${X} ${cy + 18})"><rect x="${X - 5}" y="${cy - 18}" width="10" height="34" rx="3" class="s"/>${L(X, cy - 13, X, cy + 11, 'w thin2')}</g>` + `<circle cx="${X}" cy="${cy + 18}" r="2.6" class="dot"/>`;
    return { g, top: cy - 22, bottom: cy + 18, h, cy };
  },
  seccp(y, e, c) { return SYM.secc(y, e, c); },
  doble(y, e, ctx) {
    const n1l = wrap((e.f.nombre1 || '').trim() || '1', 18).slice(0, 2), n2l = wrap((e.f.nombre2 || '').trim() || '2', 18).slice(0, 2);
    const nl = Math.max(n1l.length, n2l.length), o = (nl - 1) * 12, h = 132 + o, xa = X - 70, xb = X + 70, yt = y + 34 + o, cy = y + 70 + o, yj = y + 108 + o;
    const c1 = e.f.uso !== 'Cerrado circuito 2', c2 = e.f.uso !== 'Cerrado circuito 1';
    const tm = !!(ctx && ((ctx.next && ctx.next.t === 'transc') || ctx.dual));
    const sw = (x: number, closed: boolean) => L(x, yt, x, cy - 14) + L(x - 9, cy - 14, x + 9, cy - 14, 'w thick') + (closed ? L(x, cy + 15, x + 2, cy - 12) : L(x, cy + 15, x + 15, cy - 12)) + `<circle cx="${x}" cy="${cy + 15}" r="3" class="s"/>` + L(x, cy + 18, x, yj);
    let g = L(xa - 14, yt, xa + 14, yt, 'bus') + L(xb - 14, yt, xb + 14, yt, 'bus') + sw(xa, c1) + sw(xb, c2) + (tm ? L(xa, yj, xa, y + h) + L(xb, yj, xb, y + h) : L(xa, yj, xb, yj) + dot(X, yj) + L(X, yj, X, y + h));
    ([[xa, n1l], [xb, n2l]] as [number, string[]][]).forEach(([x, ls]) => {
      g += `<text x="${x}" y="${y + 11}" class="t2" style="text-anchor:middle">Cto.</text>`;
      ls.forEach((l, i) => (g += `<text x="${x}" y="${y + 24 + i * 12 + (nl - ls.length) * 12}" class="t1" style="text-anchor:middle">${esc(l)}</text>`));
    });
    g += `<text x="${xa - 24}" y="${cy + 4}" class="t1">Doble circuito</text>`;
    if (e.f.cambio && e.f.cambio !== 'Sin indicar') g += `<text x="${X}" y="${yj + 16}" class="t2 lft" style="text-anchor:start" dx="8">Cambio ${esc(e.f.cambio.toLowerCase())}</text>`;
    if (tm) { ctx.dualPrev = y + h; return { g, top: y, bottom: null, h, cy: yj, noLabel: true, bx: xb + 22, by: yt - 8 }; }
    return { g, top: y, bottom: y + h, h, cy: yj, noLabel: true, bx: xb + 22, by: yt - 8 };
  },
  transc(y, e, ctx) {
    const xa = X - 70, xb = X + 70, pd = ctx && ((ctx.prevEl && ctx.prevEl.t === 'doble') || ctx.dual), y0 = pd ? y : y + 42, auto = e.f.tipo === 'Automática', u2 = e.f.enUso === 'Circuito 2';
    const xl = X - 24, xr = X + 24, yc = y0 + 34, yb = y0 + 82, h = yb - y + 30;
    let g = '';
    if (!pd) g += L(xa - 14, y + 28, xa + 14, y + 28, 'bus') + L(xb - 14, y + 28, xb + 14, y + 28, 'bus') + `<text x="${xa}" y="${y + 8}" class="t2" style="text-anchor:middle">Cto.</text><text x="${xb}" y="${y + 8}" class="t2" style="text-anchor:middle">Cto.</text><text x="${xa}" y="${y + 21}" class="t1" style="text-anchor:middle">${esc((e.f.nombre1 || '').trim() || '1')}</text><text x="${xb}" y="${y + 21}" class="t1" style="text-anchor:middle">${esc((e.f.nombre2 || '').trim() || '2')}</text>` + L(xa, y + 28, xa, y0) + L(xb, y + 28, xb, y0);
    g += L(xa, y0, xa, y0 + 12) + L(xa, y0 + 12, xl, y0 + 12) + L(xb, y0, xb, y0 + 12) + L(xb, y0 + 12, xr, y0 + 12);
    if (!auto) {
      g += L(xl, y0 + 12, xl, yc) + L(xr, y0 + 12, xr, yc) + L(xl - 8, yc, xl + 8, yc, 'w thick') + L(xr - 8, yc, xr + 8, yc, 'w thick');
      const tx = u2 ? xr : xl, ox = u2 ? xl : xr;
      g += L(X, yb, tx, yc + 3) + `<path d="M${X} ${yb} L${ox} ${yc + 3}" class="w thin2" style="stroke-dasharray:4 4"/>` + `<circle cx="${X}" cy="${yb}" r="3.2" class="s"/>`;
    } else {
      const brk = (x: number, closed: boolean) => L(x, y0 + 12, x, yc - 4) + `<path d="M${x - 5} ${yc - 9} l10 10 M${x + 5} ${yc - 9} l-10 10" class="w thin2"/>` + (closed ? L(x, yc + 22, x + 1, yc - 3) : L(x, yc + 22, x + 13, yc - 1)) + `<circle cx="${x}" cy="${yc + 22}" r="2.6" class="s"/>` + L(x, yc + 22, x, yb);
      g += brk(xl, !u2) + brk(xr, u2) + `<path d="M${xl + 6} ${yc + 10} H${xr - 6}" class="w thin2" style="stroke-dasharray:3 3"/>` + L(xl, yb, xr, yb) + dot(X, yb)
        + `<rect x="${xl - 16}" y="${y0 + 20}" width="${xr - xl + 32}" height="${yb - y0 - 14}" rx="6" class="cel"/><text x="${xr + 20}" y="${y0 + 30}" class="t4 lft">ATS</text>`;
    }
    g += L(X, yb, X, y + h);
    g += `<text x="${X - 48}" y="${yc + 6}" class="t1">Celda de transferencia</text><text x="${X - 48}" y="${yc + 19}" class="t2">${e.f.tipo === 'Automática' ? 'automática · ' : e.f.tipo === 'Manual' ? 'manual · ' : ''}${esc(u2 ? (e.f.nombre2 || '').trim() || 'circuito 2' : (e.f.nombre1 || '').trim() || 'circuito 1')}</text>`;
    if (ctx) ctx.dual = false;
    return { g, top: pd ? null : y, bottom: y + h, h, cy: yc, noLabel: true, bx: xb + 18, by: yc - 20 };
  },
  secc(y) {
    const h = 66, cy = y + 33;
    const g = L(X - 9, cy - 14, X + 9, cy - 14, 'w thick') + L(X, cy + 15, X + 15, cy - 12) + `<circle cx="${X}" cy="${cy + 15}" r="3" class="s"/>` + L(X + 4, cy + 1, X + 11, cy + 5, 'w thin2');
    return { g, top: cy - 14, bottom: cy + 18, h, cy };
  },
  reco(y) {
    const h = 66, cy = y + 33;
    const g = `<rect x="${X - 15}" y="${cy - 17}" width="30" height="34" rx="6" class="s"/>` + L(X - 6, cy - 7, X + 6, cy + 5) + L(X + 6, cy - 7, X - 6, cy + 5) + `<path d="M${X - 8} ${cy + 10} a8 4 0 0 0 16 0" class="w thin2"/><text x="${X + 19}" y="${cy - 12}" class="pol" style="font-weight:600">79</text>`;
    return { g, top: cy - 17, bottom: cy + 17, h, cy };
  },
  dps(y) {
    const h = 82, cy = y + 22, bx = X + 44;
    const g = L(X, y, X, y + h) + dot(X, cy) + L(X, cy, bx, cy) + L(bx, cy, bx, cy + 8) + `<rect x="${bx - 8}" y="${cy + 8}" width="16" height="28" rx="3" class="s"/>`
      + `<path d="M${bx + 3} ${cy + 12} L${bx - 3} ${cy + 22} L${bx + 3} ${cy + 22} L${bx - 3} ${cy + 32}" class="w thin2"/>` + L(bx, cy + 36, bx, cy + 44) + ground(bx, cy + 44);
    return { g, top: y, bottom: y + h, h, cy };
  },
  spt(y) {
    const h = 62, cy = y + 20, bx = X + 36;
    return { g: L(X, y, X, y + h) + dot(X, cy) + L(X, cy, bx, cy) + L(bx, cy, bx, cy + 14) + ground4(bx, cy + 14), top: y, bottom: y + h, h, cy };
  },
  cond(y) {
    const h = 72, cy = y + 22, bx = X + 44;
    return { g: L(X, y, X, y + h) + dot(X, cy) + L(X, cy, bx, cy) + L(bx, cy, bx, cy + 14) + L(bx - 12, cy + 14, bx + 12, cy + 14, 'w thick') + `<path d="M${bx - 12} ${cy + 23} q12 -7 24 0" class="w thick"/>` + L(bx, cy + 20, bx, cy + 32) + ground(bx, cy + 32), top: y, bottom: y + h, h, cy };
  },
  otros(y, e) {
    const h = 100, yb = y + 14;
    const g = L(X, y, X, y + h) + otrosBranch(yb, 0, e.f.descripcion === 'Sin especificar' ? '' : e.f.descripcion, '');
    return { g, top: y, bottom: y + h, h, cy: yb, noLabel: true, bx: X - 92, by: yb + 6 };
  },
  trafo(y, e) {
    const n = trN(e), multi = n > 1, ex = multi ? 18 : 0, cy = y + 46 + ex, h = 92 + 2 * ex, sp = 100;
    const one = (x: number) => `<circle cx="${x}" cy="${cy - 12}" r="17" class="w"/><circle cx="${x}" cy="${cy + 12}" r="17" class="w"/>`
      + `<path d="M${x - 6} ${cy - 9} L${x} ${cy - 19} L${x + 6} ${cy - 9} Z" class="w thin2"/>` + L(x, cy + 13, x, cy + 19, 'w thin2') + L(x, cy + 13, x - 5, cy + 9, 'w thin2') + L(x, cy + 13, x + 5, cy + 9, 'w thin2');
    let g = '';
    if (!multi) g = one(X);
    else {
      const yt = cy - 47, yb2 = cy + 47, xe = X + (n - 1) * sp, ks = trK(e);
      g += L(X, yt - 4, X, yt) + L(X, yt, xe, yt) + L(X, yb2, xe, yb2) + dot(X, yt) + dot(X, yb2);
      for (let i = 0; i < n; i++) {
        const x = X + i * sp;
        g += L(x, yt, x, cy - 29) + L(x, cy + 29, x, yb2) + one(x) + `<text x="${x + 22}" y="${cy - 3}" class="t1" style="text-anchor:start">Trafo ${i + 1}</text>` + (ks[i] ? `<text x="${x + 22}" y="${cy + 11}" class="t2" style="text-anchor:start">${ks[i]} kVA</text>` : '');
      }
    }
    const bot = multi ? cy + 47 : cy + 29;
    return { g, top: multi ? cy - 51 : cy - 29, bottom: bot, h, cy };
  },
  tt(y) {
    const h = 78, cy = y + 33;
    const g = L(X, y, X, y + h) + dot(X, cy) + L(X, cy, X + 34, cy) + `<rect x="${X + 34}" y="${cy - 6}" width="9" height="12" rx="1.5" class="s thinS"/>` + L(X + 43, cy, X + 44, cy)
      + `<circle cx="${X + 56}" cy="${cy}" r="12" class="w"/><circle cx="${X + 72}" cy="${cy}" r="12" class="w"/>` + L(X + 64, cy + 10, X + 64, cy + 22, 'thin') + ground(X + 64, cy + 22) + `<text x="${X + 64}" y="${cy - 16}" class="pol" style="text-anchor:middle">TP</text>`;
    return { g, top: y, bottom: y + h, h, cy, sec: { x: X + 84, y: cy, k: 'V' } };
  },
  tc(y) {
    const h = 64, cy = y + 32;
    return { g: L(X, y, X, y + h) + `<circle cx="${X}" cy="${cy}" r="12" class="w"/><circle cx="${X}" cy="${cy}" r="6" class="w thin2"/><circle cx="${X - 9}" cy="${cy - 15}" r="2.2" class="dot"/><text x="${X + 17}" y="${cy - 7}" class="pol">S1</text><text x="${X + 17}" y="${cy + 15}" class="pol">S2</text>`, top: y, bottom: y + h, h, cy, sec: { x: X + 12, y: cy, k: 'I' } };
  },
  barrmt(y, e) {
    const h = 78, by = y + 24, n = parseInt(e.f.salidas) || 0, sp = 30, w = Math.max(120, 40 + (n + 1) * sp);
    let g = L(X, y, X, by) + `<rect x="${X - 40}" y="${by - 5}" width="${w}" height="10" rx="1.5" class="arr"/>` + L(X, by, X, y + h);
    const nf = NF[e.f.sistema] || RCX.fases, cs = phCols(false, nf);
    for (let i = 0; i < nf; i++) { const yy = by - 21 + i * 6; g += PH(X - 5, yy + 3, X + 5, yy - 3, cs[i]); }
    for (let i = 1; i <= n; i++) { const x = X + i * sp; g += L(x, by + 5, x, by + 30) + `<path d="M${x - 6} ${by + 30} L${x + 6} ${by + 30} L${x} ${by + 41} Z" class="arr"/>`; }
    if (n) g += `<text x="${X + (sp * (n + 1)) / 2}" y="${by - 11}" class="pol" style="text-anchor:middle">${n} salida${n > 1 ? 's' : ''}</text>`;
    return { g, top: y, bottom: y + h, h, cy: by };
  },
  barraje(y, e, c) {
    const h = 72, by = y + 26, n = NF[e.f.sistema] || 3, ph = ['R', 'S', 'T'].slice(0, n);
    let g = L(X, y, X, by) + `<rect x="${X - 40}" y="${by - 4}" width="110" height="8" rx="2" class="arr"/>` + L(X, by, X, y + h);
    const cs = phCols(!(c && c.mt), n);
    ph.forEach((t, i) => { const px = X - 24 + i * 30; g += `<text x="${px}" y="${by - 8}" class="pol" style="text-anchor:middle;font-weight:600">${t}</text>` + PH(px, by + 4, px, by + 16, cs[i] || cs[0]); });
    return { g, top: y, bottom: y + h, h, cy: by };
  },
  brkcli(y) {
    const h = 66, cy = y + 33;
    const g = `<rect x="${X - 4}" y="${cy - 19}" width="8" height="8" class="s thinS"/>` + L(X, cy + 15, X + 15, cy - 11) + `<circle cx="${X}" cy="${cy + 15}" r="2.6" class="dot"/>`;
    return { g, top: cy - 19, bottom: cy + 15, h, cy };
  },
  breaker(y) {
    const h = 66, cy = y + 33;
    const g = L(X - 5, cy - 19, X + 5, cy - 9) + L(X + 5, cy - 19, X - 5, cy - 9) + L(X, cy + 15, X + 15, cy - 11) + `<circle cx="${X}" cy="${cy + 15}" r="2.6" class="dot"/>` + `<path d="M${X + 9} ${cy - 2} a10 10 0 0 1 7 9" class="w thin2"/>`;
    return { g, top: cy - 14, bottom: cy + 15, h, cy };
  },
  transfer(y, _e, ctx) {
    const pl = ctx.planta, h = pl ? 100 : 66, cy = y + 32, cx2 = X + 26;
    let g = `<circle cx="${X}" cy="${cy - 16}" r="2.6" class="dot"/><circle cx="${cx2}" cy="${cy - 16}" r="2.6" class="dot"/>` + L(X, cy + 16, X + 4, cy - 13) + `<circle cx="${X}" cy="${cy + 16}" r="3" class="s"/>` + `<text x="${X - 10}" y="${cy - 20}" class="pol" style="text-anchor:end">Red</text>`;
    if (pl) {
      const gx = X + 84;
      g += L(cx2, cy - 16, cx2, cy - 30) + L(cx2, cy - 30, gx, cy - 30) + L(gx, cy - 30, gx, cy - 18);
      const st = pl.f.estado !== 'Bueno' && pl.f.estado ? (pl.f.estado === 'Dañado' ? ' bad' : ' rev') : '';
      g += `<g class="${st}"><circle cx="${gx}" cy="${cy}" r="18" class="s"/><text x="${gx}" y="${cy - 1}" class="kwh" style="font-weight:700">G</text><path d="M${gx - 7} ${cy + 7} q3.5 -5 7 0 q3.5 5 7 0" class="w thin2"/></g>` + `<text x="${gx}" y="${cy + 34}" class="t1" style="text-anchor:middle">Planta</text>`;
      wrap([summary(pl), stateText(pl)].filter(Boolean).join(' · '), 24).slice(0, 2).forEach((l, i) => (g += `<text x="${gx}" y="${cy + 46 + i * 12}" class="t2" style="text-anchor:middle">${esc(l)}</text>`));
    } else g += `<text x="${cx2 + 6}" y="${cy - 20}" class="pol">G</text>`;
    return { g, top: cy - 16, bottom: cy + 19, h, cy };
  },
  planta(y) {
    const h = 68, cy = y + 34;
    return { g: `<circle cx="${X}" cy="${cy}" r="20" class="s"/><text x="${X}" y="${cy - 1}" class="kwh" style="font-weight:700">G</text><path d="M${X - 8} ${cy + 8} q4 -5 8 0 q4 5 8 0" class="w thin2"/>`, top: cy - 20, bottom: cy + 20, h, cy };
  },
  cajam(y, e) {
    const h = 84, top = y + 12, bot = y + h - 12, by = top + 22, n = parseInt(e.f.clientes) || 0, rmu = /RMU/.test(e.f.tipo || ''), pre = /premoldeado/i.test(e.f.tipo || '');
    let g = L(X, y, X, top) + `<rect x="${X - 34}" y="${top}" width="68" height="${bot - top}" rx="3" class="s"/>` + L(X, top, X, by) + `<rect x="${X - 24}" y="${by - 3}" width="48" height="6" rx="1" class="arr"/>`;
    if (rmu) { const sy = by + 10; g += L(X, by, X, sy) + L(X, sy, X + 9, sy + 13) + L(X, sy + 16, X, bot); }
    else if (pre) g += L(X, by, X, by + 10) + `<path d="M${X - 5} ${by + 10} L${X} ${by + 17} L${X + 5} ${by + 10}" class="w thin2"/>` + L(X, by + 17, X, bot);
    else g += L(X, by, X, bot);
    g += L(X, bot, X, y + h);
    if (n) {
      const k = Math.min(n, 6), sp = k > 1 ? Math.min(10, 34 / (k - 1)) : 0, y0 = by - (sp * (k - 1)) / 2 + 4, ex = X + 80;
      g += L(X + 24, by, X + 46, by, 'w thin2');
      for (let i = 0; i < k; i++) { const yy = y0 + i * sp; g += L(X + 46, by, ex - 8, yy, 'w thin2') + `<path d="M${ex - 9} ${yy - 3.5} L${ex} ${yy} L${ex - 9} ${yy + 3.5} Z" class="arr"/>`; }
      g += `<text x="${X + 88}" y="${by + 4}" class="t2 lft">${n} cliente${n > 1 ? 's' : ''}</text>`;
    }
    return { g, top: y, bottom: y + h, h, cy: by };
  },
  rabi(y) {
    const h = 74, cy = y + 37, px = X + 16;
    let g = L(X, y, X, y + h) + `<rect x="${px - 4}" y="${cy - 22}" width="8" height="44" rx="2" class="s thinS"/>`;
    [-14, 0, 14].forEach((o) => (g += `<ellipse cx="${px}" cy="${cy + o}" rx="5.5" ry="4" class="s"/>` + L(X, cy + o, px - 5.5, cy + o, 'w thin2')));
    return { g, top: y, bottom: y + h, h, cy };
  },
  rtren(y) {
    const h = 74, a = y + 14, z = y + h - 14, n = 4, st = (z - a) / n;
    let p1 = `M${X} ${a}`, p2 = `M${X} ${a}`;
    for (let i = 0; i < n; i++) {
      const y1 = a + i * st, ym = y1 + st / 2, y2 = y1 + st;
      p1 += ` C${X + 9} ${y1 + st * 0.15} ${X + 9} ${ym - st * 0.15} ${X} ${ym} C${X - 9} ${ym + st * 0.15} ${X - 9} ${y2 - st * 0.15} ${X} ${y2}`;
      p2 += ` C${X - 9} ${y1 + st * 0.15} ${X - 9} ${ym - st * 0.15} ${X} ${ym} C${X + 9} ${ym + st * 0.15} ${X + 9} ${y2 - st * 0.15} ${X} ${y2}`;
    }
    const g = L(X, y, X, a) + `<path d="${p1}" class="w"/><path d="${p2}" class="w"/>` + L(X, z, X, y + h);
    return { g, top: y, bottom: y + h, h, cy: (a + z) / 2 };
  },
  cajab(y, e) {
    const h = 70, cy = y + 35, n = parseInt(e.f.abonados) || 0;
    let g = L(X, y, X, cy - 15) + `<rect x="${X - 28}" y="${cy - 15}" width="56" height="30" rx="3" class="s"/>` + L(X - 18, cy, X + 18, cy, 'w thick') + dot(X, cy) + L(X, cy + 15, X, y + h);
    if (n) {
      const k = Math.min(n, 6), sp = k > 1 ? Math.min(12, 40 / (k - 1)) : 0, y0 = cy - (sp * (k - 1)) / 2, ex = X + 74;
      g += L(X + 28, cy, X + 40, cy, 'w thin2');
      for (let i = 0; i < k; i++) { const yy = y0 + i * sp; g += L(X + 40, cy, ex - 8, yy, 'w thin2') + `<path d="M${ex - 9} ${yy - 3.5} L${ex} ${yy} L${ex - 9} ${yy + 3.5} Z" class="arr"/>`; }
      g += `<text x="${X + 82}" y="${cy + 4}" class="t2 lft">${n} abonado${n > 1 ? 's' : ''}</text>`;
    }
    return { g, top: y, bottom: y + h, h, cy };
  },
  subm(y) { const h = 52, cy = y + 26; return { g: L(X, y, X, y + h) + L(X - 34, cy, X + 34, cy, 'irr0') + dot(X, cy), top: y, bottom: y + h, h, cy }; },
  mdir(y) { const h = 76, cy = y + 38; return { g: meterBox(X, cy, 40, 48, 6) + `<text x="${X + 24}" y="${cy - 16}" class="pol" style="font-weight:600">D</text>`, top: cy - 24, bottom: cy + 24, h, cy }; },
  medidor(y) { const h = 76, cy = y + 38; return { g: meterBox(X, cy, 40, 48, 6), top: cy - 24, bottom: cy + 24, h, cy }; },
  testigo(y) { const h = 76, cy = y + 38; return { g: meterBox(X, cy, 40, 48, 6) + `<text x="${X + 24}" y="${cy - 16}" class="pol" style="font-weight:600">T</text>`, top: cy - 24, bottom: cy + 24, h, cy }; },
  respaldo(y) { const h = 76, cy = y + 38; return { g: meterBox(X, cy, 40, 48, 6) + `<text x="${X + 24}" y="${cy - 16}" class="pol" style="font-weight:600">R</text>`, top: cy - 24, bottom: cy + 24, h, cy }; },
  carga(y) { const h = 60, cy = y + 28; return { g: L(X, y, X, cy - 11) + `<rect x="${X - 15}" y="${cy - 11}" width="30" height="24" rx="4" class="s"/><path d="M${X - 7} ${cy - 4} L${X + 7} ${cy - 4} L${X} ${cy + 7} Z" class="arr"/>`, top: y, bottom: cy + 13, h, cy }; },
};
