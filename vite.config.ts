import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Localhost by default. Set HOST=0.0.0.0 only when you deliberately want the
// demo reachable from another device — it has no authentication.
const host = process.env.HOST ?? '127.0.0.1'
const apiTarget = `http://127.0.0.1:${process.env.API_PORT ?? '3001'}`

export default defineConfig({
  plugins: [react()],
  server: {
    host,
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      '/api': { target: apiTarget },
    },
  },
  preview: {
    host,
    port: 4173,
    allowedHosts: true,
    proxy: {
      '/api': { target: apiTarget },
    },
  },
})
