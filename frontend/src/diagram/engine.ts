/**
 * Motor de dibujo del unifilar (SVG). Copia de `buildSVG_`, `bodySeg` y `bodySVG`
 * de UnifilarPro_Medida_Bia.html, para mantener el mismo aspecto.
 *
 * - Columna principal: elementos de arriba hacia abajo sobre la línea x = 230.
 * - Al lado: secundarios de TC/TT hacia el bloque de pruebas y los medidores.
 * - Gabinete y celda: cajas punteadas.
 * - Doble circuito, celda de transferencia y ramales (varios trafos o totalizadores).
 */
import { TYPES } from '@/catalog';
import { MTR, NF, faseText, irrLabel, meterType, multiT, segSplit, summary, trK, trN } from '@/checks';
import type { DiagramLike } from '@/types';
import {
  DRAW, L, PH, RC, RCX, RC_G, RC_N, SYM, X, badge, dot, esc, meterBox, phCols, stClass, stateText, tri, wrap,
  type Ctx, type El,
} from './symbols';

/* ===== Irregularidades ===== */
const IRR_BYP = ['Línea directa antes de los TC', 'Conexión directa antes de la medida', 'Acometida derivada antes del medidor', 'Fase sin pasar por la medida'];
const isMeterByp = (f: Record<string, any>) => /puente que salta el medidor|directa antes del medidor|salta(ndo)? el medidor/i.test(f.tipo === 'Otra' ? f.detalle || '' : f.tipo);
const low = (s: string) => (!s || /^[A-ZÁÉÍÓÚÑ]{2,}/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));

/** Diagrama que se está dibujando (lo necesitan algunas funciones auxiliares). */
let CUR: DiagramLike = { els: [] };

function irrDefaultDesde(): string {
  const els = CUR.els, skip = ['irreg', 'celda', 'gabinete', 'bloque', 'bloquer', 'medidor', 'respaldo', 'testigo', 'planta'];
  let i = els.findIndex((x) => x.t === 'tc');
  if (i < 0) i = els.findIndex((x) => x.t === 'medidor');
  if (i < 0) i = els.length;
  for (let j = i - 1; j >= 0; j--) if (!skip.includes(els[j].t)) return els[j].id;
  return '';
}
export function irrTarget(f: Record<string, any>): { branch: boolean; id: string } {
  if (IRR_BYP.includes(f.tipo) || !f.en) return { branch: true, id: f.desde || irrDefaultDesde() };
  return { branch: false, id: f.en };
}

/* ===== Paleta ===== */
export interface Palette { nm: string; sheet: string; ink: string; muted: string; line: string; accent: string; volt: string; bad: string }
export const LIGHT: Palette = { nm: '#0D2F6B', sheet: '#FFFFFF', ink: '#17262B', muted: '#5B6C70', line: '#D3DCDA', accent: '#0A7C74', volt: '#B4530F', bad: '#C62828' };
export function palette(): Palette {
  if (typeof document === 'undefined') return LIGHT;
  const cs = getComputedStyle(document.documentElement);
  const g = (k: keyof Palette) => cs.getPropertyValue('--' + k).trim() || LIGHT[k];
  return { nm: g('nm'), sheet: g('sheet'), ink: g('ink'), muted: g('muted'), line: g('line'), accent: g('accent'), volt: g('volt'), bad: g('bad') };
}

/* ===== Colores de ramales ===== */
const TKC0 = ['#1F6FD1', '#8E44AD', '#2E8B3A', '#C2185B', '#B8860B', '#6D4C41'];
export const tkc = (k: number) => (k <= 6 ? TKC0[k - 1] : `hsl(${Math.round((k * 137.5) % 360)},60%,40%)`);
const MED_TXT: Record<string, string> = { Directa: 'Medida directa', Semidirecta: 'Medida semidirecta', Indirecta: 'Medida indirecta' };

function estRight(els: El[]) {
  const has = (t: string) => els.some((e) => e.t === t);
  if (has('tc') || has('tt')) return has('gabinete') || has('irreg') ? 790 : 690;
  if (has('gabinete') || has('irreg')) return 450;
  return 340;
}

/* ===== Etiquetas a la izquierda ===== */
function diagText(el: El): string {
  const f = el.f;
  if (el.t === 'trafo') { const k = trK(el); if (k.length > 1) return ''; return [k[0] ? k[0] + ' kVA' : '', el._sub || ''].filter(Boolean).join(' · '); }
  if (el.t === 'dps' || el.t === 'fus') return '';
  if (el.t === 'barrmt') return f.sistema && f.sistema !== 'Sin indicar' ? f.sistema : '';
  if (el.t === 'cajam') return [(f.tension || '').trim(), f.tipo && f.tipo !== 'Sin indicar' ? f.tipo : ''].filter(Boolean).join(' · ');
  if (el.t === 'cajab') return f.material && f.material !== 'Sin indicar' ? f.material : '';
  if (el.t === 'tc' || el.t === 'tt') return (f.relacion || '').trim();
  if (el.t === 'breaker' && el._title) return [summary(el, CUR), el._sub || ''].filter(Boolean).join(' · ');
  return summary(el, CUR);
}
function label(cy: number, el: El): string {
  const ci = el.t === 'red' && (el.f.circuito || '').trim();
  let dt = diagText(el);
  if (ci) dt = dt.replace(ci, '').replace(/^\s*·\s*/, '');
  const ciTxt = ci ? 'Cto: ' + ci.replace(/^\s*(circuito|cto\.?)\s*:?\s*/i, '') : '';
  const lines = (dt ? wrap(dt, 27).slice(0, 2) : []).concat(ci ? wrap(ciTxt, 27).slice(0, 2) : []).slice(0, 4), st = stateText(el);
  const f = el.f;
  let title = el._title || TYPES[el.t].short;
  if (el.t === 'dps') { const n = (parseInt(f.buenos) || 0) + (parseInt(f.malos) || 0); if (n) title = n + ' DPS'; }
  if (el.t === 'fus') { const n = parseInt(f.cantidad) || 0; if (n) title = n + (n === 1 ? ' Cortacircuito' : ' Cortacircuitos'); }
  if (el.t === 'tc' || el.t === 'tt') { const n = parseInt(f.cantidad) || 0; if (n) title = n + ' ' + TYPES[el.t].short; }
  if (el.t === 'trafo' && trN(el) > 1) title = trN(el) + ' Transformadores';
  let s = `<text x="${X - 48}" y="${cy - 3}" class="t1">${esc(title)}</text>`;
  lines.forEach((l, i) => (s += `<text x="${X - 48}" y="${cy + 11 + i * 12}" class="t2">${esc(l)}</text>`));
  const sl = st ? wrap(st, 27).slice(0, 2) : [];
  sl.forEach((l, i) => (s += `<text x="${X - 48}" y="${cy + 11 + (lines.length + i) * 12}" class="t3 ${stClass(el)}">${esc(l)}</text>`));
  LAST_LABEL_BOTTOM = cy + 11 + (lines.length + sl.length - 1) * 12 + 4;
  LAST_LABEL_LEFT = X - 48 - Math.max(textW(title), ...lines.map(textW), ...sl.map(textW));
  return s;
}
/** Parte de abajo y borde izquierdo de la última etiqueta dibujada. */
let LAST_LABEL_BOTTOM = 0, LAST_LABEL_LEFT = X;

/** Ancho aproximado de un texto del diagrama. */
const textW = (t: string) => t.length * 6.5;

/** Borde izquierdo de lo que dibujan los elementos sin etiqueta normal. */
function leftExt(el: El): number {
  if (el.t === 'doble') return X - 94 - textW('Doble circuito');
  if (el.t === 'transc') return Math.min(X - 48 - textW('Celda de transferencia'), X - 70 - Math.max(...wrap((el.f.nombre1 || '').trim() || '1', 18).map(textW)) / 2);
  if (el.t === 'otros') return X - 110 - Math.max(textW('Otros usuarios'), textW(el.f.descripcion || '')) / 2;
  return X - 60;
}

