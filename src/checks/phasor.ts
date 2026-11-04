/** Copia de backend/app/rules/phasor.py (sistema, ángulos y avisos del diagrama fasorial). */
import type { DiagramLike, Element } from '@/types';
import { NF, fv } from './common';

export const FS_SIS = [
  'Trifásico 4 hilos (estrella)',
  'Trifásico 3 hilos (Aron)',
  'Bifásico de red trifásica (0° y 120°)',
  'Monofásico',
  'Bifásico trifilar de trafo monofásico (0° y 180°)',
];
export const FS_UI = ['Trifásico', 'Bifásico', 'Monofásico'];
export const FS_SEQ = ['R-S-T (positiva)', 'R-T-S (negativa)'];
export const FS_MODO = ['Ángulo en grados', 'Factor de potencia'];

type F = Record<string, any>;
export interface FsRow { k: string; lab: string; vl: string }
export interface FsPoint extends FsRow { V: number; I: number; phi: number; va: number; vdeg: number; vdef: number; man: boolean; ia: number }

export const fsSis = (f: F) => { const v = f.sis || FS_SIS[0]; return v === 'Trifásico' ? FS_SIS[0] : v === 'Bifásico' ? FS_SIS[4] : v; };
export const fsUI = (f: F) => { const v = fsSis(f); return v === FS_SIS[3] ? 'Monofásico' : v === FS_SIS[2] || v === FS_SIS[4] ? 'Bifásico' : 'Trifásico'; };

/** Número escrito por el técnico (acepta coma decimal). NaN si está vacío. */
export function fsNum(v: unknown): number {
  if (v == null) return NaN;
  const s = String(v).trim().replace(',', '.');
  if (!s) return NaN;
  return parseFloat(s);
}

export function fsDefault(d: DiagramLike): string {
  const red = d.els.find((e) => e.t === 'red'), nf = red ? NF[fv(red, 'fases')] || 3 : 3, cx = d.els.find((e) => e.t === 'conex');
  if (cx && /Aron/.test(fv(cx, 'tipo'))) return FS_SIS[1];
  return nf === 1 ? 'Monofásico' : nf === 2 ? 'Bifásico' : 'Trifásico';
}

export function fsRows(f: F): FsRow[] {
  const s = fsSis(f);
  if (s === FS_SIS[1]) return [{ k: 'R', lab: 'Elemento 1 (U12 · I1)', vl: 'U12' }, { k: 'T', lab: 'Elemento 2 (U32 · I3)', vl: 'U32' }];
  const ph = s === FS_SIS[3] ? ['R'] : s === FS_SIS[2] || s === FS_SIS[4] ? ['R', 'S'] : ['R', 'S', 'T'];
  return ph.map((k) => ({ k, lab: 'Fase ' + k, vl: 'V' + k }));
}

/** Por fila: V, I, φ, ángulo de la tensión (va, en el dibujo) y de la corriente (ia). */
export function fsData(e: Element): FsPoint[] {
  const f = e.f, rows = fsRows(f), neg = f.seq === FS_SEQ[1], aron = fsSis(f) === FS_SIS[1], fp = f.modo === FS_MODO[1];
  const base: Record<string, number> = { R: 90, S: fsSis(f) === FS_SIS[4] ? -90 : neg ? 210 : -30, T: neg ? -30 : 210 };
  return rows.map((r, j) => {
    const V = fsNum(f['V' + j]), I = fsNum(f['I' + j]);
    let phi = NaN;
    if (fp) {
      const p = fsNum(f['A' + j]);
      if (!isNaN(p) && Math.abs(p) <= 1) phi = ((Math.acos(Math.abs(p)) * 180) / Math.PI) * (f['C' + j] === 'Cap' ? -1 : 1) * (p < 0 ? -1 : 1) + (p < 0 ? 180 : 0);
    } else phi = fsNum(f['A' + j]);
    let va = base[r.k];
    if (aron) va = r.k === 'R' ? (neg ? 60 : 120) : neg ? 0 : 180;
    const vdef = (((90 - va) % 360) + 360) % 360, vd = fsNum(f['VA' + j]);
    const man = !isNaN(vd);
    if (man) va = 90 - vd;
    return { ...r, V, I, phi, va, vdeg: man ? ((vd % 360) + 360) % 360 : vdef, vdef, man, ia: isNaN(phi) ? NaN : va - phi };
  });
}

/** Avisos del fasorial: sin tensión, desbalance, sin corriente, ángulos raros. */
export function fsWarn(e: Element): string[] {
  const D = fsData(e), W: string[] = [], aron = fsSis(e.f) === FS_SIS[1];
  const Vs = D.map((x) => x.V).filter((v) => !isNaN(v)), Vm = Vs.length ? Vs.reduce((a, b) => a + b, 0) / Vs.length : 0;
  const Is = D.map((x) => x.I).filter((v) => !isNaN(v)), Im = Is.length ? Math.max(...Is) : 0;
  D.forEach((x) => {
    const n = aron ? x.lab.split(' (')[0] : 'Fase ' + x.k;
    if (!isNaN(x.V) && Vm > 0 && x.V < 0.15 * Vm) W.push(`${n}: sin tensión (revisar cuchilla, fusible o cable de tensión).`);
    else if (!isNaN(x.V) && Vm > 0 && !D.some((z) => z.man) && Math.abs(x.V - Vm) > 0.1 * Vm) W.push(`${n}: tensión desbalanceada (${x.V} V contra promedio ${Vm.toFixed(1)} V).`);
    if (!isNaN(x.I) && Im > 0 && x.I < 0.05 * Im) W.push(`${n}: sin corriente (revisar puente en bloque, TC o cable de corriente).`);
    if (!isNaN(x.phi)) {
      const a = (((x.phi % 360) + 540) % 360) - 180;
      if (Math.abs(Math.abs(a) - 180) < 35) W.push(`${n}: corriente invertida (${a.toFixed(0)}°): posible TC con S1/S2 invertidos.`);
      else if (Math.abs(Math.abs(a) - 120) < 30 && !aron) W.push(`${n}: ángulo de ${a.toFixed(0)}°: la corriente parece de otra fase (tensiones o corrientes cruzadas).`);
      else if (Math.abs(a) > 90) W.push(`${n}: ángulo de ${a.toFixed(0)}° (mayor a 90°): energía en sentido contrario, revisar polaridad.`);
    }
  });
  if (aron) {
    const a = D[0].phi, b = D[1] ? D[1].phi : NaN;
    if (!isNaN(a) && !isNaN(b) && Math.abs(a - b - 60) > 35 && Math.abs(a) <= 90 && Math.abs(b) <= 90)
      W.push(`Aron: la diferencia entre ángulos (${(a - b).toFixed(0)}°) debería estar cerca de 60° con carga equilibrada; revisar secuencia o cruces.`);
  }
  return W;
}

/** Resumen en la lista: sistema · n ángulos. */
export function fsSummary(e: Element, d?: DiagramLike): string {
  const n = d ? fsData(e).filter((x) => !isNaN(x.phi)).length : 0;
  return [fsUI(e.f), n ? n + ' ángulos' : 'sin datos'].filter(Boolean).join(' · ');
}
