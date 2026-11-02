/**
 * Diagrama de conexiones (cableado de bornes): copia fiel de wrGeom / wiringSVG del HTML.
 * Red, TC (S1/S2/P1/P2), TT (a/b/A/B), bloque de pruebas y medidor(es) con bornes numerados,
 * colores RETIE y cables ruteados por carriles para cruzarse lo menos posible.
 */
import { WR_BLQ, WR_RESP, wrCfg, wrDefault, wrNovText, wrNovs, type Novedad } from '@/checks/wiring';
import type { DiagramLike, Element } from '@/types';
import { RC, RC_G, RC_N, dot, esc, phCols, tri, wrap } from './symbols';

/** Marcas y modelos de medidor: [nombre, uso (A = todos, D = directa, SI = semidirecta/indirecta), dibujo]. */
export const WR_CAT: [string, 'A' | 'D' | 'SI', string][] = [
  ['Genérico', 'A', 'gen'], ['Elster A1800', 'SI', 'a1800'], ['Elster A1700', 'SI', 'a1800'], ['Itron SL7000', 'SI', 'sl7000'], ['Itron ACE6000', 'A', 'ace6000'],
  ['Landis+Gyr ZMG405', 'SI', 'landis'], ['Landis+Gyr ZMY405', 'A', 'landis'], ['Landis+Gyr E650 (ZMD)', 'SI', 'landis'], ['Iskra MT174', 'A', 'iskra'], ['Iskra MT372', 'A', 'iskra'], ['Iskra MT880', 'SI', 'iskraD'],
  ['Inhemeter i310', 'A', 'inhe'], ['EDMI Mk10E', 'SI', 'edmi'], ['EDMI Mk6E', 'SI', 'edmi'], ['ZIV 5CTD', 'SI', 'ziv'], ['Circutor CIRWATT B', 'A', 'circutor'], ['Hexing (directo)', 'D', 'hexing'], ['Hexing (semidirecto / indirecto)', 'SI', 'hexing'],
  ['Holley (trifásico)', 'A', 'holley'], ['Kaifa (trifásico)', 'A', 'kaifa'], ['Meccon (directo)', 'D', 'meccon'], ['Meccon (semidirecto / indirecto)', 'SI', 'meccon'], ['CDM (directo)', 'D', 'cdm'], ['CDM (semidirecto / indirecto)', 'SI', 'cdm'],
  ['Nansen (directo)', 'D', 'nansen'], ['Nansen (semidirecto / indirecto)', 'SI', 'nansen'], ['Otro (escribir)', 'A', 'gen'],
];
export const WR_MOD = WR_CAT.map((x) => x[0]);

interface Look { b: string; s: string; d: 'L' | 'C'; dc?: string; top?: string; acc?: string; btn?: string[]; lbl?: string; cover?: number }
/** Dibujo aproximado de cada marca: colores de caja, display, botones. */
const WR_LOOK: Record<string, Look> = {
  gen: { b: '#E7EBEE', s: '#90A4AE', d: 'L' },
  a1800: { b: '#2F3133', s: '#1C1D1E', d: 'L', dc: '#A9C8B0', btn: ['#C62828', '#9E9E9E'], lbl: '#E0E0E0' },
  sl7000: { b: '#5A6570', s: '#3E4851', top: '#3E4851', d: 'C', dc: '#9FC3C9', acc: '#1E88E5', cover: 1, btn: ['#B0BEC5', '#B0BEC5'] },
  ace6000: { b: '#D5D9DC', s: '#90A4AE', top: '#37474F', d: 'C', dc: '#B8CDB0', btn: ['#1565C0'] },
  landis: { b: '#E4E6E3', s: '#9EA3A0', d: 'L', dc: '#C5D3B9', btn: ['#43A047'] },
  iskra: { b: '#E9E6DE', s: '#A8A39A', d: 'C', dc: '#C9D6C0', btn: ['#5D4037'], cover: 1 },
  iskraD: { b: '#55595C', s: '#3B3E40', d: 'C', dc: '#A5C2B1', btn: ['#E0E0E0'] },
  inhe: { b: '#F4F6F8', s: '#B0BEC5', acc: '#1565C0', d: 'C', dc: '#BFD6E8', btn: ['#1565C0'] },
  edmi: { b: '#4E6378', s: '#34465A', d: 'L', dc: '#B3CBB6', btn: ['#ECEFF1', '#ECEFF1', '#ECEFF1'] },
  ziv: { b: '#F2F2F2', s: '#BDBDBD', acc: '#C62828', d: 'L', dc: '#C8D6C0', btn: ['#C62828'] },
  circutor: { b: '#E8EAE6', s: '#A5ABA2', acc: '#7CB342', d: 'C', dc: '#C8D6C0', btn: ['#616161'] },
  hexing: { b: '#F5F5F5', s: '#BDBDBD', acc: '#EF6C00', d: 'C', dc: '#C9D8E6', btn: ['#EF6C00'] },
  holley: { b: '#ECEFF1', s: '#B0BEC5', acc: '#283593', d: 'C', dc: '#C3D3C0', cover: 1, btn: ['#283593'] },
  kaifa: { b: '#EEEEEE', s: '#BDBDBD', acc: '#00897B', d: 'C', dc: '#C3D3C0', btn: ['#00897B'] },
  meccon: { b: '#F1F1F1', s: '#BDBDBD', acc: '#D32F2F', d: 'C', dc: '#C9D6C0', cover: 1, btn: ['#D32F2F'] },
  cdm: { b: '#EDEFF1', s: '#B0BEC5', acc: '#0D47A1', d: 'C', dc: '#C9D6C0', cover: 1, btn: ['#0D47A1'] },
  nansen: { b: '#E6E8E3', s: '#A5ABA2', acc: '#2E7D32', d: 'L', dc: '#C9D6C0', cover: 1, btn: ['#2E7D32'] },
};
const wrLook = (m: string) => { const r = WR_CAT.find((x) => x[0] === m); return WR_LOOK[r ? r[2] : 'gen']; };

const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Modelos que se muestran en la lista según el tipo (directa o semi/indirecta). */
export function wrModOptions(tipo: string, cur: string): string[] {
  const dir = /^Directa/.test(tipo || '');
  return WR_CAT.filter((x) => x[1] === 'A' || (dir ? x[1] === 'D' : x[1] === 'SI') || x[0] === cur).map((x) => x[0]);
}

