import { TYPES } from '@/catalog';
import { useStore } from '@/store/diagram';

/**
 * Vista del diagrama. El motor de dibujo SVG (src/diagram/) llega en la fase 3;
 * mientras tanto se muestra la columna de elementos en orden.
 */
export function DiagramView() {
  const d = useStore((s) => s.cur);
  return (
    <section className="panel">
      <div className="lbl">Diagrama unifilar</div>
      <div className="rounded-lg border border-dashed border-line bg-[var(--sheet)] p-4">
        {d.els.length ? (
          <ol className="m-0 flex list-none flex-col items-center gap-0 p-0">
            {d.els.map((e, i) => (
              <li key={e.id} className="flex flex-col items-center">
                {i > 0 && <span className="h-4 w-0.5 bg-ink" />}
                <span className="rounded border border-line px-2 py-0.5 text-sm font-semibold text-nm">
                  {TYPES[e.t].short}
                  {(e.rama ?? 0) > 0 && <span className="ml-1 text-xs text-muted">(ramal {e.rama})</span>}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="m-0 text-center text-sm text-muted">El diagrama aparecerá aquí.</p>
        )}
        <p className="mb-0 mt-3 text-center text-xs text-muted">Vista provisional: el dibujo con símbolos RETIE llega en la siguiente fase.</p>
      </div>
    </section>
  );
}
