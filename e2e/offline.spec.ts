/**
 * Fase 9: guardado en el celular (IndexedDB) y app instalable que abre sin internet.
 * Usa la app ya construida (vite preview), como queda en el celular.
 */
import { expect, test } from '@playwright/test';

const APP = 'http://localhost:4299/';
const KEY = 'unifilarpro-medida';

test('lo guardado sigue ahí al recargar (IndexedDB)', async ({ page }) => {
  await page.goto(APP);
  await page.getByRole('button', { name: 'Mis diagramas' }).click();
  await page.getByRole('button', { name: 'Directa', exact: true }).click();
  await page.getByLabel('Proyecto / cliente').fill('Panadería La Espiga');
  await expect(page.getByText('Guardado en el celular')).toBeVisible();
  await page.waitForTimeout(300); // la escritura en IndexedDB es asíncrona
  await page.reload();
  await expect(page.getByLabel('Proyecto / cliente')).toHaveValue('Panadería La Espiga');
  // Quedó en IndexedDB, no en localStorage.
  expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBeNull();
});

test('los diagramas de antes (localStorage) pasan solos a IndexedDB', async ({ page }) => {
  const viejo = { state: { cur: { id: 'v1', p: { nombre: 'Diagrama viejo', frontera: '', fecha: '2026-10-01', elaboro: '', idp: '', nic: '', tipoPunto: '' }, els: [{ id: 'e1', t: 'medidor', f: {} }], updated: 1 }, diagrams: [], closedGroups: [] }, version: 0 };
  await page.goto(APP);
  await page.evaluate(async ([k, v]) => {
    localStorage.setItem(k as string, JSON.stringify(v));
    await new Promise<void>((res) => { const r = indexedDB.deleteDatabase('keyval-store'); r.onsuccess = r.onerror = r.onblocked = () => res(); });
  }, [KEY, viejo] as const);
  await page.reload();
  await expect(page.getByLabel('Proyecto / cliente')).toHaveValue('Diagrama viejo');
  await page.getByLabel('Proyecto / cliente').fill('Diagrama viejo (editado)');
  await page.waitForTimeout(300);
  expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBeNull();
  await page.reload();
  await expect(page.getByLabel('Proyecto / cliente')).toHaveValue('Diagrama viejo (editado)');
});

test('la app abre y funciona sin internet', async ({ page, context }) => {
  await page.goto(APP);
  // Espera a que la app quede guardada en el celular (service worker activo y controlando).
  await page.waitForFunction(async () => !!(await navigator.serviceWorker.ready) && !!navigator.serviceWorker.controller, null, { timeout: 30_000 }).catch(async () => {
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 30_000 });
  });
  const manifest = await page.evaluate(async () => (await fetch('/manifest.webmanifest')).json());
  expect(manifest).toMatchObject({ name: 'UnifilarPro Medida', display: 'standalone', lang: 'es-CO' });

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Mis diagramas' })).toBeVisible();
  // Se puede trabajar: agregar elementos y ver el dibujo con su letra.
  await page.getByRole('button', { name: 'Mis diagramas' }).click();
  await page.getByRole('button', { name: 'Indirecta', exact: true }).click();
  await expect(page.locator('svg text', { hasText: 'Medidor principal' }).first()).toBeVisible();
  expect(await page.evaluate(() => document.fonts.check('600 12px "IBM Plex Sans Condensed"'))).toBe(true);
  // Y exportar el PDF (el generador también queda guardado).
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Informe PDF' }).click()]);
  expect(dl.suggestedFilename()).toMatch(/\.pdf$/);
  await context.setOffline(false);
});
