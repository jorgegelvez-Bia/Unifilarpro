/**
 * Generador de diagramas al azar para la prueba anti-cruces (§5.5).
 * Mitad "realistas" (como se arman en campo) y mitad combinaciones al azar de todos los botones.
 * Con la misma semilla siempre da los mismos diagramas.
 */
import { TYPES, fieldsOf } from '@/catalog';
import { FS_MODO, FS_SEQ, FS_SIS, FS_UI, fsDefault, WR_BLQ, WR_BORNES, WR_N, WR_RESP, WR_RETS2, WR_T, fillDefaults, wrDefault, wrPhaseOpts } from '@/checks';
import { WR_MOD } from '@/diagram/wiring';
import { mk } from '@/store/diagram';
import type { DiagramLike, Element } from '@/types';

export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

const BUTTONS = Object.keys(TYPES).filter((t) => !['conex', 'fasor'].includes(t));
const TXT: Record<string, string[]> = {
  circuito: ['', 'Sol y Mar', 'Circuito Toledo 34', 'Alimentador industrial norte número 2'],
  tension: ['13.2 kV', '220/127 V', '34.5 kV', '480/277 V'],
  relacion: ['', '200/5 A', '13200/√3 : 120/√3 V', '13.2 kV / 220-127 V'],
  potencia: ['', '45', '75', '112.5', '150', '500'],
  corriente: ['', '100 A', '200 A', '1200 A'],
  obs: ['', 'carcasa rota', 'sin sello y con el display apagado desde hace meses'],
  nombre1: ['', 'Toledo', 'Circuito Pamplona centro'],
  nombre2: ['', 'Pamplona', 'Circuito Chinácota rural largo'],
  detalle: ['', 'cable extra', 'puente con alambre de cobre detrás de la bornera'],
  abonados: ['', '3', '12'],
  clientes: ['', '2', '7'],
  otrosCant: ['3', '1', '10'],
  marca: ['', 'Cummins'],
};

function randomize(e: Element, r: () => number, ids: string[]) {
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  for (const fs of fieldsOf(e.t)) {
    if (r() < 0.45) continue;
    if (fs.kind === 'select') e.f[fs.key] = pick(fs.options!);
    else if (fs.kind === 'ref') e.f[fs.key] = ids.length && r() < 0.7 ? pick(ids) : '';
    else if (TXT[fs.key]) e.f[fs.key] = pick(TXT[fs.key]);
  }
  if (e.t === 'irreg' && e.f.tipo === 'Otra') e.f.detalle = pick(TXT.detalle.slice(1));
  if ((e.t === 'trafo' || e.t === 'breaker') && r() < 0.25) {
    const n = 2 + Math.floor(r() * 4);
    e.f.cantidad = String(n);
    for (let k = 1; k <= n; k++) {
      e.f['med' + k] = pick(['Sin indicar', 'Directa', 'Semidirecta', 'Indirecta', 'Solo carga']);
      if (e.t === 'trafo') { e.f[k === 1 ? 'potencia' : 'potencia' + k] = pick(TXT.potencia); e.f['secc' + k] = pick(['No', 'Sí']); }
      else e.f[k === 1 ? 'corriente' : 'corriente' + k] = pick(TXT.corriente);
    }
  } else if (e.t === 'trafo' || e.t === 'breaker') e.f.cantidad = '1';
  if (e.t === 'celda' && r() < 0.5) e.f.incl = [];
}

/** Reparte en ramales lo que va después del trafo/totalizador con varios. */
function assignRamas(els: Element[], r: () => number) {
  const T = els.find((e) => e.t === 'trafo' && +e.f.cantidad > 1 && e.f.configuracion !== 'Banco de monofásicos')
    || els.find((e) => e.t === 'breaker' && +e.f.cantidad > 1);
  if (!T) return;
  // Solo el primer trafo / totalizador puede abrir ramales.
  els.forEach((e) => { if (e !== T && (e.t === 'trafo' || e.t === 'breaker')) e.f.cantidad = '1'; });
  const ti = els.indexOf(T), n = +T.f.cantidad;
  els.forEach((e, i) => { if (i > ti) e.rama = 1 + Math.floor(r() * n); });
}

const opt = (r: () => number, p: number, ...t: string[]) => (r() < p ? t : []);

