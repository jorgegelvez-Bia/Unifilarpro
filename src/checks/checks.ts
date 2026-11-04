/** Copia de backend/app/rules/checks.py (revisiones del diagrama, texto exacto). */
import { TYPES } from '@/catalog';
import type { CheckItem, DiagramLike } from '@/types';
import { NF, brName, fv, jsFloat, jsInt, jsNumber, multiT, numTxt, rama, trN } from './common';
import { fuseFor } from './fuse';
import { fsWarn } from './phasor';
import { summary } from './summary';
import { wrNovText, wrNovs } from './wiring';

export const OK_TEXT = 'Sin observaciones. El diagrama tiene los elementos básicos para el tipo de medida.';

export function checks(d: DiagramLike): CheckItem[] {
  const els = d.els;
  if (!els.length) return [];
  const out: CheckItem[] = [];
  const bad = (text: string) => out.push({ level: 'bad', text });
  const warn = (text: string) => out.push({ level: 'warn', text });
  const has = (t: string) => els.some((e) => e.t === t);
  const idx = (t: string) => els.findIndex((e) => e.t === t);

  els.filter((e) => e.t === 'irreg').forEach((e, k) => bad(`Irregularidad ${k + 1}: ${summary(e, d)}.`));
  els.filter((e) => e.t === 'fasor').forEach((c) => fsWarn(c).forEach((w) => bad('Fasorial · ' + w)));
  {
    let k = els.filter((e) => e.t === 'irreg').length;
    els.filter((e) => e.t === 'conex').forEach((c) => wrNovs(c, d).forEach((n) => bad(`Irregularidad ${++k} (cableado): ${wrNovText(n)}.`)));
  }

  for (const e of els) {
    if (fv(e, 'estado') !== 'Dañado') continue;
    const obs = fv(e, 'obs');
    const malos = jsNumber(fv(e, 'malos'));
    if (e.t === 'dps' && malos && malos > 0)
      bad(`DPS: ${fv(e, 'malos')} ${malos === 1 ? 'dañado' : 'dañados'} y ${fv(e, 'buenos')} en buen estado${obs ? ' (' + obs + ')' : ''}.`);
    else bad(`${TYPES[e.t].name} dañado${obs ? ': ' + obs : ''}.`);
  }
  for (const e of els) {
    if (fv(e, 'estado') === 'Por revisar') {
      const obs = fv(e, 'obs');
      warn(`${TYPES[e.t].name} por revisar${obs ? ': ' + obs : ''}.`);
    }
  }

  const red = els.find((e) => e.t === 'red');
  const fases = red ? NF[fv(red, 'fases')] || 3 : 3;

  const T = multiT(d);
  if (T) {
    const n = trN(T);
    for (let k = 1; k <= n; k++) {
      const m = fv(T, `med${k}`);
      const be = els.filter((e) => Math.min(n, rama(e)) === k);
      const bh = (t: string) => be.some((e) => e.t === t);
      if (m && m !== 'Sin indicar' && m !== 'Solo carga' && !bh('medidor'))
        warn(`${brName(T, k)}: indicaste medida ${m.toLowerCase()} pero todavía no tiene medidor.`);
      if (m === 'Semidirecta' && !bh('tc')) warn(`${brName(T, k)}: la medida semidirecta lleva TC.`);
      if (m === 'Indirecta' && (!bh('tc') || !bh('tt'))) warn(`${brName(T, k)}: la medida indirecta lleva TC y TT.`);
    }
  }

  if (
    has('tc') && red && fv(red, 'nivel') === 'MT' && !has('tt') &&
    els.some((e, i) => e.t === 'tc' && !(rama(e) > 0) && !(has('trafo') && i > idx('trafo')))
  )
    warn('La red es MT y hay TC sin TT: en MT la medida es indirecta y necesita TT.');
  if (has('tt') && !has('tc')) warn('Hay TT pero no TC: la medida indirecta usa ambos.');
  if ((has('tc') || has('tt')) && !has('bloque') && !has('bloquer'))
    warn('No hay bloque de pruebas entre los transformadores de medida y el medidor. Revísalo con el Código de Medida (CREG 038 de 2014).');
  if (red && NF[fv(red, 'fases')]) {
    for (const e of els) {
      if (e.t !== 'tc' && e.t !== 'tt') continue;
      const n = jsNumber(fv(e, 'cantidad'));
      if (n && n !== fases)
        warn(`${TYPES[e.t].short}: hay ${numTxt(n)} y el sistema es ${fv(red, 'fases').toLowerCase()} (${fases} fase${fases > 1 ? 's' : ''}).`);
    }
  }

  if (has('otros') && has('tc') && idx('otros') > idx('tc'))
    warn('Hay otros usuarios conectados después de los TC: su consumo quedaría registrado en este medidor.');
  if (has('otros') && !has('tc') && has('medidor') && idx('otros') > idx('medidor'))
    warn('Hay otros usuarios conectados después del medidor: su consumo quedaría registrado en este medidor.');

  for (const e of els) {
    if (e.t !== 'trafo') continue;
    const n = jsInt(fv(e, 'cantidad')) || 1;
    if (n > 1 && fv(e, 'configuracion') === 'Banco de monofásicos' && red && NF[fv(red, 'fases')] === 3 && n !== 3 && n !== 2)
      warn(`Transformador: un banco para sistema trifásico suele ser de 3 monofásicos (o 2 en delta abierta) y tienes ${n}.`);
  }

  const r = fuseFor(d);
  if (r) {
    els.forEach((e, i) => {
      if (e.t !== 'fus' || i > r.ti || fv(e, 'criterio') !== 'Manual') return;
      const a = jsFloat(fv(e, 'corriente').replace(',', '.'));
      if (a && (a < 1.3 * r.In - 0.01 || a > 2 * r.In + 0.5) && a !== r.amp)
        warn(
          `Cortacircuitos: fusible de ${numTxt(a)} A y para ${numTxt(r.unit)} kVA${r.mono ? ' monofásico' : ''} se sugiere ${numTxt(r.amp)} A tipo K (${r.src}).`,
        );
    });
  }

  if (has('bloquer') && !has('bloque')) warn('Hay bloque de pruebas de respaldo sin el bloque de pruebas principal.');
  if (has('bloquer') && !has('respaldo')) warn('Hay bloque de pruebas de respaldo pero no hay medidor de respaldo.');
  if (has('gabinete') && !['medidor', 'mdir', 'respaldo', 'testigo', 'bloque', 'bloquer'].some(has))
    warn('Hay gabinete de medida pero no hay medidor ni bloque de pruebas.');
  if (has('planta') && !has('transfer')) warn('Hay planta de emergencia sin transferencia.');

  const tc = els.find((e) => e.t === 'tc');
  const br = els.find((e) => e.t === 'breaker');
  if (tc && br && has('trafo') && idx('tc') > idx('trafo')) {
    const ip = jsFloat(fv(tc, 'relacion').split('/')[0]);
    const ib = jsFloat(fv(br, 'corriente'));
    if (ip && ib && ib > ip * 1.2) warn(`El totalizador (${numTxt(ib)} A) supera en más de 20% la corriente primaria del TC (${numTxt(ip)} A).`);
  }

  if (!out.length) out.push({ level: 'ok', text: OK_TEXT });
  return out;
}
