/**
 * Catálogo de elementos. NO editar catalog.json a mano:
 * se genera desde backend/app/catalog.py con `python scripts/export_catalog.py`.
 */
import raw from './catalog.json';

export interface FieldSpec {
  key: string;
  label: string;
  kind: 'select' | 'text' | 'ref';
  options?: string[];
  default: string;
}

export interface TypeSpec {
  name: string;
  short: string;
  btn: string;
  sub: string;
  noCommon: boolean;
  mk?: [string, string];
  fields: FieldSpec[];
}

export interface GroupSpec {
  key: string;
  name: string;
  items: string[];
  color: string;
  colorDark: string;
}

export interface Catalog {
  types: Record<string, TypeSpec>;
  common: FieldSpec[];
  groups: GroupSpec[];
  medidaRamal: string[];
  templates: Record<string, { t: string; over: Record<string, string> }[]>;
}

export const CATALOG = raw as unknown as Catalog;
export const TYPES = CATALOG.types;
export const GROUPS = CATALOG.groups;

export function fieldsOf(t: string): FieldSpec[] {
  const s = TYPES[t];
  return s.noCommon ? s.fields : [...s.fields, ...CATALOG.common];
}

const sel = (key: string, label: string, options: string[]): FieldSpec => ({ key, label, kind: 'select', options, default: options[0] });
const txt = (key: string, label: string): FieldSpec => ({ key, label, kind: 'text', default: '' });
const POLOS = ['Sin indicar', '3', '2', '1'];

/** Campos extra por trafo cuando hay varios trafos independientes. */
export const trFields = (k: number): FieldSpec[] => [
  txt(k === 1 ? 'potencia' : `potencia${k}`, `kVA trafo ${k}`),
  sel(`med${k}`, `Medida trafo ${k}`, CATALOG.medidaRamal),
  sel(`secc${k}`, `Seccionador trafo ${k}`, ['No', 'Sí']),
];

/** Campos extra por totalizador cuando hay varios totalizadores. */
export const bkFields = (k: number): FieldSpec[] => [
  txt(k === 1 ? 'corriente' : `corriente${k}`, `Capacidad (A) totalizador ${k}`),
  sel(k === 1 ? 'polos' : `polos${k}`, `Polos totalizador ${k}`, POLOS),
  sel(`med${k}`, `Medida totalizador ${k}`, CATALOG.medidaRamal),
];
