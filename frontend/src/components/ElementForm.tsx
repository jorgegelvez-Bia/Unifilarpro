import type { ReactNode } from 'react';
import { TYPES, bkFields, fieldsOf, trFields, type FieldSpec } from '@/catalog';
import { brName, celdaCands, celdaSel, fuseFor, grpOf, multiT, multiTr, trN } from '@/checks';
import { useStore } from '@/store/diagram';
import type { Element } from '@/types';
import { ConexForm } from './ConexForm';
import { ElementCard } from './ElementList';
import { FasorForm } from './FasorForm';

const IRR_BYP = ['Línea directa antes de los TC', 'Conexión directa antes de la medida', 'Acometida derivada antes del medidor', 'Fase sin pasar por la medida'];
const WIDE = ['relacion', 'serial', 'descripcion', 'obs', 'encierra', 'configuracion', 'tipo', 'detalle'];
const PLACEHOLDER: Record<string, string> = {
  'tc.relacion': 'Ej.: 200/5 A',
  'tt.relacion': 'Ej.: 13200/120 V',
  'trafo.relacion': 'Ej.: 13.2 kV / 220-127 V',
  'trafo.potencia': 'Ej.: 150',
  'breaker.corriente': 'Ej.: 100 A',
  'brkcli.corriente': 'Ej.: 100 A',
  'red.circuito': 'Ej.: Sol y Mar',
  'cajam.tension': 'Ej.: 13.2 kV',
  'cajam.clientes': 'Ej.: 4',
  'cajab.abonados': 'Ej.: 15',
  'doble.nombre1': 'Ej.: Circuito Toledo',
  'doble.nombre2': 'Ej.: Circuito Pamplona',
};

