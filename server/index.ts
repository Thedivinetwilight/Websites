import { createApp } from './app.js'

/**
 * Theru demo API + (in production) the built frontend.
 *
 * Binds to localhost by default. Set HOST=0.0.0.0 only if you deliberately
 * want to expose the demo on your network — it has no authentication.
 */

const port = Number(process.env.PORT ?? 3001)
const host = process.env.HOST ?? '127.0.0.1'
// `--no-static` is passed by `npm run dev:api` so the dev API never serves a
// stale build from dist/; Vite owns the frontend in development.
const serveStatic = process.env.THERU_SERVE_STATIC !== '0' && !process.argv.includes('--no-static')

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`[theru] Invalid PORT: ${process.env.PORT}`)
  process.exit(1)
}

const theru = createApp({ serveStatic })

const server = theru.app.listen(port, host, () => {
  console.log(`[theru] API listening on http://${host}:${port}`)
  console.log(`[theru] SQLite: ${theru.dbPath}${theru.seeded ? ' (seeded)' : ''}`)
  console.log('[theru] Demo build — no authentication. Do not expose this to the internet.')
})

function shutdown(signal: string) {
  console.log(`\n[theru] ${signal} received, closing database…`)
  server.close(() => {
    try {
      theru.close()
    } finally {
      process.exit(0)
    }
  })
  setTimeout(() => process.exit(1), 5000).unref()
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

// Fail loudly rather than leaving the browser with an unreachable API.
process.on('unhandledRejection', (error) => {
  console.error('[theru] Unhandled rejection:', error)
})
