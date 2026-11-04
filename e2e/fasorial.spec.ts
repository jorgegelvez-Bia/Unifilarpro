/**
 * Diagrama fasorial (fase 8) en la app real: se agrega, se llenan los datos medidos,
 * y los avisos salen en el dibujo y en Revisiones.
 */
import { expect, test } from '@playwright/test';
import { writeFileSync } from 'node:fs';

test('fasorial con una fase sin tensión y un TC invertido', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Mis diagramas' }).click();
  await page.getByRole('button', { name: 'Semidirecta', exact: true }).click();
  await page.getByRole('button', { name: /^Diagrama fasorial/ }).click();

  // Se abre solo, trifásico y secuencia positiva.
  await expect(page.getByLabel('Sistema')).toHaveValue('Trifásico');
  await expect(page.locator('svg text', { hasText: 'DIAGRAMA FASORIAL' })).toBeVisible();
  // La casilla del ángulo de cada tensión muestra el normal del sistema.
  await expect(page.getByLabel('∠VS (°)')).toHaveAttribute('placeholder', '120');

  const fill = async (k: string, v: string) => page.locator(`[id$="_${k}"]`).fill(v);
  await fill('V0', '121'); await fill('I0', '2,5'); await fill('A0', '25');
  await fill('V1', '0'); await fill('I1', '2.4'); await fill('A1', '20');
  await fill('V2', '120'); await fill('I2', '2.6'); await fill('A2', '200');

  await expect(page.getByText('Fasorial · Fase S: sin tensión (revisar cuchilla, fusible o cable de tensión).')).toBeVisible();
  await expect(page.getByText('Fasorial · Fase T: corriente invertida (-160°): posible TC con S1/S2 invertidos.')).toBeVisible();
  await expect(page.locator('svg text.t3.bad', { hasText: 'Fase T: corriente invertida' })).toBeVisible();
  // Tabla: P de la fase R = 121 × 2.5 × cos 25° / 1000.
  await expect(page.locator('svg text', { hasText: '0.274' }).first()).toBeVisible();

  // Con factor de potencia aparece Ind/Cap.
  await page.getByLabel('¿Cómo escribes el desfase?').selectOption('Factor de potencia');
  await expect(page.locator('[id$="_C0"]')).toBeVisible();

  if (process.env.EXPORT_DIR) {
    await page.getByLabel('¿Cómo escribes el desfase?').selectOption('Ángulo en grados');
    const png = await page.evaluate(async () => {
      const { useStore } = await import('/src/store/diagram.ts');
      const ex = await import('/src/export/index.ts');
      return (await ex.svgToCanvas(await ex.exportSVG(useStore.getState().cur), 1.5)).toDataURL().split(',')[1];
    });
    writeFileSync(`${process.env.EXPORT_DIR}/fasorial.png`, Buffer.from(png, 'base64'));
  }
});
