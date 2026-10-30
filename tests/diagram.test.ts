/** Motor de dibujo: que dibuje cada elemento y los casos principales sin fallar. */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { TYPES } from '@/catalog';
import { fillDefaults } from '@/checks';
import { buildSVG } from '@/diagram/engine';
import { mk } from '@/store/diagram';
import type { DiagramLike, Element } from '@/types';

const D = (els: Element[], p = {}): DiagramLike => fillDefaults({ els, p: { nombre: 'Prueba', frontera: 'FRT123', ...p } });
const svgWidth = (s: string) => Number(/width="(\d+)"/.exec(s)![1]);

describe('motor de dibujo', () => {
  it('dibuja un diagrama vacío con el rótulo', () => {
    const s = buildSVG(D([]));
    expect(s.startsWith('<svg')).toBe(true);
    expect(s).toContain('Agrega elementos con los botones para empezar.');
    expect(s).toContain('PROYECTO / CLIENTE');
    expect(s).toContain('FRT123');
  });

  it.each(Object.keys(TYPES).filter((t) => !['conex', 'fasor'].includes(t)))('dibuja %s sin fallar', (t) => {
    const s = buildSVG(D([mk('red'), mk(t), mk('carga')]));
    expect(s).toContain('</svg>');
    expect(s).not.toContain('undefined');
    expect(s).not.toContain('NaN');
  });

  it('medida indirecta: secundarios al bloque y al medidor dentro del gabinete', () => {
    const s = buildSVG(D([mk('red'), mk('tt'), mk('tc'), mk('bloque'), mk('medidor'), mk('gabinete', { material: 'Metálico' })]));
    expect(s).toContain('class="wi"'); // circuito de corriente
    expect(s).toContain('class="wv"'); // circuito de tensión
    expect(s).toContain('Bloque de');
    expect(s).toContain('Medidor principal');
    expect(s).toContain('>GABINETE<');
    expect(s).toContain('>METÁLICO<');
    expect(s).toContain('>Indirecta<');
  });

  it('gabinete sin material dice solo "GABINETE"', () => {
    const s = buildSVG(D([mk('red'), mk('medidor'), mk('gabinete')]));
    expect(s).toContain('>GABINETE<');
  });

  it('bloque principal y respaldo con nota serie / paralelo', () => {
    const s = buildSVG(D([mk('red'), mk('tc'), mk('bloque'), mk('bloquer'), mk('medidor'), mk('respaldo')]));
    expect(s).toContain('serie / paralelo');
    expect(s).toContain('Medidor de respaldo');
  });

  it('celda con equipos marcados', () => {
    const tt = mk('tt'), tc = mk('tc');
    const s = buildSVG(D([mk('red'), { ...mk('celda', { nivel: 'MT' }), f: { ...mk('celda').f, nivel: 'MT', incl: [tt.id, tc.id] } }, tt, tc, mk('bloque'), mk('medidor')]));
    expect(s).toContain('CELDA MT');
  });

  it('doble circuito con transferencia y nombres', () => {
    const s = buildSVG(D([mk('doble', { nombre1: 'Toledo', nombre2: 'Pamplona' }), mk('fus'), mk('transc', { tipo: 'Automática' }), mk('trafo')]));
    expect(s).toContain('Toledo');
    expect(s).toContain('Pamplona');
    expect(s).toContain('ATS');
    expect(s).toContain('Celda de transferencia');
  });

  it('varios trafos abren ramales y el lienzo crece', () => {
    const t = mk('trafo', { cantidad: '3', potencia: '75', potencia2: '112.5', potencia3: '150', med1: 'Directa', med2: 'Semidirecta', med3: 'Indirecta' });
    const kids = [1, 2, 3].map((k) => ({ ...mk('medidor'), rama: k }));
    const s = buildSVG(D([mk('red'), mk('fus'), t, ...kids]));
    expect(s).toContain('Trafo 1');
    expect(s).toContain('Trafo 3');
    expect(s).toContain('class="tk3"');
    expect(svgWidth(s)).toBeGreaterThan(790);
  });

  it('varios totalizadores', () => {
    const s = buildSVG(D([mk('red', { nivel: 'BT' }), mk('barraje'), mk('breaker', { cantidad: '2', med1: 'Directa', med2: 'Directa' })]));
    expect(s).toContain('Breaker Tot. 1');
    expect(s).toContain('Breaker Tot. 2');
  });

  it('irregularidad con triángulo numerado y lista al final', () => {
    const m = mk('medidor');
    const s = buildSVG(D([mk('red'), m, mk('irreg', { tipo: 'Puente que salta el medidor', en: m.id, fase: 'R' })]));
    expect(s).toContain('IRREGULARIDADES');
    expect(s).toContain('class="trit">1<');
  });

  it('equipo dañado: marca "!" y leyenda', () => {
    const s = buildSVG(D([mk('red'), mk('dps', { estado: 'Dañado', malos: '1', buenos: '2' })]));
    expect(s).toContain('1 DAÑADO');
    expect(s).toContain('>Dañado<');
  });

  it('valores "Sin indicar" no se escriben', () => {
    const s = buildSVG(D([mk('red'), mk('acom'), mk('medidor')]));
    expect(s).not.toContain('Sin indicar');
    expect(s).not.toContain('Sin especificar');
  });

  it('código de colores RETIE en la leyenda', () => {
    expect(buildSVG(D([mk('red'), mk('trafo')]))).toContain('CÓDIGO DE COLORES RETIE');
  });
});

describe('casos compartidos', () => {
  const DIR = path.resolve(__dirname, '../../shared/test-cases');
  it.each(readdirSync(DIR).filter((f) => f.endsWith('.json')))('%s se dibuja', (file) => {
    const data = JSON.parse(readFileSync(path.join(DIR, file), 'utf-8'));
    const s = buildSVG(fillDefaults({ ...data.diagram, p: {} }));
    expect(s).toContain('TIPO DE MEDIDA');
    expect(s).toContain(`>${data.expect.meterType}<`);
  });
});