/** Separación del "puente" de una irregularidad para que pase por fuera de símbolos anchos. */
const BRIDGE: Record<string, number> = { cajab: 36, cajam: 42, red: 52, barraje: 48, barrmt: 48, planta: 28, reco: 23, trafo: 25, carga: 23 };

/** Ancho de los textos de una irregularidad dibujada a la derecha de la línea. */
const irrTextRight = (sx: number, lines: string[], dl: string[]) => sx + 12 + Math.max(...lines.map((l) => l.length * 7.6), ...dl.map(textW));

/** Hasta dónde llega a la derecha un elemento dibujado en la línea principal. */
function rightExt(el: El, ctx: Ctx): number {
  const f = el.f;
  switch (el.t) {
    case 'tt': return X + 84;
    case 'cajab': { const n = parseInt(f.abonados) || 0; return n ? X + 82 + textW(`${n} abonados`) : X + 28; }
    case 'cajam': { const n = parseInt(f.clientes) || 0; return n ? X + 88 + textW(`${n} clientes`) : X + 34; }
    case 'barrmt': { const n = parseInt(f.salidas) || 0; return X - 40 + Math.max(120, 40 + (n + 1) * 30); }
    case 'barraje': return X + 70;
    case 'trafo': {
      const n = trN(el), ks = trK(el);
      if (n < 2) return X + 17;
      return X + (n - 1) * 100 + 22 + Math.max(textW('Trafo ' + n), textW((ks[n - 1] || '') + ' kVA'));
    }
    case 'transfer': {
      if (!ctx.planta) return X + 40;
      const t = wrap([summary(ctx.planta, CUR), stateText(ctx.planta)].filter(Boolean).join(' · '), 24).slice(0, 2);
      return Math.max(X + 102, X + 84 + Math.max(0, ...t.map(textW)) / 2);
    }
    case 'doble': return Math.max(X + 84, X + 70 + Math.max(...wrap((f.nombre1 || '').trim() || '1', 18).concat(wrap((f.nombre2 || '').trim() || '2', 18)).map(textW)) / 2, f.cambio && f.cambio !== 'Sin indicar' ? X + 8 + textW('Cambio ' + f.cambio) : 0);
    case 'transc': return Math.max(X + 84, X + 70 + Math.max(...wrap((f.nombre1 || '').trim() || '1', 18).concat(wrap((f.nombre2 || '').trim() || '2', 18)).map(textW)) / 2);
    case 'red': case 'dps': case 'cond': return X + 56;
    default: return X + 40;
  }
}

interface Pos { x?: number; cy?: number; inline?: boolean; tt?: boolean; tc?: boolean; side?: boolean; bloque?: boolean; meter?: boolean; bx?: number; minY?: number; maxY?: number; rmy?: number; mx?: number; my?: number }
interface BodyOpts {
  y0?: number; prev0?: number | null; frag?: boolean; bt?: boolean; irrAll?: El[];
  /** Espacio extra antes del primer TT/TC, para que el lado de medida no choque con lo de arriba. */
  preSide?: number;
  /** Los elementos anchos que van después de los TT/TC se bajan hasta aquí. */
  postSideY?: number;
  /** Fondo del lado de medida del tramo anterior (el de este tramo debe quedar debajo). */
  sideFloor?: number;
}
interface BodyResult {
  parts: string[]; y: number; kinds: string[]; prev: number | null; pos: Record<string, Pos>;
  /** Lo más a la derecha y a la izquierda que llega el dibujo. */
  maxRight: number;
  minLeft?: number;
  /** Si un elemento ancho choca con el lado de medida: cuánto mover. */
  clash?: { preSide: number; postSideY: number };
  /** Parte más baja del lado de medida. */
  sideBot?: number;
}

function celdaSelIds(c: El): string[] {
  return Array.isArray(c.f.incl) ? c.f.incl : [];
}

