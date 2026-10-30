import { useStore } from '@/store/diagram';

export function ProjectForm() {
  const p = useStore((s) => s.cur.p);
  const setProject = useStore((s) => s.setProject);

  return (
    <section className="panel">
      <div className="lbl">Datos del proyecto</div>
      <div className="grid gap-2.5 sm:grid-cols-3">
        <div className="field">
          <label htmlFor="p_nombre">Proyecto / cliente</label>
          <input id="p_nombre" value={p.nombre} onChange={(e) => setProject('nombre', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="p_frontera">Código de la frontera</label>
          <input id="p_frontera" placeholder="Ej.: FRT12345" value={p.frontera} onChange={(e) => setProject('frontera', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="p_fecha">Fecha</label>
          <input id="p_fecha" type="date" value={p.fecha} onChange={(e) => setProject('fecha', e.target.value)} />
        </div>
      </div>
    </section>
  );
}
