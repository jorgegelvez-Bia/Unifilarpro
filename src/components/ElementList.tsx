import { TYPES } from '@/catalog';
import { grpOf, multiT, summary } from '@/checks';
import { useStore } from '@/store/diagram';
import type { Element } from '@/types';
import { ElementForm } from './ElementForm';

/** Tarjeta de un elemento con ↑ ↓ ✕ (equivale a `cardHTML`). */
export function ElementCard({ e, i }: { e: Element; i: number }) {
  const d = useStore((s) => s.cur);
  const openId = useStore((s) => s.openId);
  const toggleOpen = useStore((s) => s.toggleOpen);
  const move = useStore((s) => s.move);
  const remove = useStore((s) => s.remove);

  const G = grpOf(d, e);
  const T = multiT(d);
  const childOpen = T?.id === e.id && d.els.some((x) => x.id === openId && grpOf(d, x) > 0);
  const open = openId === e.id || childOpen;
  const first = !d.els.some((x, j) => j < i && grpOf(d, x) === G);
  const last = !d.els.some((x, j) => j > i && grpOf(d, x) === G);
  const st = e.f.estado && e.f.estado !== 'Bueno' ? e.f.estado : '';
  const irr = e.t === 'irreg';

  return (
    <div className={`overflow-hidden rounded-[8px] border bg-panel ${irr || st === 'Dañado' ? 'border-bad' : st ? 'border-[#E0A040]' : 'border-line'}`}>
      <div className="flex items-stretch">
        <button className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-left" aria-expanded={open} onClick={() => toggleOpen(e.id)}>
          <span className="flex min-w-0 flex-col">
            <b className={irr ? 'text-bad' : ''}>
              {TYPES[e.t].name}
              {st && <em className="ml-1 text-[11px] not-italic text-bad">{st.toUpperCase()}</em>}
            </b>
            <span className="truncate font-mono text-xs text-muted">{summary(e, d) || 'sin datos'}</span>
          </span>
          <span className={`ml-auto transition-transform ${open ? '' : '-rotate-90'}`} aria-hidden>▾</span>
        </button>
        <button className="w-9 border-l border-line disabled:opacity-30" aria-label="Subir" disabled={first} onClick={() => move(i, -1)}>↑</button>
        <button className="w-9 border-l border-line disabled:opacity-30" aria-label="Bajar" disabled={last} onClick={() => move(i, 1)}>↓</button>
        <button className="w-9 border-l border-line text-bad" aria-label="Quitar" onClick={() => remove(i)}>✕</button>
      </div>
      {open && <ElementForm e={e} />}
    </div>
  );
}

/** "2 · Elementos del diagrama". Los elementos de un ramal se ven dentro de su padre. */
export function ElementList() {
  const d = useStore((s) => s.cur);
  return (
    <section className="panel">
      <div className="lbl">2 · Elementos del diagrama <i className="normal-case tracking-normal font-normal">de arriba hacia abajo</i></div>
      {d.els.length ? (
        <div className="flex flex-col gap-1.5">
          {d.els.map((e, i) => (grpOf(d, e) === 0 ? <ElementCard key={e.id} e={e} i={i} /> : null))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-line p-4 text-center text-sm text-muted">Aún no hay elementos. Empieza por la red o acometida.</div>
      )}
    </section>
  );
}
