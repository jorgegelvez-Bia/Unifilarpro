/**
 * Guardado en el celular con IndexedDB (cabe mucho más que en localStorage y no se borra
 * al limpiar el caché normal del navegador). La primera vez trae lo que había en localStorage.
 */
import { del, get, set } from 'idb-keyval';
import type { StateStorage } from 'zustand/middleware';

export const idbStorage: StateStorage = {
  async getItem(name) {
    try {
      const v = await get<string>(name);
      if (v != null) return v;
    } catch {
      /* sin IndexedDB (navegación privada): se usa localStorage */
    }
    return localStorage.getItem(name); // datos de antes de la fase 9
  },
  async setItem(name, value) {
    try {
      await set(name, value);
      localStorage.removeItem(name); // ya quedó en IndexedDB
    } catch {
      localStorage.setItem(name, value);
    }
  },
  async removeItem(name) {
    try { await del(name); } catch { /* nada */ }
    localStorage.removeItem(name);
  },
};
