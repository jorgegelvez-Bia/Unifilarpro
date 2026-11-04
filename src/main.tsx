import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { fontsReady } from './fonts';
import { useStore } from './store/diagram';
import { startSync } from './sync';
import './index.css';

/** Espera a que se lean los diagramas guardados en el celular (IndexedDB es asíncrono). */
const hydrated = () =>
  new Promise<void>((res) => {
    if (useStore.persist.hasHydrated()) return res();
    useStore.persist.onFinishHydration(() => res());
  });

// Se dibuja cuando las fuentes y los datos ya cargaron, para que el diagrama se mida bien
// y nada se escriba encima de lo guardado.
Promise.all([fontsReady(), hydrated()]).finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
  startSync();
});
