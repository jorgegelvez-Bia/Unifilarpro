import { useState } from 'react';
import { WR_BLQ, WR_BORNES, WR_N, WR_RESP, WR_RETS2, WR_T, wrDefault, wrPhaseOpts, type Novedad } from '@/checks';
import { wrModHits, wrModOptions } from '@/diagram/wiring';
import { useStore } from '@/store/diagram';
import type { Element } from '@/types';

/** Marca y modelo del medidor: lupa para buscar + lista + "Otro (escribir)". */
function ModelPicker({ e, k, txtk, label }: { e: Element; k: string; txtk: string; label: string }) {
  const setField = useStore((s) => s.setField);
  const [q, setQ] = useState('');
  const cur: string = e.f[k] || 'Genérico';
  const hits = wrModHits(q);
  const id = `f_${e.id}_${k}`;
  return (
    <div className="field sm:col-span-2">
      <label htmlFor={id}>{label}</label>
      <input value={q} onChange={(ev) => setQ(ev.target.value)} placeholder="🔍 Buscar medidor (ej. sl7, elster, meccon)" autoComplete="off" aria-label={`Buscar ${label.toLowerCase()}`} />
      {q.trim() && (
        <div className="flex flex-wrap gap-1.5">
          {hits.length ? (
            hits.map((h) => (
              <button key={h} className="btn py-1 text-xs" onClick={() => { setField(e.id, k, h); setQ(''); }}>{h}</button>
            ))
          ) : (
            <span className="text-xs text-muted">Sin resultados. Escoge «Otro (escribir)».</span>
          )}
        </div>
      )}
      <select id={id} value={cur} onChange={(ev) => setField(e.id, k, ev.target.value)}>
        {wrModOptions(e.f.tipo, cur).map((o) => <option key={o}>{o}</option>)}
      </select>
      {cur === 'Otro (escribir)' && (
        <input className="mt-1.5" aria-label="Marca y modelo" value={e.f[txtk] || ''} onChange={(ev) => setField(e.id, txtk, ev.target.value)} placeholder="Marca y modelo" />
      )}
    </div>
  );
}

/** Formulario del diagrama de conexiones (equivale a `cxBody` del HTML). */
export function ConexForm({ e }: { e: Element }) {
  const d = useStore((s) => s.cur);
  const setField = useStore((s) => s.setField);
  const toggleOpen = useStore((s) => s.toggleOpen);
  const tipo: string = e.f.tipo || wrDefault(d);
  const dir = /^Directa/.test(tipo);
  const nov: Novedad[] = e.f.nov || [];
  const setNov = (n: Novedad[]) => setField(e.id, 'nov', n);
  const upd = (r: number, p: Partial<Novedad>) => setNov(nov.map((x, i) => (i === r ? { ...x, ...p } : x)));

  const sel = (k: string, label: string, opts: string[], value: string, hint?: string) => (
    <div className="field sm:col-span-2">
      <label htmlFor={`f_${e.id}_${k}`}>{label}</label>
      <select id={`f_${e.id}_${k}`} value={value} onChange={(ev) => setField(e.id, k, ev.target.value)}>
        {opts.map((o) => <option key={o}>{o}</option>)}
      </select>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );

  return (
    <div className="flex flex-col gap-2.5 border-t border-line p-3">
      <div className="grid gap-2.5 sm:grid-cols-2">
        {sel('tipo', 'Tipo de conexión', WR_T, tipo, 'El cableado se dibuja solo: red, TC, TT, bloque de pruebas y medidor con bornes numerados y colores RETIE.')}
        {sel('bornes', 'Bornera del medidor', WR_BORNES, e.f.bornes || 'Asimétrico', 'Asimétrico: entrada y salida de cada fase seguidas (1-2-3, 4-5-6…). Simétrico: entradas a la izquierda y salidas a la derecha, en espejo.')}
        {!dir && sel('bloque', 'Bloque de pruebas', WR_BLQ, e.f.bloque || WR_BLQ[0])}
        <ModelPicker e={e} k="modelo" txtk="modeloTxt" label="Medidor principal (marca y modelo)" />
        {!(dir || e.f.bloque === WR_BLQ[3]) && sel('resp', 'Medidor de respaldo', WR_RESP, e.f.resp || WR_RESP[0])}
        {!dir && ((e.f.resp || WR_RESP[0]) !== WR_RESP[0] || e.f.bloque === WR_BLQ[3]) && (
          <ModelPicker e={e} k="modeloR" txtk="modeloRTxt" label="Medidor de respaldo (marca y modelo)" />
        )}
        {/Aron/.test(tipo) && sel('retS2', 'Retornos S2 de los TC (Aron) puenteados', WR_RETS2, e.f.retS2 || WR_RETS2[0])}
      </div>

      <div className="field">
        <label>Novedades en el cableado (opcional)</label>
        {nov.length ? (
          nov.map((n, r) => {
            const fo = wrPhaseOpts(tipo, n.t);
            return (
              <div key={r} className="flex flex-wrap items-end gap-2 rounded-[7px] border border-line p-2">
                <div className="grid h-7 w-7 place-items-center rounded-full bg-bad text-xs font-bold text-white">{r + 1}</div>
                <div className="field min-w-[190px] flex-[2]">
                  <label htmlFor={`nv_${e.id}_${r}`}>Novedad</label>
                  <select
                    id={`nv_${e.id}_${r}`}
                    value={n.t}
                    onChange={(ev) => { const t = ev.target.value, o = wrPhaseOpts(tipo, t); upd(r, { t, fase: o.includes(n.fase || '') ? n.fase : o[0] || '' }); }}
                  >
                    <option value="">— Escoge —</option>
                    {WR_N.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
                {fo.length > 0 && (
                  <div className="field flex-1">
                    <label htmlFor={`nvf_${e.id}_${r}`}>Fase</label>
                    <select id={`nvf_${e.id}_${r}`} value={fo.includes(n.fase || '') ? n.fase : fo[0]} onChange={(ev) => upd(r, { fase: ev.target.value })}>
                      {fo.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                )}
                {n.t === 'Otra' && (
                  <div className="field min-w-[190px] flex-[2]">
                    <label htmlFor={`nvt_${e.id}_${r}`}>Describe</label>
                    <input id={`nvt_${e.id}_${r}`} value={n.txt || ''} onChange={(ev) => upd(r, { txt: ev.target.value })} placeholder="Ej.: borne 5 flojo" />
                  </div>
                )}
                <button className="btn border-bad text-bad" aria-label="Quitar novedad" onClick={() => setNov(nov.filter((_, i) => i !== r))}>✕</button>
              </div>
            );
          })
        ) : (
          <span className="text-xs text-muted">Sin novedades: el cableado se dibuja correcto.</span>
        )}
        <button className="btn self-start" onClick={() => setNov([...nov, { t: '', fase: '', txt: '' }])}>+ Agregar novedad</button>
      </div>

      <div className="flex justify-end">
        <button className="btn-pri" onClick={() => toggleOpen(null)}>Listo ✓ Cerrar</button>
      </div>
    </div>
  );
}
