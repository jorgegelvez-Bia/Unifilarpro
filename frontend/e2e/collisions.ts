/**
 * Revisa un SVG ya pintado en el navegador y devuelve los choques (§5.5):
 *  1. texto montado sobre texto;
 *  2. texto montado sobre un símbolo;
 *  3. línea o barra que cruza por dentro de un símbolo (salvo la que pasa por su centro);
 *  4. borde de caja punteada (gabinete, celda) que corta un texto.
 */

export interface Box { x1: number; y1: number; x2: number; y2: number }
export interface Collision { kind: 'texto/texto' | 'texto/símbolo' | 'línea/símbolo' | 'caja/texto'; a: string; b: string }

const shrink = (b: Box, dx: number, dy = dx): Box => ({ x1: b.x1 + dx, y1: b.y1 + dy, x2: b.x2 - dx, y2: b.y2 - dy });
const hit = (a: Box, b: Box) => a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;
const inside = (x: number, y: number, b: Box) => x >= b.x1 && x <= b.x2 && y >= b.y1 && y <= b.y2;
const contains = (o: Box, i: Box) => i.x1 >= o.x1 - 0.5 && i.x2 <= o.x2 + 0.5 && i.y1 >= o.y1 - 0.5 && i.y2 <= o.y2 + 0.5;

/** ¿El segmento toca el rectángulo? (Liang–Barsky) */
function segHits(x1: number, y1: number, x2: number, y2: number, b: Box): boolean {
  let t0 = 0, t1 = 1;
  const dx = x2 - x1, dy = y2 - y1;
  const p = [-dx, dx, -dy, dy], q = [x1 - b.x1, b.x2 - x1, y1 - b.y1, b.y2 - y1];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) { if (q[i] < 0) return false; continue; }
    const t = q[i] / p[i];
    if (p[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
  }
  return t0 < t1;
}

const desc = (el: Element, b: Box) => {
  const t = el.tagName === 'text' ? `"${el.textContent}"` : `${el.tagName}.${el.getAttribute('class') || ''}`;
  return `${t} @${Math.round(b.x1)},${Math.round(b.y1)}`;
};