/** Cuerpo de un tramo del diagrama (columna principal + lado de medida). */
function bodySVG(els: El[], o: BodyOpts = {}): BodyResult {
  const W = 790;
  let y = o.y0 || 26, prev: number | null = o.prev0 != null ? o.prev0 : null;
  const parts: string[] = [], sec: { x: number; y: number; k: 'I' | 'V' }[] = [];
  const has = (t: string) => els.some((e) => e.t === t);
  const irrs = els.filter((e) => e.t === 'irreg');
  const NUM = (ir: El) => (o.irrAll || irrs).indexOf(ir) + 1;

  const side = has('tc') || has('tt');
  // Con medida al lado, los textos de irregularidades van en renglones cortos para no llegar al gabinete.
  const IW = side ? { l: 11, d: 13, n: 4 } : { l: 15, d: 22, n: 3 };
  const ctx: Ctx = { planta: has('transfer') ? els.find((e) => e.t === 'planta') : null, mt: o.bt ? false : RCX.mt };
  let celda: { y0: number; el: El; left?: number; sel?: boolean; last?: string; right: number } | null = null;
  let gabInline: { y0: number; y1?: number } | null = null;
  // Cajas de los elementos de la línea principal, para evitar choques con el lado de medida.
  const inlineBoxes: { top: number; bot: number; right: number; afterSec: boolean }[] = [];
  let secSeen = false, maxRight = X + 60, lastCeldaEnd = -1, minLeft = X - 60;
  const celdaBoxes: { y0: number; y1: number; right: number; lab: string[]; c: El; sc: string }[] = [];
  // Textos de irregularidades a la derecha de la línea (el rótulo del gabinete no puede montarse sobre ellos).
  const irrBoxes: { top: number; bot: number; right: number }[] = [];
  const celdaLabels = (c: El) => [`CELDA${c.f.nivel && c.f.nivel !== 'Sin indicar' ? ' ' + c.f.nivel : ''}`, ...(c.f.tipo && c.f.tipo !== 'Sin indicar' ? [c.f.tipo.toUpperCase()] : [])];
  const celdaHeader = (c: El) => 18 + 12 * (celdaLabels(c).length - 1);
  const pos: Record<string, Pos> = {};
  const placed = new Set<string>();
  const arrowTo = (x1: number, y1: number, x2: number, y2: number) => {
    const a = Math.atan2(y2 - y1, x2 - x1), l = 9, w = 5, bx = x2 - l * Math.cos(a), by = y2 - l * Math.sin(a);
    return `<line x1="${x1}" y1="${y1}" x2="${bx}" y2="${by}" class="irr solid"/><path d="M${x2} ${y2} L${bx + w * Math.sin(a)} ${by - w * Math.cos(a)} L${bx - w * Math.sin(a)} ${by + w * Math.cos(a)} Z" class="tri"/>`;
  };
  const closeCelda = () => {
    if (!celda) return;
    const c = celda.el, sc = stClass(c), lab = celdaLabels(c);
    // La caja debe alcanzar para su rótulo y para lo que encierra.
    y = Math.max(y, celda.y0 + 13 + 12 * (lab.length - 1) + 8);
    // Se dibuja al final, cuando ya se sabe si encierra un gabinete.
    celdaBoxes.push({ y0: celda.y0, y1: y, right: Math.max(X + 126, celda.right + 8), lab, c, sc });
    lastCeldaEnd = y;
    celda = null;
  };
  const CS: { c: El; first: string; last: string }[] = [];
  {
    // La celda no encierra el doble circuito ni la celda de transferencia.
    const inl = els.filter((e) => !['bloque', 'bloquer', 'gabinete', 'irreg', 'celda', 'doble', 'transc'].includes(e.t) && !(side && MTR.includes(e.t))).map((e) => e.id);
    els.filter((e) => e.t === 'celda' && Array.isArray(e.f.incl)).forEach((c) => {
      const ix = celdaSelIds(c).map((id) => inl.indexOf(id)).filter((i) => i >= 0);
      if (!ix.length) return;
      CS.push({ c, first: inl[Math.min(...ix)], last: inl[Math.max(...ix)] });
    });
  }
  const DUALOK = ['xlpe', 'lmt', 'fus', 'secc', 'seccp', 'dps', 'reco', 'spt'];

  els.forEach((el, ix) => {
    ctx.next = els[ix + 1];
    ctx.prevEl = els[ix - 1];
    if (el.t === 'doble') {
      const rest = els.slice(ix + 1), j = rest.findIndex((x) => x.t === 'transc');
      ctx.dual = j > 0 && rest.slice(0, j).every((x) => DUALOK.includes(x.t));
    }
    // Entre doble circuito y transferencia: el elemento va en cada alimentador.
    if (ctx.dual && el.t !== 'doble' && el.t !== 'transc' && DUALOK.includes(el.t)) {
      const s = SYM[el.t](y, el, ctx), c = stClass(el);
      [-70, 70].forEach((dx, k) => {
        if (ctx.dualPrev != null && s.top != null) parts.push(L(X + dx, ctx.dualPrev, X + dx, s.top));
        parts.push(`<g transform="translate(${dx},0)"><g class="${c}">${s.g}</g>${k === 0 && !s.noLabel ? label(s.cy, el) : ''}</g>`);
      });
      pos[el.id] = { x: X - 70, cy: s.cy, inline: true };
      ctx.dualPrev = s.bottom;
      y += s.h;
      return;
    }
    if (el.t === 'transc' && ctx.dual && ctx.dualPrev != null) parts.push(L(X - 70, ctx.dualPrev, X - 70, y) + L(X + 70, ctx.dualPrev, X + 70, y));
    if (el.t === 'celda' && Array.isArray(el.f.incl)) return;
    if (['bloque', 'bloquer', 'gabinete', 'irreg'].includes(el.t)) return;
    if (MTR.includes(el.t) && side) return;
    if (el.t === 'planta' && ctx.planta) return;
    if (el.t === 'doble' || el.t === 'transc') {
      closeCelda();
      if (lastCeldaEnd >= y - 2) y += 12; // espacio para los "Cto." de arriba
    }
    if (el.t === 'celda') {
      closeCelda();
      const h = celdaHeader(el);
      if (prev != null) parts.push(L(X, prev, X, y + h));
      prev = y + h;
      celda = { y0: y + 4, el, left: parseInt(el.f.encierra) || 1, right: 0 };
      y += h;
      return;
    }
    {
      const cs = CS.find((z) => z.first === el.id);
      if (cs) {
        closeCelda();
        // Espacio arriba para el rótulo de la celda.
        const h = celdaHeader(cs.c) - 4;
        celda = { y0: y + 4, el: cs.c, sel: true, last: cs.last, right: 0 };
        if (prev != null) { parts.push(L(X, prev, X, y + h)); prev = y + h; }
        y += h;
      }
    }
    // Ancho del elemento, contando los textos de las irregularidades que se le dibujan al lado.
    let wide = rightExt(el, ctx);
    irrs.forEach((ir) => {
      const t = irrTarget(ir.f);
      if (t.branch || t.id !== el.id) return;
      const f = ir.f, lines = wrap(irrLabel(f).toUpperCase(), IW.l).slice(0, IW.n);
      const dl = wrap([faseText(f).toUpperCase(), f.tipo === 'Otra' ? '' : f.detalle].filter(Boolean).join(' · '), IW.d).slice(0, 2);
      const mb = isMeterByp(f) && /medidor|respaldo|testigo|mdir/.test(el.t);
      wide = Math.max(wide, irrTextRight(mb ? X + 84 : X + 44, lines, dl));
    });
    if ((el.t === 'tt' || el.t === 'tc') && !secSeen && o.preSide) {
      if (prev != null) { parts.push(L(X, prev, X, y + o.preSide)); prev = y + o.preSide; }
      y += o.preSide;
    }
    if (secSeen && o.postSideY && wide > X + 146 && y < o.postSideY) {
      if (prev != null) { parts.push(L(X, prev, X, o.postSideY)); prev = o.postSideY; }
      y = o.postSideY;
    }
    const s = SYM[el.t](y, el, ctx);
    if (el.t === 'trafo') ctx.mt = false;
    if (prev != null && s.top != null) parts.push(L(X, prev, X, s.top));
    const c = stClass(el);
    LAST_LABEL_BOTTOM = 0;
    parts.push(`<g class="${c}">${s.g}</g>`, s.noLabel ? '' : label(s.cy, el), s.noLabel ? badge(s.bx!, s.by!, el) : badge(X - 30, s.cy - 4, el));
    minLeft = Math.min(minLeft, s.noLabel ? leftExt(el) : LAST_LABEL_LEFT);
    if (s.sec) sec.push(s.sec);
    pos[el.id] = { x: el.t === 'tt' ? X + 64 : X, cy: el.t === 'red' ? s.cy + 50 : s.cy, inline: true, tt: el.t === 'tt', tc: el.t === 'tc' };
    if ([...MTR, 'mdir'].includes(el.t)) { if (!gabInline) gabInline = { y0: y }; gabInline.y1 = y + s.h; }
    if (!s.sec) inlineBoxes.push({ top: y, bot: y + s.h, right: wide, afterSec: secSeen }); // TT/TC se mueven con su lado
    if (s.sec) secSeen = true;
    maxRight = Math.max(maxRight, wide);
    if (celda) celda.right = Math.max(celda.right, wide);
    prev = s.bottom;
    y += s.h;
    // Una etiqueta larga no puede invadir al elemento de abajo.
    if (LAST_LABEL_BOTTOM) y = Math.max(y, LAST_LABEL_BOTTOM + 6);
    if (celda) { if (celda.sel) { if (el.id === celda.last) closeCelda(); } else if (--celda.left! <= 0) closeCelda(); }

    const TG = irrs.map((ir) => ({ ir, t: irrTarget(ir.f) }));
    TG.filter((x) => !x.t.branch && x.t.id === el.id).forEach(({ ir }) => {
      const f = ir.f, lines = wrap(irrLabel(f).toUpperCase(), IW.l).slice(0, IW.n);
      const det = [faseText(f).toUpperCase(), f.tipo === 'Otra' ? '' : f.detalle].filter(Boolean).join(' · '), dl = wrap(det, IW.d).slice(0, 2);
      const mb = isMeterByp(f) && /medidor|respaldo|testigo|mdir/.test(el.t);
      const h = mb ? Math.max(0, lines.length * 14 + dl.length * 12 - 30) : 22 + lines.length * 14 + dl.length * 12 + 10;
      if (h && prev != null) { parts.push(L(X, prev, X, y + h)); prev = y + h; }
      const tipX = mb ? X + 45 : el.t === 'tt' ? X + 64 : X + 13, tipY = mb ? s.cy : s.cy + (el.t === 'trafo' ? 25 : el.t === 'tt' ? 13 : 12), sx = mb ? X + 84 : X + 44, sy = mb ? s.cy : y + 16;
      parts.push(arrowTo(sx, sy, tipX, tipY) + tri(sx - 2, sy + 2, NUM(ir)));
      if (mb) { const a = s.cy - 34, z = s.cy + 34, bx = X + 42; parts.push(`<path d="M${X} ${a} H${bx} V${z} H${X}" class="irr"/><circle cx="${X}" cy="${a}" r="3.4" class="irrdot"/><circle cx="${X}" cy="${z}" r="3.4" class="irrdot"/>`); }
      else if (/Puente/.test(f.tipo)) parts.push(`<path d="M${X} ${s.cy - 20} H${X - (BRIDGE[el.t] || 20)} V${s.cy + 20} H${X}" class="irr"/><circle cx="${X}" cy="${s.cy - 20}" r="3" class="irrdot"/><circle cx="${X}" cy="${s.cy + 20}" r="3" class="irrdot"/>`);
      const ty = mb ? sy - ((lines.length - 1) * 14) / 2 : sy;
      lines.forEach((l, j) => parts.push(`<text x="${sx + 12}" y="${ty + 5 + j * 14}" class="t1 irrh lft">${esc(l)}</text>`));
      dl.forEach((l, j) => parts.push(`<text x="${sx + 12}" y="${ty + 5 + lines.length * 14 + j * 12}" class="t3 bad lft">${esc(l)}</text>`));
      irrBoxes.push({ top: ty - 12, bot: ty + 8 + lines.length * 14 + dl.length * 12, right: irrTextRight(sx, lines, dl) });
      placed.add(ir.id);
      y += h;
    });
    TG.filter((x) => x.t.branch && x.t.id === el.id).forEach(({ ir }) => {
      // Renglones cortos para no salirse a la derecha de x = 196 (borde de la celda).
      const f = ir.f, yb = y + 14, ax = X - 110, lines = wrap(irrLabel(f).toUpperCase(), 17).slice(0, 3);
      const det = [faseText(f).toUpperCase(), f.tipo === 'Otra' ? '' : f.detalle].filter(Boolean).join(' · '), dl = wrap(det, 20).slice(0, 2);
      const h = yb - y + 40 + lines.length * 14 + dl.length * 12 + 10;
      if (prev != null) { parts.push(L(X, prev, X, y + h)); prev = y + h; }
      parts.push(`<circle cx="${X}" cy="${yb}" r="3.4" class="irrdot"/><path d="M${X} ${yb} H${ax} V${yb + 14}" class="irr solid"/><path d="M${ax - 7} ${yb + 14} L${ax + 7} ${yb + 14} L${ax} ${yb + 27} Z" class="tri"/>`);
      lines.forEach((l, j) => parts.push(`<text x="${ax}" y="${yb + 43 + j * 14}" class="t1 irrh" style="text-anchor:middle">${esc(l)}</text>`));
      dl.forEach((l, j) => parts.push(`<text x="${ax}" y="${yb + 43 + lines.length * 14 + j * 12}" class="t3 bad" style="text-anchor:middle">${esc(l)}</text>`));
      parts.push(tri(ax - 26, yb + 22, NUM(ir)));
      minLeft = Math.min(minLeft, ax - 40, ax - Math.max(...lines.map((l) => l.length * 7.6), ...dl.map(textW)) / 2);
      placed.add(ir.id);
      y += h;
    });
  });
  closeCelda();
  if (!els.length && !o.frag) { parts.push(`<text x="${W / 2}" y="90" class="t2" style="text-anchor:middle">Agrega elementos con los botones para empezar.</text>`); y = 150; }

  let kinds: string[] = [];
  let clash: BodyResult['clash'], sideBot: number | undefined;
  const gab = els.find((e) => e.t === 'gabinete');
  const gabUb = (g: El) => (g.f.ubic === 'Poste' ? 'EN POSTE' : g.f.ubic === 'Subestación' ? 'EN SUBESTACIÓN' : '');
  const gabParts = (g: El) => ['GABINETE', g.f.material === 'Policarbonato' ? 'DE POLICARBONATO' : g.f.material === 'Metálico' ? 'METÁLICO' : '', gabUb(g), g.f.uso === 'Compartido' ? 'COMPARTIDO' : g.f.uso === 'Exclusivo' ? 'EXCLUSIVO' : ''].filter(Boolean);
  const ghost = (x: number, yy: number, g: El) => { const n = parseInt(g.f.otrosCant) || 0; return `<circle cx="${x}" cy="${yy}" r="11" class="w ghost"/><text x="${x}" y="${yy + 3}" class="pol" style="text-anchor:middle">kWh</text><text x="${x + 18}" y="${yy + 4}" class="t2 lft">Medidores otros usuarios${n ? ' ×' + n : ''}</text>`; };
  const gi = gabInline as { y0: number; y1?: number } | null;
  if (gab && !side && gi) {
    const sh = gab.f.uso === 'Compartido', y0 = gi.y0 + 6;
    let y1 = gi.y1! - 6;
    const gp = gabParts(gab), gl = [gp.slice(0, -1).join(' '), gp[gp.length - 1]], tw = Math.max(...gl.map((t) => t.length)) * 6.8, n = parseInt(gab.f.otrosCant) || 0, ot = 'Otros usuarios' + (n ? ' ×' + n : '');
    // Lo que quede dentro del gabinete (por ejemplo flechas de abonados) no puede salirse por el borde,
    // y el rótulo va a la derecha de los textos de irregularidades.
    const inside = inlineBoxes.filter((b) => b.bot > y0 && b.top < y1).map((b) => b.right + 8);
    const ib = irrBoxes.filter((b) => b.bot > y0 && b.top < y1);
    y1 = Math.max(y1, ...ib.map((b) => b.bot + 4));
    const lx = Math.round(Math.max(X + 30, ...ib.map((b) => b.right + 10)));
    const gx1 = Math.round(Math.max(lx + tw + 12, sh ? lx + 32 + 18 + ot.length * 6 + 12 : 0, ...inside, ...ib.map((b) => b.right + 8)));
    maxRight = Math.max(maxRight, gx1);
    parts.push(`<rect x="${X - 34}" y="${y0}" width="${gx1 - X + 34}" height="${y1 - y0}" class="cel ${stClass(gab)}"/>` + gl.map((t, i) => `<text x="${lx}" y="${y0 + 13 + i * 12}" class="t4 lft nm">${esc(t)}</text>`).join('') + badge(gx1, y0, gab));
    if (sh) { const gy = y0 + 13 + gl.length * 12 + 9; parts.push(`<circle cx="${lx + 32}" cy="${gy}" r="11" class="w ghost"/><text x="${lx + 32}" y="${gy + 3}" class="pol" style="text-anchor:middle">kWh</text><text x="${lx + 50}" y="${gy + 4}" class="t2 lft">${esc(ot)}</text>`); }
    // Una celda que encierra el gabinete se ensancha para contenerlo.
    celdaBoxes.forEach((b) => { if (b.y1 > y0 && b.y0 < y1) b.right = Math.max(b.right, gx1 + 10); });
  }
  for (const b of celdaBoxes) {
    const right = Math.round(b.right);
    maxRight = Math.max(maxRight, right);
    parts.push(`<rect x="${X - 34}" y="${b.y0}" width="${right - X + 34}" height="${b.y1 - b.y0}" class="cel ${b.sc}"/>`
      + b.lab.map((t, i) => `<text x="${right - 6}" y="${b.y0 + 13 + i * 12}" class="t4 nm">${esc(t)}</text>`).join('') + badge(right, b.y0, b.c));
  }

  if (sec.length) {
    const ys = sec.map((s) => s.y), minY = Math.min(...ys), maxY = Math.max(...ys);
    const bl = els.find((e) => e.t === 'bloque') || els.find((e) => e.t === 'bloquer');
    const bl2 = els.find((e) => e.t === 'bloque') && els.find((e) => e.t === 'bloquer');
    const meters = els.filter((e) => MTR.includes(e.t));
    const bx = 440, mx = 595, my = (minY + maxY) / 2, endX = bl ? bx : 454;
    kinds = [...new Set(sec.map((s) => s.k))];
    sec.forEach((s) => parts.push(L(s.x, s.y, endX, s.y, s.k === 'I' ? 'wi' : 'wv')));
    let top = minY - 16, bot = maxY + 16;
    let blHalf = 55; // mitad del texto más ancho bajo/sobre el bloque de pruebas
    if (bl) {
      const c = stClass(bl);
      parts.push(`<g class="${c}"><rect x="${bx}" y="${minY - 16}" width="24" height="${maxY - minY + 32}" rx="4" class="s"/></g>`);
      for (let yy = minY - 6; yy <= maxY + 8; yy += 12) parts.push(`<circle cx="${bx + 7}" cy="${yy}" r="2.6" class="s thinS"/><circle cx="${bx + 17}" cy="${yy}" r="2.6" class="s thinS"/>` + L(bx + 9.6, yy, bx + 14.4, yy, 'thin'));
      const nm = bl.t === 'bloquer' ? 'respaldo' : bl2 ? 'principal' : '';
      if (!bl2) {
        parts.push(`<text x="${bx + 12}" y="${maxY + 31}" class="t1" style="text-anchor:middle">Bloque de</text><text x="${bx + 12}" y="${maxY + 44}" class="t1" style="text-anchor:middle">pruebas</text>${nm ? `<text x="${bx + 12}" y="${maxY + 57}" class="t1" style="text-anchor:middle">${nm}</text>` : ''}` + badge(bx + 30, minY - 16, bl));
        const bls = wrap([summary(bl, CUR), stateText(bl)].filter(Boolean).join(' · '), 12).slice(0, 3), b0 = maxY + 57 + (nm ? 13 : 0);
        bls.forEach((l, i) => parts.push(`<text x="${bx + 12}" y="${b0 + i * 12}" class="t2 ${c ? 't3 ' + c : ''}" style="text-anchor:middle">${esc(l)}</text>`));
        bot = b0 - 7 + bls.length * 12;
        blHalf = Math.max(blHalf, ...bls.map((l) => textW(l) / 2));
      } else {
        const st = stateText(bl);
        parts.push(`<text x="${bx + 12}" y="${minY - (st ? 46 : 34)}" class="t1" style="text-anchor:middle">Bloque de pruebas</text><text x="${bx + 12}" y="${minY - (st ? 33 : 21)}" class="t1" style="text-anchor:middle">principal</text>` + badge(bx + 30, minY - 16, bl));
        if (st) parts.push(`<text x="${bx + 12}" y="${minY - 21}" class="t3 ${c}" style="text-anchor:middle">${esc(st.slice(0, 24))}</text>`);
        top = Math.min(top, minY - (st ? 58 : 46));
        blHalf = Math.max(blHalf, textW(st.slice(0, 24)) / 2);
      }
      pos[bl.id] = { side: true, bloque: true, bx, minY, maxY };
      if (bl2) {
        const h = maxY - minY, r0 = minY + Math.max(h + 72, 124), r1 = r0 + h, c2 = stClass(bl2);
        kinds.forEach((k) => { const lx = k === 'I' ? bx + 7 : bx + 17; parts.push(L(lx, maxY + 16, lx, r0 - 16, k === 'I' ? 'wi' : 'wv')); });
        parts.push(`<text x="${bx + 30}" y="${(maxY + r0) / 2 + 4}" class="pol lft">serie / paralelo</text>`);
        parts.push(`<g class="${c2}"><rect x="${bx}" y="${r0 - 16}" width="24" height="${h + 32}" rx="4" class="s"/></g>`);
        for (let yy = r0 - 6; yy <= r1 + 8; yy += 12) parts.push(`<circle cx="${bx + 7}" cy="${yy}" r="2.6" class="s thinS"/><circle cx="${bx + 17}" cy="${yy}" r="2.6" class="s thinS"/>` + L(bx + 9.6, yy, bx + 14.4, yy, 'thin'));
        parts.push(`<text x="${bx + 12}" y="${r1 + 31}" class="t1" style="text-anchor:middle">Bloque de pruebas</text><text x="${bx + 12}" y="${r1 + 44}" class="t1" style="text-anchor:middle">respaldo</text>` + badge(bx + 30, r0 - 16, bl2));
        const st2 = stateText(bl2);
        if (st2) parts.push(`<text x="${bx + 12}" y="${r1 + 57}" class="t3 ${c2}" style="text-anchor:middle">${esc(st2.slice(0, 24))}</text>`);
        bot = r1 + 50 + (st2 ? 12 : 0);
        blHalf = Math.max(blHalf, textW(st2.slice(0, 24)) / 2);
        pos[bl2.id] = { side: true, bloque: true, bx, minY: r0, maxY: r1, rmy: (r0 + r1) / 2 };
      }
    } else if (sec.length > 1) parts.push(L(454, minY, 454, maxY, kinds.length === 1 && kinds[0] === 'V' ? 'wv' : 'wi'));
    const x0 = bl ? bx + 24 : 454;
    let meterRight = mx + 30;
    const drawMeter = (m: El, cy: number) => {
      const c = stClass(m);
      pos[m.id] = { side: true, meter: true, mx, my: cy };
      parts.push(`<g class="${c}">${meterBox(mx, cy, 46, 56, 7)}</g>` + badge(mx + 24, cy - 26, m));
      parts.push(`<text x="${mx}" y="${cy + 40}" class="t1" style="text-anchor:middle">${m.t === 'respaldo' ? 'Medidor de respaldo' : m.t === 'testigo' ? 'Medidor testigo' : 'Medidor principal'}</text>`);
      const ls = wrap(summary(m, CUR), 24).slice(0, 2);
      ls.forEach((l, i) => parts.push(`<text x="${mx}" y="${cy + 53 + i * 12}" class="t2" style="text-anchor:middle">${esc(l)}</text>`));
      const st = stateText(m);
      if (st) parts.push(`<text x="${mx}" y="${cy + 53 + ls.length * 12}" class="t3 ${c}" style="text-anchor:middle">${esc(st.slice(0, 26))}</text>`);
      meterRight = Math.max(meterRight, mx + Math.max(...ls.map(textW), textW(st.slice(0, 26)), 120) / 2);
      top = Math.min(top, cy - 24);
      bot = Math.max(bot, cy + 53 + (ls.length + (st ? 1 : 0)) * 12);
    };
    if (bl2) {
      const rmy = pos[bl2.id].rmy!, pm = meters.find((m) => m.t === 'medidor') || meters[0];
      if (pm) { kinds.forEach((k, i) => { const yy = kinds.length > 1 ? my + (i ? 6 : -6) : my; parts.push(L(x0, yy, mx - 24, yy, k === 'I' ? 'wi' : 'wv')); }); drawMeter(pm, my); }
      meters.filter((m) => m !== pm).forEach((m, j) => {
        const ty = rmy + j * 156;
        kinds.forEach((k, i) => {
          const o2 = kinds.length > 1 ? (i ? 6 : -6) : 0, c = k === 'I' ? 'wi' : 'wv';
          if (j === 0) parts.push(L(x0, rmy + o2, mx - 24, rmy + o2, c)); else parts.push(L(500 + o2, rmy + o2, 500 + o2, ty + o2, c) + L(500 + o2, ty + o2, mx - 24, ty + o2, c));
        });
        drawMeter(m, ty);
      });
    } else if (meters.length === 1) {
      kinds.forEach((k, i) => { const yy = kinds.length > 1 ? my + (i ? 6 : -6) : my; parts.push(L(x0, yy, mx - 24, yy, k === 'I' ? 'wi' : 'wv')); });
      drawMeter(meters[0], my);
    } else if (meters.length >= 2) {
      const n = meters.length, sh = Math.max(0, 70 - (my - (n - 1) * 78)), ys2 = meters.map((_, i) => my + sh + (i - (n - 1) / 2) * 156), y1 = Math.min(ys2[0], my), y2 = ys2[n - 1];
      kinds.forEach((k, i) => {
        const o2 = kinds.length > 1 ? (i ? 6 : -6) : 0, bxs = 500 + o2, c = k === 'I' ? 'wi' : 'wv';
        parts.push(L(x0, my + o2, bxs, my + o2, c) + L(bxs, y1 + o2, bxs, y2 + o2, c) + ys2.map((yy) => L(bxs, yy + o2, mx - 24, yy + o2, c)).join(''));
      });
      meters.forEach((m, i) => drawMeter(m, ys2[i]));
    }
    {
      const cnt: Record<string, number> = {};
      irrs.forEach((ir) => {
        if (placed.has(ir.id)) return;
        const t = irrTarget(ir.f);
        if (t.branch) return;
        const P = pos[t.id];
        if (!P || !P.side) return;
        const f = ir.f, k = (cnt[t.id] = (cnt[t.id] || 0) + 1), n = NUM(ir);
        const lines = wrap(irrLabel(f).toUpperCase(), P.meter && (isMeterByp(f) || /Puente/.test(f.tipo)) ? 14 : 17).slice(0, 4);
        if (P.meter) {
          const mb = isMeterByp(f) || /Puente/.test(f.tipo), tx = mb ? P.mx! + 66 : P.mx! + 46, ty = (mb ? P.my! - 18 : P.my! - 44) + (k - 1) * (lines.length * 14 + 18);
          parts.push((mb ? arrowTo(tx - 14, ty - 4, P.mx! + 45, ty - 4) : arrowTo(tx - 6, ty - 4, P.mx! + 18, P.my! - 16)) + tri(tx - 6, ty - 2, n));
          if (mb) { const x1 = P.mx! - 42, x2 = P.mx! + 42, yt = P.my! - 44; parts.push(`<path d="M${x1} ${P.my} V${yt} H${x2} V${P.my}" class="irr"/><circle cx="${x1}" cy="${P.my}" r="3.4" class="irrdot"/><circle cx="${x2}" cy="${P.my}" r="3.4" class="irrdot"/>`); }
          lines.forEach((l, j) => parts.push(`<text x="${tx + 8}" y="${ty + j * 14}" class="t1 irrh lft">${esc(l)}</text>`));
          const fz = faseText(f);
          if (fz) parts.push(`<text x="${tx + 8}" y="${ty + lines.length * 14}" class="t3 bad lft">${esc(fz.toUpperCase())}</text>`);
          top = Math.min(top, ty - 14);
          bot = Math.max(bot, ty + (lines.length + (fz ? 1 : 0)) * 14);
        } else if (P.bloque) {
          const b0 = bot + 14 + (k - 1) * (lines.length * 14 + 18), tx = P.bx! + 66;
          parts.push(arrowTo(tx - 6, b0 + 2, P.bx! + 26, P.maxY! - 4) + tri(tx - 6, b0 + 6, n));
          lines.forEach((l, j) => parts.push(`<text x="${tx + 8}" y="${b0 + 10 + j * 14}" class="t1 irrh lft">${esc(l)}</text>`));
          const fz = faseText(f);
          if (fz) parts.push(`<text x="${tx + 8}" y="${b0 + 10 + lines.length * 14}" class="t3 bad lft">${esc(fz.toUpperCase())}</text>`);
          bot = b0 + 10 + (lines.length + (fz ? 1 : 0)) * 14;
        }
        placed.add(ir.id);
      });
    }
    if (gab) {
      const sh = gab.f.uso === 'Compartido', gx0 = bl ? Math.round(Math.min(bx - 58, bx + 12 - blHalf - 8)) : 440;
      const irrM = irrs.some((ir) => { const t = irrTarget(ir.f); const P = !t.branch && pos[t.id]; return P && P.meter; });
      const gp = gabParts(gab), head = gp.slice(0, -1).join(' ');
      const gx1 = irrM ? W - 10 : Math.round(Math.max(mx + 66, meterRight + 8, gx0 + 8 + head.length * 6.8 + 12, sh ? gx0 + 40 + ('Medidores otros usuarios ×' + (parseInt(gab.f.otrosCant) || 0)).length * 6 + 10 : 0));
      const gy0 = top - 38, gy1 = bot + (sh ? 36 : 10);
      parts.push(`<rect x="${gx0}" y="${gy0}" width="${gx1 - gx0}" height="${gy1 - gy0}" class="cel ${stClass(gab)}"/><text x="${gx0 + 8}" y="${gy0 + 14}" class="t4 lft nm">${esc(head)}</text><text x="${gx0 + 8}" y="${gy0 + 26}" class="t4 lft nm">${esc(gp[gp.length - 1])}</text>` + badge(gx1, gy0, gab));
      if (sh) parts.push(ghost(gx0 + 22, gy1 - 18, gab));
      top = gy0;
      bot = gy1;
      maxRight = Math.max(maxRight, gx1);
    }
    maxRight = Math.max(maxRight, meterRight);
    // ¿Algún elemento ancho de la línea principal se monta sobre el lado de medida?
    const sideL = bl ? Math.min(bx - 58, bx + 12 - blHalf - 8) : 440, sideT = top - 20;
    let preSide = 0, postSideY = 0;
    for (const b of inlineBoxes) {
      if (b.right < sideL - 6 || b.bot < sideT - 6 || b.top > bot + 6) continue;
      if (b.afterSec) postSideY = bot + 16;
      else preSide = Math.max(preSide, b.bot - sideT + 12);
    }
    if (o.sideFloor && sideT < o.sideFloor + 8) preSide = Math.max(preSide, o.sideFloor + 8 - sideT);
    sideBot = bot;
    if (preSide || postSideY) clash ={ preSide: (o.preSide || 0) + preSide, postSideY: postSideY ? Math.max(postSideY, o.postSideY || 0) : o.postSideY || 0 };
    y = Math.max(y, bot + 12);
  }
  irrs.forEach((ir) => {
    const f = ir.f, P = pos[f.en];
    if (!P) return;
    if (P.tc && /TC puenteado/.test(f.tipo)) parts.push(`<path d="M${P.x! + 11} ${P.cy} h14 M${P.x! + 25} ${P.cy! - 7} v14" class="irr solid"/>`);
    if (P.tt && /TT desconectado/.test(f.tipo)) parts.push(`<path d="M${P.x! + 26} ${P.cy! - 6} l10 12 M${P.x! + 36} ${P.cy! - 6} l-10 12" class="irr solid"/>`);
  });
  return { parts, y, kinds, prev, pos, maxRight, minLeft, clash, sideBot };
}

