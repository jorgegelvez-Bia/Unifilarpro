/**
 * Diagrama fasorial: copia fiel de fasSVG del HTML.
 * Escala circular 0–360° en sentido horario desde VR (marcas cada 10°, números cada 30°),
 * flechas de tensión (llenas) y corriente (rayadas), tabla con V, I, φ, FP, P y Q, y avisos.
 */
import { FS_SEQ, FS_SIS, fsData, fsSis, fsUI, fsWarn } from '@/checks/phasor';
import type { Element } from '@/types';
import { L, RCX, esc, wrap } from './symbols';

/** Ancho de un rótulo en Arial negrita de 11 px (medidas de la letra, en milésimas de em). */
const AW: Record<string, number> = { ' ': 278, '.': 278, ',': 278, '-': 333, I: 278, V: 667, S: 667, T: 611, R: 722, U: 722, A: 722 };
const arialW = (t: string) => [...t].reduce((a, c) => a + (AW[c] ?? (/\d/.test(c) ? 556 : 600)), 0) * 0.011;

/** Ancho aproximado de un dato de la tabla (letra IBM Plex Mono de 10.5 px). */
const monoW = (t: string) => t.length * 6.3;

/**
 * Tabla del fasorial: V, I, φ, FP, P y Q por fase, y el total.
 * Las columnas están donde las pone el HTML; si un número no cabe (potencias grandes en el
 * primario), esa columna y las siguientes se corren a la derecha.
 */
export function fsTable(e: Element) {
  const D = fsData(e), aron = fsSis(e.f) === FS_SIS[1];
  const tx = Math.max(370, 195 + 125 + 62), cw = [0, 62, 152, 198, 242, 296, 348];
  let Pt = 0, Qt = 0, ok = false;
  const rows = D.map((x) => {
    const vi = !isNaN(x.V) && !isNaN(x.I), ph = !isNaN(x.phi);
    let P = '', Q = '', FP = '';
    if (ph) FP = Math.abs(Math.cos((x.phi * Math.PI) / 180)).toFixed(3) + (Math.sin((x.phi * Math.PI) / 180) >= 0 ? ' i' : ' c');
    if (vi && ph) {
      const p = (x.V * x.I * Math.cos((x.phi * Math.PI) / 180)) / 1000, q = (x.V * x.I * Math.sin((x.phi * Math.PI) / 180)) / 1000;
      Pt += p; Qt += q; ok = true; P = p.toFixed(3); Q = q.toFixed(3);
    }
    return [aron ? (x.k === 'R' ? 'Elem. 1' : 'Elem. 2') : 'Fase ' + x.k, (isNaN(x.V) ? '—' : x.V + ' V') + ' ∠' + Math.round(x.vdeg) + '°', isNaN(x.I) ? '—' : x.I + ' A', ph ? x.phi.toFixed(1) + '°' : '—', FP || '—', P || '—', Q || '—'];
  });
  const S = Math.hypot(Pt, Qt);
  const total = ok ? [S > 0 ? (Pt / S).toFixed(3) : '—', Pt.toFixed(3), Qt.toFixed(3)] : null;
  const col = (j: number) => [...rows.map((r) => r[j]), ...(total && j >= 4 ? [total[j - 4]] : [])];
  for (let j = 1; j < 6; j++) cw[j + 1] = Math.max(cw[j + 1], cw[j] + Math.max(...col(j).map(monoW)) + 1);
  const lineW = Math.max(390, cw[6] + Math.max(...col(6).map(monoW)));
  return { tx, cw, rows, total, lineW };
}

/** Ancho que necesita el lienzo para este fasorial. */
export const fsNeedW = (e: Element) => { const t = fsTable(e); return Math.max(790, Math.ceil(t.tx + t.lineW + 24)); };

