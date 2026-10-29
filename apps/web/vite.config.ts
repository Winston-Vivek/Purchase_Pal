import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
// From vitest/config, not vite: it is the one that knows about the `test`
// key, and vue-tsc rejects the plain Vite type.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    proxy: {
      // The API sets an httpOnly cookie, so the browser has to see one origin.
      // Proxying in dev avoids CORS and keeps the cookie first-party.
      '/api': {
        target: process.env.VITE_API_TARGET ?? 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    coverage: { reporter: ['text', 'json-summary'], include: ['src/**/*.{ts,vue}'] },
  },
});
