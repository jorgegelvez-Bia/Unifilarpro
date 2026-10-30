/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: 'var(--paper)',
        panel: 'var(--panel)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        line: 'var(--line)',
        accent: 'var(--accent)',
        nm: 'var(--nm)',
        bad: 'var(--bad)',
        'bad-bg': 'var(--bad-bg)',
        'ok-bg': 'var(--ok-bg)',
        'warn-bg': 'var(--warn-bg)',
      },
      fontFamily: {
        sans: ['"IBM Plex Sans Condensed"', '"Arial Narrow"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
