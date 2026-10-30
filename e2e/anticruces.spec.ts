/**
 * Prueba anti-cruces (§5.5): 1.000 diagramas al azar, 0 choques.
 *  1. ningún texto se monta sobre otro;
 *  2. ningún texto se monta sobre un símbolo;
 *  3. ninguna línea o barra cruza por dentro de un símbolo (salvo la principal por su centro);
 *  4. ningún borde de caja punteada corta un texto.
 */
import { expect, test } from '@playwright/test';

const TOTAL = Number(process.env.ANTICRUCES_N || 1000);
const STEP = 250;
/** Otra semilla = otros 1.000 diagramas (ANTICRUCES_SEED=1 npm run test:e2e). */
const SEED = process.env.ANTICRUCES_SEED ? Number(process.env.ANTICRUCES_SEED) : undefined;

test.beforeEach(async ({ page }) => {
  await page.goto('/e2e/harness.html');
  await page.waitForFunction(() => !!document.body.dataset.ready);
  expect(await page.evaluate(() => document.body.dataset.ready), 'las fuentes IBM Plex deben cargar').toBe('1');
});

test('el revisor sí detecta choques', async ({ page }) => {
  const n = await page.evaluate(async () => {
    const { findCollisions } = await import('/e2e/collisions.ts');
    const host = document.getElementById('host')!;
    host.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200">
      <text x="10" y="20" style="font:12px sans-serif">Texto uno</text>
      <text x="14" y="22" style="font:12px sans-serif">Texto dos</text>
      <rect x="100" y="60" width="40" height="40" class="s" style="fill:#fff;stroke:#000"/>
      <line x1="80" y1="70" x2="160" y2="90" class="w" style="stroke:#000"/>
      <rect x="180" y="10" width="60" height="30" class="cel" style="fill:none;stroke:#000"/>
      <text x="170" y="30" style="font:12px sans-serif">cortado</text>
    </svg>`;
    return findCollisions(host.querySelector('svg')!).map((c) => c.kind);
  });
  expect(n).toEqual(expect.arrayContaining(['texto/texto', 'línea/símbolo', 'caja/texto']));
});

test(`${TOTAL} diagramas al azar sin choques`, async ({ page }) => {
  test.setTimeout(10 * 60_000);
  const fails: unknown[] = [];
  for (let i = 0; i < TOTAL; i += STEP) {
    const f = await page.evaluate(([a, b, s]) => (window as any).runAntiCruces(a, b, s), [i, Math.min(TOTAL, i + STEP), SEED] as const);
    fails.push(...f);
  }
  // Si falla, el mensaje dice qué diagrama (número i) y qué se montó con qué.
  expect(fails, JSON.stringify(fails.slice(0, 5), null, 1)).toHaveLength(0);
});
