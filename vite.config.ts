/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    // App instalable (PWA): guarda la app completa en el celular para abrir sin internet.
    VitePWA({
      registerType: 'autoUpdate', // al publicar una versión nueva, se actualiza sola al abrir
      includeAssets: ['logo.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'UnifilarPro Medida',
        short_name: 'UnifilarPro',
        description: 'Diagrama unifilar del sistema de medida, en campo y sin internet.',
        lang: 'es-CO',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#EEF2F1',
        theme_color: '#17262B',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Todo lo de la app, incluidas las fuentes y el generador de PDF.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/e2e\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: { proxy: { '/api': 'http://localhost:8000' } },
  test: { include: ['tests/**/*.test.ts'] },
});
