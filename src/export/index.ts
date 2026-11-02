/**
 * Exportar el diagrama: imagen PNG e informe PDF (igual al HTML actual).
 *  - PNG: escala 4×, máximo ~14 millones de píxeles, fondo blanco.
 *  - PDF (A4): cabecera y datos del proyecto, diagrama en PNG sin pérdida,
 *    "Datos de los equipos", "Revisiones" y firmas.
 */
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { TYPES } from '@/catalog';
import { brName, checks, grpOf, meterType, multiT, summary, trTot } from '@/checks';
import { buildSVG, LIGHT } from '@/diagram/engine';
import { dTitle, today } from '@/store/diagram';
import type { Diagram } from '@/types';
import { fontFaceCSS, withFonts } from './fonts';

/** Tope de píxeles de la imagen (los celulares fallan con lienzos más grandes). */
export const MAX_PX = 14e6;

/** Escala final: la pedida, sin pasar de MAX_PX y nunca menor que 1. */
export const fitScale = (w: number, h: number, scale: number) => Math.max(1, Math.min(scale, Math.sqrt(MAX_PX / (w * h))));

/** Nombre del archivo: Unifilar_<frontera o cliente>_<fecha>.<ext> */
export function fname(d: Diagram, ext: string): string {
  const t = dTitle(d);
  const base = (t !== 'Diagrama sin nombre' ? t : 'diagrama').replace(/[^\wÁÉÍÓÚáéíóúÑñ-]+/g, '_').slice(0, 40);
  return `Unifilar_${base}_${d.p.fecha || today()}.${ext}`;
}

/** La letra estándar del PDF no tiene algunos símbolos: se cambian por texto. */
export const pdfTxt = (s: unknown) =>
  String(s ?? '')
    .replace(/√/g, 'raíz')
    .replace(/Ω/g, 'ohm')
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/×/g, 'x')
    .replace(/[^\x00-\xFF—·]/g, '');

/** SVG del diagrama en colores claros y con las fuentes adentro. */
export async function exportSVG(d: Diagram): Promise<string> {
  return withFonts(buildSVG(d, LIGHT), await fontFaceCSS());
}

/** Pasa el SVG a un lienzo con fondo blanco. */
export function svgToCanvas(svg: string, scale = 2): Promise<HTMLCanvasElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = async () => {
      await img.decode().catch(() => undefined);
      const s = fitScale(img.width, img.height, scale);
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      const g = c.getContext('2d')!;
      g.fillStyle = '#fff';
      g.fillRect(0, 0, c.width, c.height);
      g.scale(s, s);
      g.drawImage(img, 0, 0);
      res(c);
    };
    img.onerror = rej;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}

const toBlob = (c: HTMLCanvasElement) =>
  new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('png'))), 'image/png'));

/** Imagen PNG del diagrama (escala 4×). */
export async function makePng(d: Diagram): Promise<Blob> {
  return toBlob(await svgToCanvas(await exportSVG(d), 4));
}

/** Filas de la tabla del proyecto. */
export function projectRows(d: Diagram): string[][] {
  const kva = d.els.filter((e) => e.t === 'trafo').reduce((a, e) => a + trTot(e), 0);
  return [
    ['Proyecto / cliente', d.p.nombre || '—'],
    ['Código de la frontera', d.p.frontera || '—'],
    ['Tipo de medida', meterType(d)],
    ['Potencia instalada', kva ? +kva.toFixed(1) + ' kVA' : '—'],
  ].map((r) => r.map(pdfTxt));
}

/** Filas de "Datos de los equipos": #, elemento, datos, estado, observación. */
export function equipmentRows(d: Diagram): string[][] {
  const T = multiT(d);
  return d.els.map((e, i) =>
    [
      String(i + 1),
      TYPES[e.t].name + (T && grpOf(d, e) > 0 ? ' (' + brName(T, grpOf(d, e)) + ')' : ''),
      summary(e, d) || '—',
      e.f.estado || 'Bueno',
      e.f.obs || '',
    ].map(pdfTxt),
  );
}

type Doc = jsPDF & { lastAutoTable: { finalY: number } };

