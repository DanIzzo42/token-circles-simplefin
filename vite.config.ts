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
    environment: 'jsdom'
  }
})