export function findCollisions(svg: SVGSVGElement): Collision[] {
  const R = svg.getBoundingClientRect();
  const box = (el: Element): Box => { const r = el.getBoundingClientRect(); return { x1: r.left - R.left, y1: r.top - R.top, x2: r.right - R.left, y2: r.bottom - R.top }; };
  const toSvg = (el: SVGGraphicsElement) => {
    const m = svg.getScreenCTM()!.inverse().multiply(el.getScreenCTM()!);
    return (x: number, y: number) => ({ x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f });
  };
  const out: Collision[] = [];

  // Textos (sin los números de los triángulos ni los "!" de estado).
  // El ancho lo da el navegador; la altura se calcula con el tamaño de letra (de lo alto de una
  // mayúscula a lo bajo de una "p"), porque cada sistema operativo agrega distinto margen
  // arriba y abajo a la misma fuente y eso daba choques falsos en Linux.
  const textBox = (el: SVGTextElement): Box => {
    const b = box(el);
    const fs = parseFloat(getComputedStyle(el).fontSize) || 10;
    const p = toSvg(el)(+(el.getAttribute('x') || 0), +(el.getAttribute('y') || 0));
    const dy = parseFloat(el.getAttribute('dy') || '0');
    const base = p.y + dy;
    return { x1: b.x1, x2: b.x2, y1: base - 0.8 * fs, y2: base + 0.2 * fs };
  };
  const texts = [...svg.querySelectorAll('text')]
    .filter((t) => !t.matches('.trit,.bdgt') && (t.textContent || '').trim())
    .map((el) => ({ el, b: textBox(el) }));

  // Símbolos: cuerpos sólidos de los equipos.
  const symbols = [...svg.querySelectorAll('rect.s,circle.s,ellipse.s,path.s,circle.w,rect.arr')]
    .filter((el) => {
      const b = box(el);
      if (el.matches('circle.s') && b.x2 - b.x1 < 8) return false; // bornes pequeños del bloque
      if (el.matches('circle.w') && b.x2 - b.x1 < 18) return false; // círculo interno del TC
      if (el.matches('rect.arr') && b.x2 - b.x1 < 30) return false; // flechas pequeñas
      return true;
    })
    .map((el) => ({ el, b: box(el) }));

  // 1. Texto sobre texto
  for (let i = 0; i < texts.length; i++)
    for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i], b = texts[j];
      if (hit(shrink(a.b, 1, 0.5), shrink(b.b, 1, 0.5))) out.push({ kind: 'texto/texto', a: desc(a.el, a.b), b: desc(b.el, b.b) });
    }

  // 2. Texto sobre símbolo (salvo los rótulos que van dentro, como "kWh" o "0000")
  for (const t of texts)
    for (const s of symbols) {
      if (t.el.matches('.pol,.kwh') && contains(s.b, t.b)) continue;
      if (hit(shrink(t.b, 1, 0.5), shrink(s.b, 1.5))) out.push({ kind: 'texto/símbolo', a: desc(t.el, t.b), b: desc(s.el, s.b) });
    }

  // 3. Línea o barra por dentro de un símbolo
  const segs: { el: Element; x1: number; y1: number; x2: number; y2: number }[] = [];
  svg.querySelectorAll('line').forEach((el) => {
    const f = toSvg(el), g = (k: string) => +el.getAttribute(k)!;
    const a = f(g('x1'), g('y1')), b = f(g('x2'), g('y2'));
    segs.push({ el, x1: a.x, y1: a.y, x2: b.x, y2: b.y });
  });
  svg.querySelectorAll('path').forEach((el) => {
    const d = el.getAttribute('d') || '';
    if (!/^[MHVL\d\s.,-]+$/.test(d)) return; // solo trazos rectos
    const f = toSvg(el), tok = d.match(/[MHVL]|-?[\d.]+/g) || [];
    let cx = 0, cy = 0, cmd = '';
    for (let i = 0; i < tok.length; ) {
      if (/[MHVL]/.test(tok[i])) cmd = tok[i++];
      let nx = cx, ny = cy;
      if (cmd === 'H') nx = +tok[i++];
      else if (cmd === 'V') ny = +tok[i++];
      else { nx = +tok[i++]; ny = +tok[i++]; }
      if (cmd !== 'M') { const a = f(cx, cy), b = f(nx, ny); segs.push({ el, x1: a.x, y1: a.y, x2: b.x, y2: b.y }); }
      cx = nx; cy = ny;
      if (cmd === 'M') cmd = 'L';
    }
  });
  const bars = symbols.filter((s) => s.el.matches('rect.arr'));
  for (const s of symbols) {
    if (s.el.matches('rect.arr')) continue;
    const inner = shrink(s.b, 2), outer = shrink(s.b, -2), cxs = (s.b.x1 + s.b.x2) / 2, cys = (s.b.y1 + s.b.y2) / 2;
    for (const g of segs) {
      if (!segHits(g.x1, g.y1, g.x2, g.y2, inner)) continue;
      if (inside(g.x1, g.y1, outer) || inside(g.x2, g.y2, outer)) continue; // conexión o dibujo propio
      const vert = Math.abs(g.x1 - g.x2) < 0.5, horiz = Math.abs(g.y1 - g.y2) < 0.5;
      if ((vert && Math.abs(g.x1 - cxs) < 1.5) || (horiz && Math.abs(g.y1 - cys) < 1.5)) continue; // pasa por el centro
      out.push({ kind: 'línea/símbolo', a: desc(g.el, { x1: g.x1, y1: g.y1, x2: g.x2, y2: g.y2 }), b: desc(s.el, s.b) });
    }
    for (const bar of bars) {
      if (hit(shrink(bar.b, 0.5), inner) && !contains(bar.b, s.b) && !contains(s.b, bar.b)) out.push({ kind: 'línea/símbolo', a: desc(bar.el, bar.b), b: desc(s.el, s.b) });
    }
  }

  // 4. Borde de caja punteada que corta un texto
  for (const c of svg.querySelectorAll('rect.cel')) {
    const b = box(c);
    const edges = [[b.x1, b.y1, b.x2, b.y1], [b.x2, b.y1, b.x2, b.y2], [b.x1, b.y2, b.x2, b.y2], [b.x1, b.y1, b.x1, b.y2]];
    for (const t of texts) {
      const tb = shrink(t.b, 1, 0.5);
      if (edges.some(([x1, y1, x2, y2]) => segHits(x1, y1, x2, y2, tb))) out.push({ kind: 'caja/texto', a: desc(c, b), b: desc(t.el, t.b) });
    }
  }
  return out;
}
