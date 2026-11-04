import { describe, expect, it } from 'vitest';
import { emptySync, mergeRemote, rowsToPush, sinceWithOverlap, syncOnce, type Remote, type Row, type SyncState } from '@/sync/engine';
import type { Diagram } from '@/types';

/** Nube de mentira con la misma regla que supabase/migrations: gana el `updated` mayor. */
class FakeCloud implements Remote {
  rows = new Map<string, Row>();
  clock = 0;
  async push(rows: Row[]) {
    for (const r of rows) {
      const old = this.rows.get(r.id);
      if (old && r.updated < old.updated) continue;
      this.rows.set(r.id, { ...structuredClone(r), server_updated: new Date(Date.UTC(2026, 0, 1) + ++this.clock * 1000).toISOString() });
    }
  }
  async pull(since: string) {
    return [...this.rows.values()].filter((r) => r.server_updated! > since).sort((a, b) => a.server_updated!.localeCompare(b.server_updated!)).map((r) => structuredClone(r));
  }
}

/** Un celular: su lista de diagramas y su estado de sincronización. */
class Device {
  diagrams: Diagram[] = [];
  sync: SyncState = emptySync();
  constructor(private cloud: Remote) {}
  save(d: Diagram) {
    this.diagrams = [...this.diagrams.filter((x) => x.id !== d.id), structuredClone(d)];
    this.sync = { ...this.sync, dirty: [...new Set([...this.sync.dirty, d.id])] };
  }
  remove(id: string, ts: number) {
    this.diagrams = this.diagrams.filter((x) => x.id !== id);
    this.sync = { ...this.sync, dirty: [...new Set([...this.sync.dirty, id])], gone: { ...this.sync.gone, [id]: ts } };
  }
  run() {
    return syncOnce(this.cloud, () => ({ diagrams: this.diagrams, sync: this.sync }), (r) => { if (r.diagrams) this.diagrams = r.diagrams; this.sync = r.sync; });
  }
  get(id: string) { return this.diagrams.find((d) => d.id === id); }
}

const dg = (id: string, updated: number, nombre = id): Diagram => ({ id, updated, els: [{ id: 'e', t: 'medidor', f: {} }], p: { nombre, frontera: '', fecha: '2026-11-04', elaboro: '', idp: '', nic: '', tipoPunto: '' } });

describe('sincronización', () => {
  it('lo hecho sin internet llega al otro equipo', async () => {
    const cloud = new FakeCloud(), cel = new Device(cloud), pc = new Device(cloud);
    cel.save(dg('a', 100)); cel.save(dg('b', 110));
    expect(await cel.run()).toEqual({ pushed: 2, pulled: 0 });
    expect(cel.sync.dirty).toEqual([]);
    await pc.run();
    expect(pc.diagrams.map((d) => d.id).sort()).toEqual(['a', 'b']);
  });

  it('gana el cambio más reciente, en los dos sentidos', async () => {
    const cloud = new FakeCloud(), cel = new Device(cloud), pc = new Device(cloud);
    cel.save(dg('a', 100, 'original')); await cel.run(); await pc.run();
    pc.save(dg('a', 300, 'del PC')); // más nuevo
    cel.save(dg('a', 200, 'del celular'));
    await pc.run(); await cel.run(); await pc.run();
    expect(cel.get('a')!.p.nombre).toBe('del PC');
    expect(pc.get('a')!.p.nombre).toBe('del PC');
    expect(cloud.rows.get('a')!.updated).toBe(300);
  });

  it('el borrado también se sincroniza y no revive', async () => {
    const cloud = new FakeCloud(), cel = new Device(cloud), pc = new Device(cloud);
    cel.save(dg('a', 100)); await cel.run(); await pc.run();
    pc.remove('a', 500); await pc.run();
    expect(cloud.rows.get('a')!.deleted).toBe(true);
    await cel.run();
    expect(cel.get('a')).toBeUndefined();
    expect(cel.sync.gone.a).toBe(500);
    await cel.run(); await pc.run(); // otra vuelta: sigue borrado
    expect(cel.get('a')).toBeUndefined();
    expect(pc.get('a')).toBeUndefined();
  });

  it('un cambio posterior al borrado lo revive', async () => {
    const cloud = new FakeCloud(), cel = new Device(cloud), pc = new Device(cloud);
    cel.save(dg('a', 100)); await cel.run(); await pc.run();
    pc.remove('a', 200);
    cel.save(dg('a', 300, 'editado después'));
    await pc.run(); await cel.run(); await pc.run();
    expect(pc.get('a')!.p.nombre).toBe('editado después');
    expect(pc.sync.gone.a).toBeUndefined();
  });

  it('un cambio hecho mientras se subía queda pendiente', async () => {
    const cloud = new FakeCloud(), cel = new Device(cloud);
    cel.save(dg('a', 100));
    const orig = cloud.push.bind(cloud);
    cloud.push = async (rows) => { await orig(rows); cel.save(dg('a', 150, 'durante la subida')); };
    await cel.run();
    expect(cel.sync.dirty).toEqual(['a']);
    cloud.push = orig;
    await cel.run();
    expect(cloud.rows.get('a')!.data!.p.nombre).toBe('durante la subida');
    expect(cel.sync.dirty).toEqual([]);
  });

  it('piezas sueltas', () => {
    const s: SyncState = { dirty: ['x', 'y', 'z'], gone: { y: 9 }, lastPull: '' };
    expect(rowsToPush([dg('x', 5)], s)).toEqual([{ id: 'x', data: dg('x', 5), updated: 5, deleted: false }, { id: 'y', data: null, updated: 9, deleted: true }]);
    expect(sinceWithOverlap('')).toBe('1970-01-01T00:00:00.000Z');
    expect(sinceWithOverlap('2026-01-01T00:10:00.000Z')).toBe('2026-01-01T00:05:00.000Z');
    // Lo del celular más nuevo no se pisa; igual = ya sincronizado.
    const m = mergeRemote([dg('x', 5)], { dirty: ['x'], gone: {}, lastPull: '' }, [{ id: 'x', data: dg('x', 3), updated: 3, deleted: false, server_updated: 'B' }, { id: 'w', data: dg('w', 1), updated: 1, deleted: false, server_updated: 'A' }]);
    expect(m.diagrams.find((d) => d.id === 'x')!.updated).toBe(5);
    expect(m.sync.dirty).toEqual(['x']);
    expect(m.changed).toEqual(['w']);
    expect(m.sync.lastPull).toBe('B');
    expect(mergeRemote([dg('x', 5)], { dirty: ['x'], gone: {}, lastPull: '' }, [{ id: 'x', data: dg('x', 5), updated: 5, deleted: false }]).sync.dirty).toEqual([]);
  });
});