/** Buscador (lupa) de medidores: hasta 8 resultados. */
export function wrModHits(q: string): string[] {
  const n = norm(q || '').trim();
  if (!n) return [];
  const k = n.replace(/[^a-z0-9 ]/g, '');
  return WR_CAT.filter((x) => norm(x[0] + ' ' + (x[1] === 'D' ? 'directa directo' : x[1] === 'SI' ? 'semidirecta indirecta' : '')).replace(/[^a-z0-9 ]/g, '').includes(k))
    .slice(0, 8)
    .map((x) => x[0]);
}

interface MTerm { i: number; k: string; n: number }
interface BCol { i: number; k: string; l: string }
interface Col { gx: number | null; S1: number | null; V: number | null; S2: number | null }

export function wrGeom(e: Element, d: DiagramLike) {
  const tipo: string = e.f.tipo || wrDefault(d), c = wrCfg(tipo), sym = e.f.bornes === 'Simétrico';
  let resp = c.dir ? 0 : Math.max(0, WR_RESP.indexOf(e.f.resp || WR_RESP[0]));
  const GW = 175, gx0 = 95 + (3 - c.nf) * 58 + (c.ind ? 25 : 0);
  const col: Col[] = c.ph.map((_, i) => ({ gx: gx0 + i * GW, S1: gx0 + i * GW + 34, V: gx0 + i * GW + 64, S2: gx0 + i * GW + 94 }));
  const lastX = col[c.nf - 1].S2 as number, NX: number | null = c.neutro ? lastX + 56 : null, fR = (NX || lastX) + 20, fC = (gx0 + fR) / 2;
  // terminales del medidor
  const MT: MTerm[] = [];
  const add = (i: number, k: string, n: number) => MT.push({ i, k, n });
  if (!sym) {
    if (c.dir) {
      c.ph.forEach((_, i) => { add(i, 'S1', i * 3 + 1); add(i, 'S2', i * 3 + 3); });
      if (c.neutro) { const a = c.nf === 1 ? 4 : 10; add(-1, 'N', a); add(-1, 'NO', a + 2); }
    } else {
      c.ph.forEach((p, i) => { if (p.vOnly && !c.aron) { add(i, 'V', i * 3 + 2); return; } add(i, 'S1', i * 3 + 1); add(i, 'V', i * 3 + 2); add(i, 'S2', i * 3 + 3); });
      if (c.neutro || c.aron) add(-1, 'N', 11);
    }
  } else {
    const o: [number, string][] = [];
    c.ph.forEach((p, i) => { if (c.dir) o.push([i, 'S1']); else (p.vOnly && !c.aron ? ['V'] : ['S1', 'V']).forEach((k) => o.push([i, k])); });
    if (c.neutro || c.aron) { o.push([-1, 'N']); if (c.dir) o.push([-1, 'NO']); }
    c.ph.map((_, i) => i).reverse().forEach((i) => { if (c.dir || c.ph[i].tc || c.aron) o.push([i, 'S2']); });
    o.forEach(([i, k], j) => add(i, k, j + 1));
  }
  const TS = 36, mW = Math.max(300, MT.length * TS + 28), MO = (mW - (MT.length - 1) * TS) / 2;
  // columnas del bloque
  const bt = Math.max(0, WR_BLQ.indexOf(e.f.bloque || WR_BLQ[0])), dbl = bt === 3 && !c.dir, BC: BCol[] = [];
  if (dbl) resp = 2;
  const bc = (i: number, k: string, l: string) => BC.push({ i, k, l });
  const PH = ['A', 'B', 'C'];
  const NN = c.neutro || c.aron;
  if (bt === 0) {
    c.ph.forEach((_, i) => bc(i, 'V', 'V' + PH[i]));
    if (NN) bc(-1, 'N', 'N');
    c.ph.forEach((p, i) => { if (p.tc || c.aron) { bc(i, 'S1', 'I' + PH[i]); bc(i, 'S2', 'I' + PH[i]); } });
  } else if (bt === 1) {
    c.ph.forEach((p, i) => { bc(i, 'V', 'V'); if (p.tc || c.aron) { bc(i, 'S1', 'I'); bc(i, 'X', 'I'); bc(i, 'S2', 'I'); } });
    if (NN) bc(-1, 'N', 'N');
  } else {
    c.ph.forEach((p, i) => { if (p.tc || c.aron) { bc(i, 'S1', 'S1'); bc(i, 'S2', 'S2'); } });
    c.ph.forEach((_, i) => bc(i, 'V', 'L' + (i + 1)));
    if (NN) bc(-1, 'N', 'N');
    if (bt === 2) bc(-1, 'PE', 'PE');
  }
  const BS = 44, bW = BC.length * BS + 28;
  const bPx = c.dir ? 120 : 130;
  let mPx = Math.max(70, bPx + bW / 2 - mW / 2);
  if (c.dir) mPx = Math.max(110, fC - mW / 2);
  let mRx = mPx + mW + 70, bRx: number | null = resp === 2 ? mRx + mW / 2 - bW / 2 : null;
  if (dbl) { bRx = bPx + bW; mRx = Math.max(mRx, bRx + bW / 2 - mW / 2); }
  else if (resp === 2 && (bRx as number) < bPx + bW + 40) { bRx = bPx + bW + 40; mRx = Math.max(mRx, bRx + bW / 2 - mW / 2); }
  const right = Math.max(fR, resp ? mRx + mW : mPx + mW, bRx ? bRx + bW + (dbl ? BS + 20 : 90) : 0) + 40;
  return { tipo, c, sym, resp, dbl, col, NX, MT, TS, mW, MO, BC, BS, bW, bt, bPx, mPx, mRx, bRx, needW: Math.max(790, right + 60) };
}

/** Ancho que necesita el lienzo para este diagrama de conexiones. */
export const wrNeedW = (e: Element, d: DiagramLike) => wrGeom(e, d).needW;

interface Wire { x1: number; y1: number; x2: number; y2: number; cl: string; isI: boolean; tag?: string; i?: number; k?: string; red?: boolean; gap?: Novedad | null; L?: number; path?: string }

