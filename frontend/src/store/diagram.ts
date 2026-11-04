/**
 * Estado de la app (Zustand). Se guarda en el celular (IndexedDB) y, con sesión iniciada,
 * se sincroniza con Supabase (ver src/sync/). Cada cambio deja el diagrama pendiente de subir.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { CATALOG, TYPES, fieldsOf } from '@/catalog';
import { applyAutoFuse, brName, fillDefaults, mainBk, multiT, multiTr, trN, grpOf, wrDefault, fsDefault, FS_SEQ, FS_MODO } from '@/checks';
import { emptySync, type SyncState } from '@/sync/engine';
import type { Diagram, Element } from '@/types';
import { idbStorage } from './idb';

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const today = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
};

/** Crea un elemento con sus valores por defecto. */
export function mk(t: string, over: Record<string, string> = {}): Element {
  const f: Record<string, any> = {};
  for (const fs of fieldsOf(t)) f[fs.key] = fs.default;
  return { id: uid(), t, f: { ...f, ...over }, fotos: [] };
}

export type TemplateKind = 'vacio' | 'directa' | 'semidirecta' | 'indirecta' | 'distribucion';

export function newDiagram(kind: TemplateKind = 'vacio'): Diagram {
  const els = (CATALOG.templates[kind] || []).map(({ t, over }) => mk(t, over));
  return { id: uid(), p: { nombre: '', frontera: '', fecha: today(), elaboro: '', idp: '', nic: '', tipoPunto: '' }, els, updated: Date.now() };
}

/** Ajusta los ramales cuando cambia la cantidad de trafos/totalizadores (`normRamas`). */
function normRamas(d: Diagram) {
  const T = multiT(d);
  if (T) {
    const n = trN(T), ti = d.els.indexOf(T);
    delete T.rama;
    if (!d.els.some((e) => (e.rama ?? 0) > 0)) d.els.forEach((e, i) => { if (i > ti) e.rama = 1; });
    d.els.forEach((e) => { if ((e.rama ?? 0) > n) e.rama = n; });
  } else d.els.forEach((e) => { delete e.rama; });
}

/** "Solo carga" agrega una carga sola en ese ramal (`ensureSoloCarga`). */
function ensureSoloCarga(d: Diagram) {
  const T = multiT(d);
  if (!T) return;
  for (let k = 1; k <= trN(T); k++) {
    if (T.f['med' + k] === 'Solo carga' && !d.els.some((x) => x.t === 'carga' && x.rama === k)) {
      const c = mk('carga');
      c.rama = k;
      d.els.push(c);
    }
  }
}

