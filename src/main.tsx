import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { fontsReady } from './fonts';
import './index.css';

// Se dibuja cuando las fuentes ya cargaron, para que el diagrama se mida bien.
fontsReady().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
