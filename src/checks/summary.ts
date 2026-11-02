/** Copia de backend/app/rules/summary.py (resumen de 1 línea de cada elemento). */
import { TYPES } from '@/catalog';
import type { DiagramLike, Element } from '@/types';
import { fv, grpOf, jsInt, multiT, numTxt, trK, trN, trTot } from './common';
import { wrSummary } from './wiring';

const SKIP_CELDA = ['irreg', 'celda', 'gabinete', 'bloque', 'bloquer', 'conex', 'fasor'];

export function irrLabel(f: Record<string, any>): string {
  return f.tipo === 'Otra' ? (f.detalle || '').trim() || 'Irregularidad' : f.tipo || '';
}

export function faseText(f: Record<string, any>): string {
  const v: string = f.fase || '';
  if (!v || ['Sin indicar', 'No aplica', 'Todas'].includes(v)) return '';
  if (v.startsWith('Todas')) return 'Fases R, S y T';
  if (v === 'Neutro') return 'En el neutro';
  return (v.includes(' y ') ? 'Fases ' : 'Fase ') + v;
}

export function celdaCands(d: DiagramLike, c: Element): Element[] {
  const side = d.els.some((e) => e.t === 'tc' || e.t === 'tt');
  const g = grpOf(d, c);
  const T = multiT(d);
  return d.els.filter(
    (e) => !SKIP_CELDA.includes(e.t) && !(side && ['medidor', 'respaldo', 'testigo'].includes(e.t)) && grpOf(d, e) === g && e !== T,
  );
}

export function celdaSel(d: DiagramLike, c: Element): string[] {
  if (Array.isArray(c.f.incl)) return c.f.incl;
  const i = d.els.indexOf(c);
  const n = jsInt(fv(c, 'encierra')) || 1;
  return celdaCands(d, c)
    .filter((e) => d.els.indexOf(e) > i)
    .slice(0, n)
    .map((e) => e.id);
}

function trKtxt(e: Element): string {
  const k = trK(e);
  if (k.length === 1) return k[0] ? `${numTxt(k[0])} kVA` : '';
  if (!k.some(Boolean)) return '';
  return k.map((v, i) => (v ? `T${i + 1}: ${numTxt(v)} kVA` : '')).filter(Boolean).join(', ');
}

export function summary(el: Element, d?: DiagramLike): string {
  const f = el.f || {};
  const t = el.t;
  const out: string[] = [];

  if (t === 'transc') {
    const u2 = f.enUso === 'Circuito 2';
    const n: string = (u2 ? f.nombre2 : f.nombre1) || '';
    return [...(f.tipo === 'Manual' || f.tipo === 'Automática' ? [f.tipo] : []), 'conectado: ' + (n.trim() || f.enUso || 'Circuito 1')].join(' · ');
  }
  if (t === 'conex') return wrSummary(el, d);
  // Se completa en la fase 8 (fasorial).
  if (t === 'fasor') return fv(el, 'tipo');
  if (t === 'breaker') {
    const n = trN(el);
    if (n > 1) return `${n} totalizadores`;
    const pol = fv(el, 'polos');
    return [fv(el, 'corriente').trim(), pol && pol !== 'Sin indicar' ? pol + 'P' : ''].filter(Boolean).join(' · ');
  }
  if (t === 'trafo') {
    const n = trN(el);
    if (n > 1) out.push(`${n} trafos ${fv(el, 'configuracion').toLowerCase()}`);
    const kt = trKtxt(el);
    if (kt) {
      const tot = trTot(el);
      out.push(kt + (n > 1 && tot ? ` (total ${numTxt(tot)} kVA)` : ''));
    }
    if (fv(el, 'relacion').trim()) out.push(fv(el, 'relacion').trim());
    return out.join(' · ');
  }

  for (const { key: k } of TYPES[t].fields) {
    const v = fv(el, k).trim();
    if (!v || v === 'Sin indicar' || v === 'Sin especificar' || v === 'Igual a la red') continue;
    if (k === 'neutro' || k === 'criterio') continue;
    if (t === 'spt') {
      if (k === 'para') out.push('Para ' + (v === 'DPS' ? 'DPS' : v.charAt(0).toLowerCase() + v.slice(1)));
      continue;
    }
    if (t === 'lmt') {
      if (k === 'lineas') out.push(v + (v === '1' ? ' línea' : ' líneas'));
      continue;
    }
    if (t === 'cajam' && k === 'clientes') {
      const n = jsInt(v) || 0;
      if (n) out.push(`${n} ${n === 1 ? 'cliente' : 'clientes'}`);
      continue;
    }
    if (t === 'cajab' && k === 'abonados') {
      const n = jsInt(v) || 0;
      if (n) out.push(`${n} ${n === 1 ? 'abonado' : 'abonados'}`);
      continue;
    }
    if (t === 'acom') {
      if (k === 'porFase') out.push(v + (v === '1' ? ' cable por fase' : ' cables por fase'));
      else if (['fasesA', 'tipo', 'calibre', 'material'].includes(k)) out.push(v);
      continue;
    }
    if (t === 'otros' || t === 'carga') {
      if (k === 'descripcion') out.push(v);
      continue;
    }
    if (t === 'irreg') {
      if (k === 'tipo') out.push(irrLabel(f));
      else if (k === 'fase' && faseText(f)) {
        const ft = faseText(f);
        out.push(ft.charAt(0).toLowerCase() + ft.slice(1));
      } else if (k === 'detalle' && f.tipo !== 'Otra') out.push(v);
      continue;
    }
    if (t === 'xlpe') {
      if (k === 'subterraneo') out.push(v === 'Sí' ? 'Subterráneo' : 'Aéreo');
      if (k === 'calibre') out.push(v);
      continue;
    }
    if (t === 'dps') {
      if (k === 'buenos') out.push(v + (v === '1' ? ' bueno' : ' buenos'));
      if (k === 'malos' && v !== '0') out.push(v + (v === '1' ? ' dañado' : ' dañados'));
      continue;
    }
    if (k === 'corriente' && t === 'fus') {
      out.push('Fusible ' + v + (f.criterio === 'Manual' ? '' : ' (auto)'));
      continue;
    }
    if (k === 'fases') out.push(v + (f.neutro === 'Sí' && f.nivel !== 'MT' ? ' + N' : ''));
    else if (k === 'cantidad') out.push('×' + v);
    else if (k === 'polos') out.push(v + 'P');
    else if (k === 'encierra') {
      if (t === 'celda' && d) {
        const n = celdaSel(d, el).length;
        out.push(n ? `encierra ${n} equipo${n > 1 ? 's' : ''}` : 'sin equipos marcados');
      }
    } else if (k === 'uso' && v === 'Exclusivo' && t !== 'gabinete') continue;
    else if (k === 'uso' && t === 'doble' && v === 'Ambos cerrados') continue;
    else if (k === 'otrosCant' && t === 'gabinete') {
      if (f.uso === 'Compartido') out.push(v + ' medidores de otros usuarios');
    } else if (k === 'pasos') out.push(v + ' pasos');
    else out.push(v);
  }
  return out.join(' · ');
}
