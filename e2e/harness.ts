/** Página de prueba: dibuja diagramas al azar y busca choques. La usa anticruces.spec.ts. */
import { buildSVG, LIGHT } from '@/diagram/engine';
import { findCollisions, type Collision } from './collisions';
import { randomDiagram } from './randomDiagrams';

export interface Failure { i: number; types: string; collisions: Collision[] }

function run(from: number, to: number, seed?: number): Failure[] {
  const host = document.getElementById('host')!;
  const fails: Failure[] = [];
  for (let i = from; i < to; i++) {
    const d = randomDiagram(i, seed);
    host.innerHTML = buildSVG(d, LIGHT);
    const c = findCollisions(host.querySelector('svg')!);
    if (c.length) fails.push({ i, types: d.els.map((e) => e.t + (e.rama ? '@' + e.rama : '')).join(','), collisions: c });
  }
  return fails;
}

function show(i: number, seed?: number) {
  const d = randomDiagram(i, seed);
  document.getElementById('host')!.innerHTML = buildSVG(d, LIGHT);
  return d;
}

Object.assign(window, { runAntiCruces: run, showDiagram: show });
document.body.dataset.ready = '1';
