import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import { createApp, type TheruApp } from '../server/app'

export interface TestServer {
  baseUrl: string
  app: TheruApp
  close: () => Promise<void>
}

/**
 * Boots a real Express app against a throwaway SQLite file and listens on an
 * ephemeral port, so frontend tests can exercise the same HTTP surface a
 * browser would.
 */
export async function startTestServer(): Promise<TestServer> {
  const dir = mkdtempSync(path.join(tmpdir(), 'theru-test-'))
  const app = createApp({ dbPath: path.join(dir, 'theru.sqlite') })
  const server: Server = app.app.listen(0, '127.0.0.1')
  await new Promise<void>((resolve) => server.once('listening', () => resolve()))
  const { port } = server.address() as AddressInfo

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    app,
    close: async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()))
      app.close()
      rmSync(dir, { recursive: true, force: true })
    },
  }
}

export function tempDbPath() {
  const dir = mkdtempSync(path.join(tmpdir(), 'theru-db-'))
  return {
    file: path.join(dir, 'theru.sqlite'),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  }
}
