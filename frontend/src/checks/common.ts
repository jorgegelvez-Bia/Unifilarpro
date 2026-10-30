/**
 * Copia en TypeScript de backend/app/rules/common.py (para trabajar sin internet).
 * Debe dar los mismos resultados que Python con los casos de shared/test-cases/.
 */
import { fieldsOf } from '@/catalog';
import type { DiagramLike, Element } from '@/types';

export const NF: Record<string, number> = { Trifásico: 3, Bifásico: 2, Monofásico: 1 };
export const MTR = ['medidor', 'respaldo', 'testigo'];

/** parseFloat de JS, pero con null en vez de NaN. */
export function jsFloat(v: unknown): number | null {
  const n = parseFloat(String(v ?? ''));
  return Number.isNaN(n) ? null : n;
}

export function jsInt(v: unknown): number | null {
  const n = parseInt(String(v ?? ''), 10);
  return Number.isNaN(n) ? null : n;
}

/** Number(v) de JS, con null en vez de NaN. */
export function jsNumber(v: unknown): number | null {
  const n = Number(String(v ?? '').trim());
  return Number.isNaN(n) ? null : n;
}

export const numTxt = (x: number): string => String(+x.toFixed(10));

export const fv = (e: Element | undefined | null, k: string): string => {
  const v = e?.f?.[k];
  return v == null ? '' : String(v);
};

export const rama = (e: Element): number => (typeof e.rama === 'number' && e.rama > 0 ? e.rama : 0);

export const trN = (e: Element): number => Math.min(99, Math.max(1, jsInt(fv(e, 'cantidad')) || 1));

export const trK = (e: Element): number[] =>
  Array.from({ length: trN(e) }, (_, i) => jsFloat(fv(e, i ? `potencia${i + 1}` : 'potencia').replace(',', '.')) || 0);

export const trTot = (e: Element): number => +trK(e).reduce((a, b) => a + b, 0).toFixed(1);

export function multiTr(d: DiagramLike): Element | null {
  const t = d.els.find((e) => e.t === 'trafo');
  return t && trN(t) > 1 && fv(t, 'configuracion') !== 'Banco de monofásicos' ? t : null;
}

export const mainBk = (d: DiagramLike): Element | null => d.els.find((e) => e.t === 'breaker' && !(rama(e) > 0)) ?? null;

/** El elemento que abre ramales (varios trafos o varios totalizadores). */
export function multiT(d: DiagramLike): Element | null {
  const t = multiTr(d);
  if (t) return t;
  const b = mainBk(d);
  return b && trN(b) > 1 ? b : null;
}

export const brName = (t: Element | null, k: number): string => (t && t.t === 'breaker' ? 'Totalizador ' : 'Trafo ') + k;

export function grpOf(d: DiagramLike, e: Element): number {
  const t = multiT(d);
  if (!t || e === t) return 0;
  return Math.min(trN(t), rama(e));
}

/** Parte la lista en tramos de medida (medidas aguas abajo). */
export function segSplit(els: Element[]): Element[][] {
  const segs: Element[][] = [[]];
  const MG = [...MTR, 'mdir'];
  for (const e of els) {
    if (e.t === 'irreg') continue;
    const cs = segs[segs.length - 1];
    const lm = cs.map((x) => MTR.includes(x.t)).lastIndexOf(true);
    const brk =
      e.t === 'subm' ||
      (['tc', 'tt'].includes(e.t) && lm >= 0) ||
      (['bloque', 'bloquer'].includes(e.t) && lm >= 0 && cs.some((x) => x.t === e.t)) ||
      (MTR.includes(e.t) && lm >= 0 && cs.slice(lm + 1).some((x) => !['gabinete', 'celda', 'irreg', 'bloque', 'bloquer', 'tc', 'tt'].includes(x.t)));
    const lg = cs.map((x) => MG.includes(x.t)).lastIndexOf(true);
    const brkG = MG.includes(e.t) && lg >= 0 && cs.slice(lg + 1).some((x) => x.t === 'gabinete');
    if ((brk || brkG) && cs.length) segs.push([e]);
    else cs.push(e);
  }
  return segs;
}

/** Completa los campos que falten con su valor por defecto (como `openDiagram`). */
export function fillDefaults<T extends DiagramLike>(d: T): T {
  for (const e of d.els) {
    e.f = e.f || {};
    for (const fs of fieldsOf(e.t)) if (e.f[fs.key] === undefined) e.f[fs.key] = fs.default;
  }
  return d;
}
