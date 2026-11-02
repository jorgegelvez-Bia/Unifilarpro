/**
 * Exportar (fase 6): en la app real se toca "Imagen PNG" e "Informe PDF"
 * y se revisa lo que se descarga.
 */
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

async function openTemplate(page: Page, label: string) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Mis diagramas' }).click();
  await page.getByRole('button', { name: label, exact: true }).click();
}

async function grab(page: Page, button: string, dir: string) {
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: button }).click()]);
  const path = `${dir}/${dl.suggestedFilename()}`;
  await dl.saveAs(path);
  // Para mirar los archivos: EXPORT_DIR=carpeta npm run test:e2e
  if (process.env.EXPORT_DIR) await dl.saveAs(`${process.env.EXPORT_DIR}/${dl.suggestedFilename()}`);
  return { name: dl.suggestedFilename(), buf: readFileSync(path) };
}

test('Imagen PNG: escala 4×, sin pasar de ~14 millones de píxeles', async ({ page }, info) => {
  await openTemplate(page, 'Indirecta');
  const { name, buf } = await grab(page, 'Imagen PNG', info.outputDir);
  expect(name).toMatch(/^Unifilar_diagrama_\d{4}-\d{2}-\d{2}\.png$/);
  expect(buf.subarray(1, 4).toString()).toBe('PNG');
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  expect(w * h).toBeLessThanOrEqual(14e6 * 1.01);
  expect(w).toBeGreaterThanOrEqual(790 * 2);
  // Se abre la ventana para copiar o compartir.
  await expect(page.getByRole('dialog', { name: 'Imagen del diagrama' })).toBeVisible();
});

test('Informe PDF: datos del proyecto, diagrama, equipos y revisiones', async ({ page }, info) => {
  await openTemplate(page, 'Indirecta');
  const { name, buf } = await grab(page, 'Informe PDF', info.outputDir);
  expect(name).toMatch(/\.pdf$/);
  const pdf = buf.toString('latin1');
  expect(pdf.startsWith('%PDF-')).toBe(true);
  for (const t of ['Levantamiento de sistema de medida', 'Tipo de medida', 'Diagrama unifilar', 'Datos de los equipos', 'Revisiones', 'Elabor', 'Revis'])
    expect(pdf, t).toContain(t);
  expect(pdf).toMatch(/\/Subtype \/Image/);
  expect(pdf.match(/\/Type \/Page\b/g)?.length).toBeGreaterThanOrEqual(2);
});

test('la imagen exportada usa las fuentes IBM Plex (van dentro del SVG)', async ({ page }) => {
  await page.goto('/');
  const r = await page.evaluate(async () => {
    const ex = await import('/src/export/index.ts');
    const { buildSVG, LIGHT } = await import('/src/diagram/engine.ts');
    const d = { els: [], p: { nombre: 'Prueba de letra ÁÑ', frontera: 'FRT0001', fecha: '2026-11-01' } } as any;
    const plain = buildSVG(d, LIGHT);
    const full = await ex.exportSVG(d);
    const png = async (s: string) => (await ex.svgToCanvas(s, 1)).toDataURL();
    return { faces: (full.match(/@font-face/g) || []).length, same: (await png(plain)) === (await png(full)) };
  });
  expect(r.faces).toBe(7);
  // Si las fuentes no se aplicaran, las dos imágenes serían iguales (letra de reemplazo).
  expect(r.same).toBe(false);
});