/** Informe PDF (A4). */
export async function makePdf(d: Diagram): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' }) as Doc;
  const PW = 210, PH = 297, m = 14;
  const teal: [number, number, number] = [10, 124, 116];
  let y = 18;
  const head = (t: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(23, 38, 43);
    doc.text(pdfTxt(t), m, y);
    y += 6;
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(23, 38, 43);
  doc.text('Levantamiento de sistema de medida', m, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(91, 108, 112);
  doc.text(pdfTxt(dTitle(d)), m, y);
  y += 5;
  autoTable(doc, {
    startY: y, theme: 'grid', margin: { left: m, right: m }, styles: { fontSize: 9, cellPadding: 1.8 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 48, fillColor: [238, 242, 241] } },
    body: projectRows(d),
  });
  y = doc.lastAutoTable.finalY + 7;

  // Diagrama: PNG sin pérdida, a todo el ancho (o a toda la altura si es muy alto).
  const c = await svgToCanvas(await exportSVG(d), 3.5);
  let w = PW - 2 * m, h = (w * c.height) / c.width;
  const maxFull = PH - 18 - m - 6;
  if (h > maxFull) { h = maxFull; w = (h * c.width) / c.height; }
  if (y + 6 + h > PH - m) { doc.addPage(); y = 18; }
  head('Diagrama unifilar');
  doc.addImage(c.toDataURL('image/png'), 'PNG', m + (PW - 2 * m - w) / 2, y, w, h, undefined, 'FAST');

  doc.addPage();
  y = 18;
  head('Datos de los equipos');
  autoTable(doc, {
    startY: y, theme: 'striped', margin: { left: m, right: m }, styles: { fontSize: 8.5, cellPadding: 1.8, valign: 'top' },
    headStyles: { fillColor: teal },
    head: [['#', 'Elemento', 'Datos', 'Estado', 'Observación']],
    columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 36 }, 3: { cellWidth: 22 }, 4: { cellWidth: 40 } },
    body: equipmentRows(d),
    didParseCell: (dd) => {
      if (dd.section !== 'body' || dd.column.index !== 3) return;
      if (dd.cell.raw === 'Dañado') { dd.cell.styles.textColor = [198, 40, 40]; dd.cell.styles.fontStyle = 'bold'; }
      else if (dd.cell.raw === 'Por revisar') { dd.cell.styles.textColor = [180, 83, 15]; dd.cell.styles.fontStyle = 'bold'; }
    },
  });
  y = doc.lastAutoTable.finalY + 8;
  if (y > PH - 40) { doc.addPage(); y = 18; }
  head('Revisiones');
  autoTable(doc, {
    startY: y, theme: 'plain', margin: { left: m, right: m }, styles: { fontSize: 9, cellPadding: 1.4 },
    body: checks(d).map((k) => ['•', pdfTxt(k.text)]), columnStyles: { 0: { cellWidth: 5 } },
  });
  y = doc.lastAutoTable.finalY + 8;

  if (y > PH - 45) { doc.addPage(); y = 30; } else y += 14;
  doc.setDrawColor(23, 38, 43);
  doc.setFontSize(9);
  doc.setTextColor(23, 38, 43);
  for (const [t, x] of [['Elaboró', m], ['Revisó', PW / 2 + 4]] as const) {
    doc.line(x, y + 12, x + 80, y + 12);
    doc.text(t, x, y + 17);
  }
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140, 150, 152);
    doc.text(`Página ${i} de ${n}`, PW - m, PH - 7, { align: 'right' });
  }
  return doc.output('blob');
}

/** Descarga un archivo con un enlace temporal. */
export function download(filename: string, blob: Blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 3000);
}

/** Copia la imagen al portapapeles (para pegarla en la app de digitación). */
export async function copyPng(blob: Blob | Promise<Blob>): Promise<boolean> {
  try {
    if (!navigator.clipboard || !window.ClipboardItem) return false;
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return true;
  } catch {
    return false;
  }
}

/** Abre "Compartir" del celular con el archivo. false = el equipo no lo permite. */
export async function sharePng(blob: Blob, filename: string, title: string): Promise<boolean | 'cancel'> {
  const file = new File([blob], filename, { type: 'image/png' });
  if (!navigator.canShare?.({ files: [file] })) return false;
  try {
    await navigator.share({ files: [file], title });
    return true;
  } catch (e) {
    return (e as Error)?.name === 'AbortError' ? 'cancel' : false;
  }
}
