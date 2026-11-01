import { spawn, type ChildProcess } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import net from 'node:net'
import path from 'node:path'

/** A real `server/index.ts` process, used by the browser-level tests. */

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.unref()
    srv.on('error', reject)
    srv.listen(0, '127.0.0.1', () => {
      const address = srv.address()
      const port = typeof address === 'object' && address ? address.port : 0
      srv.close(() => resolve(port))
    })
  })
}

export interface SpawnedServer {
  baseUrl: string
  stop: () => Promise<void>
}

export async function spawnApiServer(): Promise<SpawnedServer> {
  const port = await freePort()
  const dir = mkdtempSync(path.join(tmpdir(), 'theru-spawn-'))
  const child: ChildProcess = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', '--import', 'tsx', 'server/index.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      HOST: '127.0.0.1',
      THERU_DB_PATH: path.join(dir, 'theru.sqlite'),
      THERU_SERVE_STATIC: '0',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const logs: string[] = []
  child.stdout?.on('data', (d) => logs.push(String(d)))
  child.stderr?.on('data', (d) => logs.push(String(d)))

  const baseUrl = `http://127.0.0.1:${port}`
  const deadline = Date.now() + 20_000
  for (;;) {
    if (child.exitCode !== null) {
      throw new Error(`API process exited early:\n${logs.join('')}`)
    }
    try {
      const res = await fetch(`${baseUrl}/api/health`)
      if (res.ok) break
    } catch {
      /* not listening yet */
    }
    if (Date.now() > deadline) {
      child.kill('SIGKILL')
      throw new Error(`API did not start in time:\n${logs.join('')}`)
    }
    await new Promise((r) => setTimeout(r, 150))
  }

  return {
    baseUrl,
    stop: async () => {
      if (child.exitCode === null) {
        child.kill('SIGTERM')
        await new Promise<void>((resolve) => {
          const timer = setTimeout(() => {
            child.kill('SIGKILL')
            resolve()
          }, 4000)
          child.once('exit', () => {
            clearTimeout(timer)
            resolve()
          })
        })
      }
      rmSync(dir, { recursive: true, force: true })
    },
  }
}