/** Dibuja el diagrama de conexiones desde y0. n0 = número del primer triángulo de novedad. */
export function wiringSVG(e: Element, W: number, y0: number, n0: number, d: DiagramLike): { g: string; y: number; n: number } {
  const G = wrGeom(e, d), { tipo, c, sym, resp, dbl, MT, TS, mW, MO, BC, BS, bW, bt } = G, nov = wrNovs(e, d);
  let col = G.col, NX = G.NX;
  const find = (t: string, f?: string) => nov.find((n) => n.t === t && (f == null || n.fase === f || (n.fase || '').split(' y ').includes(f)));
  const nums = new Map<Novedad, number>();
  nov.forEach((n, i) => nums.set(n, n0 + i));
  const sec = c.ind ? RC.B208 : phCols(true, c.nf), lc = c.ind ? RC.MT : phCols(true, c.nf), RED = '#D32F2F';
  const g: string[] = [], top: string[] = [];
  const ws = (p: string, cl: string, w = 2.6) =>
    cl === RC_N
      ? `<path d="${p}" style="stroke:#8A9699;stroke-width:4.4;fill:none;stroke-linecap:round;stroke-linejoin:round"/><path d="${p}" style="stroke:#fff;stroke-width:2.4;fill:none;stroke-linecap:round;stroke-linejoin:round"/>`
      : `<path d="${p}" style="stroke:${cl};stroke-width:${w};fill:none;stroke-linecap:round;stroke-linejoin:round"/>`;
  const wi = (p: string, cl: string) => ws(p, cl, 3.2) + `<path d="${p}" style="stroke:${cl === '#212121' ? '#FFFFFF' : '#1B1B1B'};stroke-width:1.2;stroke-dasharray:5 5;fill:none"/>`;
  const irr = (p: string) => `<path d="${p}" class="irr"/>`;
  const gnd = (x: number, y: number) => `<path d="M${x} ${y} v7 M${x - 7} ${y + 7} h14 M${x - 4.5} ${y + 10.5} h9 M${x - 2} ${y + 14} h4" style="stroke:${RC_G};stroke-width:1.8;fill:none"/>`;
  const hh = (y: number, x1: number, x2: number, xs: number[]) => { let p = `M${x1} ${y}`; xs.slice().sort((a, b) => a - b).forEach((x) => { p += ` H${x - 5} a5 5 0 0 1 10 0`; }); return p + ` H${x2}`; };
  const T = (x: number, y: number, t: string, cls = 't2', anc = 'middle') => `<text x="${x}" y="${y}" class="${cls}" style="text-anchor:${anc}">${esc(t)}</text>`;
  const F = (x: number, y: number, t: string | number, sz: number, w: number, cl: string, anc = 'middle') => `<text x="${x}" y="${y}" style="font:${w} ${sz}px Arial,Helvetica,sans-serif;fill:${cl};text-anchor:${anc}">${esc(String(t))}</text>`;
  const mark = (n: Novedad | null | undefined, x: number, y: number) => { if (n && nums.has(n)) top.push(tri(x, y, nums.get(n)!)); };
  const Xm = (x: number, y: number) => `<circle cx="${x}" cy="${y}" r="7" fill="#fff"/>` + irr(`M${x - 6} ${y - 6} l12 12 M${x + 6} ${y - 6} l-12 12`);
  const scr = (x: number, y: number, r = 6) => `<circle cx="${x}" cy="${y}" r="${r + 1.5}" fill="#8D6E3F"/><circle cx="${x}" cy="${y}" r="${r}" fill="#D9C08A"/><path d="M${x - r + 2} ${y} h${2 * r - 4}" stroke="#5D4524" stroke-width="1.8"/>`;
  const scr2 = (x: number, y: number, r = 5.5) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#CFD8DC" stroke="#455A64" stroke-width="1.2"/><path d="M${x - 3.2} ${y - 3.2} l6.4 6.4" stroke="#455A64" stroke-width="1.5"/>`;
  // ---- coordenadas verticales
  const yT = y0 + 24, yM0 = y0 + 44, yMt = yM0 + 108, yWa = yM0 + 128;
  const nTop = (() => { let n = BC.filter((b) => b.k !== 'X' && b.k !== 'PE').length; if (resp === 1) n += MT.length; if (resp === 2) n *= 2; return n; })();
  const yB0 = c.dir ? 0 : yWa + 40 + nTop * 9, yBt = yB0 + 18, yBb = yB0 + 104, yB1 = yB0 + 122;
  const nBot = BC.filter((b) => b.k !== 'X' && b.k !== 'PE').length * (resp === 2 ? 2 : 1);
  const yF = c.dir ? yWa : yB1 + 36 + (dbl ? 22 : 0) + nBot * 9, yS = yF + 34, yP = yS + 34, yTa = yP + 30, yTb = yTa + 40;
  const yL0 = c.dir ? yWa + 60 : c.ind ? yTb + 40 : yP + 42, yL = (i: number) => yL0 + i * 24, yN = yL0 + c.nf * 24;
  const xA = 60, xZ = W - 60;
  g.push(`<line x1="12" y1="${y0 + 4}" x2="${W - 12}" y2="${y0 + 4}" class="thin"/>` + T(24, yT, 'DIAGRAMA DE CONEXIONES', 't1', 'start') + T(206, yT, tipo.toUpperCase() + ' · MEDIDOR ' + (sym ? 'SIMÉTRICO' : 'ASIMÉTRICO'), 't4', 'start'));
  // ---- medidores (ilustrados)
  const mX = (x0: number, k: string, i: number) => { const j = MT.findIndex((t) => t.k === k && t.i === i); return j < 0 ? null : x0 + MO + j * TS; };
  const meter = (x0: number, model: string, tag: string, tagC: string, look: Look) => {
    const L = look || WR_LOOK.gen, dark = parseInt(L.b.slice(1, 3), 16) < 140, tx = dark ? '#ECEFF1' : '#5B6C70';
    let s = `<rect x="${x0}" y="${yM0}" width="${mW}" height="128" rx="14" fill="${L.b}" stroke="${L.s}" stroke-width="2"/>`;
    if (L.top) s += `<path d="M${x0 + 1} ${yM0 + 20} V${yM0 + 14} a13 13 0 0 1 13 -13 H${x0 + mW - 14} a13 13 0 0 1 13 13 V${yM0 + 20} Z" fill="${L.top}"/>`;
    if (L.acc) s += `<rect x="${x0 + 5}" y="${yM0 + 12}" width="5" height="64" rx="2" fill="${L.acc}"/>`;
    const dx = L.d === 'C' ? x0 + Math.max(16, (mW - 104 - 118) / 2) : x0 + 16, dy = yM0 + (L.top ? 24 : 12), dh = L.top ? 26 : 32;
    s += `<rect x="${dx}" y="${dy}" width="118" height="${dh}" rx="4" fill="${L.dc || '#B5CCA3'}" stroke="${dark ? '#111' : '#4E6B3A'}" stroke-width="1.6"/>` + F(dx + 124, dy + 11, 'kWh', 9, 700, tx, 'start');
    (L.btn || []).forEach((cc, k) => { s += `<circle cx="${dx + 132 + k * 14}" cy="${dy + dh - 6}" r="5" fill="${cc}" stroke="${dark ? '#111' : '#78909C'}"/>`; });
    s += `<circle cx="${x0 + mW - 30}" cy="${yM0 + (L.top ? 32 : 44)}" r="4" fill="#E53935"/><circle cx="${x0 + mW - 18}" cy="${yM0 + (L.top ? 32 : 44)}" r="4" fill="#FBC02D"/>`;
    s += `<rect x="${x0 + mW - 106}" y="${yM0 + (L.top ? 3 : 8)}" width="92" height="16" rx="8" fill="${tagC}"/>` + F(x0 + mW - 60, yM0 + (L.top ? 15 : 20), tag, 9.5, 700, '#fff');
    s += `<rect x="${x0 + 14}" y="${yM0 + 58}" width="${mW - 28}" height="20" rx="4" fill="${L.lbl || '#fff'}" stroke="${dark ? '#111' : '#CFD8DC'}"/>` + F(x0 + mW / 2, yM0 + 72, model, 11, 700, '#17262B');
    if (L.cover) s += `<rect x="${x0 + 4}" y="${yM0 + 4}" width="${mW - 8}" height="78" rx="11" fill="#fff" fill-opacity=".10" stroke="#fff" stroke-opacity=".55" stroke-width="1.5"/>`;
    s += `<rect x="${x0}" y="${yM0 + 84}" width="${mW}" height="44" rx="0" fill="#455A64"/><rect x="${x0}" y="${yM0 + 114}" width="${mW}" height="14" rx="7" fill="#455A64"/>`;
    MT.forEach((t, j) => { const x = x0 + MO + j * TS; s += `<rect x="${x - 12}" y="${yM0 + 88}" width="24" height="30" rx="3" fill="#CFD8DC"/>` + F(x, yM0 + 98, t.n, 9, 700, '#263238'); });
    return s;
  };
  const meterScrews = (x0: number) => MT.map((_, j) => scr2(x0 + MO + j * TS, yMt, 5.5)).join('');
  const mod = (v: string, t: string) => (v === 'Otro (escribir)' ? (t || '').trim() || 'Medidor' : v && v !== 'Genérico' ? v : 'Medidor');
  g.push(meter(G.mPx, mod(e.f.modelo, e.f.modeloTxt), 'PRINCIPAL', '#1E63D6', wrLook(e.f.modelo)));
  if (resp) g.push(meter(G.mRx, mod(e.f.modeloR, e.f.modeloRTxt), 'RESPALDO', '#8E24AA', wrLook(e.f.modeloR)));
  // ---- bloque(s) ilustrados
  const bX = (x0: number, k: string, i: number) => { const j = BC.findIndex((b) => b.k === k && b.i === i); return j < 0 ? null : x0 + 28 + j * BS; };
  const bloque = (x0: number, lab: string) => {
    let s = '';
    if (bt >= 2) {
      s += `<rect x="${x0}" y="${yB1 - 6}" width="${bW}" height="12" fill="#B0BEC5"/>`;
      BC.forEach((b, j) => {
        const x = x0 + 28 + j * BS, pe = b.k === 'PE', cur = b.k === 'S1' || b.k === 'S2';
        s += `<rect x="${x - 16}" y="${yB0}" width="32" height="${yB1 - yB0 - 4}" rx="3" fill="${pe ? '#7CB342' : '#9EA7AD'}" stroke="#78858B"/>`
          + (pe ? `<path d="M${x - 16} ${yB0 + 30} l32 26 M${x - 16} ${yB0 + 70} l32 26" stroke="#FDD835" stroke-width="6"/>` : '')
          + `<rect x="${x - 6}" y="${yB0 + 34}" width="12" height="34" rx="3" fill="#E8692C"/><rect x="${x - 13}" y="${yB0 + 72}" width="26" height="13" rx="2" fill="#fff"/>` + F(x, yB0 + 82, b.l, 8.5, 700, '#333')
          + (cur ? `<rect x="${x - 12}" y="${yB0 + 26}" width="24" height="6" rx="2" fill="#FFE0D0" stroke="#E8692C"/>` : '');
      });
    } else if (bt === 1) {
      s += `<path d="M${x0 + 14} ${yB0} H${x0 + bW - 14} L${x0 + bW} ${(yB0 + yB1) / 2} L${x0 + bW - 14} ${yB1} H${x0 + 14} L${x0} ${(yB0 + yB1) / 2} Z" fill="#1E1E1E"/>`;
      let j = 0;
      while (j < BC.length) {
        const b = BC[j], x = x0 + 28 + j * BS;
        if (b.k === 'S1') {
          const x2 = x + 2 * BS;
          s += `<rect x="${x - 14}" y="${yB0 + 8}" width="${x2 - x + 28}" height="${yB1 - yB0 - 16}" rx="3" fill="#2B2B2B" stroke="#444"/><rect x="${x - 4}" y="${yB0 + 46}" width="${x2 - x + 8}" height="8" rx="2" fill="#E0E0E0"/><rect x="${x + BS - 4}" y="${yB0 + 66}" width="${BS + 8}" height="8" rx="2" fill="#E0E0E0"/>`;
          j += 3;
          continue;
        }
        s += `<rect x="${x - 14}" y="${yB0 + 8}" width="28" height="${yB1 - yB0 - 16}" rx="3" fill="#2B2B2B" stroke="#444"/><rect x="${x - 5}" y="${yB0 + 40}" width="10" height="40" rx="2" fill="#E0E0E0"/>` + (b.k === 'V' ? `<rect x="${x - 5}" y="${yB0 + 64}" width="10" height="8" fill="#E53935"/>` : F(x, yB0 + 64, 'N', 9, 700, '#555'));
        j++;
      }
    } else {
      s += `<rect x="${x0}" y="${yB0}" width="${bW}" height="${yB1 - yB0}" rx="12" fill="#1C1C1C"/><rect x="${x0 + 5}" y="${yB0 + 5}" width="${bW - 10}" height="${yB1 - yB0 - 10}" rx="9" fill="#262626"/>`;
      BC.forEach((b, j) => {
        const x = x0 + 28 + j * BS, cc = b.i >= 0 ? sec[b.i] : '#6D4C41';
        s += `<rect x="${x - 2.5}" y="${yBt + 8}" width="5" height="${yBb - yBt - 16}" fill="#9E9E9E"/>`
          + (b.k === 'N' ? `<rect x="${x - 5}" y="${yBt + 22}" width="10" height="${yBb - yBt - 44}" rx="2" fill="#6D4C41"/>` : `<path d="M${x - 14} ${yBt + 18} h28 v30 h-7 v7 h-14 v-7 h-7 z" fill="${cc}"/><rect x="${x - 9}" y="${yBt + 26}" width="18" height="10" fill="#fff"/>` + F(x, yBt + 34, b.l, 7.5, 700, '#222'));
      });
    }
    const lw = lab.split('|'), rgt = /respaldo/.test(lab) && !dbl, off = dbl && x0 === G.bRx ? BC.length : 0;
    if (!(dbl && x0 === G.bRx)) lw.forEach((l, j) => { s += F(rgt ? x0 + bW + 8 : x0 - 8, yB0 + 16 + j * 13, l, 10, 700, '#5B6C70', rgt ? 'start' : 'end'); });
    if (dbl) s += `<rect x="${x0 + bW / 2 - 44}" y="${yB1 + 6}" width="88" height="16" rx="8" fill="${x0 === G.bRx ? '#8E24AA' : '#1E63D6'}"/>` + F(x0 + bW / 2, yB1 + 18, x0 === G.bRx ? 'RESPALDO' : 'PRINCIPAL', 9.5, 700, '#fff');
    BC.forEach((_, j) => { s += F(x0 + 28 + j * BS + 12, yBb + 16, j + 1 + off, 8.5, 700, bt >= 2 ? '#263238' : '#BDBDBD', 'start'); });
    return s;
  };
  if (!c.dir) {
    col = c.ph.map((_, i) => { const a = bX(G.bPx, 'S1', i), b = bX(G.bPx, 'S2', i); return { gx: bX(G.bPx, 'V', i), S1: a, S2: b, V: a != null ? (a + (b as number)) / 2 : null }; });
    NX = c.neutro ? bX(G.bPx, 'N', -1) : null;
  }
  const bScrews = (x0: number) => BC.map((_, j) => { const x = x0 + 28 + j * BS; return bt === 0 ? scr(x, yBt) + scr(x, yBb) : scr2(x, yBt) + scr2(x, yBb); }).join('');
  if (!c.dir) {
    g.push(bloque(G.bPx, dbl ? 'Bloque de|pruebas|doble' : resp === 2 ? 'Bloque de|pruebas|principal' : 'Bloque de|pruebas'));
    if (resp === 2) g.push(bloque(G.bRx as number, 'Bloque de|pruebas|respaldo'));
    if (dbl) {
      const bRx = G.bRx as number, x = bRx + bW + BS / 2 - 14 + 2;
      g.push(`<rect x="${bRx + bW}" y="${yB1 - 6}" width="${BS}" height="12" fill="#B0BEC5"/><rect x="${x - 16}" y="${yB0}" width="32" height="${yB1 - yB0 - 4}" rx="3" fill="#7CB342" stroke="#78858B"/><path d="M${x - 16} ${yB0 + 30} l32 26 M${x - 16} ${yB0 + 70} l32 26" stroke="#FDD835" stroke-width="6"/><rect x="${x - 13}" y="${yB0 + 72}" width="26" height="13" rx="2" fill="#fff"/>` + F(x, yB0 + 82, 'PE', 8.5, 700, '#333') + scr2(x, yBt) + scr2(x, yBb) + `<path d="M${x} ${yBb} V${yB1 + 14}" style="stroke:${RC_G};stroke-width:2"/>` + gnd(x, yB1 + 14));
    }
  }
  // ---- enrutador de cables: escoge el orden de los carriles que menos cruces deja
  const route = (W_: Wire[], yA: number, yB: number): Wire[] => {
    const n = W_.length;
    if (!n) return [];
    const ly = (k: number) => yA + 16 + (n > 1 ? (k * (yB - yA - 32)) / (n - 1) : (yB - yA - 32) / 2);
    const segs = (w: Wire, L: number) => ({ h: [Math.min(w.x1, w.x2), Math.max(w.x1, w.x2), L], v: [[w.x1, Math.min(w.y1, L), Math.max(w.y1, L)], [w.x2, Math.min(w.y2, L), Math.max(w.y2, L)]] });
    const cost = (ord: number[]) => {
      const L: number[] = [];
      ord.forEach((w, k) => (L[w] = ly(k)));
      let s = 0;
      for (let a = 0; a < n; a++) {
        const A = segs(W_[a], L[a]);
        for (let b = 0; b < n; b++) {
          if (a === b) continue;
          const B = segs(W_[b], L[b]);
          B.v.forEach(([x, y1, y2]) => { if (x > A.h[0] + 1 && x < A.h[1] - 1 && A.h[2] > y1 + 1 && A.h[2] < y2 - 1) s++; });
          if (b > a) A.v.forEach(([x, y1, y2]) => B.v.forEach(([x2, u1, u2]) => { if (Math.abs(x - x2) < 2 && Math.min(y2, u2) - Math.max(y1, u1) > 2) s += 100; }));
        }
      }
      return s;
    };
    const idx = W_.map((_, j) => j);
    const cands: ((a: number, b: number) => number)[] = [
      (a, b) => W_[a].x2 - W_[b].x2, (a, b) => W_[b].x2 - W_[a].x2, (a, b) => W_[a].x1 - W_[b].x1, (a, b) => W_[b].x1 - W_[a].x1,
      (a, b) => W_[a].x2 - W_[a].x1 - (W_[b].x2 - W_[b].x1), (a, b) => W_[b].x2 - W_[b].x1 - (W_[a].x2 - W_[a].x1),
    ];
    let best = idx, bc = cost(idx);
    cands.forEach((f) => { const o = idx.slice().sort(f), k = cost(o); if (k < bc) { bc = k; best = o; } });
    let imp = true, guard = 0;
    while (imp && guard++ < 40) {
      imp = false;
      for (let k = 0; k + 1 < n; k++) { const o = best.slice(); [o[k], o[k + 1]] = [o[k + 1], o[k]]; const v = cost(o); if (v < bc) { bc = v; best = o; imp = true; } }
    }
    const L: number[] = [];
    best.forEach((w, k) => (L[w] = Math.round(ly(k))));
    return W_.map((w, j) => {
      const Lj = L[j];
      const hops = (x: number, y1: number, y2: number) =>
        W_.map((o, m) => (m === j ? null : { a: Math.min(o.x1, o.x2), b: Math.max(o.x1, o.x2), y: L[m] }))
          .filter((o): o is { a: number; b: number; y: number } => !!o && x > o.a + 1 && x < o.b - 1 && o.y > Math.min(y1, y2) + 6 && o.y < Math.max(y1, y2) - 6)
          .map((o) => o.y);
      const vseg = (x: number, from: number, to: number) => {
        let p = '';
        const hs = hops(x, from, to).sort((u, v) => (from < to ? u - v : v - u));
        hs.forEach((h) => { const dir = to > from ? 1 : -1; p += ` V${h - 5 * dir} a5 5 0 0 ${dir > 0 ? 1 : 0} 0 ${10 * dir}`; });
        return p + ` V${to}`;
      };
      const path = `M${w.x1} ${w.y1}` + vseg(w.x1, w.y1, Lj) + ` H${w.x2}` + vseg(w.x2, Lj, w.y2);
      return { ...w, L: Lj, path };
    });
  };
  const drawWire = (w: Wire) => {
    const cl = w.cl, path = w.path as string;
    let s = w.isI ? wi(path, cl) : ws(path, cl);
    if (w.red) s += irr(path);
    if (w.gap) { const px = w.x1 !== w.x2 ? (w.x1 + w.x2) / 2 : w.x1, py = w.x1 !== w.x2 ? (w.L as number) : (w.y1 + w.y2) / 2; s += Xm(px, py); mark(w.gap, px + 16, py - 4); }
    return s;
  };
  if (c.dir) {
    // directa: líneas a los bornes del medidor
    const segsL: [number, number, number][] = [];
    c.ph.forEach((_, i) => { segsL.push([yL(i), xA, mX(G.mPx, 'S1', i)!], [yL(i), mX(G.mPx, 'S2', i)!, xZ]); });
    if (c.neutro) segsL.push([yN, xA, mX(G.mPx, 'N', -1)!], [yN, mX(G.mPx, 'NO', -1)!, xZ]);
    const H = (x: number, self: number) => segsL.filter((s) => s[0] !== self && x > Math.min(s[1], s[2]) + 3 && x < Math.max(s[1], s[2]) - 3).map((s) => s[0]);
    const vh = (x: number, y1: number, y2: number) => { const a = Math.min(y1, y2), b = Math.max(y1, y2); let p = `M${x} ${b}`; H(x, y1).filter((h) => h > a + 7 && h < b - 7).sort((u, v) => v - u).forEach((h) => { p += ` V${h + 5} a5 5 0 0 0 0 -10`; }); return p + ` V${a}`; };
    c.ph.forEach((p, i) => {
      const y = yL(i), a = mX(G.mPx, 'S1', i)!, b = mX(G.mPx, 'S2', i)!;
      g.push(ws(`M${xA} ${y} H${a}`, lc[i]) + ws(vh(a, y, yMt), lc[i]) + ws(vh(b, y, yMt), lc[i]) + ws(`M${b} ${y} H${xZ}`, lc[i]) + T(xA - 6, y + 4, 'L' + (i + 1) + ' (' + p.k + ')', 't2', 'end'));
    });
    if (c.neutro) {
      const a = mX(G.mPx, 'N', -1)!, b = mX(G.mPx, 'NO', -1)!, nv = find('Neutro suelto');
      g.push(ws(`M${xA} ${yN} H${a}`, RC_N) + ws(vh(a, yN, yMt), RC_N) + ws(vh(b, yN, yMt), RC_N) + ws(`M${b} ${yN} H${xZ}`, RC_N) + T(xA - 6, yN + 4, 'N', 't2', 'end'));
      if (nv) { const m = (yWa + yL0) / 2 - 10; top.push(Xm(a, m)); mark(nv, a + 16, m - 4); }
    }
    g.push(meterScrews(G.mPx));
  } else {
    const cross = find('Tensiones cruzadas entre fases');
    const cp = cross ? (cross.fase as string).split(' y ').map((k) => c.ph.findIndex((p) => p.k === k)) : null;
    const KS = ['S1', 'V', 'S2', 'N'];
    const used = BC.filter((b) => KS.includes(b.k) && !((b.k === 'S1' || b.k === 'S2') && !c.ph[b.i].tc) && !(b.k === 'N' && !c.neutro));
    const colorOf = (i: number, k: string) => (k === 'N' ? RC_N : sec[i]), isI = (k: string) => k === 'S1' || k === 'S2';
    // ---- arriba: bloque(s) -> medidor(es)
    const TW: Wire[] = [];
    const tw = (x1: number, y1: number, x2: number, y2: number, i: number, k: string, tag: string) => TW.push({ x1, y1, x2, y2, cl: colorOf(i, k), isI: isI(k), tag, i, k });
    const mP = (k: string, i: number) => mX(G.mPx, k, i), mR = (k: string, i: number) => mX(G.mRx, k, i);
    const bP = (k: string, i: number) => bX(G.bPx, k, i), bR = (k: string, i: number) => (G.bRx != null ? bX(G.bRx, k, i) : null);
    used.forEach((b) => {
      const i = b.i, k = b.k;
      if (mP(k, i) == null) return;
      let tgt = mP(k, i)!, red = false;
      if (k === 'V' && cp && cp.includes(i)) { tgt = mP('V', cp[0] === i ? cp[1] : cp[0])!; red = true; }
      if (resp === 1 && k === 'S2') { tw(mR('S2', i)!, yWa, bP('S2', i)!, yBt, i, k, 'S2R:' + i); return; }
      tw(bP(k, i)!, yBt, tgt, yWa, i, k, k + ':' + i);
      if (red) TW[TW.length - 1].red = true;
      if (resp === 2) tw(bR(k, i)!, yBt, mR(k, i)!, yWa, i, k, 'R' + k + ':' + i);
      if (resp === 1) { if (k === 'S1') tw(mP('S2', i)!, yWa, mR('S1', i)!, yWa, i, 'S1', 'PR:' + i); else tw(mP(k, i)!, yWa, mR(k, i)!, yWa, i, k, 'PRv:' + k + i); }
    });
    TW.forEach((w) => {
      if (w.tag === 'V:' + w.i) w.gap = find('Cable de tensión suelto', c.ph[w.i!].k);
      if (w.tag === 'S1:' + w.i) w.gap = find('Cable de corriente suelto', c.ph[w.i!].k);
      if (w.tag === 'N:-1') w.gap = find('Neutro suelto');
    });
    if (cross) { const w = TW.find((x) => x.red); if (w) w.gap = null; }
    route(TW, yWa, yB0).forEach((w) => { g.push(drawWire(w)); if (w.red && cp && w.i === cp[0]) mark(cross, (w.x1 + w.x2) / 2, (w.L as number) - 12); });
    // ---- abajo: campo -> bloque(s)
    const fx = (k: string, i: number) => (k === 'N' ? NX : k === 'V' ? col[i].gx : (col[i] as any)[k]) as number;
    const BW: Wire[] = [];
    const bw = (x1: number, y1: number, x2: number, y2: number, i: number, k: string) => BW.push({ x1, y1, x2, y2, cl: colorOf(i, k), isI: isI(k) });
    used.forEach((b) => {
      const i = b.i, k = b.k;
      if (resp === 2) {
        if (k === 'S1') { bw(fx(k, i), yF, bP('S1', i)!, yBb, i, k); return; }
        if (k === 'S2') { bw(bP('S2', i)!, yBb, bR('S1', i)!, yBb, i, 'S1'); bw(bR('S2', i)!, yBb, fx('S2', i), yF, i, k); return; }
        bw(fx(k, i), yF, bP(k, i)!, yBb, i, k);
        bw(bP(k, i)!, yBb, bR(k, i)!, yBb, i, k);
        return;
      }
      bw(fx(k, i), yF, bP(k, i)!, yBb, i, k);
    });
    route(BW, yB1 + (dbl ? 22 : 0), yF).forEach((w) => g.push(drawWire(w)));
    // tornillos encima de los cables
    g.push(meterScrews(G.mPx));
    if (resp) g.push(meterScrews(G.mRx));
    g.push(bScrews(G.bPx));
    if (resp === 2) g.push(bScrews(G.bRx as number));
    // puente en bloque (irregularidad)
    c.ph.forEach((p, i) => {
      if (!p.tc) return;
      const pb = find('Puente en el bloque de pruebas', p.k);
      if (!pb) return;
      const a = bP('S1', i)!, b = bP('S2', i)!, yy = yBt - 14;
      top.push(`<path d="M${a} ${yBt} V${yy} H${b} V${yBt}" class="irr solid"/><circle cx="${a}" cy="${yy}" r="3" class="irrdot"/><circle cx="${b}" cy="${yy}" r="3" class="irrdot"/>`);
      mark(pb, Math.max(a, b) + 16, yy);
    });
    // Aron: puente de retornos S2
    if (c.aron) {
      const RS = '#616161';
      if ((e.f.retS2 || 'En el medidor') === 'En el medidor') {
        (resp === 0 ? [G.mPx] : resp === 1 ? [G.mRx] : [G.mPx, G.mRx]).forEach((x0) => {
          const a = mX(x0, 'S2', 0)!, b = mX(x0, 'S2', 2)!, x1 = Math.min(a, b), x2 = Math.max(a, b), yy = yWa + 10;
          const xs = MT.map((_, j) => x0 + MO + j * TS).filter((x) => x > x1 + 2 && x < x2 - 2);
          top.push(wi(hh(yy, x1, x2, xs), RS) + dot(a, yy) + dot(b, yy) + T(x2 + 10, yy + 4, 'Puente S2', 't2', 'start'));
        });
      } else {
        (resp === 2 ? [G.bPx, G.bRx as number] : [G.bPx]).forEach((x0) => {
          const a = bX(x0, 'S2', 0)!, b = bX(x0, 'S2', 2)!, x1 = Math.min(a, b), x2 = Math.max(a, b), yy = yB0 - 14;
          const xs = BC.map((_, j) => x0 + 28 + j * BS).filter((x) => x > x1 + 2 && x < x2 - 2);
          top.push(wi(hh(yy, x1, x2, xs), RS) + dot(a, yy) + dot(b, yy) + T(x2 + 10, yy + 4, 'Puente S2', 't2', 'start'));
        });
      }
    }
    // ---- campo: líneas, TC, TT
    const segsL: [number, number, number][] = [];
    c.ph.forEach((p, i) => { const y = yL(i); if (p.tc) segsL.push([y, xA, col[i].S1!], [y, col[i].S2!, xZ]); else segsL.push([y, xA, xZ]); });
    if (NX) segsL.push([yN, xA, xZ]);
    const H = (x: number, self: number) => segsL.filter((s) => s[0] !== self && x > Math.min(s[1], s[2]) + 3 && x < Math.max(s[1], s[2]) - 3).map((s) => s[0]);
    const vh = (x: number, y1: number, y2: number) => { const hops = H(x, y1), a = Math.min(y1, y2), b = Math.max(y1, y2); let p = `M${x} ${b}`; hops.filter((h) => h > a + 7 && h < b - 7).sort((u, v) => v - u).forEach((h) => { p += ` V${h + 5} a5 5 0 0 0 0 -10`; }); return p + ` V${a}`; };
    c.ph.forEach((p, i) => {
      const C = col[i], y = yL(i);
      g.push(T(xA - 6, y + 4, 'L' + (i + 1) + ' (' + p.k + ')', 't2', 'end'));
      if (p.tc) g.push(ws(`M${xA} ${y} H${C.S1}`, lc[i]) + ws(vh(C.S1!, y, yP + 4), lc[i]) + ws(vh(C.S2!, y, yP + 4), lc[i]) + ws(`M${C.S2} ${y} H${xZ}`, lc[i]));
      else g.push(ws(`M${xA} ${y} H${xZ}`, lc[i]));
    });
    if (NX && !c.ind) g.push(ws(`M${xA} ${yN} H${xZ}`, RC_N) + T(xA - 6, yN + 4, 'N', 't2', 'end') + ws(vh(NX, yN, yF), RC_N) + dot(NX, yN));
    if (NX && c.ind) {
      const yC = yTa - 12, bs = c.ph.filter((p) => p.tt).map((p) => (col[c.ph.indexOf(p)].gx as number) - 16), xa = Math.min(...bs, NX), xb = Math.max(...bs, NX);
      const fxs = ([] as (number | null)[]).concat(...col.map((q, j) => (c.ph[j].tc ? [q.S1, q.S2, q.gx] : [q.gx])))
        .filter((x): x is number => x != null && x > xa + 2 && x < xb - 2 && !bs.includes(x) && x !== NX);
      g.push(ws(`M${xA} ${yN} H${xZ}`, RC_N) + T(xA - 6, yN + 4, 'N', 't2', 'end') + ws(hh(yC, xa, xb, fxs), RC_N) + ws(`M${NX} ${yF} V${yC}`, RC_N) + dot(NX, yC) + `<path d="M${NX} ${yC} V${yC + 8}" style="stroke:${RC_G};stroke-width:1.6"/>` + gnd(NX, yC + 8));
    }
    c.ph.forEach((p, i) => {
      const C = col[i], y = yL(i), gx = C.gx as number;
      const bx = gx - 16, yC = yTa - 12;
      if (p.vOnly) {
        const bR_ = (col[0].gx as number) - 16, bT = (col[2].gx as number) - 16, xa = Math.min(bR_, bT), xb = Math.max(bR_, bT);
        const fxs = ([] as (number | null)[]).concat(...col.map((q, j) => (c.ph[j].tc ? [q.S1, q.S2, q.gx] : [q.gx])))
          .filter((x): x is number => x != null && x !== gx && x > xa + 2 && x < xb - 2);
        g.push(ws(hh(yC, xa, xb, fxs), sec[i]) + ws(`M${gx} ${yF} V${yC}`, sec[i]) + dot(gx, yC) + gnd(gx, yC));
        return;
      }
      if (p.tt) {
        const tl = (x: number, yy: number, t: string) => F(x, yy, t, 7.5, 700, '#fff'), tp = (x: number, yy: number) => `<circle cx="${x}" cy="${yy}" r="3.5" fill="#FFD54F" stroke="#5D4037"/>`;
        g.push(ws(`M${gx} ${yF} V${yTa}`, sec[i]) + `<rect x="${gx - 25}" y="${yTa}" width="34" height="40" rx="5" fill="#78909C" stroke="#455A64" stroke-width="1.5"/>`
          + tl(gx, yTa + 11, 'a') + tl(bx, yTa + 11, 'b') + F(gx - 8, yTa + 24, 'TT ' + p.k, 8, 700, '#fff') + tl(gx, yTb - 4, 'A') + tl(bx, yTb - 4, 'B') + tp(gx, yTa) + tp(bx, yTa) + tp(gx, yTb) + tp(bx, yTb));
        g.push(ws(vh(gx, y, yTb), lc[i]) + dot(gx, y));
        if (c.aron) g.push(ws(`M${bx} ${yTa} V${yC}`, sec[i]) + ws(vh(bx, yL(1), yTb), lc[1]) + dot(bx, yL(1)));
        else g.push(ws(`M${bx} ${yTa} V${yC}`, RC_N) + dot(bx, yC) + `<path d="M${bx} ${yTb} V${yTb + 6}" style="stroke:${RC_G};stroke-width:1.6"/>` + gnd(bx, yTb + 6));
      } else g.push(ws(vh(gx, y, yF), sec[i]) + dot(gx, y));
      if (!p.tc) return;
      const S1 = C.S1 as number, S2 = C.S2 as number, V = C.V as number;
      const inv = find('TC con S1 y S2 invertidos', p.k), yX = yS - 22;
      g.push(`<rect x="${S1 - 12}" y="${yS}" width="${S2 - S1 + 24}" height="${yP - yS}" rx="7" fill="#5D4037" stroke="#3E2723" stroke-width="1.6"/><rect x="${S1 - 4}" y="${yS + 7}" width="${S2 - S1 + 8}" height="${yP - yS - 14}" rx="4" fill="#8D6E63"/>` + F(V, yS + 21, 'TC ' + p.k, 10, 700, '#fff')
        + `<circle cx="${S1}" cy="${yS}" r="3.5" fill="#FFD54F" stroke="#5D4037"/><circle cx="${S2}" cy="${yS}" r="3.5" fill="#FFD54F" stroke="#5D4037"/>` + T(S1 - 8, yP + 12, 'P1', 'pol', 'end') + T(S2 + 8, yP + 12, 'P2', 'pol', 'start'));
      if (inv) {
        g.push(wi(`M${S1} ${yS} V${yX + 12} L${S2} ${yX}`, sec[i]) + wi(`M${S2} ${yS} V${yX + 12} L${S1} ${yX}`, sec[i]) + irr(`M${S1} ${yX + 12} L${S2} ${yX} M${S2} ${yX + 12} L${S1} ${yX}`) + wi(`M${S1} ${yX} V${yF}`, sec[i]) + wi(`M${S2} ${yX} V${yF}`, sec[i])
          + `<text x="${S1 - 8}" y="${yS - 4}" class="pol" style="text-anchor:end;fill:${RED};font-weight:700">S2</text><text x="${S2 - 6}" y="${yS - 6}" class="pol" style="text-anchor:end;fill:${RED};font-weight:700">S1</text>`);
        mark(inv, S2 + 24, yX + 6);
      } else g.push(wi(`M${S1} ${yS} V${yF}`, sec[i]) + wi(`M${S2} ${yS} V${yF}`, sec[i]) + T(S1 - 6, yS - 6, 'S1', 'pol', 'end') + T(S2 - 6, yS - 6, 'S2', 'pol', 'end'));
      if (!(c.aron && i === 2)) g.push(`<path d="M${S2} ${yS - 8} H${S2 + 16}" style="stroke:${RC_G};stroke-width:1.6"/>` + gnd(S2 + 16, yS - 8));
    });
    {
      const pe = bX(G.bPx, 'PE', -1);
      if (pe != null) g.push(`<path d="M${pe} ${yBb} V${yB1 + 14}" style="stroke:${RC_G};stroke-width:2"/>` + gnd(pe, yB1 + 14));
    }
  }
  g.push(top.join(''));
  {
    const yy = (c.neutro ? yN : yL(c.nf - 1)) + 18;
    g.push(T(xA, yy, '← ' + (c.ind ? 'RED MT' : 'RED / ACOMETIDA'), 't4', 'start') + T(xZ, yy, 'CARGA →', 't4', 'end'));
  }
  let y = Math.max(c.neutro ? yN : yL(c.nf - 1), c.ind && !c.dir ? yTb : 0) + 46;
  const lg: string[] = [];
  let lx = 24;
  const it = (sw: (x: number) => string, t: string) => { lg.push(sw(lx) + T(lx + 32, y + 4, t, 't2', 'start')); lx += 40 + t.length * 6.4 + 12; };
  if (!c.dir) { it((x) => ws(`M${x} ${y} h26`, sec[0]), 'Tensión'); it((x) => wi(`M${x} ${y} h26`, sec[0]), 'Corriente (con franja)'); }
  if (c.neutro) it((x) => ws(`M${x} ${y} h26`, RC_N), 'Neutro');
  it((x) => `<path d="M${x} ${y} h26" style="stroke:${RC_G};stroke-width:2.4"/>`, 'Tierra');
  it((x) => `<path d="M${x} ${y} h10 a5 5 0 0 1 10 0 h6" class="w"/>`, 'Cruce sin conexión');
  g.push(lg.join(''));
  y += 18;
  if (c.aron && !c.dir) { g.push(T(24, y + 4, 'Aron: los bornes b de los dos TT se unen (común, a tierra) y dan la tensión S al bloque y al medidor.', 't2', 'start')); y += 18; }
  if (nov.length) {
    y += 6;
    nov.forEach((n, k) => {
      g.push(tri(32, y - 4, n0 + k));
      const ls = wrap(wrNovText(n), 84);
      ls.slice(0, 2).forEach((l, j) => g.push(`<text x="48" y="${y + j * 13}" class="t3 bad lft">${esc(l)}</text>`));
      y += Math.min(2, ls.length) * 13 + 6;
    });
  }
  return { g: g.join(''), y: y + 6, n: nov.length };
}
