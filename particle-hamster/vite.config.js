import { defineConfig } from 'vite';

// relative asset paths so dist/ works from any folder or static host
export default defineConfig({ base: './', build: { chunkSizeWarningLimit: 800 } });
