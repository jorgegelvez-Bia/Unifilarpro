import { FS_MODO, FS_SEQ, FS_UI, fsData, fsRows, fsUI } from '@/checks';
import { useStore } from '@/store/diagram';
import type { Element } from '@/types';

/** Formulario del diagrama fasorial (equivale a `fasBody` del HTML). */
export function FasorForm({ e }: { e: Element }) {
  const setField = useStore((s) => s.setField);
  const toggleOpen = useStore((s) => s.toggleOpen);
  const f = e.f, rows = fsRows(f), fp = f.modo === FS_MODO[1];
  // Ángulo normal de cada tensión (se muestra de guía en la casilla vacía).
  const dflt = fsData({ ...e, f: { ...f, VA0: '', VA1: '', VA2: '' } }).map((x) => x.vdef);

  const sel = (k: string, label: string, opts: string[], value: string) => (
    <div className="field sm:col-span-2">
      <label htmlFor={`f_${e.id}_${k}`}>{label}</label>
      <select id={`f_${e.id}_${k}`} value={value} onChange={(ev) => setField(e.id, k, ev.target.value)}>
        {opts.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
  const inp = (k: string, label: string, ph: string) => (
    <div className="field min-w-[64px] flex-1">
      <label htmlFor={`f_${e.id}_${k}`}>{label}</label>
      <input id={`f_${e.id}_${k}`} inputMode="decimal" value={f[k] || ''} placeholder={ph} onChange={(ev) => setField(e.id, k, ev.target.value)} />
    </div>
  );

  return (
    <div className="flex flex-col gap-2.5 border-t border-line p-3">
      <div className="grid gap-2.5 sm:grid-cols-2">
        {sel('sis', 'Sistema', FS_UI, fsUI(f))}
        {sel('seq', 'Secuencia de fases', FS_SEQ, f.seq || FS_SEQ[0])}
        {sel('modo', '¿Cómo escribes el desfase?', FS_MODO, f.modo || FS_MODO[0])}
      </div>
      <div className="field">
        <label>Datos medidos</label>
        {rows.map((r, j) => (
          <div key={r.k + j} className="flex flex-wrap items-end gap-2 rounded-[7px] border border-line p-2">
            <div className="basis-full text-xs font-semibold">{r.lab}</div>
            {inp('V' + j, `${r.vl} (V)`, '120')}
            {inp('VA' + j, `∠${r.vl} (°)`, String(Math.round(dflt[j])))}
            {inp('I' + j, 'I (A)', '2.5')}
            {inp('A' + j, fp ? 'FP' : 'φ (°)', fp ? '0.95' : '25')}
            {fp && (
              <div className="field min-w-[64px] flex-1">
                <label htmlFor={`f_${e.id}_C${j}`}>Tipo</label>
                <select id={`f_${e.id}_C${j}`} value={f['C' + j] || 'Ind'} onChange={(ev) => setField(e.id, 'C' + j, ev.target.value)}>
                  {['Ind', 'Cap'].map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
            )}
          </div>
        ))}
        <span className="text-xs text-muted">
          {fp
            ? 'Factor de potencia de cada fase (ej. 0.95) y si es inductivo o capacitivo.'
            : '∠V: ángulo de cada tensión en la escala 0°–360° (vacío = el normal del sistema; escríbelo si encuentras otro, ej. 0, 180, 240). φ: ángulo entre tensión y corriente (positivo = inductivo).'}
        </span>
      </div>
      <div className="flex justify-end">
        <button className="btn-pri" onClick={() => toggleOpen(null)}>Listo ✓ Cerrar</button>
      </div>
    </div>
  );
}
