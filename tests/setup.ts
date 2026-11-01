/**
 * Shared test setup.
 *
 * - Silences React's "not wrapped in act" noise for assertions we don't make.
 * - Gives jsdom suites a working `fetch` against the real Express app by
 *   prefixing relative `/api/...` URLs with the base URL each suite provides.
 */

const globalAny = globalThis as unknown as { __THERU_API_BASE__?: string }

if (typeof window !== 'undefined') {
  const realFetch = globalThis.fetch.bind(globalThis)
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const base = globalAny.__THERU_API_BASE__
    if (base && typeof input === 'string' && input.startsWith('/api')) {
      return realFetch(`${base}${input}`, init)
    }
    return realFetch(input as RequestInfo, init)
  }) as typeof globalThis.fetch
}

export function setApiBase(base: string | undefined) {
  globalAny.__THERU_API_BASE__ = base
}
