import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@fortawesome/react-fontawesome': fileURLToPath(
        new URL('./node_modules/@fortawesome/react-fontawesome/dist/index.js', import.meta.url),
      ),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
  },
});
