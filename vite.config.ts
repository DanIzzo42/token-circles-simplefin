/// <reference types="vitest" />
import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'

// Listen on the home network and accept Bonjour names like "dans-macbook.local",
// so other devices in the house can open the app. localhost and IPs are
// always allowed.
const homeNetwork = {
  host: true,
  port: 3000,
  allowedHosts: ['.local']
}

export default defineConfig({
  plugins: [solidPlugin()],
  server: homeNetwork,
  preview: homeNetwork,
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
