/**
 * Prueba el SQL de supabase/migrations en un PostgreSQL real (PGlite, corre dentro de Node).
 * Se imitan las piezas de Supabase que usa: el rol `authenticated`, auth.users, auth.uid() y auth.jwt().
 */
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

const SQL = readFileSync(new URL('../../supabase/migrations/0001_diagrams.sql', import.meta.url), 'utf8');
const JORGE = '11111111-1111-1111-1111-111111111111', ANA = '22222222-2222-2222-2222-222222222222';

const SUPABASE_STUB = `
create role authenticated nologin;
create role anon nologin;
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
grant usage on schema auth to authenticated;
grant execute on all functions in schema auth to authenticated;
insert into auth.users values ('${JORGE}', 'jorge@ejemplo.com'), ('${ANA}', 'ana@ejemplo.com');
`;

let db: PGlite;
/** Corre `q` como el usuario indicado (igual que una petición de la app con su sesión). */
async function as<T = any>(user: string, email: string, q: string, params: readonly unknown[] = []) {
  await db.exec(`select set_config('request.jwt.claim.sub', '${user}', false), set_config('request.jwt.claims', '{"sub":"${user}","email":"${email}"}', false); set role authenticated;`);
  try {
    return (await db.query<T>(q, [...params])).rows;
  } finally {
    await db.exec('reset role;');
  }
}
const upsert = (id: string, updated: number, nombre: string, deleted = false) => [
  `insert into public.diagrams (owner, id, data, updated, deleted) values (auth.uid(), $1, $2, $3, $4)
   on conflict (owner, id) do update set data = excluded.data, updated = excluded.updated, deleted = excluded.deleted`,
  [id, deleted ? null : { id, p: { nombre } }, updated, deleted],
] as const;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUB);
  await db.exec(SQL.replace('TU_CORREO@ejemplo.com', 'jorge@ejemplo.com'));
  // Supabase da permisos sobre todas las tablas de public a los usuarios; el SQL debe quitarlos donde no van.
  await db.exec('grant usage on schema public to authenticated; grant select, insert, update, delete on all tables in schema public to anon, authenticated;');
  await db.exec(SQL.replace('TU_CORREO@ejemplo.com', 'jorge@ejemplo.com')); // se puede correr dos veces
});

describe('SQL de Supabase', () => {
  it('Jorge guarda y lee sus diagramas', async () => {
    await as(JORGE, 'jorge@ejemplo.com', ...upsert('a', 100, 'Planta'));
    const r = await as(JORGE, 'jorge@ejemplo.com', 'select id, updated, data from public.diagrams');
    expect(r).toEqual([{ id: 'a', updated: 100, data: { id: 'a', p: { nombre: 'Planta' } } }]);
  });

  it('gana el más reciente: un cambio viejo no pisa uno nuevo', async () => {
    const t0 = (await as(JORGE, 'jorge@ejemplo.com', 'select server_updated from public.diagrams where id = $1', ['a']))[0].server_updated;
    await as(JORGE, 'jorge@ejemplo.com', ...upsert('a', 300, 'nuevo'));
    await as(JORGE, 'jorge@ejemplo.com', ...upsert('a', 200, 'viejo'));
    const r = await as(JORGE, 'jorge@ejemplo.com', 'select updated, data, server_updated from public.diagrams where id = $1', ['a']);
    expect(r[0].updated).toBe(300);
    expect(r[0].data.p.nombre).toBe('nuevo');
    expect(+r[0].server_updated).toBeGreaterThan(+t0);
  });

  it('el borrado queda como marca', async () => {
    await as(JORGE, 'jorge@ejemplo.com', ...upsert('b', 50, 'x'));
    await as(JORGE, 'jorge@ejemplo.com', ...upsert('b', 60, '', true));
    const r = await as(JORGE, 'jorge@ejemplo.com', 'select deleted, data from public.diagrams where id = $1', ['b']);
    expect(r).toEqual([{ deleted: true, data: null }]);
  });

  it('un correo sin acceso no ve ni guarda nada', async () => {
    expect(await as(ANA, 'ana@ejemplo.com', 'select * from public.diagrams')).toEqual([]);
    await expect(as(ANA, 'ana@ejemplo.com', ...upsert('c', 1, 'x'))).rejects.toThrow(/row-level security/);
    // La lista de correos tampoco se puede leer desde la app.
    await expect(as(JORGE, 'jorge@ejemplo.com', 'select * from public.allowed_users')).rejects.toThrow(/permission denied/);
  });

  it('nadie puede escribir a nombre de otro', async () => {
    await expect(as(JORGE, 'jorge@ejemplo.com', `insert into public.diagrams (owner, id, data, updated) values ('${ANA}', 'z', null, 1)`)).rejects.toThrow(/row-level security/);
  });

  it('al darle acceso a otra persona, solo ve lo suyo', async () => {
    await db.exec(`insert into public.allowed_users (email) values ('ana@ejemplo.com')`);
    await as(ANA, 'ana@ejemplo.com', ...upsert('a', 10, 'de Ana')); // mismo id que Jorge, otro dueño
    expect((await as(ANA, 'ana@ejemplo.com', 'select data from public.diagrams')).map((r) => r.data.p.nombre)).toEqual(['de Ana']);
    expect((await as(JORGE, 'jorge@ejemplo.com', "select data from public.diagrams where id = 'a'"))[0].data.p.nombre).toBe('nuevo');
    // Al quitarle el acceso deja de ver.
    await db.exec(`delete from public.allowed_users where email = 'ana@ejemplo.com'`);
    expect(await as(ANA, 'ana@ejemplo.com', 'select * from public.diagrams')).toEqual([]);
  });

  it('bajar cambios por hora del servidor', async () => {
    const all = await as(JORGE, 'jorge@ejemplo.com', 'select id from public.diagrams where server_updated > $1 order by server_updated', ['1970-01-01T00:00:00Z']);
    expect(all.map((r) => r.id).sort()).toEqual(['a', 'b']);
  });
});
