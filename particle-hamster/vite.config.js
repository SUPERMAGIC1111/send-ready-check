import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// relative asset paths so dist/ works from any folder or static host; two pages
export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: { input: { index: resolve(import.meta.dirname, 'index.html'), gallery: resolve(import.meta.dirname, 'gallery.html'), galleryV3: resolve(import.meta.dirname, 'gallery-v3.html'), lab: resolve(import.meta.dirname, 'lab.html') } },
  },
  worker: { format: 'es' },
});
