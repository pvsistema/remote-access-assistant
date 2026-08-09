import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// Desktop build config for "ПВ-Система Доступ" (PVSDOST.exe).
// Produces a fully static bundle in dist-desktop/ that the C# WebView2
// host loads from disk (base: './' — relative asset paths, no dev server).
export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    'import.meta.env.VITE_DESKTOP': JSON.stringify('1'),
  },
  build: {
    outDir: 'dist-desktop',
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000,
  },
});
