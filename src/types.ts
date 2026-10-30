/** Modelo de datos (igual a backend/app/models.py). */

export interface Element {
  id: string;
  /** Tipo de elemento (clave del catálogo). */
  t: string;
  /** Valores de sus campos. */
  f: Record<string, any>;
  /** 0 / undefined = parte principal; k = ramal k (varios trafos o totalizadores). */
  rama?: number | null;
  fotos?: unknown[];
}

export interface Project {
  nombre: string;
  frontera: string;
  fecha: string;
  elaboro: string;
  idp: string;
  nic: string;
  tipoPunto: string;
}

export interface Diagram {
  id: string;
  p: Project;
  /** El orden de la lista = el orden del unifilar, de arriba hacia abajo. */
  els: Element[];
  updated: number;
}

/** Lo mínimo que necesitan las reglas. */
export type DiagramLike = { els: Element[]; p?: Partial<Project> };

export interface CheckItem {
  level: 'bad' | 'warn' | 'ok';
  text: string;
}

export interface FuseResult {
  amp: number;
  In: number;
  text: string;
  src: string;
  mono: boolean;
  unit: number;
  kv: number;
  ti: number;
}
