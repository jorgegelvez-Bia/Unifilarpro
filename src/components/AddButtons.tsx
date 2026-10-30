import { GROUPS, TYPES } from '@/catalog';
import { useStore } from '@/store/diagram';

const MK_COLOR: Record<string, string> = { p: 'bg-accent', r: 'bg-[#8E44AD]', t: 'bg-[#B8860B]', d: 'bg-[#1F6FD1]' };

/** "1 · Agregar elemento": botones grandes por grupo, plegables. */
export function AddButtons() {
  const closed = useStore((s) => s.closedGroups);
  const toggleGroup = useStore((s) => s.toggleGroup);
  const add = useStore((s) => s.add);

  return (
    <section className="panel">
      <div className="lbl">1 · Agregar elemento <i className="normal-case tracking-normal font-normal">en el orden en que lo ves en campo</i></div>
      {GROUPS.map((g) => {
        const isClosed = closed.includes(g.key);
        return (
          <div key={g.key} className="overflow-hidden rounded-[10px] border border-line">
            <button
              className="flex w-full items-center gap-2 bg-paper px-3 py-2 text-left text-sm font-bold"
              aria-expanded={!isClosed}
              onClick={() => toggleGroup(g.key)}
            >
              <span className="font-extrabold uppercase tracking-[.04em]" style={{ color: `light-dark(${g.color}, ${g.colorDark})` }}>
                {g.name}
              </span>
              <i className="rounded-full border border-line bg-panel px-1.5 text-[11px] font-semibold not-italic text-muted">{g.items.length}</i>
              <span className={`ml-auto transition-transform ${isClosed ? '-rotate-90' : ''}`} aria-hidden>▾</span>
            </button>
            {!isClosed && (
              <div className="grid grid-cols-3 gap-1.5 p-2">
                {g.items.map((t) => {
                  const s = TYPES[t];
                  const irr = t === 'irreg';
                  return (
                    <button
                      key={t}
                      onClick={() => add(t)}
                      className={`flex min-h-[50px] flex-col items-center justify-center gap-0.5 rounded-[7px] border px-1 py-1.5 leading-tight ${
                        irr ? 'border-2 border-bad bg-bad-bg text-bad' : 'border-line bg-paper'
                      }`}
                    >
                      <b className="text-sm">
                        {s.btn}
                        {s.mk && <em className={`ml-1 rounded px-1 text-[10px] not-italic text-white ${MK_COLOR[s.mk[1]]}`}>{s.mk[0]}</em>}
                      </b>
                      <span className={`text-[11px] ${irr ? 'text-bad' : 'text-muted'}`}>{s.sub}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
