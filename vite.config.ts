/// <reference types="vitest" />
import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solidPlugin()],
  server: {
    port: 3000,
    host: true
  },
  build: {
    outDir: 'dist'
  },
  test: {
    environment: 'jsdom',
    // vite-plugin-solid auto-adds @testing-library/jest-dom/extend-expect as a
    // setup file when it can resolve it (it does in CI), and that file needs a
    // global `expect`.
    globals: true
  }
})
