import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'src',
  build: {
    outDir: '../public',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    open: true
  }
});