function realistic(r: () => number): string[] {
  const mt = r() < 0.6;
  const seq: string[] = [];
  if (mt) {
    if (r() < 0.2) seq.push('doble', ...opt(r, 0.5, 'xlpe'), ...opt(r, 0.6, 'fus'), ...opt(r, 0.4, 'dps'), 'transc');
    else seq.push('red', ...opt(r, 0.3, 'lmt'), ...opt(r, 0.2, 'cajam'), ...opt(r, 0.3, 'xlpe'), ...opt(r, 0.2, 'reco'));
    seq.push(...opt(r, 0.8, 'fus'), ...opt(r, 0.6, 'dps'), ...opt(r, 0.3, 'spt'));
    const ind = r() < 0.5;
    if (ind) seq.push(...opt(r, 0.5, 'celda'), 'tt', 'tc', ...opt(r, 0.85, 'bloque'), ...opt(r, 0.25, 'bloquer'), 'medidor', ...opt(r, 0.25, 'respaldo'), ...opt(r, 0.1, 'testigo'), ...opt(r, 0.5, 'gabinete'));
    seq.push('trafo', ...opt(r, 0.25, 'otros'));
    if (!ind) {
      const semi = r() < 0.6;
      seq.push(...opt(r, 0.4, 'acom'));
      if (semi) seq.push('tc', ...opt(r, 0.85, 'bloque'), 'medidor', ...opt(r, 0.5, 'gabinete'));
      else seq.push('medidor', ...opt(r, 0.5, 'gabinete'));
    }
  } else {
    seq.push('red', ...opt(r, 0.3, 'rtren'), ...opt(r, 0.2, 'rabi'), ...opt(r, 0.3, 'cajab'), 'acom');
    if (r() < 0.5) seq.push('tc', ...opt(r, 0.85, 'bloque'), 'medidor', ...opt(r, 0.5, 'gabinete'));
    else seq.push('medidor', ...opt(r, 0.5, 'gabinete'));
  }
  seq.push(...opt(r, 0.4, 'barraje'), ...opt(r, 0.15, 'transfer', 'planta'), 'breaker', ...opt(r, 0.2, 'mdir'), ...opt(r, 0.2, 'brkcli'), ...opt(r, 0.15, 'cond'), ...opt(r, 0.8, 'carga'));
  if (r() < 0.3) seq.push('irreg');
  if (r() < 0.1) seq.push('irreg');
  return seq;
}

const LONG = 'borne 5 flojo y cable de tensión pelado detrás de la bornera, con marcas de calentamiento en el aislamiento';

/** Diagrama de conexiones al azar: tipo, bornera, bloque, respaldo, marcas y novedades. */
function randomConex(r: () => number, els: Element[]): Element {
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const e = mk('conex');
  e.f.tipo = r() < 0.2 ? wrDefault({ els }) : pick(WR_T);
  e.f.bornes = pick(WR_BORNES);
  e.f.bloque = pick(WR_BLQ);
  e.f.resp = pick(WR_RESP);
  e.f.modelo = pick(WR_MOD);
  e.f.modeloR = pick(WR_MOD);
  e.f.modeloTxt = pick(['', 'Medidor de prueba']);
  e.f.retS2 = pick(WR_RETS2);
  e.f.nov = Array.from({ length: Math.floor(r() * 5) }, () => {
    const t = pick(WR_N), o = wrPhaseOpts(e.f.tipo, t);
    return { t, fase: o.length ? pick(o) : '', txt: t === 'Otra' ? pick(['cable flojo', LONG]) : '' };
  });
  return e;
}

const NUM = ['', '120', '121.5', '0', '95', '13200', '2,5', '0.05', '3', '-1'];
const ANG = ['', '25', '-30', '200', '-130', '100', '0', '0.95', '-0.5', '0,8'];

/** Diagrama fasorial al azar: sistema, secuencia, modo y datos medidos (algunos raros). */
function randomFasor(r: () => number, els: Element[]): Element {
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const e = mk('fasor');
  e.f.sis = r() < 0.3 ? fsDefault({ els }) : pick([...FS_UI, ...FS_SIS]);
  e.f.seq = pick(FS_SEQ);
  e.f.modo = pick(FS_MODO);
  for (let j = 0; j < 3; j++) {
    e.f['V' + j] = pick(NUM); e.f['I' + j] = pick(NUM); e.f['A' + j] = pick(ANG);
    e.f['VA' + j] = r() < 0.2 ? pick(['0', '180', '240']) : ''; e.f['C' + j] = pick(['Ind', 'Cap']);
  }
  return e;
}

export function randomDiagram(i: number, seed = 20261030): DiagramLike {
  const r = rng(seed + i * 7919);
  const types = i % 2 === 0 ? realistic(r) : Array.from({ length: 1 + Math.floor(r() * 16) }, () => BUTTONS[Math.floor(r() * BUTTONS.length)]);
  const els: Element[] = [];
  for (const t of types) {
    const e = mk(t);
    randomize(e, r, els.map((x) => x.id));
    els.push(e);
  }
  assignRamas(els, r);
  // 1 de cada 4 lleva diagrama de conexiones (con su propio azar, para no cambiar los demás).
  if (i % 4 === 1) els.push(randomConex(rng(seed * 3 + i), els));
  // y 1 de cada 4 (otros) lleva diagrama fasorial; algunos llevan los dos.
  if (i % 4 === 3 || i % 20 === 1) els.push(randomFasor(rng(seed * 5 + i), els));
  return fillDefaults({ els, p: { nombre: i % 3 ? 'Proyecto ' + i : '', frontera: i % 4 ? 'FRT' + (10000 + i) : '' } });
}
