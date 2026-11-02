/** Copia de backend/app/rules/wiring.py (tipos, opciones y novedades del diagrama de conexiones). */
import type { DiagramLike, Element } from '@/types';
import { NF, fv } from './common';

export const WR_T = [
  'Semidirecta trifásica (3 TC)',
  'Semidirecta bifásica (2 TC)',
  'Semidirecta monofásica (1 TC)',
  'Indirecta trifásica (3 TC + 3 TT)',
  'Indirecta Aron (2 TC + 2 TT)',
  'Directa trifásica',
  'Directa bifásica',
  'Directa monofásica',
];
export const WR_N = [
  'TC con S1 y S2 invertidos',
  'Puente en el bloque de pruebas',
  'Tensiones cruzadas entre fases',
  'Cable de tensión suelto',
  'Cable de corriente suelto',
  'Neutro suelto',
  'Otra',
];
export const WR_BLQ = ['Cuchillas 10 polos', 'Tres elementos 13 polos', 'Modular de riel', 'Modular de riel doble (principal + respaldo)'];
export const WR_RESP = ['Sin medidor de respaldo', 'Con respaldo · un solo bloque', 'Con respaldo · dos bloques'];
export const WR_BORNES = ['Asimétrico', 'Simétrico'];
export const WR_RETS2 = ['En el medidor', 'Después del bloque de pruebas'];

export interface Novedad { t: string; fase?: string; txt?: string }
export interface WrPhase { k: string; tc: boolean; tt: boolean; vOnly: boolean }
export interface WrCfg { dir: boolean; ind: boolean; aron: boolean; nf: number; ph: WrPhase[]; neutro: boolean }

const I_NOV = /TC con|Puente|corriente/;

/** Tipo de conexión que se propone según el unifilar. */
export function wrDefault(d: DiagramLike): string {
  const els = d.els, red = els.find((e) => e.t === 'red'), nf = red ? NF[fv(red, 'fases')] || 3 : 3;
  if (els.some((e) => e.t === 'tt')) return WR_T[3];
  if (els.some((e) => e.t === 'tc')) return WR_T[nf === 1 ? 2 : nf === 2 ? 1 : 0];
  return WR_T[nf === 1 ? 7 : nf === 2 ? 6 : 5];
}

export function wrCfg(tipo: string): WrCfg {
  const dir = /^Directa/.test(tipo), ind = /^Indirecta/.test(tipo), aron = /Aron/.test(tipo), nf = /monof/i.test(tipo) ? 1 : /bif/i.test(tipo) ? 2 : 3;
  const ph = ['R', 'S', 'T'].slice(0, nf).map((k) => ({ k, tc: !dir && !(aron && k === 'S'), tt: ind && !(aron && k === 'S'), vOnly: aron && k === 'S' }));
  return { dir, ind, aron, nf, ph, neutro: !aron };
}

/** Fases que se pueden escoger para una novedad. */
export function wrPhaseOpts(tipo: string, t: string): string[] {
  const c = wrCfg(tipo || '');
  if (!t || t === 'Neutro suelto' || t === 'Otra') return [];
  if (t === 'Tensiones cruzadas entre fases') {
    const k = c.ph.map((p) => p.k), o: string[] = [];
    for (let i = 0; i < k.length; i++) for (let j = i + 1; j < k.length; j++) o.push(k[i] + ' y ' + k[j]);
    return o;
  }
  if (I_NOV.test(t)) return c.ph.filter((p) => p.tc).map((p) => p.k);
  return c.ph.map((p) => p.k);
}

export const wrTipo = (e: Element, d: DiagramLike) => fv(e, 'tipo') || wrDefault(d);

/** Novedades válidas para el tipo de conexión (las incompletas no cuentan). */
export function wrNovs(e: Element, d: DiagramLike): Novedad[] {
  const tipo = wrTipo(e, d), c = wrCfg(tipo);
  return ((e.f.nov as Novedad[]) || []).filter((n) => {
    if (!n.t) return false;
    if (n.t === 'Otra') return !!(n.txt || '').trim();
    if (n.t === 'Neutro suelto') return c.neutro;
    if (c.dir && I_NOV.test(n.t)) return false;
    return wrPhaseOpts(tipo, n.t).includes(n.fase as string);
  });
}

export function wrNovText(n: Novedad): string {
  if (n.t === 'Otra') return (n.txt || '').trim();
  return n.t + (n.fase ? (n.t === 'Tensiones cruzadas entre fases' ? ' (' + n.fase + ')' : ' — fase ' + n.fase) : '');
}

/** Resumen en la lista: tipo · modelo · respaldo · bornera · novedades. */
export function wrSummary(e: Element, d?: DiagramLike): string {
  const tipo = fv(e, 'tipo'), modelo = fv(e, 'modelo'), resp = fv(e, 'resp');
  const n = d ? wrNovs(e, d).length : 0;
  return [
    tipo,
    modelo && modelo !== 'Genérico' ? modelo : '',
    resp && resp !== WR_RESP[0] && !/^Directa/.test(tipo) ? 'con respaldo' : '',
    e.f.bornes === 'Simétrico' ? 'medidor simétrico' : '',
    n ? n + (n === 1 ? ' novedad' : ' novedades') : '',
  ].filter(Boolean).join(' · ');
}
