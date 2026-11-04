import { useState } from 'react';
import { dTitle, useStore, type TemplateKind } from '@/store/diagram';
import { CloudPanel } from './CloudPanel';

const TEMPLATES: [TemplateKind, string][] = [
  ['vacio', 'Vacío'],
  ['directa', 'Directa'],
  ['semidirecta', 'Semidirecta'],
  ['indirecta', 'Indirecta'],
  ['distribucion', 'Distribución'],
];

const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** "Mis diagramas": buscar, abrir, duplicar, borrar y plantillas. */
export function MyDiagrams({ onClose }: { onClose: () => void }) {
  const { diagrams, create, openDiagram, duplicate, deleteDiagram } = useStore();
  const [q, setQ] = useState('');
  const [armed, setArmed] = useState<string | null>(null);

  const list = [...diagrams]
    .sort((a, b) => (b.updated || 0) - (a.updated || 0))
    .filter((d) => !q || norm(`${d.p.nombre} ${d.p.frontera}`).includes(norm(q)));

  return (
    <section className="panel">
      <div className="flex items-center justify-between">
        <div className="lbl">Mis diagramas</div>
        <button className="btn" onClick={onClose}>Cerrar</button>
      </div>
      <CloudPanel />
      <div className="flex flex-wrap gap-1.5">
        <span className="self-center text-xs text-muted">Nuevo:</span>
        {TEMPLATES.map(([k, l]) => (
          <button key={k} className="btn" onClick={() => { create(k); onClose(); }}>{l}</button>
        ))}
      </div>
      <div className="field">
        <input placeholder="Buscar por proyecto o frontera" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {list.length ? (
        list.map((d) => (
          <div key={d.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-line p-2">
            <div className="min-w-[160px] flex-1">
              <b className="block">{dTitle(d)}</b>
              <span className="text-xs text-muted">{d.els.length} elementos · {d.p.fecha}</span>
            </div>
            <button className="btn-pri" onClick={() => { openDiagram(d.id); onClose(); }}>Abrir</button>
            <button className="btn" onClick={() => duplicate(d.id)}>Duplicar</button>
            <button
              className="btn text-bad"
              onClick={() => {
                if (armed !== d.id) { setArmed(d.id); setTimeout(() => setArmed(null), 4000); return; }
                deleteDiagram(d.id);
              }}
            >
              {armed === d.id ? '¿Seguro? Toca de nuevo' : 'Borrar'}
            </button>
          </div>
        ))
      ) : (
        <div className="text-sm text-muted">{q ? 'No hay diagramas con ese nombre.' : 'Todavía no hay diagramas guardados.'}</div>
      )}
    </section>
  );
}
