import { defineConfig } from 'vite';

export default defineConfig({
  root: import.meta.dirname,
  base: './',
  resolve: {
    alias: {
      highbeam: `${import.meta.dirname}/../src/index.ts`,
    },
  },
  esbuild: {
    jsx: 'automatic',
  },
  build: {
    outDir: `${import.meta.dirname}/../dist-demo`,
    emptyOutDir: true,
  },
});
