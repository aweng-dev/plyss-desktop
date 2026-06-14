import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

// electron-vite drives three independent builds (main · preload · renderer).
// The renderer is a plain Vite + React app — it reuses the admin UI copied from
// apps/landing under src/renderer/src, so it shares that exact design system.
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/main/index.ts') },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/preload/index.ts') },
      },
    },
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    // Guarantee a single copy of React even though the UI was copied in — avoids
    // the "invalid hook call" duplicate-React trap.
    resolve: {
      dedupe: ['react', 'react-dom', 'react-router-dom'],
    },
    plugins: [react()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/renderer/index.html') },
      },
    },
  },
})