/** Dibuja un tramo y, si algo ancho choca con el lado de medida, lo vuelve a armar con más espacio. */
function bodyFit(els: El[], o: BodyOpts): BodyResult {
  let r = bodySVG(els, o);
  for (let k = 0; k < 4 && r.clash; k++) r = bodySVG(els, { ...o, ...r.clash });
  return r;
}

/** Parte en tramos de medida y los dibuja uno debajo del otro. */
function bodySeg(els: El[], o: BodyOpts = {}): BodyResult {
  const isM = (e: El) => MTR.includes(e.t) || ['mdir', 'bloque', 'bloquer'].includes(e.t);
  const segs = segSplit(els) as El[][];
  if (segs.length < 2) return bodyFit(els, o);
  segs.forEach((sg, k) => {
    if (sg.some(isM)) return;
    sg.filter((e) => e.t === 'gabinete').forEach((g) => {
      const gi = els.indexOf(g);
      let best = -1;
      segs.forEach((s2, j) => { if (s2.some((e) => isM(e) && els.indexOf(e) < gi)) best = j; });
      if (best < 0) best = segs.findIndex((s2) => s2.some(isM));
      if (best >= 0 && best !== k) { sg.splice(sg.indexOf(g), 1); segs[best].push(g); }
    });
  });
  els.filter((e) => e.t === 'irreg').forEach((ir) => {
    const t = irrTarget(ir.f), k = segs.findIndex((sg) => sg.some((e) => e.id === t.id));
    segs[k >= 0 ? k : 0].push(ir);
  });
  let r: BodyResult | null = null;
  const out: BodyResult = { parts: [], kinds: [], pos: {}, y: 0, prev: null, maxRight: 0, minLeft: X };
  let sideFloor = 0;
  segs.forEach((sg) => {
    if (!sg.length) return;
    const oo: BodyOpts = Object.assign({}, o, r ? { y0: r.y, prev0: r.prev, frag: true, sideFloor } : {});
    r = bodyFit(sg, oo);
    if (r.sideBot) sideFloor = r.sideBot;
    out.maxRight = Math.max(out.maxRight, r.maxRight);
    out.minLeft = Math.min(out.minLeft!, r.minLeft ?? X);
    out.parts.push(...r.parts);
    r.kinds.forEach((k) => { if (!out.kinds.includes(k)) out.kinds.push(k); });
    Object.assign(out.pos, r.pos);
  });
  const last = r as BodyResult | null;
  return Object.assign(out, { y: last ? last.y : 0, prev: last ? last.prev : null });
}