/** Abre un diagrama viejo aplicando las migraciones de datos (`openDiagram`). */
export function migrate(src: Diagram): Diagram {
  const d: Diagram = structuredClone(src);
  const p: any = d.p;
  if (p.direccion && !p.frontera) {
    const m = String(p.direccion).match(/\bFRT\s*\d+/i);
    if (m) p.frontera = m[0].replace(/\s+/g, '').toUpperCase();
  }
  p.tipoPunto = p.tipoPunto || '';
  for (const e of [...d.els]) {
    e.fotos = e.fotos || [];
    if (e.t === 'trafo' && ('uso' in e.f || 'otrosCant' in e.f)) {
      if (e.f.uso === 'Compartido') {
        const o = mk('otros');
        if (e.rama != null) o.rama = e.rama;
        if (e.f.otrosDesc) o.f.descripcion = e.f.otrosDesc === 'Otros' ? 'Sin especificar' : e.f.otrosDesc;
        d.els.splice(d.els.indexOf(e) + 1, 0, o);
      }
      delete e.f.uso; delete e.f.otrosCant; delete e.f.otrosDesc;
    }
    if ((e.t === 'otros' || e.t === 'carga') && e.f.descripcion && !['Residencial', 'Comercial', 'Industrial', 'Sin especificar'].includes(e.f.descripcion)) {
      const v = String(e.f.descripcion).toLowerCase();
      e.f.descripcion = v.startsWith('resid') ? 'Residencial' : v.startsWith('comer') ? 'Comercial' : v.startsWith('indus') ? 'Industrial' : 'Sin especificar';
    }
    if (e.t === 'celda' && e.f.tipo && !['Sin indicar', 'Metálica', 'Policarbonato'].includes(e.f.tipo)) e.f.tipo = 'Metálica';
    if (e.t === 'doble' && (e.f.uso === 'Circuito 1' || e.f.uso === 'Circuito 2')) e.f.uso = e.f.uso === 'Circuito 2' ? 'Cerrado circuito 2' : 'Ambos cerrados';
    if (e.t === 'gabinete' && !e.f._gm) { if (e.f.material === 'Metálico') e.f.material = 'Sin especificar'; e.f._gm = 1; }
    if (e.t === 'cajab' && e.f.abonados === 'Sin indicar') e.f.abonados = '';
    if (e.t === 'acom' && !e.f._pfv) { if (e.f.porFase === '1') e.f.porFase = 'Sin indicar'; e.f._pfv = 1; }
    if (e.t === 'trafo') {
      if (e.f.configuracion !== 'Banco de monofásicos') e.f.configuracion = 'Independientes';
      const n = parseInt(e.f.cantidad) || 1;
      e.f.cantidad = String(Math.min(99, Math.max(1, n)));
      if (n > 1 && e.f.potencia && e.f.potencia2 === undefined) for (let i = 2; i <= n; i++) e.f['potencia' + i] = e.f.potencia;
    }
    if (e.t === 'fus' && e.f.criterio === undefined && src.updated && src.els.some((x) => x.t === 'trafo')) e.f.criterio = 'Automático según trafo';
  }
  fillDefaults(d);
  // Breakers seguidos en la parte principal = un solo totalizador con varios.
  if (!multiTr(d)) {
    for (let i = 0; i < d.els.length - 1; i++) {
      const a = d.els[i], b = d.els[i + 1];
      if (a.t === 'breaker' && b.t === 'breaker' && !(a.rama! > 0) && !(b.rama! > 0) && trN(b) === 1 && (trN(a) === 1 || (a as any)._mg)) {
        const n = trN(a) + 1;
        a.f.cantidad = String(n);
        a.f['corriente' + n] = b.f.corriente || '';
        a.f['polos' + n] = b.f.polos || 'Sin indicar';
        (a as any)._mg = 1;
        d.els.splice(i + 1, 1);
        i--;
      }
    }
    d.els.forEach((e) => delete (e as any)._mg);
  }
  normRamas(d);
  ensureSoloCarga(d);
  applyAutoFuse(d);
  return d;
}

interface State {
  cur: Diagram;
  diagrams: Diagram[];
  /** Ramal donde se agregan los elementos nuevos (0 = parte principal). */
  addRama: number;
  openId: string | null;
  closedGroups: string[];
  toast: string;
  /** Qué falta subir a la nube y hasta dónde se bajó. */
  sync: SyncState;
  /** Usuario de la nube con el que se sincronizó este celular. */
  syncUser: string;

  setToast: (t: string) => void;
  setProject: (k: string, v: string) => void;
  add: (t: string) => void;
  setField: (id: string, k: string, v: any) => void;
  setRama: (id: string, k: number) => void;
  setAddRama: (k: number) => void;
  move: (i: number, dir: -1 | 1) => void;
  remove: (i: number) => void;
  toggleOpen: (id: string | null) => void;
  toggleGroup: (key: string) => void;
  create: (kind: TemplateKind) => void;
  finish: () => void;
  openDiagram: (id: string) => void;
  duplicate: (id: string) => void;
  deleteDiagram: (id: string) => void;
  /** Guarda el resultado de una sincronización (y actualiza el diagrama abierto si cambió). */
  applySync: (r: { diagrams?: Diagram[]; sync: SyncState; changed?: string[] }) => void;
  setSyncUser: (u: string) => void;
}

/** Marca un diagrama como pendiente de subir (y quita su lápida si la tenía). */
const touch = (s: SyncState, id: string): SyncState => {
  const gone = { ...s.gone };
  delete gone[id];
  return { ...s, dirty: s.dirty.includes(id) ? s.dirty : [...s.dirty, id], gone };
};
/** Marca un diagrama como borrado (la lápida también se sube). */
const bury = (s: SyncState, id: string, ts: number): SyncState => ({
  ...s,
  dirty: s.dirty.includes(id) ? s.dirty : [...s.dirty, id],
  gone: { ...s.gone, [id]: ts },
});

