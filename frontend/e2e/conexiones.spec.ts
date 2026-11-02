/**
 * Diagrama de conexiones (fase 7) en la app real: se agrega, propone el tipo según el unifilar,
 * se marca una novedad y esta sale en el dibujo y en Revisiones.
 */
import { expect, test } from '@playwright/test';
import { writeFileSync } from 'node:fs';

test('agregar diagrama de conexiones con una novedad', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Mis diagramas' }).click();
  await page.getByRole('button', { name: 'Indirecta', exact: true }).click();
  await page.getByRole('button', { name: /^Diagrama de conexiones/ }).click();

  // Se abre solo y propone el tipo según el unifilar (hay TT y TC → indirecta).
  const tipo = page.getByLabel('Tipo de conexión');
  await expect(tipo).toHaveValue('Indirecta trifásica (3 TC + 3 TT)');
  await expect(page.locator('svg text', { hasText: 'DIAGRAMA DE CONEXIONES' })).toBeVisible();

  // Buscar la marca con la lupa.
  await page.getByLabel('Buscar medidor principal (marca y modelo)').fill('sl7');
  await page.getByRole('button', { name: 'Itron SL7000' }).click();
  await expect(page.getByLabel('Medidor principal (marca y modelo)', { exact: true })).toHaveValue('Itron SL7000');

  // Novedad: TC con S1 y S2 invertidos en la fase S.
  await page.getByRole('button', { name: '+ Agregar novedad' }).click();
  await page.locator('[id^="nv_"]').selectOption('TC con S1 y S2 invertidos');
  await page.locator('[id^="nvf_"]').selectOption('S');
  await expect(page.getByText('Irregularidad 1 (cableado): TC con S1 y S2 invertidos — fase S.')).toBeVisible();
  await expect(page.locator('svg text.t3.bad', { hasText: 'TC con S1 y S2 invertidos — fase S' })).toBeVisible();

  // Aron: aparece la opción de los retornos S2.
  await tipo.selectOption('Indirecta Aron (2 TC + 2 TT)');
  await expect(page.getByLabel('Retornos S2 de los TC (Aron) puenteados')).toBeVisible();
  await expect(page.locator('svg text', { hasText: 'Puente S2' })).toBeVisible();
  // En Aron la fase S no tiene TC: esa novedad deja de contar. Se cambia a la fase T.
  await expect(page.getByText(/\(cableado\)/)).toHaveCount(0);
  await page.locator('[id^="nvf_"]').selectOption('T');
  await expect(page.getByText('Irregularidad 1 (cableado): TC con S1 y S2 invertidos — fase T.')).toBeVisible();
  // Para mirar el dibujo: EXPORT_DIR=carpeta npm run test:e2e
  if (process.env.EXPORT_DIR) {
    const png = await page.evaluate(async () => {
      const { useStore } = await import('/src/store/diagram.ts');
      const ex = await import('/src/export/index.ts');
      return (await ex.svgToCanvas(await ex.exportSVG(useStore.getState().cur), 1.5)).toDataURL().split(',')[1];
    });
    writeFileSync(`${process.env.EXPORT_DIR}/conexiones_aron.png`, Buffer.from(png, 'base64'));
  }
});