/** Formulario de un elemento (equivale a `elBody` del HTML). */
export function ElementForm({ e }: { e: Element }) {
  const d = useStore((s) => s.cur);
  const addRama = useStore((s) => s.addRama);
  const setField = useStore((s) => s.setField);
  const setRama = useStore((s) => s.setRama);
  const setAddRama = useStore((s) => s.setAddRama);
  const toggleOpen = useStore((s) => s.toggleOpen);

  if (e.t === 'conex') return <ConexForm e={e} />;
  if (e.t === 'fasor') return <FasorForm e={e} />;

  const T = multiT(d);
  const TM = T?.id === e.id;
  const perT = (k: string) => (e.t === 'breaker' ? /^(corriente\d*|polos\d*|med\d+)$/.test(k) : /^(potencia\d?|med\d|secc\d)$/.test(k));

  const renderField = (fs: FieldSpec): ReactNode => {
    const { key: k } = fs;
    let label = fs.label;
    const id = `f_${e.id}_${k}`;
    const wide = WIDE.includes(k) ? 'sm:col-span-2' : '';
    if (k === 'obs' && (e.f.estado || 'Bueno') === 'Bueno') return null;
    if (k === 'otrosCant' && e.f.uso !== 'Compartido') return null;
    if (k === 'neutro' && e.t === 'red' && e.f.nivel === 'MT') return null;
    if (e.t === 'breaker' && k === 'cantidad' && (multiTr(d) || (e.rama ?? 0) > 0)) return null;
    if (e.t === 'trafo') {
      const n = trN(e);
      if (k === 'configuracion' && n < 2) return null;
      const m = k.match(/^potencia(\d)?$/);
      if (m) label = n > 1 ? `kVA trafo ${m[1] ? +m[1] : 1}` : 'kVA';
    }

    if (e.t === 'celda' && k === 'encierra') {
      const C = celdaCands(d, e);
      const sel = celdaSel(d, e);
      return (
        <div key={k} className="field sm:col-span-2">
          <label>¿Qué equipos encierra la celda?</label>
          {C.length ? (
            C.map((x) => (
              <label key={x.id} className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={sel.includes(x.id)}
                  onChange={(ev) => setField(e.id, 'incl', ev.target.checked ? [...sel, x.id] : sel.filter((s) => s !== x.id))}
                />
                {d.els.indexOf(x) + 1}. {TYPES[x.t].name}
              </label>
            ))
          ) : (
            <span className="text-xs text-muted">Primero agrega los equipos al diagrama.</span>
          )}
          <span className="text-xs text-muted">Si marcas equipos separados, la celda encierra también los que están entre ellos.</span>
        </div>
      );
    }

    if (e.t === 'irreg') {
      const byp = IRR_BYP.includes(e.f.tipo);
      const branch = byp || !e.f.en;
      if (k === 'hasta') return null;
      if (k === 'desde' && !branch) return null;
      if (k === 'en' && byp) return null;
      if (k === 'detalle' && e.f.tipo === 'Otra') label = 'Describe la irregularidad (se escribe en el diagrama)';
    }

    let ctl: ReactNode;
    if (fs.kind === 'ref') {
      const refs = d.els.map((x, i) => ({ x, i })).filter(({ x }) => !['irreg', 'celda', 'gabinete', 'conex', 'fasor'].includes(x.t));
      ctl = (
        <select id={id} value={e.f[k] || ''} onChange={(ev) => setField(e.id, k, ev.target.value)}>
          <option value="">{k === 'en' ? 'Ninguno (dibujar como línea que sale del circuito)' : '— Escoge —'}</option>
          {refs.map(({ x, i }) => (
            <option key={x.id} value={x.id}>
              {i + 1}. {TYPES[x.t].name}
            </option>
          ))}
        </select>
      );
    } else if (fs.kind === 'select') {
      ctl = (
        <select id={id} value={e.f[k] ?? fs.default} onChange={(ev) => setField(e.id, k, ev.target.value)}>
          {fs.options!.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      );
    } else {
      const numeric = (k === 'cantidad' && (e.t === 'trafo' || e.t === 'breaker')) || k === 'abonados' || k === 'clientes';
      ctl = (
        <input
          id={id}
          value={e.f[k] ?? ''}
          type={numeric ? 'number' : 'text'}
          min={numeric ? (k === 'cantidad' ? 1 : 0) : undefined}
          inputMode={numeric ? 'numeric' : /^potencia/.test(k) && e.t === 'trafo' ? 'decimal' : undefined}
          placeholder={k === 'obs' ? 'Ej.: carcasa rota, sin sello' : PLACEHOLDER[`${e.t}.${k.replace(/\d+$/, '')}`]}
          onChange={(ev) => setField(e.id, k, ev.target.value)}
        />
      );
    }

    let hint: ReactNode = null;
    if (e.t === 'tt' && k === 'relacion') {
      const ins = (s: string, all = false) => setField(e.id, k, all ? s : (e.f[k] || '') + s);
      hint = (
        <span className="flex gap-1">
          <button type="button" className="btn py-0.5" onClick={() => ins('√')}>√</button>
          <button type="button" className="btn py-0.5" onClick={() => ins('/√3')}>/√3</button>
          <button type="button" className="btn py-0.5" onClick={() => ins('13200/√3 : 120/√3 V', true)}>13200/√3 : 120/√3</button>
        </span>
      );
    }
    if (e.t === 'fus' && k === 'corriente') {
      const r = fuseFor(d);
      hint = (
        <span className="text-xs text-muted">
          {r ? `Sugerido: ${r.amp} A tipo K (In del trafo ${r.In.toFixed(2)} A, ${r.src}).` : 'Agrega el transformador con sus kVA para calcularlo.'}
        </span>
      );
    }
    return (
      <div key={k} className={`field ${wide}`}>
        <label htmlFor={id}>{label}</label>
        {ctl}
        {hint}
      </div>
    );
  };

  const fields = fieldsOf(e.t).filter((fs) => !(TM && perT(fs.key)));
  const n = TM ? trN(e) : 0;

  return (
    <div className="flex flex-col gap-2.5 border-t border-line p-3">
      <div className="grid gap-2.5 sm:grid-cols-2">{fields.map(renderField)}</div>

      {TM && (
        <div className="flex flex-col gap-2.5">
          {addRama > 0 && (
            <button className="btn self-start" onClick={() => setAddRama(0)}>↩ Volver a agregar en la parte principal</button>
          )}
          {Array.from({ length: n }, (_, j) => {
            const k = j + 1;
            const children = d.els.map((x, i) => ({ x, i })).filter(({ x }) => grpOf(d, x) === k);
            const color = k <= 6 ? ['#1F6FD1', '#8E44AD', '#2E8B3A', '#C2185B', '#B8860B', '#6D4C41'][k - 1] : `hsl(${Math.round((k * 137.5) % 360)},60%,40%)`;
            return (
              <div key={k} className="flex flex-col gap-2 rounded-[10px] border-2 p-2.5" style={{ borderColor: color }}>
                <div className="flex items-center gap-2 font-bold" style={{ color }}>
                  <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                  {brName(e, k)}
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2">{(e.t === 'breaker' ? bkFields(k) : trFields(k)).map(renderField)}</div>
                <div className="flex flex-col gap-1.5">
                  {children.length ? children.map(({ x, i }) => <ElementCard key={x.id} e={x} i={i} />) : <div className="text-xs text-muted">Sin elementos todavía.</div>}
                </div>
                {addRama === k ? (
                  <div className="text-sm font-semibold text-accent">✓ Los botones de «Agregar elemento» ahora agregan aquí</div>
                ) : (
                  <button className="btn self-start" onClick={() => setAddRama(k)}>+ Agregar elementos al {brName(e, k)}</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {T && !TM && (
        <div className="field">
          <label htmlFor={`rm_${e.id}`}>Ubicación</label>
          <select id={`rm_${e.id}`} value={grpOf(d, e)} onChange={(ev) => setRama(e.id, +ev.target.value)}>
            {[`Principal (antes de ${T.t === 'breaker' ? 'los totalizadores' : 'los trafos'})`, ...Array.from({ length: trN(T) }, (_, i) => brName(T, i + 1))].map((t, k) => (
              <option key={k} value={k}>{t}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex justify-end">
        <button className="btn-pri" onClick={() => toggleOpen(null)}>Listo ✓ Cerrar</button>
      </div>
    </div>
  );
}
