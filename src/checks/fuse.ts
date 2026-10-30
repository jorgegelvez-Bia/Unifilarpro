/** Copia de backend/app/rules/fuse.py (fusible sugerido tipo K). */
import type { DiagramLike, FuseResult } from '@/types';
import { NF, fv, jsFloat, numTxt, trK, trN } from './common';

// Tablas CENS (Norma Cap. 3-08) para 13.2 kV, fusible tipo K 15 kV.
const FUS_TRI: Record<number, number> = { 15: 1, 30: 2, 45: 3, 75: 5, 112.5: 7, 150: 10, 225: 15 };
const FUS_MONO: Record<number, number> = { 5: 0.5, 10: 1, 15: 2, 25: 3, 37.5: 4, 50: 6, 75: 8, 100: 12, 167.5: 20 };
const FUS_STD = [0.5, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20, 25, 30, 40, 50, 65, 80, 100, 140, 200];

export function primaryKV(d: DiagramLike): number {
  const tr = d.els.find((e) => e.t === 'trafo');
  const red = d.els.find((e) => e.t === 'red');
  for (const src of [tr && fv(tr, 'relacion'), red && fv(red, 'tension')]) {
    if (!src) continue;
    const m = src.replace(',', '.').match(/([\d.]+)\s*kV/i);
    if (m) {
      const kv = jsFloat(m[1]);
      if (kv !== null) return kv;
    }
  }
  return 13.2;
}

export function fuseFor(d: DiagramLike): FuseResult | null {
  const ti = d.els.findIndex((e) => e.t === 'trafo');
  if (ti < 0) return null;
  const tr = d.els[ti];
  const ks = trK(tr).filter(Boolean);
  if (!ks.length) return null;
  const n = trN(tr);
  const red = d.els.find((e) => e.t === 'red');
  const sys = red && NF[fv(red, 'fases')] ? fv(red, 'fases') : 'Trifásico';
  const banco = n > 1 && fv(tr, 'configuracion') === 'Banco de monofásicos';
  const mono = banco || sys !== 'Trifásico';
  const unit = banco ? Math.max(...ks) : +ks.reduce((a, b) => a + b, 0).toFixed(1);
  const kv = primaryKV(d);
  const In = mono ? unit / kv : unit / (Math.sqrt(3) * kv);
  let amp: number | null = null;
  let src = '';
  if (Math.abs(kv - 13.2) < 0.05) {
    const t = mono ? FUS_MONO : FUS_TRI;
    if (t[unit] !== undefined) {
      amp = t[unit];
      src = 'tabla CENS 13.2 kV';
    }
  }
  if (amp === null) {
    amp = FUS_STD.find((a) => a >= 1.3 * In) ?? null;
    src = 'cálculo 1.3 × In';
  }
  if (amp === null) return null;
  return { amp, In, text: `${numTxt(amp)} A tipo K`, src, mono, unit, kv, ti };
}

/** Llena el fusible de los cortacircuitos en modo automático (antes del trafo). */
export function applyAutoFuse<T extends DiagramLike>(d: T): T {
  const r = fuseFor(d);
  if (!r) return d;
  d.els.forEach((e, i) => {
    if (e.t !== 'fus' || i > r.ti || fv(e, 'criterio') === 'Manual') return;
    e.f.corriente = r.text;
  });
  return d;
}
