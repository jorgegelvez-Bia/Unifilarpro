/**
 * Sincronización entre el celular y la nube (sin depender de Supabase, para poder probarla).
 *
 * - Cada cambio deja el diagrama "pendiente" (dirty). Al haber internet se sube.
 * - Al borrar, queda una marca (lápida) para que el borrado también llegue a los otros equipos.
 * - Gana el cambio más reciente (`updated`). La nube aplica la misma regla (ver supabase/).
 * - Para bajar cambios se usa la hora del servidor (`server_updated`), no la del celular.
 */
import type { Diagram } from '@/types';

/** Una fila de la tabla `diagrams` en la nube. */
export interface Row {
  id: string;
  data: Diagram | null;
  updated: number;
  deleted: boolean;
  server_updated?: string;
}

/** Lo que el motor necesita de la nube. */
export interface Remote {
  push(rows: Row[]): Promise<void>;
  /** Filas cambiadas después de `since` (hora del servidor, ISO), en orden. */
  pull(since: string): Promise<Row[]>;
}

export interface SyncState {
  /** Diagramas con cambios que falta subir. */
  dirty: string[];
  /** Diagramas borrados en este equipo: id → hora del borrado. */
  gone: Record<string, number>;
  /** Hasta dónde se bajaron cambios (hora del servidor). */
  lastPull: string;
}

export const emptySync = (): SyncState => ({ dirty: [], gone: {}, lastPull: '' });

/** Filas para subir: los diagramas pendientes y las lápidas. */
export function rowsToPush(diagrams: Diagram[], s: SyncState): Row[] {
  const rows: Row[] = [];
  for (const id of s.dirty) {
    const d = diagrams.find((x) => x.id === id);
    if (d) rows.push({ id, data: d, updated: d.updated, deleted: false });
    else if (s.gone[id]) rows.push({ id, data: null, updated: s.gone[id], deleted: true });
  }
  return rows;
}

/** Junta lo que llegó de la nube con lo del celular. Gana el más reciente. */
export function mergeRemote(diagrams: Diagram[], s: SyncState, rows: Row[]): { diagrams: Diagram[]; sync: SyncState; changed: string[] } {
  const list = [...diagrams];
  const gone = { ...s.gone };
  const dirty = new Set(s.dirty);
  const changed: string[] = [];
  let lastPull = s.lastPull;
  for (const r of rows) {
    if (r.server_updated && r.server_updated > lastPull) lastPull = r.server_updated;
    const i = list.findIndex((d) => d.id === r.id);
    const localTs = i >= 0 ? list[i].updated : gone[r.id] ?? -1;
    if (r.updated < localTs) continue; // lo del celular es más nuevo: se subirá
    if (r.updated === localTs && (i >= 0 ? !r.deleted : r.deleted)) { dirty.delete(r.id); continue; } // ya iguales
    if (r.deleted) {
      if (i >= 0) { list.splice(i, 1); changed.push(r.id); }
      gone[r.id] = r.updated;
    } else if (r.data) {
      if (i >= 0) list[i] = r.data;
      else list.push(r.data);
      delete gone[r.id];
      changed.push(r.id);
    }
    dirty.delete(r.id);
  }
  return { diagrams: list, sync: { dirty: [...dirty], gone, lastPull }, changed };
}

/** Margen al bajar cambios, por si una escritura en la nube se confirmó tarde. */
const OVERLAP_MS = 5 * 60_000;
export const sinceWithOverlap = (lastPull: string) => (lastPull ? new Date(Date.parse(lastPull) - OVERLAP_MS).toISOString() : '1970-01-01T00:00:00.000Z');

/**
 * Una vuelta completa: sube lo pendiente y baja lo nuevo.
 * `get`/`apply` leen y guardan el estado del celular (para no pisar cambios hechos mientras tanto).
 */
export async function syncOnce(remote: Remote, get: () => { diagrams: Diagram[]; sync: SyncState }, apply: (r: { diagrams?: Diagram[]; sync: SyncState; changed?: string[] }) => void) {
  const before = get();
  const rows = rowsToPush(before.diagrams, before.sync);
  if (rows.length) {
    await remote.push(rows);
    // Solo se limpian los que no volvieron a cambiar durante la subida.
    const now = get();
    const sent = new Map(rows.map((r) => [r.id, r.updated]));
    const still = now.sync.dirty.filter((id) => {
      const d = now.diagrams.find((x) => x.id === id);
      const ts = d ? d.updated : now.sync.gone[id];
      return sent.get(id) !== ts;
    });
    apply({ sync: { ...now.sync, dirty: still } });
  }
  const pulled = await remote.pull(sinceWithOverlap(get().sync.lastPull));
  const now = get();
  const m = mergeRemote(now.diagrams, now.sync, pulled);
  apply(m);
  return { pushed: rows.length, pulled: m.changed.length };
}
