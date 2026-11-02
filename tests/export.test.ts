import { describe, expect, it } from 'vitest';
import { equipmentRows, fitScale, fname, MAX_PX, pdfTxt, projectRows } from '@/export';
import { withFonts } from '@/export/fonts';
import { newDiagram } from '@/store/diagram';

describe('exportar', () => {
  it('escala 4× sin pasar de ~14 millones de píxeles', () => {
    expect(fitScale(790, 800, 4)).toBe(4);
    const s = fitScale(790, 3000, 4);
    expect(s).toBeLessThan(4);
    expect(790 * s * 3000 * s).toBeCloseTo(MAX_PX, -3);
    expect(fitScale(5000, 9000, 4)).toBe(1); // nunca más pequeña que el original
  });

  it('nombre del archivo con la frontera (o el cliente) y la fecha', () => {
    const d = newDiagram('vacio');
    d.p.fecha = '2026-11-01';
    expect(fname(d, 'png')).toBe('Unifilar_diagrama_2026-11-01.png');
    d.p.nombre = 'Panadería Ñuñoa / bodega';
    expect(fname(d, 'pdf')).toBe('Unifilar_Panadería_Ñuñoa_bodega_2026-11-01.pdf');
    d.p.frontera = 'FRT1234 CO0500001234';
    expect(fname(d, 'pdf')).toBe('Unifilar_FRT1234_CO0500001234_2026-11-01.pdf');
  });

  it('cambia los símbolos que la letra del PDF no tiene', () => {
    expect(pdfTxt('√3 · 10 Ω ≤ 2×5 ≥ 1 — ok ✔')).toBe('raíz3 · 10 ohm <= 2x5 >= 1 — ok ');
    expect(pdfTxt(undefined)).toBe('');
  });

  it('tablas del PDF', () => {
    const d = newDiagram('indirecta');
    expect(projectRows(d).map((r) => r[0])).toEqual(['Proyecto / cliente', 'Código de la frontera', 'Tipo de medida', 'Potencia instalada']);
    expect(projectRows(d)[2][1]).toBe('Indirecta');
    const rows = equipmentRows(d);
    expect(rows).toHaveLength(d.els.length);
    expect(rows[0]).toEqual(['1', 'Red', 'MT · 13.2 kV', 'Bueno', '']);
  });

  it('las fuentes van dentro del <style> del SVG', () => {
    expect(withFonts('<svg><style>.a{}</style></svg>', '@font-face{}')).toBe('<svg><style>@font-face{}.a{}</style></svg>');
  });
});
