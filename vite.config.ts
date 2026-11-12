import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // In development the help site runs separately (`npm run preview` in docs-site, port 4321) and appears at /help,
  // on the same address as the app, as it does in production.
  server: { port: 5173, proxy: { '/help': { target: 'http://localhost:4321', changeOrigin: false } } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
