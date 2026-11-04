/**
 * Reglas en TypeScript (copia de backend/app/rules/ para trabajar sin internet).
 * La fuente oficial es Python; tests/rules.test.ts compara ambas con shared/test-cases/.
 */
export { checks, OK_TEXT } from './checks';
export { applyAutoFuse, fuseFor, primaryKV } from './fuse';
export { meterType } from './meterType';
export { celdaCands, celdaSel, faseText, irrLabel, summary } from './summary';
export * from './common';
export * from './wiring';
export * from './phasor';
