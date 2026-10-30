import { useEffect, useMemo, useRef, useState } from 'react';
import { buildSVG, palette } from '@/diagram/engine';
import { useStore } from '@/store/diagram';

/** Sigue el modo claro/oscuro del sistema para redibujar con la paleta correcta. */
function useDark() {
  const q = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const [dark, setDark] = useState(!!q?.matches);
  useEffect(() => {
    if (!q) return;
    const on = (e: MediaQueryListEvent) => setDark(e.matches);
    q.addEventListener('change', on);
    return () => q.removeEventListener('change', on);
  }, [q]);
  return dark;
}

/** Vista del diagrama unifilar. Zoom con botones o con los dedos (pellizco). */
export function DiagramView() {
  const d = useStore((s) => s.cur);
  const dark = useDark();
  const svg = useMemo(() => buildSVG(d, palette()), [d, dark]);
  const width = useMemo(() => Number(/width="(\d+)"/.exec(svg)?.[1] || 790), [svg]);
  const [zoom, setZoom] = useState<number | null>(null); // null = ajustar al ancho
  const box = useRef<HTMLDivElement>(null);
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);

  const [boxW, setBoxW] = useState(0);
  useEffect(() => {
    if (!box.current) return;
    const ro = new ResizeObserver(([e]) => setBoxW(e.contentRect.width));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, []);
  const z = zoom ?? (boxW ? Math.min(1, boxW / width) : 1);
  const setZ = (v: number) => setZoom(Math.min(4, Math.max(0.25, v)));

  const dist = (t: React.TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

  return (
    <section className="panel">
      <div className="flex items-center gap-1.5">
        <div className="lbl mr-auto">Diagrama unifilar</div>
        <button className="btn py-0.5" aria-label="Alejar" onClick={() => setZ(z / 1.25)}>−</button>
        <button className="btn py-0.5 text-xs" onClick={() => setZoom(null)}>Ajustar</button>
        <button className="btn py-0.5" aria-label="Acercar" onClick={() => setZ(z * 1.25)}>+</button>
      </div>
      <div
        ref={box}
        className="max-h-[62vh] overflow-auto rounded-[10px] border border-line bg-[var(--sheet)]"
        style={{ touchAction: 'pan-x pan-y' }}
        onTouchStart={(e) => { if (e.touches.length === 2) pinch.current = { dist: dist(e.touches), zoom: z }; }}
        onTouchMove={(e) => { if (e.touches.length === 2 && pinch.current) setZ(pinch.current.zoom * (dist(e.touches) / pinch.current.dist)); }}
        onTouchEnd={() => { pinch.current = null; }}
      >
        {/* SVG vectorial: siempre nítido con cualquier zoom. */}
        <div style={{ width: width * z }} className="[&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
    </section>
  );
}
