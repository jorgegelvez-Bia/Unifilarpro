/** Reglas TypeScript contra los mismos casos que usa pytest (shared/test-cases/). */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { checks, fillDefaults, fuseFor, meterType, summary } from '@/checks';
import type { DiagramLike } from '@/types';

const DIR = path.resolve(__dirname, '../../shared/test-cases');
const files = readdirSync(DIR).filter((f) => f.endsWith('.json')).sort();

function load(file: string) {
  const data = JSON.parse(readFileSync(path.join(DIR, file), 'utf-8'));
  return { d: fillDefaults(structuredClone(data.diagram) as DiagramLike), exp: data.expect };
}

it('hay casos compartidos', () => expect(files.length).toBeGreaterThanOrEqual(10));

describe.each(files)('%s', (file) => {
  it('tipo de medida', () => {
    const { d, exp } = load(file);
    expect(meterType(d)).toBe(exp.meterType);
  });

  it('fusible', () => {
    const { d, exp } = load(file);
    const got = fuseFor(d);
    if (exp.fuse === null) return expect(got).toBeNull();
    expect(got).not.toBeNull();
    for (const [k, v] of Object.entries(exp.fuse)) {
      if (k === 'In') expect(got!.In).toBeCloseTo(v as number, 3);
      else expect((got as any)[k]).toBe(v);
    }
  });

  it('revisiones', () => {
    const { d, exp } = load(file);
    expect(checks(d)).toEqual(exp.checks);
  });

  it('resúmenes', () => {
    const { d, exp } = load(file);
    for (const [id, text] of Object.entries(exp.summaries ?? {})) {
      expect(summary(d.els.find((e) => e.id === id)!, d), id).toBe(text);
    }
  });
});