/**
 * Parte más baja de lo que queda a la derecha de xMin (gabinete, bloques, medidores).
 * Se usa para bajar el punto de unión de los ramales y que no haya cruces.
 * Necesita el navegador (getBBox); fuera de él devuelve 0.
 */
function sideBottom(parts: string[], xMin: number): number {
  if (typeof document === 'undefined') return 0;
  try {
    const sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    sv.setAttribute('style', 'position:absolute;left:-9999px;top:0;width:10px;height:10px;visibility:hidden');
    sv.innerHTML = parts.join('');
    document.body.appendChild(sv);
    let mb = 0;
    sv.querySelectorAll('rect,line,path,circle,text,polyline,polygon,ellipse').forEach((el) => {
      try { const b = (el as SVGGraphicsElement).getBBox(); if ((b.width || b.height) && b.x + b.width > xMin) mb = Math.max(mb, b.y + b.height); } catch { /* sin medida */ }
    });
    sv.remove();
    return mb;
  } catch {
    return 0;
  }
}

/** Dibuja el diagrama completo y devuelve el SVG como texto. */
export function buildSVG(d: DiagramLike, P: Palette = LIGHT): string {
  DRAW.inDiag = true;
  CUR = d;
  try {
    return build(d, P);
  } finally {
    DRAW.inDiag = false;
  }
}

