/**
 * Fuentes del diagrama incluidas en la app (no se descargan de Google):
 * funcionan sin internet y miden igual en cualquier equipo, así los textos no se montan.
 */
import '@fontsource/ibm-plex-sans-condensed/latin-400.css';
import '@fontsource/ibm-plex-sans-condensed/latin-500.css';
import '@fontsource/ibm-plex-sans-condensed/latin-600.css';
import '@fontsource/ibm-plex-sans-condensed/latin-700.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import '@fontsource/ibm-plex-mono/latin-600.css';

const NEEDED = [
  '400 12px "IBM Plex Sans Condensed"',
  '500 12px "IBM Plex Sans Condensed"',
  '600 12px "IBM Plex Sans Condensed"',
  '700 12px "IBM Plex Sans Condensed"',
  '400 12px "IBM Plex Mono"',
  '500 12px "IBM Plex Mono"',
  '600 12px "IBM Plex Mono"',
];

/** Espera a que las fuentes estén listas (el diagrama se mide con ellas). */
export async function fontsReady(): Promise<boolean> {
  try {
    await Promise.all(NEEDED.map((f) => document.fonts.load(f, 'ÁáÑñ kWh 0')));
    return NEEDED.every((f) => document.fonts.check(f));
  } catch {
    return false;
  }
}
