import { useEffect, useState } from 'react';
import { dTitle, useStore } from '@/store/diagram';

/** El generador de PDF es pesado: se carga solo cuando se usa. */
const ex = () => import('@/export');

const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

/** Botones "Imagen PNG" e "Informe PDF", y la ventana para copiar o compartir la imagen. */
export function ExportButtons() {
  const cur = useStore((s) => s.cur);
  const setToast = useStore((s) => s.setToast);
  const [busy, setBusy] = useState(false);
  const [png, setPng] = useState<{ blob: Blob; url: string } | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => () => { if (png) URL.revokeObjectURL(png.url); }, [png]);

  const onPng = async () => {
    setBusy(true);
    setToast('Preparando la imagen…');
    try {
      const { download, fname, makePng, sharePng } = await ex();
      const blob = await makePng(cur);
      const name = fname(cur, 'png');
      // En iPhone/iPad se abre "Compartir" para guardar en la galería.
      if (isIOS()) {
        const r = await sharePng(blob, name, dTitle(cur));
        if (r) return;
      }
      download(name, blob);
      setToast('✔ Imagen descargada: ' + name);
      setMsg('');
      setPng({ blob, url: URL.createObjectURL(blob) });
    } catch {
      setToast('No se pudo crear la imagen.');
    } finally {
      setBusy(false);
    }
  };

  const onPdf = async () => {
    setBusy(true);
    setToast('Generando informe…');
    try {
      const { download, fname, makePdf } = await ex();
      const name = fname(cur, 'pdf');
      download(name, await makePdf(cur));
      setToast('Archivo listo: ' + name);
    } catch (e) {
      console.error(e);
      setToast('No se pudo crear el PDF.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button className="btn" disabled={busy} onClick={onPng}>Imagen PNG</button>
      <button className="btn-pri" disabled={busy} onClick={onPdf}>Informe PDF</button>

      {png && (
        <div className="fixed inset-0 z-40 flex items-start justify-center overflow-auto bg-black/50 p-4" onClick={() => setPng(null)}>
          <div role="dialog" aria-label="Imagen del diagrama" className="panel w-full max-w-[820px]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <b>Imagen del diagrama</b>
              <button className="btn" onClick={() => setPng(null)}>Cerrar</button>
            </div>
            {msg && <p className="m-0 text-sm font-semibold text-accent">{msg}</p>}
            <div className="flex flex-wrap gap-2">
              <button
                className="btn-pri"
                onClick={async () => {
                  const ok = await (await ex()).copyPng(png.blob);
                  setMsg(ok ? '✔ Imagen copiada. Pégala en la app de digitación.' : 'Este navegador no deja copiar imágenes aquí. Usa «Compartir» o mantén presionada la imagen.');
                  if (ok) setToast('Imagen copiada.');
                }}
              >
                📋 Copiar imagen
              </button>
              <button
                className="btn"
                onClick={async () => {
                  const { sharePng, fname } = await ex();
                  const r = await sharePng(png.blob, fname(cur, 'png'), dTitle(cur));
                  if (r === false) setMsg('No se pudo compartir desde aquí. Mantén presionada la imagen › Guardar imagen.');
                }}
              >
                📤 Compartir o guardar en galería
              </button>
              <button className="btn" onClick={async () => { const { download, fname } = await ex(); download(fname(cur, 'png'), png.blob); }}>⬇ Descargar archivo</button>
            </div>
            <p className="m-0 text-xs text-muted">
              También puedes: en el celular, <b>mantener presionada la imagen</b> › «Guardar imagen» o «Copiar». En el PC, clic derecho › «Copiar imagen».
            </p>
            <img src={png.url} alt="Diagrama unifilar exportado" className="h-auto w-full rounded-md border border-line" />
          </div>
        </div>
      )}
    </>
  );
}
