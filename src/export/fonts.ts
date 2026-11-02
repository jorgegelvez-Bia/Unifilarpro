/**
 * Fuentes metidas dentro del SVG que se exporta.
 * Un SVG convertido en imagen no ve las fuentes de la página: sin esto, el PNG y el PDF
 * saldrían con otra letra y los textos podrían montarse.
 */
import sans400 from '@fontsource/ibm-plex-sans-condensed/files/ibm-plex-sans-condensed-latin-400-normal.woff2?url';
import sans500 from '@fontsource/ibm-plex-sans-condensed/files/ibm-plex-sans-condensed-latin-500-normal.woff2?url';
import sans600 from '@fontsource/ibm-plex-sans-condensed/files/ibm-plex-sans-condensed-latin-600-normal.woff2?url';
import sans700 from '@fontsource/ibm-plex-sans-condensed/files/ibm-plex-sans-condensed-latin-700-normal.woff2?url';
import mono400 from '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2?url';
import mono500 from '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2?url';
import mono600 from '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-600-normal.woff2?url';

const FACES: [family: string, weight: number, url: string][] = [
  ['IBM Plex Sans Condensed', 400, sans400],
  ['IBM Plex Sans Condensed', 500, sans500],
  ['IBM Plex Sans Condensed', 600, sans600],
  ['IBM Plex Sans Condensed', 700, sans700],
  ['IBM Plex Mono', 400, mono400],
  ['IBM Plex Mono', 500, mono500],
  ['IBM Plex Mono', 600, mono600],
];

const toDataUrl = (blob: Blob) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });

let css: Promise<string> | null = null;

/** Reglas @font-face con cada fuente en base64 (se arman una sola vez). */
export function fontFaceCSS(): Promise<string> {
  css ??= Promise.all(
    FACES.map(async ([family, weight, url]) => {
      const data = await toDataUrl(await (await fetch(url)).blob());
      return `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};src:url(${data}) format('woff2')}`;
    }),
  )
    .then((r) => r.join(''))
    .catch((e) => {
      css = null; // se reintenta la próxima vez
      throw e;
    });
  return css;
}

/** Pone las fuentes al inicio del <style> del SVG. */
export const withFonts = (svg: string, faces: string) => svg.replace('<style>', `<style>${faces}`);
