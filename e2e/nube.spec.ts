/**
 * Fase 9: entrar con el correo y sincronizar con Supabase.
 * La "nube" es de mentira: la prueba responde las peticiones que la app le haría a Supabase,
 * con la misma regla del SQL (gana el cambio más reciente).
 */
import { expect, test, type Page, type Route } from '@playwright/test';

const APP = 'http://localhost:5300/';
const USER = { id: '11111111-1111-1111-1111-111111111111', email: 'jorge@ejemplo.com', aud: 'authenticated', role: 'authenticated' };
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
const TOKEN = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: USER.id, email: USER.email, aud: 'authenticated', role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.firma`;

interface Row { owner: string; id: string; data: any; updated: number; deleted: boolean; server_updated: string }

/** Supabase de mentira: auth (correo + código) y la tabla diagrams. */
async function fakeSupabase(page: Page) {
  const rows = new Map<string, Row>();
  const log: { otp: any[]; pushes: any[][] } = { otp: [], pushes: [] };
  let clock = 0;
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': '*' };
  const json = (route: Route, body: unknown, status = 200) => route.fulfill({ status, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const put = (r: Omit<Row, 'server_updated'>) => {
    const old = rows.get(r.id);
    if (old && r.updated < old.updated) return;
    rows.set(r.id, { ...r, server_updated: new Date(Date.UTC(2026, 10, 4) + ++clock * 1000).toISOString() });
  };
  await page.route('http://supabase.test/**', async (route) => {
    const req = route.request(), url = new URL(req.url());
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (url.pathname === '/auth/v1/otp') { log.otp.push(req.postDataJSON()); return json(route, {}); }
    if (url.pathname === '/auth/v1/verify') {
      const b = req.postDataJSON();
      if (b.token !== '123456') return json(route, { code: 403, error_code: 'otp_expired', msg: 'Token has expired or is invalid' }, 403);
      return json(route, { access_token: TOKEN, token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r1', user: USER });
    }
    if (url.pathname === '/auth/v1/user') return json(route, USER);
    if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204, headers: cors });
    if (url.pathname === '/rest/v1/diagrams') {
      expect(req.headers()['authorization']).toBe(`Bearer ${TOKEN}`);
      if (req.method() === 'POST') {
        const body = req.postDataJSON() as Row[];
        log.pushes.push(body);
        body.forEach(put);
        return route.fulfill({ status: 201, headers: cors });
      }
      const since = (url.searchParams.get('server_updated') || 'gt.').slice(3);
      const list = [...rows.values()].filter((r) => r.server_updated > since).sort((a, b) => a.server_updated.localeCompare(b.server_updated));
      return json(route, list.map(({ id, data, updated, deleted, server_updated }) => ({ id, data, updated, deleted, server_updated })));
    }
    return json(route, { msg: 'no esperado: ' + url.pathname }, 404);
  });
  return { rows, log, put };
}

const diagram = (id: string, nombre: string, updated: number) => ({ id, updated, els: [{ id: 'm', t: 'medidor', f: {} }], p: { nombre, frontera: '', fecha: '2026-11-04', elaboro: '', idp: '', nic: '', tipoPunto: '' } });

test('entrar con el correo y sincronizar en los dos sentidos', async ({ page, context }) => {
  const cloud = await fakeSupabase(page);
  cloud.put({ owner: USER.id, id: 'pc1', data: diagram('pc1', 'Hecho en el PC', 5), updated: 5, deleted: false });

  await page.goto(APP);
  // Sin sesión: se trabaja igual, guardado en el celular.
  await expect(page.getByText('Sin sesión · guardado en el celular')).toBeVisible();
  await page.getByRole('button', { name: 'Mis diagramas' }).click();
  await page.getByRole('button', { name: 'Directa', exact: true }).click();
  await page.getByLabel('Proyecto / cliente').fill('Hecho en el celular');

  // Entrar: correo → código de 6 dígitos.
  await page.getByRole('button', { name: 'Mis diagramas' }).click();
  await page.getByLabel('Correo').fill('jorge@ejemplo.com');
  await page.getByRole('button', { name: 'Enviarme el acceso' }).click();
  await expect(page.getByText(/Te enviamos un correo/)).toBeVisible();
  expect(cloud.log.otp[0]).toMatchObject({ email: 'jorge@ejemplo.com', create_user: false });
  await page.getByLabel('Código del correo').fill('000000');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByText('El código no es válido o ya venció. Pide uno nuevo.')).toBeVisible();
  await page.getByLabel('Código del correo').fill('123456');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByText('Conectado como')).toBeVisible();
  await expect(page.getByText('✔ Sincronizado').first()).toBeVisible({ timeout: 10_000 });

  // Subió lo del celular (a nombre de Jorge) y bajó lo del PC.
  const mine = [...cloud.rows.values()].find((r) => r.data?.p.nombre === 'Hecho en el celular')!;
  expect(mine.owner).toBe(USER.id);
  await expect(page.getByText('Hecho en el PC')).toBeVisible();

  // Sin internet: el cambio queda pendiente y se sube solo al volver la señal.
  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await page.getByLabel('Proyecto / cliente').fill('Editado sin señal');
  await expect(page.getByText('Sin internet · 1 por subir').first()).toBeVisible();
  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(page.getByText('✔ Sincronizado').first()).toBeVisible({ timeout: 10_000 });
  expect(cloud.rows.get(mine.id)!.data.p.nombre).toBe('Editado sin señal');

  // Borrar también llega a la nube (como marca, para avisar a los otros equipos).
  await page.getByRole('button', { name: 'Borrar' }).last().click();
  await page.getByRole('button', { name: '¿Seguro? Toca de nuevo' }).click();
  await expect.poll(() => [...cloud.rows.values()].filter((r) => r.deleted).length, { timeout: 10_000 }).toBe(1);

  // Salir.
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page.getByRole('button', { name: 'Enviarme el acceso' })).toBeVisible();
});
