/** Copia de backend/app/rules/meter_type.py. */
import type { DiagramLike, Element } from '@/types';
import { fv, multiT, rama, segSplit, trN } from './common';

function base(els: Element[]): string {
  const has = (t: string) => els.some((e) => e.t === t);
  const tc = has('tc'), tt = has('tt'), md = has('mdir');
  const b = tc && tt ? 'Indirecta' : tc ? 'Semidirecta' : has('medidor') || md ? 'Directa' : '';
  return md && (tc || tt) ? b + ' + directa' : b;
}

export function meterType(d: DiagramLike): string {
  const els = d.els;
  const T = multiT(d);
  if (!T) {
    const segs = segSplit(els);
    if (segs.length > 1) {
      const ts = segs
        .map((sg) => {
          const st = sg[0].t === 'subm' ? fv(sg[0], 'tipo') : '';
          return st && st !== 'Sin indicar' ? st : base(sg);
        })
        .filter(Boolean);
      return ts.length ? ts.map((x, i) => (i ? x.toLowerCase() : x)).join(' + ') : 'Directa';
    }
    return base(els) || 'Directa';
  }
  const n = trN(T);
  const v: { k: number; x: string }[] = [];
  for (let k = 1; k <= n; k++) {
    const m = fv(T, `med${k}`);
    const x = m && m !== 'Sin indicar' && m !== 'Solo carga' ? m : base(els.filter((e) => Math.min(n, rama(e)) === k));
    if (x) v.push({ k, x });
  }
  if (!v.length) return base(els) || 'Directa';
  const u = [...new Set(v.map((z) => z.x))];
  const bk = T.t === 'breaker';
  if (u.length === 1) return u[0] + (v.length < n ? ` (${bk ? 'totalizador' : 'trafo'} ${v.map((z) => z.k).join(', ')})` : '');
  return v.map((z) => `${bk ? 'Tot.' : 'T'}${z.k} ${z.x}`).join(' · ');
}