function build(d: DiagramLike, P: Palette): string {
  const allRaw = d.els as El[], all = allRaw.filter((e) => e.t !== 'conex' && e.t !== 'fasor'), irrAll = all.filter((e) => e.t === 'irreg'), T = multiT(d) as El | null;
  {
    const red = all.find((e) => e.t === 'red'), tr = all.find((e) => e.t === 'trafo');
    const vt = [tr && tr.f.relacion, red && red.f.nivel === 'BT' && red.f.tension].filter(Boolean).join(' ');
    RCX.fases = red ? NF[red.f.fases] || 3 : 3;
    RCX.bt = /4[4-8]0|277/.test(vt) ? '480' : '208';
    RCX.mt = red ? red.f.nivel === 'MT' : !!(tr || all.some((e) => ['doble', 'barrmt', 'lmt'].includes(e.t)));
  }
  let W = 790, y: number, parts: string[] = [], kinds: string[] = [];
  if (!T) {
    const r = bodySeg(all, { irrAll });
    parts = r.parts; y = r.y; kinds = r.kinds;
    W = Math.max(W, Math.round(r.maxRight + 10));
  } else {
    // Ramales en paralelo: Trafo 1, 2… o Breaker Tot. 1, 2…
    const n = trN(T), ks = trK(T), ramaOf = (e: El) => Math.min(n, e.rama || 0);
    const tgtR = (ir: El) => { const t = irrTarget(ir.f); if (!t.id) return ramaOf(ir); if (t.id === T.id) return 1; const te = all.find((e) => e.id === t.id); return te ? ramaOf(te) : 0; };
    const inR = (e: El, k: number) => e !== T && (e.t === 'irreg' ? tgtR(e) === k : ramaOf(e) === k);
    const r0 = bodySeg(all.filter((e) => inR(e, 0)), { irrAll, frag: true });
    parts.push(...r0.parts); kinds.push(...r0.kinds);
    const tr = all.filter((e) => inR(e, 0) && e.t !== 'irreg'), lt = tr[tr.length - 1], BK = T.t === 'breaker';
    let onBar = !!(lt && (lt.t === 'barrmt' || lt.t === 'barraje') && r0.pos[lt.id]);
    if (onBar) {
      // Si el barraje queda al lado del gabinete no se alarga: se baja una línea.
      const rw = bodySeg(all.filter((e) => inR(e, 0) && e !== lt), { irrAll, frag: true }), sb = sideBottom(rw.parts, X + 40);
      if (sb && sb > r0.pos[lt.id].cy! - 12) onBar = false;
    }
    const sideB = onBar ? 0 : sideBottom(r0.parts, X + 40);
    const yb = onBar ? r0.pos[lt.id].cy! : Math.max((r0.prev != null ? r0.prev : r0.y) + 16, sideB ? sideB + 30 : 0);
    if (r0.prev != null && !onBar) parts.push(L(X, r0.prev, X, yb));
    const fr: (BodyResult & { dx: number; right: number })[] = [];
    let dx = 0, prevAbsRight = -Infinity;
    for (let k = 1; k <= n; k++) {
      const md = T.f['med' + k];
      const head: El[] = BK
        ? [{ id: k === 1 ? T.id : T.id + '_b' + k, t: 'breaker', f: { cantidad: '1', corriente: T.f[k > 1 ? 'corriente' + k : 'corriente'] || '', polos: T.f[k > 1 ? 'polos' + k : 'polos'] || '', estado: T.f.estado, obs: T.f.obs }, _title: 'Breaker Tot. ' + k, _sub: MED_TXT[md] || '' }]
        : [
            ...(T.f['secc' + k] === 'Sí' ? [{ id: T.id + '_s' + k, t: 'secc', f: { estado: 'Bueno' } }] : []),
            { id: k === 1 ? T.id : T.id + '_t' + k, t: 'trafo', f: { ...T.f, cantidad: '1', potencia: String(ks[k - 1] || ''), uso: 'Exclusivo' }, _title: 'Trafo ' + k, _sub: MED_TXT[md] || '' },
          ];
      const els = head.concat(all.filter((e) => inR(e, k)));
      const r = bodySeg(els, { irrAll, frag: true, bt: true, y0: onBar ? r0.y - 12 : yb + 14, prev0: yb });
      const right = Math.max(estRight(els), Math.round(r.maxRight + 10));
      // Las etiquetas de la izquierda no pueden montarse sobre el ramal anterior.
      dx = Math.max(dx, Math.round(prevAbsRight + 10 - (r.minLeft ?? X - 60)));
      fr.push({ ...r, dx, right });
      prevAbsRight = dx + r.maxRight;
      dx += right - 30;
    }
    const last = fr[n - 1];
    if (onBar) {
      const ns = parseInt(lt.f.salidas) || 0;
      parts.push(lt.t === 'barraje' ? `<rect x="${X - 40}" y="${yb - 4}" width="${Math.max(last.dx + 80, 110)}" height="8" rx="2" class="arr"/>` : `<rect x="${X - 40}" y="${yb - 5}" width="${Math.max(last.dx + 80, 80 + (ns + 1) * 30)}" height="10" rx="1.5" class="arr"/>`);
    } else parts.push(L(X, yb, X + last.dx, yb) + dot(X, yb));
    fr.forEach((r, j) => {
      parts.push(`<g transform="translate(${r.dx},0)" class="tk${j + 1}">${r.parts.join('')}</g>`);
      r.kinds.forEach((k) => { if (!kinds.includes(k)) kinds.push(k); });
    });
    y = Math.max(...fr.map((r) => r.y));
    W = Math.max(790, Math.round(last.dx + last.right + 10));
  }

  // Lista de irregularidades
  const refName = (id: string) => { const i = allRaw.findIndex((e) => e.id === id); return i >= 0 ? i + 1 + '. ' + TYPES[allRaw[i].t].name : ''; };
  if (irrAll.length) {
    let ly = y + 16;
    parts.push(`<text x="24" y="${ly}" class="t1 lft irrh">IRREGULARIDADES</text>`);
    ly += 16;
    irrAll.forEach((ir, k) => {
      const f = ir.f, tg = irrTarget(f);
      const where = tg.branch ? (tg.id ? ' · después de ' + refName(tg.id) : '') + ' hacia carga sin medir' : f.en ? ' · en ' + refName(f.en) : '';
      const txt = `${irrLabel(f)}${faseText(f) ? ' (' + low(faseText(f)) + ')' : ''}${where}${f.detalle && f.tipo !== 'Otra' ? ' — ' + f.detalle : ''}`;
      parts.push(tri(32, ly - 4, k + 1));
      wrap(txt, 88).slice(0, 3).forEach((l, j) => parts.push(`<text x="48" y="${ly + j * 13}" class="t3 bad lft">${esc(l)}</text>`));
      ly += Math.min(3, wrap(txt, 88).length) * 13 + 8;
    });
    y = ly;
  }
  // TODO fase 7 y 8: diagrama de conexiones y fasorial al pie.

  // Leyenda de colores RETIE
  const anyBad = all.some((e) => e.f.estado === 'Dañado');
  {
    let lx = 24, ly = y + 14;
    const sw = (c: string, t: string) => { const o = PH(lx, ly, lx + 22, ly, c) + `<text x="${lx + 28}" y="${ly + 4}" class="t2 lft">${t}</text>`; lx += 28 + t.length * 6.4 + 14; return o; };
    const hasMT = RCX.mt || all.some((e) => e.t === 'doble' || e.t === 'barrmt'), hasBT = !RCX.mt || all.some((e) => e.t === 'trafo');
    let lg = `<text x="${lx}" y="${ly + 4}" class="t4 lft">CÓDIGO DE COLORES RETIE</text>`;
    lx += 168;
    if (hasMT) RC.MT.slice(0, RCX.fases).forEach((c, i) => (lg += sw(c, (i ? '' : 'MT ') + ['violeta', 'café', 'rojo'][i])));
    if (hasMT && hasBT) { lx = 192; ly += 17; y += 17; }
    if (hasBT) {
      const nm: Record<string, string> = { '#F9A825': 'amarillo', '#1565C0': 'azul', '#D32F2F': 'rojo', '#6D4C41': 'café', '#EF6C00': 'naranja', '#212121': 'negro' };
      phCols(true, RCX.fases).forEach((c, i) => (lg += sw(c, (i ? '' : 'BT ') + nm[c])));
      lg += sw(RC_N, 'neutro blanco');
    }
    lg += sw(RC_G, 'tierra verde');
    parts.push(lg);
    y += 24;
  }
  if (kinds.length || anyBad) {
    let lx = 24, lg = '';
    const ly = y + 14;
    if (kinds.includes('I')) { lg += L(lx, ly, lx + 28, ly, 'wi') + `<text x="${lx + 34}" y="${ly + 4}" class="t2 lft">Circuito de corriente</text>`; lx += 190; }
    if (kinds.includes('V')) { lg += L(lx, ly, lx + 28, ly, 'wv') + `<text x="${lx + 34}" y="${ly + 4}" class="t2 lft">Circuito de tensión</text>`; lx += 180; }
    if (anyBad) lg += `<circle cx="${lx + 7}" cy="${ly}" r="7" class="bdg bad"/><text x="${lx + 7}" y="${ly + 3.5}" class="bdgt">!</text><text x="${lx + 20}" y="${ly + 4}" class="t2 lft">Dañado</text>`;
    parts.push(lg);
    y += 28;
  }
  // Rótulo
  const r0 = y + 14, p = d.p || {};
  const cell = (x: number, yy: number, w: number, k: string, v?: string) => `<rect x="${x}" y="${yy}" width="${w}" height="40" class="rb"/><text x="${x + 8}" y="${yy + 14}" class="rk">${k}</text><text x="${x + 8}" y="${yy + 31}" class="rv">${esc(v || '—')}</text>`;
  const mt = meterType(d), mw = Math.max(160, mt.length * 7 + 20);
  parts.push(cell(12, r0, W - 24 - mw, 'PROYECTO / CLIENTE', p.nombre) + cell(W - 12 - mw, r0, mw, 'TIPO DE MEDIDA', mt) + cell(12, r0 + 40, W - 24, 'CÓDIGO DE LA FRONTERA', p.frontera));
  const H = r0 + 92;
  const nT = T ? trN(T) : 0;
  const css = `
    .w,.bus,.wi,.wv,.thin{stroke:${P.ink};stroke-width:1.6;fill:none;stroke-linecap:round}
    .bus{stroke-width:4}.thick{stroke-width:2.6}.thinS{stroke-width:1.3}.disp{fill:${P.sheet === '#FFFFFF' ? '#E6F4F1' : P.line};stroke:${P.ink};stroke-width:1}.thin2{stroke-width:1.1}.dash{stroke-dasharray:5 4}
    .thin{stroke:${P.muted};stroke-width:1}
    .s{fill:${P.sheet};stroke:${P.ink};stroke-width:1.6}
    .dot,.arr{fill:${P.ink};stroke:none}
    .wi{stroke:${P.accent};stroke-dasharray:7 4}
    .wv{stroke:${P.volt};stroke-dasharray:2 4}
    ${Array.from({ length: Math.max(6, nT) }, (_, i) => tkc(i + 1)).map((c, i) => `.tk${i + 1} .w,.tk${i + 1} .s,.tk${i + 1} .bus{stroke:${c}} .tk${i + 1} .dot,.tk${i + 1} .arr{fill:${c}} .tk${i + 1} .t1{fill:${c}}`).join('\n    ')}
    .bad .w,.bad .s,.bad .bus{stroke:${P.bad}} .bad .dot,.bad .arr{fill:${P.bad}}
    .rev .w,.rev .s,.rev .bus{stroke-dasharray:4 3}
    .cel{fill:none;stroke:${P.muted};stroke-width:1.2;stroke-dasharray:9 5}
    .cel.bad{stroke:${P.bad}}
    .irr{stroke:${P.bad};stroke-width:2.2;stroke-dasharray:7 4;fill:none;stroke-linecap:round}.irr.solid{stroke-dasharray:none}
    .irrdot,.tri{fill:${P.bad};stroke:none}.trit{font:700 9.5px sans-serif;fill:#fff;text-anchor:middle}
    .irrh{fill:${P.bad}!important}
    .ghost{stroke-dasharray:3 2}
    .irr0{stroke:${P.muted};stroke-width:1.4;stroke-dasharray:4 3;fill:none}
    .bdg{stroke:none}.bdg.bad{fill:${P.bad}}.bdg.rev{fill:${P.volt}}
    .bdgt{font:700 10px sans-serif;fill:#fff;text-anchor:middle}
    .t1{font:600 12.5px 'IBM Plex Sans Condensed','Arial Narrow',sans-serif;fill:${P.nm || P.ink};text-anchor:end} .t4.nm{fill:${P.nm || P.muted}}
    .t2{font:400 10.5px 'IBM Plex Mono',Menlo,monospace;fill:${P.muted};text-anchor:end}
    .t3{font:600 10.5px 'IBM Plex Mono',Menlo,monospace;text-anchor:end}
    .t3.bad{fill:${P.bad}}.t3.rev{fill:${P.volt}}
    .t4{font:600 10px 'IBM Plex Sans Condensed','Arial Narrow',sans-serif;fill:${P.muted};text-anchor:end;letter-spacing:.04em}
    .lft{text-anchor:start}
    .pol{font:500 8.5px 'IBM Plex Mono',Menlo,monospace;fill:${P.muted}}
    .kwh{font:500 10px 'IBM Plex Mono',Menlo,monospace;fill:${P.ink};text-anchor:middle}
    .rb{fill:none;stroke:${P.ink};stroke-width:1}
    .rk{font:600 9px 'IBM Plex Sans Condensed','Arial Narrow',sans-serif;letter-spacing:.08em;fill:${P.muted}}
    .rv{font:500 12.5px 'IBM Plex Sans Condensed','Arial Narrow',sans-serif;fill:${P.ink}}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><style>${css}</style><rect width="${W}" height="${H}" fill="${P.sheet}"/>${parts.join('')}</svg>`;
}