const isEmpty = (d: Diagram) => !d.els.length && !d.p.nombre.trim() && !d.p.frontera.trim();
export const dTitle = (d: Diagram) => d.p.frontera.trim() || d.p.nombre || 'Diagrama sin nombre';

export const useStore = create<State>()(
  persist(
    (set, get) => {
      /** Cambia el diagrama actual sobre una copia y lo guarda en "Mis diagramas". */
      const mutate = (fn: (d: Diagram) => void, extra: Partial<State> = {}) => {
        const d = structuredClone(get().cur);
        fn(d);
        applyAutoFuse(d);
        d.updated = Date.now();
        const had = get().diagrams.some((x) => x.id === d.id);
        const diagrams = get().diagrams.filter((x) => x.id !== d.id);
        let sync = get().sync;
        if (!isEmpty(d)) { diagrams.push(d); sync = touch(sync, d.id); }
        else if (had) sync = bury(sync, d.id, d.updated); // quedó vacío: sale de Mis diagramas
        set({ cur: d, diagrams, sync, ...extra });
      };

      return {
        cur: newDiagram('vacio'),
        diagrams: [],
        addRama: 0,
        openId: null,
        closedGroups: [],
        toast: '',
        sync: emptySync(),
        syncUser: '',

        setToast: (toast) => set({ toast }),
        setProject: (k, v) => mutate((d) => { (d.p as any)[k] = v; }),

        add: (t) => {
          const { cur, addRama } = get();
          if (t === 'breaker' && !multiTr(cur) && mainBk(cur)) {
            // Cada toque suma un totalizador al mismo elemento.
            const B = mainBk(cur)!;
            const k = trN(B) + 1;
            mutate((d) => {
              const b = d.els.find((x) => x.id === B.id)!;
              b.f.cantidad = String(k);
              normRamas(d);
            }, { addRama: k, openId: B.id, toast: `Totalizador ${k} agregado. Lo que agregues ahora va al Totalizador ${k}.` });
            return;
          }
          const el = mk(t);
          if (t === 'celda') el.f.incl = [];
          if (t === 'gabinete') el.f._gm = 1;
          if (t === 'acom') el.f._pfv = 1;
          if (t === 'conex') { el.f.tipo = wrDefault(cur); el.f.bornes = 'Asimétrico'; el.f.nov = []; }
          if (t === 'fasor') { el.f.sis = fsDefault(cur); el.f.seq = FS_SEQ[0]; el.f.modo = FS_MODO[0]; }
          if (t === 'transc') {
            const db = [...cur.els].reverse().find((x) => x.t === 'doble');
            if (db) {
              el.f.nombre1 = db.f.nombre1 || '';
              el.f.nombre2 = db.f.nombre2 || '';
              if (/circuito 2$/.test(db.f.uso || '')) el.f.enUso = 'Circuito 2';
              else if (/circuito 1$/.test(db.f.uso || '')) el.f.enUso = 'Circuito 1';
            }
          }
          let openId: string | null = null;
          mutate((d) => {
            const T = multiT(d);
            if (T && t !== 'trafo') {
              const k = Math.min(addRama, trN(T));
              if (k > 0) { el.rama = k; d.els.push(el); openId = T.id; return; }
              else d.els.splice(d.els.indexOf(T), 0, el);
            } else d.els.push(el);
            // Los diagramas de conexiones y fasorial se abren solos para escoger el tipo.
            if (t === 'conex' || t === 'fasor') openId = el.id;
          });
          set({ openId, toast: `${TYPES[t].name} agregado. Tócalo en la lista para poner sus datos.` });
        },

        setField: (id, k, v) =>
          mutate((d) => {
            const e = d.els.find((x) => x.id === id);
            if (!e) return;
            e.f[k] = v;
            if (e.t === 'dps' && k === 'malos' && +v > 0) e.f.estado = 'Dañado';
            if ((e.t === 'trafo' || e.t === 'breaker') && (k === 'cantidad' || k === 'configuracion')) normRamas(d);
            ensureSoloCarga(d);
          }),

        setRama: (id, k) => mutate((d) => { const e = d.els.find((x) => x.id === id); if (e) e.rama = k; }),
        setAddRama: (k) => {
          const T = multiT(get().cur);
          set({ addRama: k, toast: k && T ? `Lo que agregues ahora va al ${brName(T, k)}.` : 'Lo que agregues ahora va en la parte principal.' });
        },

        move: (i, dir) =>
          mutate((d) => {
            const g = grpOf(d, d.els[i]);
            let j = i + dir;
            while (j >= 0 && j < d.els.length && grpOf(d, d.els[j]) !== g) j += dir;
            if (j < 0 || j >= d.els.length) return;
            [d.els[j], d.els[i]] = [d.els[i], d.els[j]];
          }),

        remove: (i) =>
          mutate((d) => {
            const [was] = d.els.splice(i, 1);
            if (was.t === 'trafo' || was.t === 'breaker') normRamas(d);
          }, { addRama: 0 }),

        toggleOpen: (id) => set({ openId: get().openId === id ? null : id }),
        toggleGroup: (key) => {
          const c = get().closedGroups;
          set({ closedGroups: c.includes(key) ? c.filter((x) => x !== key) : [...c, key] });
        },

        create: (kind) => {
          const d = migrate(newDiagram(kind));
          const vacio = kind === 'vacio';
          const diagrams = vacio ? get().diagrams : [...get().diagrams, d];
          const sync = vacio ? get().sync : touch(get().sync, d.id);
          set({ cur: d, diagrams, sync, addRama: 0, openId: null, toast: 'Diagrama nuevo creado.' });
        },

        finish: () => {
          const { cur } = get();
          if (isEmpty(cur)) return set({ toast: 'Todavía no hay nada que guardar: agrega elementos al diagrama.' });
          set({ cur: newDiagram('vacio'), addRama: 0, openId: null, toast: `✔ Guardado en Mis diagramas: ${dTitle(cur)}. Puedes empezar uno nuevo.` });
        },

        openDiagram: (id) => {
          const x = get().diagrams.find((z) => z.id === id);
          if (x) set({ cur: migrate(x), addRama: 0, openId: null, toast: `Abierto: ${dTitle(x)}. Agrega, quita o toca un elemento para cambiarlo.` });
        },

        duplicate: (id) => {
          const x = get().diagrams.find((z) => z.id === id);
          if (!x) return;
          const c: Diagram = { ...structuredClone(x), id: uid(), updated: Date.now() };
          c.p.nombre = (c.p.nombre || 'Diagrama') + ' (copia)';
          set({ diagrams: [...get().diagrams, c], sync: touch(get().sync, c.id), toast: 'Copia creada.' });
        },

        deleteDiagram: (id) => {
          const diagrams = get().diagrams.filter((z) => z.id !== id);
          const cur = get().cur.id === id ? newDiagram('vacio') : get().cur;
          set({ diagrams, cur, sync: bury(get().sync, id, Date.now()), toast: 'Diagrama borrado.' });
        },

        applySync: ({ diagrams, sync, changed }) => {
          if (!diagrams) return set({ sync });
          let cur = get().cur;
          if (changed?.includes(cur.id)) {
            const x = diagrams.find((z) => z.id === cur.id);
            cur = x ? migrate(x) : newDiagram('vacio'); // lo cambiaron (o borraron) en otro equipo
          }
          set({ diagrams, sync, cur });
        },

        setSyncUser: (syncUser) => {
          const { syncUser: before, diagrams } = get();
          if (syncUser === before) return;
          // Cuenta nueva en este celular: se sube todo lo que hay aquí y se baja todo lo de la nube.
          set({ syncUser, sync: { dirty: diagrams.map((d) => d.id), gone: {}, lastPull: '' } });
        },
      };
    },
    {
      name: 'unifilarpro-medida',
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({ cur: s.cur, diagrams: s.diagrams, closedGroups: s.closedGroups, sync: s.sync, syncUser: s.syncUser }),
    },
  ),
);
