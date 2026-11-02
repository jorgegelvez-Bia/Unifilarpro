import { checks, NF, fv, meterType } from '@/checks';
import { useStore } from '@/store/diagram';

/** Tipo de medida, sistema y lista de "Revisiones". */
export function ChecksPanel() {
  const d = useStore((s) => s.cur);
  const items = checks(d);
  const red = d.els.find((e) => e.t === 'red');
  const sistema = red && NF[fv(red, 'fases')] ? fv(red, 'fases') + (fv(red, 'neutro') === 'Sí' && fv(red, 'nivel') !== 'MT' ? ' + N' : '') : '—';

  return (
    <section className="panel">
      <div className="flex flex-wrap gap-1.5">
        <span className="rounded-full border border-accent px-2.5 py-1 font-mono text-xs text-accent">Medida {meterType(d).toLowerCase()}</span>
        <span className="rounded-full border border-line px-2.5 py-1 font-mono text-xs text-muted">{sistema}</span>
      </div>
      <div className="lbl">Revisiones</div>
      {items.length ? (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
          {items.map((c, i) => (
            <li
              key={i}
              className={`rounded-[7px] border-l-[3px] px-2.5 py-2 ${c.level === 'bad' ? 'border-bad bg-bad-bg' : c.level === 'ok' ? 'border-accent bg-ok-bg' : 'border-volt bg-warn-bg'}`}
            >
              {c.text}
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-sm text-muted">Agrega elementos para ver las revisiones.</div>
      )}
    </section>
  );
}