export function fasSVG(e: Element, W: number, y0: number): { g: string; y: number } {
  const D = fsData(e), aron = fsSis(e.f) === FS_SIS[1], g: string[] = [];
  const COL: Record<string, string> = { R: '#F9A825', S: '#1565C0', T: '#D32F2F' };
  if (RCX.bt === '480') { COL.R = '#6D4C41'; COL.S = '#EF6C00'; COL.T = '#F9A825'; }
  const T = (x: number, y: number, t: string, cls = 't2', anc = 'middle') => `<text x="${x}" y="${y}" class="${cls}" style="text-anchor:${anc}">${esc(t)}</text>`;
  const cx = 195, cy = y0 + 200, R = 125;
  g.push(`<line x1="12" y1="${y0 + 4}" x2="${W - 12}" y2="${y0 + 4}" class="thin"/>` + T(24, y0 + 24, 'DIAGRAMA FASORIAL', 't1', 'start') + T(170, y0 + 24, fsUI(e.f).toUpperCase() + (fsUI(e.f) !== 'Trifásico' ? '' : ' · SECUENCIA ' + (e.f.seq === FS_SEQ[1] ? 'NEGATIVA' : 'POSITIVA')), 't4', 'start'));
  g.push(`<circle cx="${cx}" cy="${cy}" r="${R}" class="thin" style="fill:none"/><circle cx="${cx}" cy="${cy}" r="${R * 0.46}" class="thin" style="fill:none;stroke-dasharray:3 4"/>` + L(cx - R - 10, cy, cx + R + 10, cy, 'thin') + L(cx, cy - R - 10, cx, cy + R + 10, 'thin'));
  for (let k = 0; k < 36; k++) {
    const deg = k * 10, a = ((90 - deg) * Math.PI) / 180, big = deg % 30 === 0, r1 = R, r2 = R + (big ? 8 : 4);
    g.push(`<line x1="${cx + r1 * Math.cos(a)}" y1="${cy - r1 * Math.sin(a)}" x2="${cx + r2 * Math.cos(a)}" y2="${cy - r2 * Math.sin(a)}" class="thin"/>`);
    if (big) { const rl = R + 20; g.push(`<text x="${cx + rl * Math.cos(a)}" y="${cy - rl * Math.sin(a) + 3.5}" class="pol" style="text-anchor:middle;${deg % 120 === 0 ? 'font-weight:700' : ''}">${deg}°</text>`); }
  }
  // tabla (se arma antes para que los rótulos de las flechas la eviten; se pinta al final, como en el HTML)
  const tg: string[] = [];
  const hd = ['', 'V', 'I', 'φ', 'FP', 'P (kW)', 'Q (kvar)'];
  const { tx, cw, rows: TR, total, lineW } = fsTable(e);
  let ty = y0 + 60;
  tg.push(hd.map((h, j) => T(tx + cw[j], ty, h, 't4', 'start')).join(''));
  ty += 8;
  tg.push(L(tx, ty, tx + lineW, ty, 'thin'));
  ty += 16;
  D.forEach((x, n) => {
    tg.push(`<rect x="${tx - 8}" y="${ty - 11}" width="4" height="14" style="fill:${COL[x.k]}"/>` + TR[n].map((c, j) => T(tx + cw[j], ty, c, j ? 't2' : 't1', 'start')).join(''));
    ty += 20;
  });
  if (total) {
    tg.push(L(tx, ty - 8, tx + lineW, ty - 8, 'thin'));
    tg.push(T(tx, ty + 6, 'Total', 't1', 'start') + T(tx + cw[4], ty + 6, total[0], 't2', 'start') + T(tx + cw[5], ty + 6, total[1], 't2', 'start') + T(tx + cw[6], ty + 6, total[2], 't2', 'start'));
    ty += 24;
    if (aron) { tg.push(T(tx, ty, 'En Aron la potencia total es la suma de los dos elementos.', 't2', 'start')); ty += 16; }
  }  ty += 10;
  const Wn = fsWarn(e);
  Wn.forEach((w) => { wrap(w, 58).forEach((l) => { tg.push(`<text x="${tx}" y="${ty}" class="t3 bad lft">${esc(l)}</text>`); ty += 13; }); ty += 4; });
  const tyEnd = ty;
  const Vmax = Math.max(...D.map((x) => (isNaN(x.V) ? 0 : x.V)), 0), Imax = Math.max(...D.map((x) => (isNaN(x.I) ? 0 : x.I)), 0);
  const arrow = (a: number, len: number, cl: string, dash: boolean, w: number) => {
    const r = (a * Math.PI) / 180, x = cx + len * Math.cos(r), y = cy - len * Math.sin(r), hx = x - 12 * Math.cos(r), hy = y + 12 * Math.sin(r), px = 6 * Math.sin(r), py = 6 * Math.cos(r);
    return `<line x1="${cx}" y1="${cy}" x2="${hx}" y2="${hy}" style="stroke:${cl};stroke-width:${w};${dash ? 'stroke-dasharray:7 4;' : ''}stroke-linecap:round"/><path d="M${x} ${y} L${hx + px} ${hy + py} L${hx - px} ${hy - py} Z" style="fill:${cl}"/>`;
  };
  // Rótulos de las flechas sin montarse (el HTML los dejaba encimados cuando una flecha es muy corta
  // o dos quedan en la misma dirección): si chocan, se corren sobre su flecha hasta quedar libres.
  // Sin choque quedan en el mismo sitio que en el HTML.
  type Box = { x1: number; y1: number; x2: number; y2: number };
  const placed: Box[] = [];
  const free = (b: Box) => !placed.some((p) => b.x1 < p.x2 && p.x1 < b.x2 && b.y1 < p.y2 && p.y1 < b.y2);
  for (let k = 0; k < 12; k++) { // números de la escala (0°, 30°, …)
    const a = ((90 - k * 30) * Math.PI) / 180, x = cx + (R + 20) * Math.cos(a), y = cy - (R + 20) * Math.sin(a) + 3.5, w = String(k * 30).length * 5.2 + 6;
    placed.push({ x1: x - w / 2, y1: y - 8, x2: x + w / 2, y2: y + 2 });
  }
  placed.push({ x1: tx - 10, y1: y0 + 46, x2: W, y2: tyEnd }); // tabla y avisos
  const lab = (a: number, len: number, t: string, cl: string, dn?: boolean) => {
    const r = (a * Math.PI) / 180, w = arialW(t);
    const at = (d: number, v: number) => {
      if (Math.abs(Math.sin(r)) < 0.3) return { x: cx + (len + d) * Math.cos(r), y: cy - (len + d) * Math.sin(r) + (dn ? 18 : -10) + v, anc: 'middle' };
      return { x: cx + (len + 16 + d) * Math.cos(r), y: cy - (len + 16 + d) * Math.sin(r) + 4 + v, anc: Math.cos(r) > 0.3 ? 'start' : Math.cos(r) < -0.3 ? 'end' : 'middle' };
    };
    const box = (p: { x: number; y: number; anc: string }): Box => {
      const x1 = p.anc === 'start' ? p.x : p.anc === 'end' ? p.x - w : p.x - w / 2;
      return { x1: x1 - 1, y1: p.y - 9, x2: x1 + w + 1, y2: p.y + 2.5 };
    };
    let p = at(0, 0);
    if (!free(box(p))) {
      const tries: [number, number][] = [];
      for (const d of [14, 28, 42, 56, 70]) tries.push([d, 0], [-d, 0]);
      for (const v of [14, -14, 28, -28, 42, -42, 56, -56]) for (const d of [0, 14, -14, 28, -28, 42, 56]) tries.push([d, v]);
      const ok = tries.map(([d, v]) => (len + d >= 8 ? at(d, v) : null)).find((q) => q && free(box(q)));
      if (ok) p = ok;
    }
    placed.push(box(p));
    return `<text x="${p.x}" y="${p.y}" style="font:700 11px Arial,sans-serif;fill:${cl};text-anchor:${p.anc}">${esc(t)}</text>`;
  };  D.forEach((x) => {
    const cl = COL[x.k], vl = (Vmax > 0 && !isNaN(x.V) ? Math.max(0.15, x.V / Vmax) : 1) * R * 0.7;
    g.push(arrow(x.va, vl, cl, false, 3.2) + lab(x.va, vl, x.vl + (isNaN(x.V) ? '' : ' ' + x.V + ' V'), cl));
    if (!isNaN(x.ia)) {
      const il = Imax > 0 && !isNaN(x.I) ? Math.max(0.12, x.I / Imax) * R * 0.46 : R * 0.46, nm = aron ? (x.k === 'R' ? 'I1' : 'I3') : 'I' + x.k;
      g.push(arrow(x.ia, il, cl, true, 2.4) + lab(x.ia, il, nm + (isNaN(x.I) ? '' : ' ' + x.I + ' A'), cl, true));
      const r1 = 26 + D.indexOf(x) * 9, a1 = (x.va * Math.PI) / 180, a2 = (x.ia * Math.PI) / 180, large = Math.abs(x.phi) > 180 ? 1 : 0, sw = x.phi > 0 ? 1 : 0;
      g.push(`<path d="M${cx + r1 * Math.cos(a1)} ${cy - r1 * Math.sin(a1)} A${r1} ${r1} 0 ${large} ${sw} ${cx + r1 * Math.cos(a2)} ${cy - r1 * Math.sin(a2)}" style="fill:none;stroke:${cl};stroke-width:1.4"/>`);
    }
  });
  g.push(`<circle cx="${cx}" cy="${cy}" r="3" class="dot"/>`);
  g.push(...tg);
  return { g: g.join(''), y: Math.max(cy + R + 46, ty + 10) };
}
